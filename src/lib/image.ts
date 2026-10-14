import type { PreparedImage } from '../types'

const MAX_SIDE = 1200
const JPEG_QUALITY = 0.75

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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.70)

    return { blob, dataUrl, width, height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function flipImageHorizontally(prepared: PreparedImage): Promise<PreparedImage> {
  const image = await loadImage(prepared.dataUrl)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Tarayıcı fotoğrafı işleyemedi.')
  }

  canvas.width = prepared.width
  canvas.height = prepared.height
  
  // Aynalama (Mirror) işlemi
  context.translate(prepared.width, 0)
  context.scale(-1, 1)
  context.drawImage(image, 0, 0, prepared.width, prepared.height)

  const blob = await canvasToBlob(canvas)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.70)

  return { blob, dataUrl, width: prepared.width, height: prepared.height }
}

export async function createNoteCardImage(guestName: string, noteText: string): Promise<PreparedImage> {
  const canvas = document.createElement('canvas')
  const width = 1080
  const height = 1080
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Tarayıcı not kartını oluşturamadı.')

  // Gradient background
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, width * 0.75)
  gradient.addColorStop(0, '#FFFBF8')
  gradient.addColorStop(0.65, '#FDF2F4')
  gradient.addColorStop(1, '#F8E1E6')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  // Decorative border
  ctx.strokeStyle = 'rgba(235, 130, 150, 0.35)'
  ctx.lineWidth = 4
  ctx.strokeRect(48, 48, width - 96, height - 96)

  // Inner subtle border
  ctx.strokeStyle = 'rgba(235, 130, 150, 0.15)'
  ctx.lineWidth = 2
  ctx.strokeRect(60, 60, width - 120, height - 120)

  // Top header / decorative icon
  ctx.fillStyle = '#E85D75'
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('✨ NİŞAN HATIRASI ✨', width / 2, 160)

  // Large decorative quote mark
  ctx.fillStyle = 'rgba(232, 93, 117, 0.22)'
  ctx.font = 'italic 150px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('“', width / 2, 280)

  // Note text rendering with word wrap
  ctx.fillStyle = '#1C1C1E'
  ctx.font = '500 40px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  const maxWidth = width - 240
  const lineHeight = 60

  const words = noteText.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }

  // Center vertically around y = 520
  const totalTextHeight = lines.length * lineHeight
  const startY = Math.max(360, 520 - totalTextHeight / 2)

  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight)
  })

  // Closing decorative quote mark
  ctx.fillStyle = 'rgba(232, 93, 117, 0.22)'
  ctx.font = 'italic 150px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('”', width / 2, Math.min(830, startY + totalTextHeight + 50))

  // Guest signature & footer
  ctx.fillStyle = '#E85D75'
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`— ${guestName} —`, width / 2, 930)

  ctx.fillStyle = 'rgba(142, 142, 147, 0.9)'
  ctx.font = '300 24px -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('Tebrik ve Dilek Notu', width / 2, 975)

  const blob = await canvasToBlob(canvas)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.80)

  return { blob, dataUrl, width, height }
}

