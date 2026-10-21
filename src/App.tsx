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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MessageSquareQuote,
  FileText,
  BookHeart,
} from 'lucide-react'
import './App.css'
import { EVENT_CONFIG, isSupabaseConfigured } from './config'
import { DEFAULT_PROMPT, PHOTO_PROMPTS } from './data/prompts'
import { prepareImage, flipImageHorizontally, createNoteCardImage } from './lib/image'
import {
  likePhoto,
  loadPhotos,
  savePhoto,
  subscribeToPhotos,
  deletePhoto,
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
  note?: string | null
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
  { id: 'capture', label: 'Foto & Not', icon: Camera },
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
    note: row.note || null,
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
  const [draftNote, setDraftNote] = useState('')
  const [isNoteOnlyModalOpen, setIsNoteOnlyModalOpen] = useState(false)
  const [standaloneNote, setStandaloneNote] = useState('')
  const [activeModalPhoto, setActiveModalPhoto] = useState<MemoryPhoto | null>(null)
  const [isCoupleModalOpen, setIsCoupleModalOpen] = useState(false)
  const [selectedCouplePhotoIdx, setSelectedCouplePhotoIdx] = useState(0)
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'photos' | 'notes'>('all')

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

  const filteredPhotos = useMemo(() => {
    if (galleryFilter === 'notes') {
      return visiblePhotos.filter((p) => Boolean(p.note?.trim()))
    }
    if (galleryFilter === 'photos') {
      return visiblePhotos.filter((p) => p.promptId !== 'tebrik-dilek')
    }
    return visiblePhotos
  }, [galleryFilter, visiblePhotos])

  const totalNotesCount = useMemo(
    () => visiblePhotos.filter((p) => Boolean(p.note?.trim())).length,
    [visiblePhotos],
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
              current.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p)),
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
      setNotice('İsmini yaz, puanlar ve notlar sana gelsin.')
      return
    }

    localStorage.setItem(GUEST_KEY, cleanName)
    setGuestName(cleanName)
    setNotice('Harika! Anı biriktirmeye ve not bırakmaya başlayabilirsin.')
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
        setNotice(`${preparedImages.length} fotoğraf hazır. Dilersen bir not da ekleyebilirsin.`)
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
      setNotice('Bir fotoğraf seç veya sadece not yaz.')
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
    const noteContent = draftNote.trim() || null

    try {
      for (const [index, image] of draftImages.entries()) {
        try {
          const photo = await savePhoto({
            id: crypto.randomUUID(),
            guestName,
            prompt: activePrompt,
            note: noteContent,
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
      setDraftNote('')
      setActiveTab('gallery')
      setNotice(
        `${uploadedPhotos.length} anı paylaşıldı. ${uploadedPhotos.length * activePrompt.points} puan kazandın! 🎉`,
      )
    } catch {
      setNotice('Fotoğraf yüklenemedi.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveStandaloneNote() {
    if (!guestName) {
      setNotice('Önce ismini kaydet.')
      return
    }

    const cleanNote = standaloneNote.trim()
    if (!cleanNote) {
      setNotice('Lütfen bir tebrik veya anı notu yaz.')
      return
    }

    setIsSaving(true)
    setNotice('')

    try {
      const noteCard = await createNoteCardImage(guestName, cleanNote)
      const notePrompt =
        PHOTO_PROMPTS.find((p) => p.id === 'tebrik-dilek') || activePrompt

      const photo = await savePhoto({
        id: crypto.randomUUID(),
        guestName,
        prompt: notePrompt,
        note: cleanNote,
        imageBlob: noteCard.blob,
        localDataUrl: noteCard.dataUrl,
      })

      setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)])
      setStandaloneNote('')
      setIsNoteOnlyModalOpen(false)
      setActiveTab('gallery')
      setNotice(`Tebrik notun anı defterine eklendi! +${notePrompt.points} puan kazandın. 💌✨`)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Not kaydedilemedi.')
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

    if (activeModalPhoto?.id === photo.id) {
      setActiveModalPhoto((current) =>
        current ? { ...current, likes: current.likes + 1 } : null,
      )
    }

    try {
      const updated = await likePhoto(photo)
      setPhotos((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      if (activeModalPhoto?.id === updated.id) {
        setActiveModalPhoto(updated)
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Beğeni kaydedilemedi.')
    }
  }

  async function handleDeletePhoto(photo: MemoryPhoto) {
    if (photo.guestName !== guestName) {
      setNotice('Sadece kendi yüklediğin fotoğrafları silebilirsin.')
      return
    }

    if (!window.confirm('Bu anıyı silmek istediğinize emin misiniz?')) return

    if (activeModalPhoto?.id === photo.id) {
      setActiveModalPhoto(null)
    }

    rememberHiddenPhoto(photo.id)
    setPhotos((current) => current.filter((item) => item.id !== photo.id))

    try {
      await deletePhoto(photo)
      setNotice('Anı galeriden kaldırıldı.')
    } catch {
      setNotice('Anı bu cihazda gizlendi; database güncellenemedi.')
    }
  }

  function exportGuestbook() {
    const notes = visiblePhotos
      .filter((p) => Boolean(p.note?.trim()))
      .map((p) => `• [${p.guestName} - ${formatTime(p.createdAt)}]\n  "${p.note}"`)
      .join('\n\n')

    const content = `=====================================================
${EVENT_CONFIG.title}
DİJİTAL ANILAR & TEBRİK DEFTERİ
=====================================================
Etkinlik: ${EVENT_CONFIG.title}
Toplam Fotoğraf & Hatıra: ${visiblePhotos.length}
Yazılan Not Sayısı: ${totalNotesCount}
Oluşturulma: ${new Date().toLocaleString('tr-TR')}

-----------------------------------------------------
KONUKLARIN TEBRİK & DİLEK NOTLARI:
-----------------------------------------------------

${notes || 'Henüz not yazılmamış.'}

=====================================================
${EVENT_CONFIG.title} ve sevdiklerine bir ömür boyu mutluluklar dileriz!
=====================================================
`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${EVENT_CONFIG.slug}-tebrik-ve-anilar.txt`
    a.click()
    URL.revokeObjectURL(url)
    setNotice('Tüm anı ve tebrik notları indirildi! 📥')
  }

  async function handleDownloadPhoto(url: string, filename: string) {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      setNotice('Fotoğraf başarıyla indirildi! 📥')
    } catch {
      window.open(url, '_blank')
    }
  }

  return (
    <main className="app-shell">
      <header className="wedding-hero-header">
        <div className="header-top-bar">
          <div className="sync-pill" aria-label="Bağlantı durumu">
            {isSupabaseConfigured ? <CheckCircle2 size={14} /> : <WifiOff size={14} />}
            <span>{isSupabaseConfigured ? 'Canlı Anı Defteri' : 'Demo'}</span>
          </div>
          <span className="event-date-badge">💍 {EVENT_CONFIG.eventTag || 'Nişan Hatıraları'}</span>
        </div>

        <div className="hero-arch-card">
          <button
            type="button"
            className="couple-portrait-btn"
            onClick={() => setIsCoupleModalOpen(true)}
            aria-label="Çiftin Albümünü Görüntüle"
            title="Çiftin Fotoğraflarını Gör"
          >
            <img
              src={EVENT_CONFIG.couplePhoto || '/images/couple-placeholder.jpg'}
              alt={EVENT_CONFIG.names || EVENT_CONFIG.title}
              className="couple-portrait-img"
            />
            <span className="couple-badge-sparkle">
              <Sparkles size={13} />
            </span>
          </button>

          <p className="hero-eyebrow">ÖMÜR BOYU BİRLİKTE</p>
          <h1 className="hero-title">{EVENT_CONFIG.names || EVENT_CONFIG.title}</h1>

          <div className="royal-divider">
            <span className="royal-divider-line" />
            <span className="royal-divider-ornament">✧ ❀ ✧</span>
            <span className="royal-divider-line" />
          </div>

          <p className="hero-subtitle">{EVENT_CONFIG.subtitle}</p>

          {/* Çiftin Hikaye Şeridi (Love Story Highlights Bar) */}
          <div className="couple-stories-bar">
            <div className="stories-bar-header">
              <span className="stories-bar-title">✨ Bizim Hikayemiz</span>
              <button
                type="button"
                className="stories-all-btn"
                onClick={() => {
                  setSelectedCouplePhotoIdx(0)
                  setIsCoupleModalOpen(true)
                }}
              >
                Albümü Gör ({EVENT_CONFIG.couplePhotos.length})
              </button>
            </div>
            <div className="stories-scroll">
              {EVENT_CONFIG.couplePhotos.map((item, idx) => (
                <button
                  key={item.url}
                  type="button"
                  className={`story-pill-card ${idx === selectedCouplePhotoIdx ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCouplePhotoIdx(idx)
                    setIsCoupleModalOpen(true)
                  }}
                  title={item.title}
                >
                  <div className="story-thumb-wrap">
                    <img src={item.url} alt={item.title} />
                  </div>
                  <span className="story-pill-tag">{item.tag}</span>
                </button>
              ))}
            </div>
          </div>
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
        <section className="capture-view" aria-label="Fotoğraf ve Not Yükleme">
          {!guestName ? (
            <div className="welcome-panel">
              <div className="welcome-icon">
                <Camera size={34} />
              </div>
              <h2>Anı Biriktirmeye Başla</h2>
              <p>Fotoğrafların, tebrik notların ve puanların sana yazılsın diye adını gir</p>
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
                <button
                  type="button"
                  onClick={() => {
                    setGuestName('')
                    setDraftName('')
                  }}
                  aria-label="İsmi Değiştir"
                >
                  <Edit2 size={16} />
                </button>
              </div>

              <div className="camera-panel">
                <div className="mission-row">
                  <div
                    className="mission-info-clickable"
                    onClick={() => setIsSelectorOpen(true)}
                    role="button"
                    tabIndex={0}
                  >
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
                    <button
                      className="shuffle-btn"
                      type="button"
                      onClick={shufflePrompt}
                      aria-label="Görevi Değiştir"
                    >
                      <Dices size={20} />
                    </button>
                  </div>
                </div>

                <div className="capture-actions">
                  <button
                    className="camera-button"
                    style={{
                      background: activePrompt.accent,
                      boxShadow: `0 8px 24px ${activePrompt.accent}45`,
                    }}
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

                <button
                  type="button"
                  className="quick-note-action-btn"
                  onClick={() => setIsNoteOnlyModalOpen(true)}
                >
                  <BookHeart size={18} />
                  <span>Fotoğrafsız Sadece Tebrik & Dilek Notu Yaz</span>
                </button>

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

                    <div className="draft-note-box">
                      <div className="draft-note-header">
                        <MessageSquareQuote size={16} />
                        <span>Anı veya Tebrik Notun (İsteğe Bağlı)</span>
                      </div>
                      <textarea
                        className="draft-note-textarea"
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        placeholder="Örn: İrem'cim bir ömür boyu mutluluklar, harika görünüyorsunuz! 💍✨"
                        maxLength={300}
                        rows={2}
                      />
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
                    <span>Fotoğraf Seç veya Not Bırak</span>
                    <small>Galeriden en fazla {MAX_BATCH_PHOTOS} görsel seçebilirsin</small>
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'gallery' && (
        <section className="gallery-view" aria-label="Ortak Galeri ve Anı Defteri">
          <div className="gallery-header-strip">
            <div className="gallery-filter-bar">
              <button
                type="button"
                className="gallery-filter-pill"
                data-active={galleryFilter === 'all'}
                onClick={() => setGalleryFilter('all')}
              >
                Tümü ({visiblePhotos.length})
              </button>
              <button
                type="button"
                className="gallery-filter-pill"
                data-active={galleryFilter === 'photos'}
                onClick={() => setGalleryFilter('photos')}
              >
                Fotoğraflar
              </button>
              <button
                type="button"
                className="gallery-filter-pill"
                data-active={galleryFilter === 'notes'}
                onClick={() => setGalleryFilter('notes')}
              >
                💌 Notlar ({totalNotesCount})
              </button>
            </div>

            <button
              type="button"
              className="gallery-add-note-btn"
              onClick={() => setIsNoteOnlyModalOpen(true)}
            >
              <BookHeart size={15} />
              <span>+ Not Yaz</span>
            </button>
          </div>

          {/* Çiftin Özel Köşesi Kartı */}
          <div
            className="couple-gallery-spotlight"
            onClick={() => {
              setSelectedCouplePhotoIdx(0)
              setIsCoupleModalOpen(true)
            }}
          >
            <div className="spotlight-left">
              <span className="spotlight-badge">💍 Çiftin Özel Albümü</span>
              <h3>İrem İlayda & Vedat</h3>
              <p>5 Özel Hatıra Fotoğrafı · Dokun ve İncele</p>
            </div>
            <div className="spotlight-thumbs-stack">
              {EVENT_CONFIG.couplePhotos.slice(0, 3).map((item, i) => (
                <div key={item.url} className={`stack-thumb stack-${i}`}>
                  <img src={item.url} alt="" />
                </div>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="spin" size={24} />
              <span>Galeri ve anılar yükleniyor...</span>
            </div>
          ) : filteredPhotos.length ? (
            <div className="photo-grid">
              {filteredPhotos.map((photo) => {
                const isLiked = likedPhotos.includes(photo.id)

                return (
                  <article
                    className="photo-card"
                    key={photo.id}
                    onClick={() => setActiveModalPhoto(photo)}
                  >
                    <div className="photo-card-media-wrap">
                      <img
                        alt={`${photo.guestName} anısı`}
                        src={photo.imageUrl}
                        loading="lazy"
                      />
                      {photo.note && (
                        <span className="photo-has-note-badge" title="Tebrik notu var">
                          <MessageSquareQuote size={12} />
                        </span>
                      )}
                    </div>

                    {photo.note && (
                      <div className="photo-card-note-strip">
                        <p className="photo-card-note-text">“{photo.note}”</p>
                      </div>
                    )}

                    <div className="photo-meta" onClick={(e) => e.stopPropagation()}>
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
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleLike(photo)
                          }}
                          type="button"
                          className="like-btn"
                        >
                          <Heart size={17} />
                          <span>{photo.likes}</span>
                        </button>
                        {photo.guestName === guestName && (
                          <button
                            aria-label="Sil"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDeletePhoto(photo)
                            }}
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
              <h2>Henüz anı eklenmedi</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '4px 0 16px' }}>
                İlk fotoğrafı veya tebrik notunu sen ekle!
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button type="button" onClick={() => setActiveTab('capture')}>
                  Fotoğraf Ekle
                </button>
                <button
                  type="button"
                  style={{ background: '#E85D75', color: 'white' }}
                  onClick={() => setIsNoteOnlyModalOpen(true)}
                >
                  Not Bırak
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'score' && (
        <section className="score-view" aria-label="Skor tablosu">
          <div className="my-score">
            <div>
              <p className="eyebrow">Benim Skor</p>
              <h2>{userRow?.score || 0}</h2>
              <span>{userRow?.uploads || 0} anı paylaştın</span>
            </div>
            <Crown size={34} />
          </div>

          <div className="guestbook-export-banner">
            <div className="export-info">
              <strong>Hatıra Defteri Arşivi</strong>
              <small>{visiblePhotos.length} anı ve {totalNotesCount} tebrik notu birikti</small>
            </div>
            <button type="button" onClick={exportGuestbook} className="export-download-btn">
              <FileText size={16} />
              <span>Notları İndir</span>
            </button>
          </div>

          <div className="leaderboard">
            <div className="section-heading">
              <h2>Liderlik Tablosu</h2>
              <span>En çok anı biriktirenler</span>
            </div>
            {leaderboard.length ? (
              leaderboard.slice(0, 8).map((row, index) => (
                <div className="leader-row" key={row.name}>
                  <strong>{index + 1}</strong>
                  <div>
                    <span>{row.name}</span>
                    <small>
                      {row.uploads} anı · {row.likes} beğeni
                    </small>
                  </div>
                  <b>{row.score}</b>
                </div>
              ))
            ) : (
              <div className="empty-score">
                <Trophy size={30} />
                <span>Skorlar ilk anıyla başlar</span>
              </div>
            )}
          </div>

          <div className="mission-board">
            <div className="section-heading">
              <h2>Görev Panosu</h2>
              <span>{PHOTO_PROMPTS.length} eğlenceli görev</span>
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
          {Math.max(EVENT_CONFIG.maxPhotos - visiblePhotos.length, 0)} anılık yer kaldı
        </span>
        <Users size={14} />
      </footer>

      {/* Görev Seçim Modalı */}
      {isSelectorOpen && (
        <div className="modal-overlay" onClick={() => setIsSelectorOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Görev Listesi</h2>
              <button
                className="close-modal"
                onClick={() => setIsSelectorOpen(false)}
                aria-label="Kapat"
              >
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

      {/* Sadece Tebrik / Dilek Notu Yaz Modalı */}
      {isNoteOnlyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNoteOnlyModalOpen(false)}>
          <div
            className="modal-content note-composer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookHeart size={22} color="#E85D75" />
                <h2 style={{ margin: 0 }}>Tebrik & Dilek Notu Yaz</h2>
              </div>
              <button
                className="close-modal"
                onClick={() => setIsNoteOnlyModalOpen(false)}
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            <p className="note-modal-subtitle">
              Çifte en içten tebriklerini ve dileklerini yaz. Notun dijital hatıra kartı olarak anı defterine eklenecektir!
            </p>

            <textarea
              className="note-composer-textarea"
              value={standaloneNote}
              onChange={(e) => setStandaloneNote(e.target.value)}
              placeholder="Örn: Sevgili İrem & Vedat, bu güzel günde mutluluğunuza ortak olmaktan çok mutluyuz. Bir ömür boyu hep böyle sevgiyle kalın! 💍❤️"
              maxLength={300}
              rows={4}
              autoFocus
            />

            <div className="note-composer-footer">
              <span className="char-count">{standaloneNote.length}/300</span>
              <button
                type="button"
                className="submit-note-btn"
                disabled={isSaving || !standaloneNote.trim()}
                onClick={handleSaveStandaloneNote}
              >
                {isSaving ? (
                  <Loader2 className="spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                <span>Hatıra Kartı Olarak Gönder (+15 Puan)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tam Ekran Fotoğraf & Not Lightbox Modalı */}
      {activeModalPhoto && (
        <div
          className="modal-overlay lightbox-overlay"
          onClick={() => setActiveModalPhoto(null)}
        >
          <div
            className="modal-content lightbox-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lightbox-header">
              <div className="lightbox-author-meta">
                <strong>{activeModalPhoto.guestName}</strong>
                <span>
                  {activeModalPhoto.promptTitle} · {formatTime(activeModalPhoto.createdAt)}
                </span>
              </div>
              <button
                className="close-modal"
                onClick={() => setActiveModalPhoto(null)}
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="lightbox-image-box">
              <img
                src={activeModalPhoto.imageUrl}
                alt={`${activeModalPhoto.guestName} anısı`}
              />
            </div>

            {activeModalPhoto.note && (
              <div className="lightbox-note-box">
                <span className="lightbox-quote-glyph">“</span>
                <p className="lightbox-note-text">{activeModalPhoto.note}</p>
                <span className="lightbox-quote-glyph right">”</span>
              </div>
            )}

            <div className="lightbox-footer">
              <button
                type="button"
                className="like-btn lightbox-like-btn"
                data-liked={likedPhotos.includes(activeModalPhoto.id)}
                onClick={() => void handleLike(activeModalPhoto)}
              >
                <Heart size={18} />
                <span>{activeModalPhoto.likes} Beğeni</span>
              </button>

              <button
                type="button"
                className="lightbox-download-btn"
                onClick={() =>
                  void handleDownloadPhoto(
                    activeModalPhoto.imageUrl,
                    `nisan-hatirasi-${activeModalPhoto.id}.jpg`,
                  )
                }
              >
                <Download size={16} />
                <span>Fotoğrafı Kaydet</span>
              </button>

              {activeModalPhoto.guestName === guestName && (
                <button
                  type="button"
                  className="lightbox-delete-btn"
                  onClick={() => void handleDeletePhoto(activeModalPhoto)}
                  aria-label="Anıyı Sil"
                  title="Anıyı Sil"
                >
                  <Trash2 size={16} />
                  <span>Sil</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Çiftin Fotoğraf Albümü Modalı */}
      {isCoupleModalOpen && (() => {
        const currentCouplePhoto =
          EVENT_CONFIG.couplePhotos[selectedCouplePhotoIdx] || EVENT_CONFIG.couplePhotos[0]
        const totalCouplePhotos = EVENT_CONFIG.couplePhotos.length

        return (
          <div
            className="modal-overlay couple-modal-overlay"
            onClick={() => setIsCoupleModalOpen(false)}
          >
            <div
              className="modal-content couple-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="couple-modal-header">
                <div className="couple-modal-title-group">
                  <span className="couple-modal-tag">💍 Nişan Hatıraları</span>
                  <h2>{EVENT_CONFIG.names || EVENT_CONFIG.title}</h2>
                </div>
                <button
                  type="button"
                  className="close-modal"
                  onClick={() => setIsCoupleModalOpen(false)}
                  aria-label="Kapat"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="couple-modal-gallery">
                <img
                  src={currentCouplePhoto.url}
                  alt=""
                  className="couple-modal-blur-bg"
                  aria-hidden="true"
                />
                <img
                  src={currentCouplePhoto.url}
                  alt={currentCouplePhoto.title}
                  className="couple-modal-main-img"
                />

                {totalCouplePhotos > 1 && (
                  <>
                    <button
                      type="button"
                      className="couple-nav-btn prev"
                      onClick={() =>
                        setSelectedCouplePhotoIdx((p) =>
                          p > 0 ? p - 1 : totalCouplePhotos - 1,
                        )
                      }
                      aria-label="Önceki Fotoğraf"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      className="couple-nav-btn next"
                      onClick={() =>
                        setSelectedCouplePhotoIdx((p) =>
                          p < totalCouplePhotos - 1 ? p + 1 : 0,
                        )
                      }
                      aria-label="Sonraki Fotoğraf"
                    >
                      <ChevronRight size={22} />
                    </button>
                    <span className="couple-counter-badge">
                      {selectedCouplePhotoIdx + 1} / {totalCouplePhotos}
                    </span>
                  </>
                )}
              </div>

              {/* Fotoğraf Başlığı ve Notu */}
              <div className="couple-photo-caption-card">
                <span className="couple-photo-pill">{currentCouplePhoto.tag}</span>
                <h3 className="couple-photo-caption-title">{currentCouplePhoto.title}</h3>
                <p className="couple-photo-caption-desc">{currentCouplePhoto.subtitle}</p>
              </div>

              {/* Küçük Resimler (Thumbnails) */}
              {totalCouplePhotos > 1 && (
                <div className="couple-photo-thumbnails">
                  {EVENT_CONFIG.couplePhotos.map((item, idx) => (
                    <button
                      key={item.url}
                      type="button"
                      className={`thumb-btn ${idx === selectedCouplePhotoIdx ? 'active' : ''}`}
                      onClick={() => setSelectedCouplePhotoIdx(idx)}
                      title={item.title}
                    >
                      <img src={item.url} alt={item.title} />
                    </button>
                  ))}
                </div>
              )}

              <div className="couple-modal-body">
                <p className="couple-quote">
                  “Bir ömür boyu sürecek güzel bir yolculuğun en tatlı başlangıcında,
                  bu mutlu günümüzde yanımızda olan tüm sevdiklerimize teşekkür ederiz.”
                </p>
                <div className="couple-modal-footer-actions">
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadPhoto(
                        currentCouplePhoto.url,
                        `irem-vedat-${selectedCouplePhotoIdx + 1}.jpg`,
                      )
                    }
                    className="lightbox-download-btn"
                  >
                    <Download size={15} />
                    <span>Fotoğrafı Kaydet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </main>
  )
}

export default App
