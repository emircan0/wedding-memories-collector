import type { PhotoPrompt } from '../types'

export const PHOTO_PROMPTS: PhotoPrompt[] = [
  // --- 1. Temel & Serbest Anlar ---
  {
    id: 'free-style',
    title: 'Serbest Kare & Anı',
    cue: 'Herhangi bir kategoriye bağlı kalmadan, günün sana özel en güzel ve doğal anını özgürce paylaş!',
    points: 10,
    accent: '#7E7265',
  },
  {
    id: 'tebrik-dilek',
    title: 'Tebrik & Dilek Notu',
    cue: 'Çiftimize ömür boyu mutluluklar dileyen en içten tebrik mesajını ve geleceğe dair güzel dileklerini bırak.',
    points: 15,
    accent: '#C95F72',
  },

  // --- 2. Nişan Töreni & Geleneksel Anlar ---
  {
    id: 'nisan-yuzuk',
    title: 'Yüzükler & Kurdele',
    cue: 'Parmağa takılan alyansların ve kurdele kesiminin o en ışıltılı, heyecan dolu karesini yakala.',
    points: 30,
    accent: '#B88E3E',
  },
  {
    id: 'tuzlu-kahve',
    title: 'Tuzlu Kahve Sınavı',
    cue: 'Damadın kahveyi yudumlarken yüzündeki o tatlı tebessüm ve unutulmaz hafif telaş anını çek!',
    points: 30,
    accent: '#C47842',
  },
  {
    id: 'makas-kesmiyor',
    title: 'Makas Kesmiyor!',
    cue: 'Kurdele kesilirken yapılan geleneksel bahşiş pazarlığının o neşeli ve gülümseten anını ölümsüzleştir.',
    points: 25,
    accent: '#A6823B',
  },
  {
    id: 'nisan-tepsisi',
    title: 'Nişan Tepsisi & Çiçekler',
    cue: 'Aynalı tepsi, gümüş makas, kahve fincanı veya nişan çiçeğinin en zarif detayını kadraja al.',
    points: 20,
    accent: '#4E654C',
  },
  {
    id: 'nisan-pastasi',
    title: 'Nişan Pastası & İlk Dilim',
    cue: 'Pasta kesilirken veya birbirlerine ikram edilirken çiftin yüzündeki mutluluğu fotoğrafla.',
    points: 25,
    accent: '#C95F72',
  },
  {
    id: 'nisan-hediyelik',
    title: 'Günün Hatırası & Hediyelikler',
    cue: 'Bu özel gün için hazırlanan hediyelik, çikolata, mum veya masa süslemelerinden şık bir detay yakala.',
    points: 15,
    accent: '#7E7265',
  },

  // --- 3. Romantik & Özel Çift Kareleri ---
  {
    id: 'ilk-dans',
    title: 'İlk Dansın Zarafeti',
    cue: 'Çiftin piste çıktığı, göz göze dans ettiği o büyüleyici ve romantik dakikaları yakala.',
    points: 30,
    accent: '#B88E3E',
  },
  {
    id: 'ask-dolu-bakis',
    title: 'Aşk Dolu Bir Bakış',
    cue: 'Kalabalığın içinde çiftin birbirine sevgiyle, içtenlikle baktığı o samimi ve derin bakışma.',
    points: 25,
    accent: '#C95F72',
  },
  {
    id: 'taki-tebrik',
    title: 'Tebrik & Sarılma Anı',
    cue: 'Yüzükler takıldıktan sonra sevdiklerinin çifti tebrik edip kucakladığı o sıcacık dakikalar.',
    points: 20,
    accent: '#4E654C',
  },

  // --- 4. Aile & Duygusal Anlar ---
  {
    id: 'aile-tablosu',
    title: 'Büyük Aile Tablosu',
    cue: 'Anne, baba ve kardeşlerin çiftle bir araya gelip gururla gülümsediği o kıymetli aile karesi.',
    points: 35,
    accent: '#3A4B5A',
  },
  {
    id: 'buyuklerin-duasi',
    title: 'Büyüklerin Hayır Duası',
    cue: 'Aile büyüklerinin ellerinin öpüldüğü, sarılıp dua edildiği o en saygın ve duygusal an.',
    points: 30,
    accent: '#B88E3E',
  },
  {
    id: 'dunurler-sohbet',
    title: 'İki Aile Bir Arada',
    cue: 'Dünürlerin ve aile büyüklerinin yan yana gelip samimiyetle sohbet ettiği o tatlı birliktelik.',
    points: 25,
    accent: '#4E654C',
  },
  {
    id: 'kusaklar-bulusmasi',
    title: 'Kuşakların Buluşması',
    cue: 'Ailenin en minik üyesi ile en tecrübeli aile büyüğünün aynı karede buluştuğu sıcacık an.',
    points: 30,
    accent: '#5D755B',
  },

  // --- 5. Arkadaşlar & Neşeli Kutlama ---
  {
    id: 'gelin-tayfasi',
    title: 'Gelin & En Yakınları',
    cue: 'Gelinin nedimeleri ve en yakın arkadaşlarıyla çektirdiği o ışıltılı, neşeli grup pozu.',
    points: 25,
    accent: '#C95F72',
  },
  {
    id: 'damat-ekibi',
    title: 'Damat & Arkadaş Grubu',
    cue: 'Damadın dostlarıyla bir araya gelip verdiği o en keyifli, havalı ve enerjik poz.',
    points: 25,
    accent: '#3A4B5A',
  },
  {
    id: 'pistin-yildizi',
    title: 'Pistin Yıldızı',
    cue: 'Müziğin ritmine kendini kaptırıp dans pistinde enerjisiyle ortama neşe katan konuğu çek.',
    points: 25,
    accent: '#C47842',
  },
  {
    id: 'halay-birligi',
    title: 'Coşkulu Halay & Alkışlar',
    cue: 'Mendili sallayan halay başını veya ritim tutan neşeli kalabalığı ölümsüzleştir.',
    points: 25,
    accent: '#B88E3E',
  },
  {
    id: 'masanin-nesesi',
    title: 'Masanın En Keyiflileri',
    cue: 'Sofrada kahkahalarla sohbete dalmış, günün tadını çıkaran neşeli bir grubu kadraja al.',
    points: 20,
    accent: '#4E654C',
  },

  // --- 6. Doğal, Samimi & Şık Kareler ---
  {
    id: 'habersiz-dogal',
    title: 'Haberden Uzak, Doğal Gülüş',
    cue: 'Kameraya poz vermeden, o anın güzelliğiyle içten bir kahkaha atan veya tebessüm eden biri.',
    points: 20,
    accent: '#5D755B',
  },
  {
    id: 'gunun-en-siklari',
    title: 'Günün Şıklığı',
    cue: 'Kıyafeti, zarafeti ve özeniyle bu özel güne yakışır şekilde şık duran bir konuk detayı.',
    points: 20,
    accent: '#B88E3E',
  },
  {
    id: 'tatli-telas',
    title: 'Kulis & Tatlı Telaş',
    cue: 'Tören öncesi veya aralarda saçını, kravatını düzeltenlerin o sevimli hazırlık telaşı.',
    points: 15,
    accent: '#7E7265',
  },
  {
    id: 'veda-ve-yorgunluk',
    title: 'Mutlu Bir Günün Sonu',
    cue: 'Etkinlik tamamlanırken sarılmalar, tatlı bir yorgunluk ve akılda kalan güzel hatıralar.',
    points: 20,
    accent: '#3A4B5A',
  },
]

export const DEFAULT_PROMPT = PHOTO_PROMPTS[0]
