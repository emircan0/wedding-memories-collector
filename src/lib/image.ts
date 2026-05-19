import type { PreparedImage } from '../types'

const MAX_SIDE = 1600
const JPEG_QUALITY = 0.82

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Fotoğraf okunamadı.'))
    image.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Fotoğraf hazırlanamadı.'))
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Sadece fotoğraf yüklenebilir.')
  }

  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Tarayıcı fotoğrafı işleyemedi.')
    }

    canvas.width = width
    canvas.height = height
    context.drawImage(image, 0, 0, width, height)

    const blob = await canvasToBlob(canvas)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72)

    return { blob, dataUrl, width, height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
