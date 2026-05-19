import type { PhotoPrompt } from '../types'

export const PHOTO_PROMPTS: PhotoPrompt[] = [
  {
    id: 'first-smile',
    title: 'İlk gülüş',
    cue: 'Yakalanan samimi bir gülüş',
    points: 10,
    accent: '#e85d75',
  },
  {
    id: 'ring-detail',
    title: 'Yüzük detayı',
    cue: 'Yakın plan, ışık güzelken',
    points: 16,
    accent: '#0f9f8f',
  },
  {
    id: 'table-story',
    title: 'Masa hikayesi',
    cue: 'Çiçek, kahve, tatlı veya küçük detay',
    points: 12,
    accent: '#d99a20',
  },
  {
    id: 'crew-shot',
    title: 'Ekip pozu',
    cue: 'Arkadaş grubu tam kadro',
    points: 14,
    accent: '#4f7cff',
  },
  {
    id: 'family-frame',
    title: 'Aile karesi',
    cue: 'Sıcak, net, saklamalık',
    points: 20,
    accent: '#8b5cf6',
  },
  {
    id: 'dance-floor',
    title: 'Pist anı',
    cue: 'Hareketli ve canlı bir kare',
    points: 18,
    accent: '#ef7d31',
  },
  {
    id: 'tiny-chaos',
    title: 'Tatlı telaş',
    cue: 'Hazırlık veya beklenmeyen komik an',
    points: 15,
    accent: '#ca3f8f',
  },
  {
    id: 'best-selfie',
    title: 'Selfie meydanı',
    cue: 'En iyi konuk selfiesi',
    points: 12,
    accent: '#138a45',
  },
]

export const DEFAULT_PROMPT = PHOTO_PROMPTS[0]
