import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { EVENT_CONFIG, SUPABASE_CONFIG, isSupabaseConfigured } from '../config'
import type { MemoryPhoto, PhotoPrompt } from '../types'

type SupabasePhotoRow = {
  id: string
  event_slug: string
  guest_name: string
  prompt_id: string
  prompt_title: string
  image_path: string | null
  image_url: string
  points: number
  likes: number
  created_at: string
  hidden_at?: string | null
}

type SavePhotoInput = {
  id: string
  guestName: string
  prompt: PhotoPrompt
  imageBlob: Blob
  localDataUrl: string
}

const DB_NAME = 'engagement-memories'
const DB_VERSION = 1
const STORE_NAME = 'photos'

const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null

function mapPhoto(row: SupabasePhotoRow): MemoryPhoto {
  return {
    id: row.id,
    eventSlug: row.event_slug,
    guestName: row.guest_name,
    promptId: row.prompt_id,
    promptTitle: row.prompt_title,
    imagePath: row.image_path,
    imageUrl: row.image_url,
    points: row.points,
    likes: row.likes,
    createdAt: row.created_at,
    hiddenAt: row.hidden_at || null,
  }
}

function openLocalDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('eventSlug', 'eventSlug', { unique: false })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function getLocalPhotos() {
  const db = await openLocalDb()

  return new Promise<MemoryPhoto[]>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const photos = (request.result as MemoryPhoto[])
        .filter(
          (photo) => photo.eventSlug === EVENT_CONFIG.slug && !photo.hiddenAt,
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )

      resolve(photos)
    }
  }).finally(() => db.close())
}

async function putLocalPhoto(photo: MemoryPhoto) {
  const db = await openLocalDb()

  return new Promise<MemoryPhoto>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put(photo)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(photo)
  }).finally(() => db.close())
}

export async function loadPhotos() {
  if (!supabase) {
    return getLocalPhotos()
  }

  const { data, error } = await supabase
    .from(SUPABASE_CONFIG.table)
    .select('*')
    .eq('event_slug', EVENT_CONFIG.slug)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as SupabasePhotoRow[])
    .filter((row) => !row.hidden_at)
    .map(mapPhoto)
}

export async function savePhoto(input: SavePhotoInput) {
  const createdAt = new Date().toISOString()

  if (!supabase) {
    return putLocalPhoto({
      id: input.id,
      eventSlug: EVENT_CONFIG.slug,
      guestName: input.guestName,
      promptId: input.prompt.id,
      promptTitle: input.prompt.title,
      imagePath: null,
      imageUrl: input.localDataUrl,
      points: input.prompt.points,
      likes: 0,
      createdAt,
      hiddenAt: null,
    })
  }

  const imagePath = `${EVENT_CONFIG.slug}/${input.id}.jpg`
  const upload = await supabase.storage
    .from(SUPABASE_CONFIG.bucket)
    .upload(imagePath, input.imageBlob, {
      cacheControl: '31536000',
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (upload.error) {
    throw upload.error
  }

  const { data: publicUrlData } = supabase.storage
    .from(SUPABASE_CONFIG.bucket)
    .getPublicUrl(imagePath)

  const row = {
    id: input.id,
    event_slug: EVENT_CONFIG.slug,
    guest_name: input.guestName,
    prompt_id: input.prompt.id,
    prompt_title: input.prompt.title,
    image_path: imagePath,
    image_url: publicUrlData.publicUrl,
    points: input.prompt.points,
    likes: 0,
    created_at: createdAt,
  }

  const { data, error } = await supabase
    .from(SUPABASE_CONFIG.table)
    .insert(row)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return mapPhoto(data as SupabasePhotoRow)
}

export async function likePhoto(photo: MemoryPhoto) {
  const nextLikes = photo.likes + 1

  if (!supabase) {
    return putLocalPhoto({ ...photo, likes: nextLikes })
  }

  const { data, error } = await supabase.rpc('increment_photo_like', {
    photo_id: photo.id,
  })

  if (error) {
    throw error
  }

  const updatedPhoto = (data as SupabasePhotoRow[])[0]

  if (!updatedPhoto) {
    throw new Error('Fotoğraf bulunamadı.')
  }

  return mapPhoto(updatedPhoto)
}

export function subscribeToPhotos(onPhotoChange: (payload: unknown) => void) {
  if (!supabase) {
    return () => undefined
  }

  const channel = supabase
    .channel(`memories-${EVENT_CONFIG.slug}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: SUPABASE_CONFIG.table,
      },
      (payload) => {
        onPhotoChange(payload)
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function deletePhoto(photo: MemoryPhoto) {
  const hiddenAt = new Date().toISOString()

  if (!supabase) {
    const db = await openLocalDb()
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const getReq = store.get(photo.id)
      getReq.onsuccess = () => {
        const data = getReq.result as MemoryPhoto
        if (data) {
          data.hiddenAt = hiddenAt
          store.put(data)
        }
        resolve()
      }
      getReq.onerror = () => reject(getReq.error)
    }).finally(() => db.close())
  }

  const hideResult = await supabase.rpc('hide_photo', {
    photo_id: photo.id,
  })

  if (!hideResult.error) {
    return
  }

  const hiddenAtUpdate = await supabase
    .from(SUPABASE_CONFIG.table)
    .update({ hidden_at: hiddenAt })
    .eq('id', photo.id)
    .select('id')

  if (!hiddenAtUpdate.error && hiddenAtUpdate.data && hiddenAtUpdate.data.length > 0) {
    return
  }

  const slugFallback = await supabase
    .from(SUPABASE_CONFIG.table)
    .update({ event_slug: `${EVENT_CONFIG.slug}-deleted` })
    .eq('id', photo.id)
    .select('id')

  if (slugFallback.error || !slugFallback.data || slugFallback.data.length === 0) {
    throw slugFallback.error || hiddenAtUpdate.error || hideResult.error
  }
}

export { isSupabaseConfigured }
