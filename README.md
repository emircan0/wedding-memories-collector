# Nişan Hatıraları

QR ile açılan, mobil öncelikli fotoğraf arşivi. Konuklar isimlerini yazar, sadece fotoğraf yükler, herkes ortak galeriyi ve skor tablosunu görür.

## Çalıştırma

```bash
npm install
npm run dev
```

Supabase ayarları yoksa uygulama demo modunda IndexedDB ile aynı cihazda çalışır. Gerçek etkinlik için `.env.example` dosyasını `.env.local` olarak kopyalayıp Supabase bilgilerini doldur.

## Supabase kurulumu

1. Supabase projesi oluştur.
2. SQL Editor içinde `supabase/schema.sql` dosyasını çalıştır.
3. Project Settings > API ekranından URL ve anon key değerlerini `.env.local` dosyasına ekle.
4. Uygulamayı Vercel veya Netlify'a deploy et.
5. Deploy URL'ini QR koda çevir.

Fotoğraflar tarayıcıda en uzun kenar 1600 px olacak şekilde JPEG'e çevrilir. Bu, 200 civarı fotoğraf için depolama ve mobil yükleme hızını makul tutar.

## Ortam değişkenleri

```bash
VITE_EVENT_TITLE="Nişan Hatıraları"
VITE_EVENT_SUBTITLE="Bu geceyi konukların gözünden topla"
VITE_EVENT_SLUG="nisan"
VITE_MAX_PHOTOS="220"
VITE_SUPABASE_URL="https://..."
VITE_SUPABASE_ANON_KEY="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_BUCKET="memories"
VITE_SUPABASE_TABLE="photos"
```

Supabase'in Vite ekranında verdiği `VITE_SUPABASE_PUBLISHABLE_KEY` değerini kullanabilirsin. Eski anon key adıyla gelen projeler için `VITE_SUPABASE_ANON_KEY` de destekleniyor; ikisinden biri yeterli.

`VITE_EVENT_SLUG` değerini değiştirirsen `supabase/schema.sql` içindeki `nisan` klasör/policy koşullarını da aynı slug ile güncelle.
