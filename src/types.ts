export type PhotoPrompt = {
  id: string
  title: string
  cue: string
  points: number
  accent: string
}

export type MemoryPhoto = {
  id: string
  eventSlug: string
  guestName: string
  promptId: string
  promptTitle: string
  imagePath: string | null
  imageUrl: string
  points: number
  likes: number
  createdAt: string
}

export type PreparedImage = {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}
