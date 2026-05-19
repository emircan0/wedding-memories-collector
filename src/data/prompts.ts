import type { PhotoPrompt } from '../types'

export const PHOTO_PROMPTS: PhotoPrompt[] = [
  {
    id: 'first-smile',
    title: 'Gecenin İlk Gülüşü',
    cue: 'Mekana girerken yüzünde kocaman bir gülümseme olan bir konuğu yakala.',
    points: 15,
    accent: '#FF2D55', // Apple Pink
  },
  {
    id: 'ring-detail',
    title: 'Göz Alıcı Yüzük',
    cue: 'Işığın yüzükte parladığı o kusursuz makro detayı çek.',
    points: 20,
    accent: '#007AFF', // Apple Blue
  },
  {
    id: 'table-story',
    title: 'Masa Estetiği',
    cue: 'Kadehler, çiçekler ve mumlarla masanın en estetik kompozisyonunu bul.',
    points: 10,
    accent: '#5856D6', // Apple Purple
  },
  {
    id: 'crew-shot',
    title: 'Efsane Kadro',
    cue: 'En az 5 kişinin kameraya bakıp çılgınca poz verdiği o anı yakala.',
    points: 25,
    accent: '#FF9500', // Apple Orange
  },
  {
    id: 'family-frame',
    title: 'Aile Bağları',
    cue: 'Aile büyüklerinden birinin, çiftle sarıldığı o duygusal anı bul.',
    points: 30,
    accent: '#34C759', // Apple Green
  },
  {
    id: 'dance-floor',
    title: 'Pistin Hakimi',
    cue: 'Pistte kendini müziğin ritmine en çok kaptıran kişiyi hareket halinde çek.',
    points: 25,
    accent: '#FF3B30', // Apple Red
  },
  {
    id: 'tiny-chaos',
    title: 'Tatlı Telaş',
    cue: 'Arka planda koşturan bir garson, devrilmek üzere olan bir bardak veya komik bir aksilik.',
    points: 15,
    accent: '#AF52DE', // Apple Purple
  },
  {
    id: 'best-selfie',
    title: 'Kusursuz Özçekim',
    cue: 'Işığın en iyi olduğu yeri bul ve günün en havalı selfiesini çek.',
    points: 15,
    accent: '#5AC8FA', // Apple Light Blue
  },
  {
    id: 'hidden-emotion',
    title: 'Gizli Gözyaşı',
    cue: 'Tören sırasında duygulanıp gözlerini silen birini kameraya fark ettirmeden yakala.',
    points: 35,
    accent: '#FF2D55', 
  },
  {
    id: 'cake-moment',
    title: 'Tatlı Bekleyiş',
    cue: 'Pasta kesilmeden hemen önce pastaya iştahla bakan birini çek.',
    points: 10,
    accent: '#FF9500', 
  },
  {
    id: 'cheers',
    title: 'Şerefe!',
    cue: 'Havada tokuşan kadehleri tam zamanında, net bir şekilde çek.',
    points: 20,
    accent: '#FFCC00', // Apple Yellow
  },
  {
    id: 'kids-rule',
    title: 'Çocukların Krallığı',
    cue: 'Pistte etrafta koşuşturan veya kendi dünyasında oynayan bir çocuk.',
    points: 15,
    accent: '#34C759', 
  },
  {
    id: 'shoe-game',
    title: 'Gecenin Ayakkabısı',
    cue: 'Salondaki en şık veya en ilginç ayakkabıyı (veya topukluyu) bul.',
    points: 10,
    accent: '#8E8E93', // Apple Gray
  },
  {
    id: 'mirror-check',
    title: 'Ayna Ayna',
    cue: 'Makyajını, saçını veya kravatını düzelten birini hazırlıksız yakala.',
    points: 15,
    accent: '#007AFF', 
  },
  {
    id: 'tired-feet',
    title: 'Pes Edenler',
    cue: 'Topukluları çıkarıp kenara koyan veya yorgunluktan sandalyeye çöken biri.',
    points: 20,
    accent: '#FF3B30', 
  },
  {
    id: 'dj-vibe',
    title: 'DJ ve Ritim',
    cue: 'DJ veya müzisyenlerin en coşkulu olduğu anı fotoğrafla.',
    points: 15,
    accent: '#5856D6', 
  },
  {
    id: 'kiss',
    title: 'Romantik An',
    cue: 'Gecenin çiftinin (veya başka bir çiftin) romantik bir bakışmasını yakala.',
    points: 30,
    accent: '#FF2D55', 
  },
  {
    id: 'food-lover',
    title: 'Gurme',
    cue: 'Yemeğini veya tatlısını büyük bir keyifle yiyen bir konuk.',
    points: 10,
    accent: '#FF9500', 
  },
]

export const DEFAULT_PROMPT = PHOTO_PROMPTS[0]
