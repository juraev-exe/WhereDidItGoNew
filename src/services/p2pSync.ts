/**
 * Local-first WebRTC DataChannel synchronization for WhereDidItGo.
 * Connects desktop & mobile directly on the local network via QR / pairing code handshake.
 * Zero backend server required.
 */
import { buildBackup, mergeFromBackup } from '@/services/backup'
import type { BackupPayload } from '@/types/finance'

export type P2PSyncStatus =
  | 'idle'
  | 'generating_offer'
  | 'waiting_for_answer'
  | 'connecting'
  | 'connected'
  | 'syncing'
  | 'complete'
  | 'error'

export interface P2PSyncMessage {
  type: 'handshake' | 'snapshot' | 'ack' | 'complete'
  payload?: BackupPayload
  stats?: {
    txCount: number
    accountsCount: number
    categoriesCount: number
  }
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

/**
 * Compact base64 representation of SDP session description.
 */
export function encodeSdpPayload(desc: RTCSessionDescriptionInit): string {
  const json = JSON.stringify({ type: desc.type, sdp: desc.sdp })
  return btoa(unescape(encodeURIComponent(json)))
}

export function decodeSdpPayload(encoded: string): RTCSessionDescriptionInit {
  try {
    const json = decodeURIComponent(escape(atob(encoded.trim())))
    const parsed = JSON.parse(json) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      'type' in parsed &&
      'sdp' in parsed &&
      ((parsed as RTCSessionDescriptionInit).type === 'offer' ||
        (parsed as RTCSessionDescriptionInit).type === 'answer')
    ) {
      return parsed as RTCSessionDescriptionInit
    }
  } catch {
    // fall through
  }
  throw new Error('Invalid WebRTC pairing code.')
}

/** Wait for ICE candidate gathering to finish so the SDP includes all host candidates */
function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout>

    const checkState = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState)
        clearTimeout(timeoutId)
        resolve()
      }
    }

    pc.addEventListener('icegatheringstatechange', checkState)

    // Fallback: don't wait forever, max 3 seconds for local ICE
    timeoutId = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', checkState)
      resolve()
    }, 3000)
  })
}

export class P2PHostSession {
  private pc: RTCPeerConnection
  private dc: RTCDataChannel | null = null
  private onStatus: (status: P2PSyncStatus, details?: string) => void
  private onComplete: (stats: { syncedItems: number }) => void

  constructor(
    onStatus: (status: P2PSyncStatus, details?: string) => void,
    onComplete: (stats: { syncedItems: number }) => void,
  ) {
    this.onStatus = onStatus
    this.onComplete = onComplete
    this.pc = new RTCPeerConnection(RTC_CONFIG)
  }

  async initOffer(): Promise<string> {
    this.onStatus('generating_offer')

    // Create reliable data channel
    this.dc = this.pc.createDataChannel('wherediditgo-sync', { ordered: true })
    this.setupDataChannel(this.dc)

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    await waitForIceGathering(this.pc)

    const finalOffer = this.pc.localDescription
    if (!finalOffer) throw new Error('Failed to generate local offer')

    this.onStatus('waiting_for_answer')
    return encodeSdpPayload(finalOffer)
  }

  async acceptAnswer(answerCode: string): Promise<void> {
    this.onStatus('connecting')
    const answer = decodeSdpPayload(answerCode)
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer))
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = async () => {
      this.onStatus('syncing', 'Connected to peer. Transferring database...')
      try {
        const backup = await buildBackup()
        const msg: P2PSyncMessage = {
          type: 'snapshot',
          payload: backup,
          stats: {
            txCount: backup.transactions.length,
            accountsCount: backup.accounts.length,
            categoriesCount: backup.categories.length,
          },
        }
        channel.send(JSON.stringify(msg))
      } catch (err) {
        this.onStatus('error', err instanceof Error ? err.message : 'Sync failed')
      }
    }

    channel.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as P2PSyncMessage
        if (data.type === 'snapshot' && data.payload) {
          await mergeFromBackup(data.payload)
          channel.send(JSON.stringify({ type: 'ack' }))
          this.onStatus('complete')
          this.onComplete({
            syncedItems: (data.stats?.txCount ?? data.payload.transactions.length) + (data.stats?.categoriesCount ?? 0),
          })
        } else if (data.type === 'ack') {
          this.onStatus('complete')
          this.onComplete({ syncedItems: 1 })
        }
      } catch (err) {
        this.onStatus('error', err instanceof Error ? err.message : 'Data error')
      }
    }

    channel.onerror = (err) => {
      this.onStatus('error', `Channel error: ${err.type}`)
    }
  }

  close() {
    this.dc?.close()
    this.pc.close()
  }
}

export class P2PClientSession {
  private pc: RTCPeerConnection
  private dc: RTCDataChannel | null = null
  private onStatus: (status: P2PSyncStatus, details?: string) => void
  private onComplete: (stats: { syncedItems: number }) => void

  constructor(
    onStatus: (status: P2PSyncStatus, details?: string) => void,
    onComplete: (stats: { syncedItems: number }) => void,
  ) {
    this.onStatus = onStatus
    this.onComplete = onComplete
    this.pc = new RTCPeerConnection(RTC_CONFIG)
  }

  async acceptOfferAndGenerateAnswer(offerCode: string): Promise<string> {
    this.onStatus('connecting')
    const offer = decodeSdpPayload(offerCode)

    this.pc.ondatachannel = (evt) => {
      this.dc = evt.channel
      this.setupDataChannel(this.dc)
    }

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    await waitForIceGathering(this.pc)

    const finalAnswer = this.pc.localDescription
    if (!finalAnswer) throw new Error('Failed to generate local answer')

    return encodeSdpPayload(finalAnswer)
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = async () => {
      this.onStatus('syncing', 'Connected to host. Synchronizing...')
      // Also send local snapshot to host for bidirectional merge
      try {
        const backup = await buildBackup()
        const msg: P2PSyncMessage = {
          type: 'snapshot',
          payload: backup,
          stats: {
            txCount: backup.transactions.length,
            accountsCount: backup.accounts.length,
            categoriesCount: backup.categories.length,
          },
        }
        channel.send(JSON.stringify(msg))
      } catch (err) {
        this.onStatus('error', err instanceof Error ? err.message : 'Upload failed')
      }
    }

    channel.onmessage = async (evt) => {
      try {
        const data = JSON.parse(evt.data as string) as P2PSyncMessage
        if (data.type === 'snapshot' && data.payload) {
          await mergeFromBackup(data.payload)
          channel.send(JSON.stringify({ type: 'ack' }))
          this.onStatus('complete')
          this.onComplete({
            syncedItems: (data.stats?.txCount ?? data.payload.transactions.length) + (data.stats?.categoriesCount ?? 0),
          })
        } else if (data.type === 'ack') {
          this.onStatus('complete')
          this.onComplete({ syncedItems: 1 })
        }
      } catch (err) {
        this.onStatus('error', err instanceof Error ? err.message : 'Data error')
      }
    }

    channel.onerror = (err) => {
      this.onStatus('error', `Channel error: ${err.type}`)
    }
  }

  close() {
    this.dc?.close()
    this.pc.close()
  }
}
