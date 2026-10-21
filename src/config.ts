export type CoupleStoryPhoto = {
  url: string
  title: string
  subtitle: string
  tag: string
}

export const EVENT_CONFIG = {
  names: import.meta.env.VITE_EVENT_NAMES || 'İrem İlayda & Vedat',
  title: import.meta.env.VITE_EVENT_TITLE || 'İrem İlayda & Vedat - Nişan Hatıraları',
  eventTag: import.meta.env.VITE_EVENT_TAG || 'Nişan Hatıraları',
  subtitle:
    import.meta.env.VITE_EVENT_SUBTITLE ||
    'Bu özel günü fotoğraflar ve güzel notlarla ölümsüzleştirin',
  slug: import.meta.env.VITE_EVENT_SLUG || 'irem-vedat',
  maxPhotos: Number(import.meta.env.VITE_MAX_PHOTOS || 300),

  // Ana portre / profil fotoğrafı (Teklif & Yüzük anı)
  couplePhoto: '/images/couple/couple-hero.jpg',

  // Çiftin 5 Özel Hatıra Fotoğrafı & Hikayesi
  couplePhotos: [
    {
      url: '/images/couple/couple-hero.jpg',
      title: 'Sonsuza Kadar Evet! 💍',
      subtitle: 'En unutulmaz “Evet” anımız, parmağımızda aşkın simgesiyle...',
      tag: 'Teklif & Yüzük',
    },
    {
      url: '/images/couple/couple-1.jpg',
      title: 'Mutluluğa Adım Adım 💐',
      subtitle: 'Güller ve dualar eşliğinde bir ömür boyu mutluluk',
      tag: 'Kutlama',
    },
    {
      url: '/images/couple/couple-3.jpg',
      title: 'Birlikte Büyürken 🎓',
      subtitle: 'Yan yana, omuz omuza her başarıda ve her dönemeçte',
      tag: 'Mezuniyet',
    },
    {
      url: '/images/couple/couple-4.jpg',
      title: 'Zarafetle El Ele ✨',
      subtitle: 'Birlikte her an ayrı bir zarafet, her gün ayrı bir neşe',
      tag: 'Özel Gün',
    },
    {
      url: '/images/couple/couple-5.jpg',
      title: 'Gülüşümüzle Her Mevsim 🤍',
      subtitle: 'Kalplerimiz bir, gözlerimizde hiç bitmeyen sevgi',
      tag: 'Birlikte',
    },
  ] as CoupleStoryPhoto[],
}

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey:
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '',
  bucket: import.meta.env.VITE_SUPABASE_BUCKET || 'memories',
  table: import.meta.env.VITE_SUPABASE_TABLE || 'photos',
}

export const isSupabaseConfigured = Boolean(
  SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey,
)
