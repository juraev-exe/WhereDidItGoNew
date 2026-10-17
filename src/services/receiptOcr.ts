import { createWorker } from 'tesseract.js'
import { parseReceiptText, type ParsedReceipt } from './receiptParser'
import type { Category } from '@/types/finance'

export interface OcrProgress {
  status: string
  progress: number // 0 to 1
}

/**
 * Preprocesses an image via Canvas:
 * 1. Resizes down if excessively large (max 1600px)
 * 2. Enhances contrast and converts to grayscale for crisp thermal receipt text
 */
export async function preprocessReceiptImage(fileOrBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(fileOrBlob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(url)
        return
      }

      // Max dimension 1600px for speed & crisp text
      const maxDim = 1600
      let w = img.width
      let h = img.height

      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w)
          w = maxDim
        } else {
          w = Math.round((w * maxDim) / h)
          h = maxDim
        }
      }

      canvas.width = w
      canvas.height = h

      // Draw original image
      ctx.drawImage(img, 0, 0, w, h)

      try {
        const imgData = ctx.getImageData(0, 0, w, h)
        const d = imgData.data

        // High-contrast Grayscale
        // Contrast enhancement factor
        const contrast = 1.3
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255))

        for (let i = 0; i < d.length; i += 4) {
          // Standard luminosity
          const gray = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!
          // Apply contrast stretch
          const contrasted = factor * (gray - 128) + 128
          const clamped = Math.max(0, Math.min(255, contrasted))

          d[i] = clamped
          d[i + 1] = clamped
          d[i + 2] = clamped
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } catch {
        // Fallback to original image if cross-origin or canvas error
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
    }

    img.onerror = (e) => reject(e)
    img.src = url
  })
}

/**
 * Perform Optical Character Recognition on a receipt image.
 * Uses Tesseract.js worker with multi-language support (eng + rus).
 */
export async function scanReceiptImage(
  imageBlob: Blob,
  categories: Category[] = [],
  onProgress?: (p: OcrProgress) => void,
): Promise<{ rawText: string; parsed: ParsedReceipt; previewUrl: string }> {
  onProgress?.({ status: 'preprocessing', progress: 0.1 })
  const preprocessedDataUrl = await preprocessReceiptImage(imageBlob)

  onProgress?.({ status: 'initializing', progress: 0.25 })
  // Multi-language recognition: English + Russian covers Latin and Cyrillic receipts (EN, RU, TJ)
  const worker = await createWorker('eng+rus', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const prog = 0.3 + (m.progress || 0) * 0.65
        onProgress?.({ status: 'recognizing', progress: Math.min(0.95, prog) })
      }
    },
  })

  try {
    onProgress?.({ status: 'recognizing', progress: 0.4 })
    const { data } = await worker.recognize(preprocessedDataUrl)
    const rawText = data.text || ''

    onProgress?.({ status: 'parsing', progress: 0.98 })
    const parsed = parseReceiptText(rawText, categories)

    return {
      rawText,
      parsed,
      previewUrl: preprocessedDataUrl,
    }
  } finally {
    await worker.terminate()
  }
}
