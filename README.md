# Rabia Mert - Nişan Hatıraları & Dijital Anı Defteri

QR kod ile açılan, mobil öncelikli interaktif fotoğraf arşivi ve anı defteri. Konuklar isimlerini yazar, nişandan fotoğraflar yükler, çifte özel tebrik/dilek notları bırakır; herkes ortak galeriyi, anı defterini ve oyunlaştırılmış skor tablosunu görür.

## Öne Çıkan Özellikler

- 📸 **Nişana Özel Fotoğraf Görevleri:** Tuzlu Kahve Sınavı, Yüzükler & Kurdele, Makas Kesmiyor, Nişan Tepsisi vb. 20 adet eğlenceli görev.
- 💌 **Dijital Anı Defteri (Not Yazma):** Fotoğraf yüklerken çifte özel tebrik notu ekleyebilme ya da fotoğrafsız doğrudan sadece tebrik/dilek notu yazabilme (otomatik şık dijital hatıra kartpostalı üretilir).
- 🖼️ **Tam Ekran Lightbox:** Fotoğrafları ve yazılan notları büyük boyutta inceleme, tek tıkla cihaza kaydetme.
- 🏆 **Skor & Liderlik Tablosu:** Görev puanları ve beğeni sistemi ile konukları anı yakalamaya teşvik eden oyunlaştırma.
- 📥 **Hatıra Defteri İndirme:** Etkinlik sonunda tüm konukların yazdığı tebrik notlarını tek tıkla arşiv metin dosyası olarak dışa aktarma.
- ⚡ **Offline & Demo Desteği:** Supabase olmasa bile yerel IndexedDB ile anında çalışır; internet kesintisinde verileri korur.

## Çalıştırma

```bash
npm install
npm run dev
```

Supabase ayarları yoksa uygulama demo modunda IndexedDB ile aynı cihazda çalışır. Gerçek etkinlik için `.env.example` dosyasını `.env.local` olarak kopyalayıp Supabase bilgilerini doldurun.

## Supabase Kurulumu

1. [Supabase](https://supabase.com) üzerinde bir proje oluşturun.
2. SQL Editor içinde `supabase/schema.sql` dosyasını çalıştırın.
   *(Mevcut veritabanınız varsa sadece `alter table public.photos add column if not exists note text;` çalıştırmanız yeterlidir).*
3. Project Settings > API ekranından URL ve anon/publishable key değerlerini `.env.local` dosyasına ekleyin.
4. Uygulamayı Vercel, Netlify veya Cloudflare Pages üzerine deploy edin.
5. Deploy URL'ini masa kartları veya davetiyeler için QR koda çevirin.

## Ortam Değişkenleri (.env.local)

```bash
VITE_EVENT_TITLE="Rabia Mert - Nişan Hatıraları"
VITE_EVENT_SUBTITLE="Bu özel günü fotoğraflar ve güzel notlarla ölümsüzleştirin"
VITE_EVENT_SLUG="nisan"
VITE_MAX_PHOTOS="300"

VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-or-publishable-key"
VITE_SUPABASE_BUCKET="memories"
VITE_SUPABASE_TABLE="photos"
```
