import QRCode from 'qrcode'

/**
 * Generate an SVG string of a QR Code.
 */
export async function generateQrSvg(
  text: string,
  options?: {
    margin?: number
    color?: {
      dark?: string
      light?: string
    }
  },
): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color?.dark ?? '#111827',
      light: options?.color?.light ?? '#ffffff',
    },
  })
}

/**
 * Generate a PNG Data URL of a QR Code.
 */
export async function generateQrDataUrl(
  text: string,
  options?: {
    width?: number
    margin?: number
  },
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options?.width ?? 280,
    margin: options?.margin ?? 2,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  })
}
