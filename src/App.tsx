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
  UserRound,
  Users,
  WifiOff,
  X,
} from 'lucide-react'
import './App.css'
import { EVENT_CONFIG, isSupabaseConfigured } from './config'
import { DEFAULT_PROMPT, PHOTO_PROMPTS } from './data/prompts'
import { prepareImage } from './lib/image'
import {
  likePhoto,
  loadPhotos,
  savePhoto,
  subscribeToPhotos,
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

const TABS: Tab[] = [
  { id: 'capture', label: 'Foto', icon: Camera },
  { id: 'gallery', label: 'Galeri', icon: Images },
  { id: 'score', label: 'Skor', icon: Trophy },
]

const GUEST_KEY = 'memory_guest_name'
const LIKED_KEY = 'memory_liked_photos'

function getLikedPhotoIds() {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]') as string[]
  } catch {
    return []
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>('capture')
  const [activePromptId, setActivePromptId] = useState(DEFAULT_PROMPT.id)
  const [guestName, setGuestName] = useState(
    () => localStorage.getItem(GUEST_KEY) || '',
  )
  const [draftName, setDraftName] = useState(guestName)
  const [draftImage, setDraftImage] = useState<PreparedImage | null>(null)
  const [photos, setPhotos] = useState<MemoryPhoto[]>([])
  const [likedPhotos, setLikedPhotos] = useState<string[]>(getLikedPhotoIds)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const activePrompt = getPromptById(activePromptId)
  const leaderboard = useMemo(() => buildLeaderboard(photos), [photos])
  const contributors = new Set(photos.map((photo) => photo.guestName)).size
  const userRow = leaderboard.find((row) => row.name === guestName)
  const isFull = photos.length >= EVENT_CONFIG.maxPhotos

  const promptCounts = useMemo(() => {
    return PHOTO_PROMPTS.map((prompt) => ({
      ...prompt,
      count: photos.filter((photo) => photo.promptId === prompt.id).length,
    }))
  }, [photos])

  useEffect(() => {
    let isMounted = true

    async function refreshPhotos() {
      try {
        const nextPhotos = await loadPhotos()
        if (isMounted) {
          setPhotos(nextPhotos)
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
    const unsubscribe = subscribeToPhotos(() => {
      void refreshPhotos()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  function saveGuestName() {
    const cleanName = draftName.trim().slice(0, 32)

    if (!cleanName) {
      setNotice('İsmini yaz, puanlar sana gelsin.')
      return
    }

    localStorage.setItem(GUEST_KEY, cleanName)
    setGuestName(cleanName)
    setNotice('Hazır. Fotoğraf sırası sende.')
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsPreparing(true)
    setNotice('')

    try {
      const prepared = await prepareImage(file)
      setDraftImage(prepared)
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : 'Fotoğraf hazırlanamadı.',
      )
    } finally {
      setIsPreparing(false)
      event.target.value = ''
    }
  }

  async function handleUpload() {
    if (!guestName) {
      setNotice('Önce ismini kaydet.')
      return
    }

    if (!draftImage) {
      setNotice('Bir fotoğraf seç.')
      return
    }

    if (isFull) {
      setNotice('Arşiv doldu. Daha fazlası için limit artırılabilir.')
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const photo = await savePhoto({
        id: crypto.randomUUID(),
        guestName,
        prompt: activePrompt,
        imageBlob: draftImage.blob,
        localDataUrl: draftImage.dataUrl,
      })

      setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)])
      setDraftImage(null)
      setActiveTab('gallery')
      setNotice(`${activePrompt.points} puan geldi.`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Fotoğraf yüklenemedi.')
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

      <section className="stats-strip" aria-label="Arşiv özeti">
        <div>
          <strong>{photos.length}</strong>
          <span>foto</span>
        </div>
        <div>
          <strong>{contributors}</strong>
          <span>konuk</span>
        </div>
        <div>
          <strong>{leaderboard[0]?.score || 0}</strong>
          <span>lider</span>
        </div>
      </section>

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
          <div className="identity-panel">
            <UserRound size={18} />
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onBlur={saveGuestName}
              placeholder="Adın"
              maxLength={32}
            />
            <button type="button" onClick={saveGuestName}>
              Kaydet
            </button>
          </div>

          <div className="prompt-track" aria-label="Foto görevleri">
            {PHOTO_PROMPTS.map((prompt) => {
              const isActive = prompt.id === activePromptId

              return (
                <button
                  className="prompt-chip"
                  data-active={isActive}
                  key={prompt.id}
                  onClick={() => setActivePromptId(prompt.id)}
                  style={{ '--prompt-accent': prompt.accent } as React.CSSProperties}
                  type="button"
                >
                  <span>{prompt.title}</span>
                  <strong>{prompt.points}</strong>
                </button>
              )
            })}
          </div>

          <div className="camera-panel">
            <div className="mission-row">
              <div>
                <p className="eyebrow">Görev</p>
                <h2>{activePrompt.title}</h2>
                <span>{activePrompt.cue}</span>
              </div>
              <div className="point-badge">
                <Target size={16} />
                {activePrompt.points}
              </div>
            </div>

            <button
              className="camera-button"
              disabled={isPreparing || isSaving || isFull}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {isPreparing ? <Loader2 className="spin" size={22} /> : <Camera size={22} />}
              <span>{draftImage ? 'Başka foto seç' : 'Foto çek veya seç'}</span>
            </button>

            <input
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />

            {draftImage ? (
              <div className="preview-frame">
                <img alt="Seçilen fotoğraf" src={draftImage.dataUrl} />
                <div>
                  <span>
                    {draftImage.width} x {draftImage.height}
                  </span>
                  <button
                    disabled={isSaving}
                    onClick={handleUpload}
                    type="button"
                  >
                    {isSaving ? (
                      <Loader2 className="spin" size={18} />
                    ) : (
                      <Upload size={18} />
                    )}
                    Yükle
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-camera">
                <ImagePlus size={30} />
                <span>Sadece fotoğraf</span>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'gallery' && (
        <section className="gallery-view" aria-label="Ortak galeri">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spin" size={24} />
              <span>Galeri açılıyor</span>
            </div>
          ) : photos.length ? (
            <div className="photo-grid">
              {photos.map((photo) => {
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
                      <button
                        aria-label="Beğen"
                        data-liked={isLiked}
                        onClick={() => void handleLike(photo)}
                        type="button"
                      >
                        <Heart size={17} />
                        <span>{photo.likes}</span>
                      </button>
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
          {Math.max(EVENT_CONFIG.maxPhotos - photos.length, 0)} karelik yer kaldı
        </span>
        <Users size={14} />
      </footer>
    </main>
  )
}

export default App
