import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Clock3,
  Crown,
  Heart,
  ImagePlus,
  Images,
  Loader2,
  Sparkles,
  Target,
  Trophy,
  Upload,
  Users,
  WifiOff,
  X,
  Dices,
  Edit2,
  FlipHorizontal,
  Trash2,
  ChevronDown
} from 'lucide-react'
import './App.css'
import { EVENT_CONFIG, isSupabaseConfigured } from './config'
import { DEFAULT_PROMPT, PHOTO_PROMPTS } from './data/prompts'
import { prepareImage, flipImageHorizontally } from './lib/image'
import {
  likePhoto,
  loadPhotos,
  savePhoto,
  subscribeToPhotos,
  deletePhoto
} from './lib/memoryStore'
import type { MemoryPhoto, PreparedImage } from './types'

type TabId = 'capture' | 'gallery' | 'score'

type Tab = {
  id: TabId
  label: string
  icon: typeof Camera
}

type LeaderboardRow = {
  name: string
  uploads: number
  points: number
  likes: number
  score: number
}

type RealtimePhotoRow = {
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

type PhotoChangePayload = {
  eventType?: string
  new?: RealtimePhotoRow
  old?: Partial<RealtimePhotoRow>
}

const TABS: Tab[] = [
  { id: 'capture', label: 'Foto', icon: Camera },
  { id: 'gallery', label: 'Galeri', icon: Images },
  { id: 'score', label: 'Skor', icon: Trophy },
]

const GUEST_KEY = 'memory_guest_name'
const LIKED_KEY = 'memory_liked_photos'
const HIDDEN_KEY = 'memory_hidden_photos'
const MAX_BATCH_PHOTOS = 10

function getLikedPhotoIds() {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function getHiddenPhotoIds() {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') as string[]
  } catch {
    return []
  }
}

function isPhotoChangePayload(payload: unknown): payload is PhotoChangePayload {
  return typeof payload === 'object' && payload !== null && 'eventType' in payload
}

function mapRealtimePhoto(row: RealtimePhotoRow): MemoryPhoto {
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

function formatTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function buildLeaderboard(photos: MemoryPhoto[]) {
  const rows = new Map<string, LeaderboardRow>()

  photos.forEach((photo) => {
    const current = rows.get(photo.guestName) || {
      name: photo.guestName,
      uploads: 0,
      points: 0,
      likes: 0,
      score: 0,
    }

    current.uploads += 1
    current.points += photo.points
    current.likes += photo.likes
    current.score = current.points + current.likes * 2
    rows.set(photo.guestName, current)
  })

  return [...rows.values()].sort((a, b) => b.score - a.score)
}

function getPromptById(promptId: string) {
  return PHOTO_PROMPTS.find((prompt) => prompt.id === promptId) || DEFAULT_PROMPT
}

function App() {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>('capture')
  const [activePromptId, setActivePromptId] = useState(DEFAULT_PROMPT.id)
  const [guestName, setGuestName] = useState(
    () => localStorage.getItem(GUEST_KEY) || '',
  )
  const [draftName, setDraftName] = useState(guestName)
  const [draftImages, setDraftImages] = useState<PreparedImage[]>([])
  const [photos, setPhotos] = useState<MemoryPhoto[]>([])
  const [likedPhotos, setLikedPhotos] = useState<string[]>(getLikedPhotoIds)
  const [hiddenPhotos, setHiddenPhotos] = useState<string[]>(getHiddenPhotoIds)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)

  const activePrompt = getPromptById(activePromptId)
  const draftImage = draftImages[0] || null
  const visiblePhotos = useMemo(
    () =>
      photos.filter(
        (photo) =>
          photo.eventSlug === EVENT_CONFIG.slug &&
          !photo.hiddenAt &&
          !hiddenPhotos.includes(photo.id),
      ),
    [hiddenPhotos, photos],
  )
  const leaderboard = useMemo(() => buildLeaderboard(visiblePhotos), [visiblePhotos])
  const userRow = leaderboard.find((row) => row.name === guestName)
  const isFull = visiblePhotos.length >= EVENT_CONFIG.maxPhotos

  const promptCounts = useMemo(() => {
    return PHOTO_PROMPTS.map((prompt) => ({
      ...prompt,
      count: visiblePhotos.filter((photo) => photo.promptId === prompt.id).length,
    }))
  }, [visiblePhotos])

  useEffect(() => {
    let isMounted = true

    async function refreshPhotos() {
      try {
        const nextPhotos = await loadPhotos()
        if (isMounted) {
          const hiddenIds = getHiddenPhotoIds()
          setHiddenPhotos(hiddenIds)
          setPhotos(nextPhotos.filter((photo) => !hiddenIds.includes(photo.id)))
        }
      } catch (error) {
        if (isMounted) {
          setNotice(error instanceof Error ? error.message : 'Galeri açılamadı.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void refreshPhotos()
    const unsubscribe = subscribeToPhotos((payload) => {
      if (isPhotoChangePayload(payload) && payload.eventType) {
        const { eventType, new: newRow, old: oldRow } = payload

        if (eventType === 'INSERT') {
          if (!newRow) return

          const newPhoto = mapRealtimePhoto(newRow)
          const hiddenIds = getHiddenPhotoIds()

          if (
            newPhoto.eventSlug === EVENT_CONFIG.slug &&
            !newPhoto.hiddenAt &&
            !hiddenIds.includes(newPhoto.id)
          ) {
            setPhotos((current) => {
              if (current.some((p) => p.id === newPhoto.id)) return current
              return [newPhoto, ...current]
            })
          }
        } else if (eventType === 'UPDATE') {
          if (!newRow) return

          const updatedPhoto = mapRealtimePhoto(newRow)
          const hiddenIds = getHiddenPhotoIds()

          if (
            updatedPhoto.eventSlug !== EVENT_CONFIG.slug ||
            updatedPhoto.hiddenAt ||
            hiddenIds.includes(updatedPhoto.id)
          ) {
            setPhotos((current) => current.filter((p) => p.id !== newRow.id))
          } else {
            setPhotos((current) =>
              current.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
            )
          }
        } else if (eventType === 'DELETE') {
          setPhotos((current) => current.filter((p) => p.id !== oldRow?.id))
        }
      } else {
        void refreshPhotos()
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  function rememberHiddenPhoto(photoId: string) {
    const nextHiddenPhotos = [...new Set([...getHiddenPhotoIds(), photoId])]
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(nextHiddenPhotos))
    setHiddenPhotos(nextHiddenPhotos)
  }

  function saveGuestName() {
    const cleanName = draftName.trim().slice(0, 32)

    if (!cleanName) {
      setNotice('İsmini yaz, puanlar sana gelsin.')
      return
    }

    localStorage.setItem(GUEST_KEY, cleanName)
    setGuestName(cleanName)
    setNotice('Harika! Görevleri tamamlamaya başla.')
  }

  function shufflePrompt() {
    const available = PHOTO_PROMPTS.filter((p) => p.id !== activePromptId)
    const random = available[Math.floor(Math.random() * available.length)]
    setActivePromptId(random.id)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])

    if (!files.length) {
      return
    }

    const batchSlots = MAX_BATCH_PHOTOS - draftImages.length
    const archiveSlots = EVENT_CONFIG.maxPhotos - visiblePhotos.length - draftImages.length
    const availableSlots = Math.max(Math.min(batchSlots, archiveSlots), 0)

    if (!availableSlots) {
      setNotice(`Tek seferde en fazla ${MAX_BATCH_PHOTOS} fotoğraf seçebilirsin.`)
      event.target.value = ''
      return
    }

    const selectedFiles = files.slice(0, availableSlots)

    setIsPreparing(true)
    setNotice('')

    try {
      const preparedImages = await Promise.all(selectedFiles.map(prepareImage))
      setDraftImages((current) => [...current, ...preparedImages])

      if (files.length > availableSlots) {
        setNotice(`İlk ${availableSlots} fotoğraf eklendi; limit ${MAX_BATCH_PHOTOS}.`)
      } else {
        setNotice(`${preparedImages.length} fotoğraf hazır.`)
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Fotoğraf hazırlanamadı.',
      )
    } finally {
      setIsPreparing(false)
      event.target.value = ''
    }
  }

  async function handleFlipImage() {
    if (!draftImage) return
    setIsPreparing(true)
    try {
      const flipped = await flipImageHorizontally(draftImage)
      setDraftImages((current) =>
        current.map((image, index) => (index === 0 ? flipped : image)),
      )
    } catch {
      setNotice('Fotoğraf çevrilemedi.')
    } finally {
      setIsPreparing(false)
    }
  }

  function removeDraftImage(indexToRemove: number) {
    setDraftImages((current) =>
      current.filter((_, index) => index !== indexToRemove),
    )
  }

  async function handleUpload() {
    if (!guestName) {
      setNotice('Önce ismini kaydet.')
      return
    }

    if (!draftImages.length) {
      setNotice('Bir fotoğraf seç.')
      return
    }

    if (visiblePhotos.length + draftImages.length > EVENT_CONFIG.maxPhotos) {
      setNotice('Arşiv limiti dolmak üzere. Daha az fotoğraf seç.')
      return
    }

    setIsSaving(true)
    setNotice('')

    const uploadedPhotos: MemoryPhoto[] = []
    let failedAt = -1

    try {
      for (const [index, image] of draftImages.entries()) {
        try {
          const photo = await savePhoto({
            id: crypto.randomUUID(),
            guestName,
            prompt: activePrompt,
            imageBlob: image.blob,
            localDataUrl: image.dataUrl,
          })

          uploadedPhotos.push(photo)
        } catch {
          failedAt = index
          break
        }
      }

      if (uploadedPhotos.length) {
        setPhotos((current) => [
          ...uploadedPhotos,
          ...current.filter(
            (item) => !uploadedPhotos.some((photo) => photo.id === item.id),
          ),
        ])
      }

      if (failedAt >= 0) {
        setDraftImages(draftImages.slice(failedAt))
        setNotice(
          `${uploadedPhotos.length} fotoğraf yüklendi, kalanlar tekrar denenebilir.`,
        )
        return
      }

      setDraftImages([])
      setActiveTab('gallery')
      setNotice(
        `${uploadedPhotos.length} fotoğraf yüklendi. ${uploadedPhotos.length * activePrompt.points} puan geldi.`,
      )
    } catch {
      setNotice('Fotoğraf yüklenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleLike(photo: MemoryPhoto) {
    if (likedPhotos.includes(photo.id)) {
      return
    }

    const nextLikedPhotos = [...likedPhotos, photo.id]
    setLikedPhotos(nextLikedPhotos)
    localStorage.setItem(LIKED_KEY, JSON.stringify(nextLikedPhotos))
    setPhotos((current) =>
      current.map((item) =>
        item.id === photo.id ? { ...item, likes: item.likes + 1 } : item,
      ),
    )

    try {
      const updated = await likePhoto(photo)
      setPhotos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Beğeni kaydedilemedi.')
    }
  }

  async function handleDeletePhoto(photo: MemoryPhoto) {
    if (photo.guestName !== guestName) {
      setNotice('Sadece kendi yüklediğin fotoğrafları silebilirsin.')
      return
    }

    if (!window.confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return

    rememberHiddenPhoto(photo.id)
    setPhotos((current) => current.filter((item) => item.id !== photo.id))

    try {
      await deletePhoto(photo)
      setNotice('Fotoğraf galeriden kaldırıldı.')
    } catch {
      setNotice('Fotoğraf bu cihazda gizlendi; database güncellenemedi.')
    }
  }

  return (
    <main className="app-shell">
      <header className="event-bar">
        <div>
          <p className="eyebrow">QR Hatıra Arşivi</p>
          <h1>{EVENT_CONFIG.title}</h1>
          <p>{EVENT_CONFIG.subtitle}</p>
        </div>
        <div className="sync-pill" aria-label="Bağlantı durumu">
          {isSupabaseConfigured ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
          <span>{isSupabaseConfigured ? 'Canlı' : 'Demo'}</span>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <Sparkles size={16} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Kapat">
            <X size={16} />
          </button>
        </div>
      )}

      {activeTab === 'capture' && (
        <section className="capture-view" aria-label="Fotoğraf yükleme">
          {!guestName ? (
            <div className="welcome-panel">
              <div className="welcome-icon">
                <Camera size={34} />
              </div>
              <h2>Anı Biriktirmeye Başla</h2>
              <p>Yakaladığın anların puanları sana yazılsın diye adını gir</p>
              <div className="input-group">
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveGuestName()}
                  placeholder="Adın veya lakabın..."
                  maxLength={32}
                  autoFocus
                />
                <button type="button" onClick={saveGuestName}>
                  Başla
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="user-greeting">
                <div className="greeting-text">
                  <span className="eyebrow">Hoş geldin,</span>
                  <strong>{guestName}</strong>
                </div>
                <button type="button" onClick={() => {
                  setGuestName('')
                  setDraftName('')
                }} aria-label="İsmi Değiştir">
                  <Edit2 size={16} />
                </button>
              </div>

          <div className="camera-panel">
            <div className="mission-row">
              <div className="mission-info-clickable" onClick={() => setIsSelectorOpen(true)} role="button" tabIndex={0}>
                <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Görev Seç <ChevronDown size={14} />
                </p>
                <h2>{activePrompt.title}</h2>
                <span>{activePrompt.cue}</span>
              </div>
              <div className="mission-actions">
                <div className="point-badge" style={{ background: activePrompt.accent }}>
                  <Target size={16} />
                  {activePrompt.points}
                </div>
                <button className="shuffle-btn" type="button" onClick={shufflePrompt} aria-label="Görevi Değiştir">
                  <Dices size={20} />
                </button>
              </div>
            </div>

            <div className="capture-actions">
              <button
                className="camera-button"
                style={{ background: activePrompt.accent, boxShadow: `0 8px 24px ${activePrompt.accent}45` }}
                disabled={isPreparing || isSaving || isFull}
                onClick={() => cameraInputRef.current?.click()}
                type="button"
              >
                {isPreparing ? <Loader2 className="spin" size={20} /> : <Camera size={20} />}
                <span>Fotoğraf Çek</span>
              </button>

              <button
                className="gallery-button"
                disabled={isPreparing || isSaving || isFull}
                onClick={() => galleryInputRef.current?.click()}
                type="button"
              >
                {isPreparing ? <Loader2 className="spin" size={20} /> : <ImagePlus size={20} />}
                <span>{draftImages.length ? 'Galeriden Ekle' : 'Galeriden Seç'}</span>
              </button>
            </div>

            <input
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFileChange}
              ref={cameraInputRef}
              type="file"
            />

            <input
              accept="image/*"
              hidden
              multiple
              onChange={handleFileChange}
              ref={galleryInputRef}
              type="file"
            />

            {draftImages.length ? (
              <div className="preview-frame">
                <div className="preview-grid">
                  {draftImages.map((image, index) => (
                    <div className="preview-tile" key={`${image.dataUrl}-${index}`}>
                      <img alt={`Seçilen fotoğraf ${index + 1}`} src={image.dataUrl} />
                      <button
                        aria-label="Fotoğrafı çıkar"
                        disabled={isSaving || isPreparing}
                        onClick={() => removeDraftImage(index)}
                        type="button"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="preview-actions">
                  <span className="batch-count">
                    {draftImages.length}/{MAX_BATCH_PHOTOS} fotoğraf
                  </span>
                  {draftImages.length === 1 && (
                    <button
                      className="flip-btn"
                      disabled={isPreparing || isSaving}
                      onClick={handleFlipImage}
                      type="button"
                      title="Aynala (Çevir)"
                    >
                      <FlipHorizontal size={20} />
                    </button>
                  )}
                  <button
                    disabled={isSaving || isPreparing}
                    onClick={handleUpload}
                    type="button"
                    className="upload-btn"
                  >
                    {isSaving ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <Upload size={18} />
                    )}
                    {draftImages.length} fotoğrafı yükle
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="empty-camera empty-camera-button"
                disabled={isPreparing || isSaving || isFull}
                onClick={() => galleryInputRef.current?.click()}
                type="button"
              >
                <ImagePlus size={30} />
                <span>Sadece fotoğraf</span>
                <small>Galeriden en fazla {MAX_BATCH_PHOTOS} görsel seç</small>
              </button>
            )}
          </div>
          </>
          )}
        </section>
      )}

      {activeTab === 'gallery' && (
        <section className="gallery-view" aria-label="Ortak galeri">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spin" size={24} />
              <span>Galeri açılıyor</span>
            </div>
          ) : visiblePhotos.length ? (
            <div className="photo-grid">
              {visiblePhotos.map((photo) => {
                const isLiked = likedPhotos.includes(photo.id)

                return (
                  <article className="photo-card" key={photo.id}>
                    <img alt={`${photo.guestName} fotoğrafı`} src={photo.imageUrl} />
                    <div className="photo-meta">
                      <div>
                        <strong>{photo.guestName}</strong>
                        <span>
                          {photo.promptTitle} · {formatTime(photo.createdAt)}
                        </span>
                      </div>
                      <div className="photo-actions">
                        <button
                          aria-label="Beğen"
                          data-liked={isLiked}
                          onClick={() => void handleLike(photo)}
                          type="button"
                          className="like-btn"
                        >
                          <Heart size={17} />
                          <span>{photo.likes}</span>
                        </button>
                        {photo.guestName === guestName && (
                          <button
                            aria-label="Sil"
                            onClick={() => void handleDeletePhoto(photo)}
                            type="button"
                            className="delete-btn"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-gallery">
              <Images size={34} />
              <h2>İlk kare bekleniyor</h2>
              <button type="button" onClick={() => setActiveTab('capture')}>
                Foto ekle
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'score' && (
        <section className="score-view" aria-label="Skor tablosu">
          <div className="my-score">
            <div>
              <p className="eyebrow">Benim skor</p>
              <h2>{userRow?.score || 0}</h2>
              <span>{userRow?.uploads || 0} fotoğraf</span>
            </div>
            <Crown size={34} />
          </div>

          <div className="leaderboard">
            {leaderboard.length ? (
              leaderboard.slice(0, 8).map((row, index) => (
                <div className="leader-row" key={row.name}>
                  <strong>{index + 1}</strong>
                  <div>
                    <span>{row.name}</span>
                    <small>
                      {row.uploads} foto · {row.likes} beğeni
                    </small>
                  </div>
                  <b>{row.score}</b>
                </div>
              ))
            ) : (
              <div className="empty-score">
                <Trophy size={30} />
                <span>Skorlar ilk fotoğrafla başlar</span>
              </div>
            )}
          </div>

          <div className="mission-board">
            <div className="section-heading">
              <h2>Görev panosu</h2>
              <span>{PHOTO_PROMPTS.length} kategori</span>
            </div>
            {promptCounts.map((prompt) => (
              <button
                className="mission-item"
                key={prompt.id}
                onClick={() => {
                  setActivePromptId(prompt.id)
                  setActiveTab('capture')
                }}
                style={{ '--prompt-accent': prompt.accent } as React.CSSProperties}
                type="button"
              >
                <span>{prompt.title}</span>
                <small>{prompt.count} kare</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <nav className="bottom-tabs" aria-label="Ana gezinme">
        {TABS.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              data-active={activeTab === tab.id}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <footer className="capacity-line">
        <Clock3 size={14} />
        <span>
          {Math.max(EVENT_CONFIG.maxPhotos - visiblePhotos.length, 0)} karelik yer kaldı
        </span>
        <Users size={14} />
      </footer>

      {isSelectorOpen && (
        <div className="modal-overlay" onClick={() => setIsSelectorOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Görev Listesi</h2>
              <button className="close-modal" onClick={() => setIsSelectorOpen(false)} aria-label="Kapat">
                <X size={20} />
              </button>
            </div>
            <div className="modal-scroll-area">
              {PHOTO_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  className="modal-mission-item"
                  style={{ '--prompt-accent': prompt.accent } as React.CSSProperties}
                  onClick={() => {
                    setActivePromptId(prompt.id)
                    setIsSelectorOpen(false)
                  }}
                  type="button"
                >
                  <div className="modal-mission-info">
                    <strong>{prompt.title}</strong>
                    <span>{prompt.cue}</span>
                  </div>
                  <span className="modal-mission-points">+{prompt.points} Puan</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
