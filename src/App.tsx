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
  FlipHorizontal
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
    setNotice('Harika! Görevleri tamamlamaya başla.')
  }

  function shufflePrompt() {
    const available = PHOTO_PROMPTS.filter((p) => p.id !== activePromptId)
    const random = available[Math.floor(Math.random() * available.length)]
    setActivePromptId(random.id)
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

  async function handleFlipImage() {
    if (!draftImage) return
    setIsPreparing(true)
    try {
      const flipped = await flipImageHorizontally(draftImage)
      setDraftImage(flipped)
    } catch (error) {
      setNotice('Fotoğraf çevrilemedi.')
    } finally {
      setIsPreparing(false)
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
              <div>
                <p className="eyebrow">Sıradaki Görev</p>
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

            <button
              className="camera-button"
              style={{ background: activePrompt.accent, boxShadow: `0 8px 24px ${activePrompt.accent}45` }}
              disabled={isPreparing || isSaving || isFull}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              {isPreparing ? <Loader2 className="spin" size={22} /> : <Camera size={22} />}
              <span>{draftImage ? 'Başka foto seç' : 'Görevi Tamamla!'}</span>
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
                <div className="preview-actions">
                  <button
                    className="flip-btn"
                    disabled={isPreparing || isSaving}
                    onClick={handleFlipImage}
                    type="button"
                    title="Aynala (Çevir)"
                  >
                    <FlipHorizontal size={20} />
                  </button>
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
