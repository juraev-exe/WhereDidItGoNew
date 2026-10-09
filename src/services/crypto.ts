/**
 * Native Web Crypto AES-256-GCM encryption & decryption for WhereDidItGo backups.
 * Zero external dependencies. Uses hardware-accelerated SubtleCrypto with PBKDF2 key derivation.
 */
import { format } from 'date-fns'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from '@/lib/platform'
import { buildBackup, validateBackup, markBackupExported } from '@/services/backup'
import type { BackupPayload } from '@/types/finance'

export interface EncryptedBackupEnvelope {
  format: 'wherediditgo-encrypted-backup'
  version: 1
  algorithm: 'AES-GCM'
  kdf: 'PBKDF2'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
  createdAt: string
}

const PBKDF2_ITERATIONS = 100_000

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not supported in this environment.')
  }
  return subtle
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto()
  const enc = new TextEncoder()
  const passphraseBytes = enc.encode(passphrase)

  const baseKey = await subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt a backup payload with a user passphrase using AES-256-GCM.
 */
export async function encryptBackup(
  payload: BackupPayload | string,
  passphrase: string,
): Promise<EncryptedBackupEnvelope> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Encryption passphrase cannot be empty.')
  }

  const subtle = getSubtleCrypto()
  const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload)
  const enc = new TextEncoder()
  const plainBytes = enc.encode(jsonStr)

  // 16-byte random salt for PBKDF2
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  // 12-byte random initialization vector for AES-GCM
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveAesGcmKey(passphrase, salt, PBKDF2_ITERATIONS)

  const cipherBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    plainBytes,
  )

  const ciphertextBytes = new Uint8Array(cipherBuffer)

  return {
    format: 'wherediditgo-encrypted-backup',
    version: 1,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertextBytes),
    createdAt: new Date().toISOString(),
  }
}

/**
 * Decrypt an encrypted backup envelope using user passphrase.
 * Returns validated BackupPayload.
 */
export async function decryptBackup(
  envelope: EncryptedBackupEnvelope,
  passphrase: string,
): Promise<BackupPayload> {
  if (!passphrase) {
    throw new Error('Encryption passphrase cannot be empty.')
  }

  if (envelope.format !== 'wherediditgo-encrypted-backup' || envelope.version !== 1) {
    throw new Error('Unrecognized encrypted backup format.')
  }

  const subtle = getSubtleCrypto()
  const salt = base64ToBytes(envelope.salt)
  const iv = base64ToBytes(envelope.iv)
  const ciphertextBytes = base64ToBytes(envelope.ciphertext)

  const key = await deriveAesGcmKey(passphrase, salt, envelope.iterations || PBKDF2_ITERATIONS)

  let decryptedBuffer: ArrayBuffer
  try {
    decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertextBytes as BufferSource,
    )
  } catch {
    throw new Error('Incorrect password or corrupted encrypted backup.')
  }

  const dec = new TextDecoder()
  const decryptedJson = dec.decode(decryptedBuffer)
  const parsed = JSON.parse(decryptedJson) as unknown
  return validateBackup(parsed)
}

/**
 * Parses and verifies an encrypted backup string.
 */
export function parseEncryptedBackupEnvelope(text: string): EncryptedBackupEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON in encrypted backup file.')
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as EncryptedBackupEnvelope).format !== 'wherediditgo-encrypted-backup' ||
    typeof (parsed as EncryptedBackupEnvelope).ciphertext !== 'string' ||
    typeof (parsed as EncryptedBackupEnvelope).salt !== 'string' ||
    typeof (parsed as EncryptedBackupEnvelope).iv !== 'string'
  ) {
    throw new Error('Not a valid WhereDidItGo encrypted backup envelope.')
  }

  return parsed as EncryptedBackupEnvelope
}

/**
 * Exports current database as an AES-256-GCM encrypted .enc file.
 */
export async function exportEncryptedBackupFile(passphrase: string): Promise<void> {
  const backup = await buildBackup()
  const envelope = await encryptBackup(backup, passphrase)
  const json = JSON.stringify(envelope, null, 2)
  const filename = `wherediditgo-backup-${format(new Date(), 'yyyyMMdd')}.enc`

  if (isNative()) {
    await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    const uri = await Filesystem.getUri({ path: filename, directory: Directory.Cache })
    await Share.share({
      title: 'WhereDidItGo encrypted backup',
      url: uri.uri,
      dialogTitle: 'Export encrypted backup',
    })
    await markBackupExported()
    return
  }

  const blob = new Blob([json], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  await markBackupExported()
}
