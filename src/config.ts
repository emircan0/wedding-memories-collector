export const EVENT_CONFIG = {
  title: import.meta.env.VITE_EVENT_TITLE || 'Rabia Mert - Nişan Hatıraları',
  subtitle:
    import.meta.env.VITE_EVENT_SUBTITLE ||
    'Bu özel günü fotoğraflar ve güzel notlarla ölümsüzleştirin',
  slug: import.meta.env.VITE_EVENT_SLUG || 'nisan',
  maxPhotos: Number(import.meta.env.VITE_MAX_PHOTOS || 300),
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
