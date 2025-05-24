# Hatim Takip Uygulaması

Bu uygulama, takımlar halinde Kur'an-ı Kerim hatmi yapmak ve takip etmek için geliştirilmiş bir web uygulamasıdır. Kullanıcılar takımlar oluşturabilir, takımlara katılabilir ve hatim okuyuşlarını takip edebilirler.

## Özellikler

- Takım oluşturma ve yönetme
- Hatim başlatma ve sayfa takibi
- Kullanıcı davet sistemi
- Hatim ilerleme durumunu görüntüleme
- Okunmuş sayfaları işaretleme

## Kullanılan Teknolojiler

- **React**: UI bileşenleri için
- **TypeScript**: Tip güvenliği için
- **Firebase**: 
  - Authentication: Kullanıcı yönetimi
  - Firestore: Veritabanı
  - Cloud Functions: Sunucu taraflı işlemler
- **Vite**: Hızlı geliştirme deneyimi için
- **Tailwind CSS**: UI tasarımı için

## Başlangıç

### Gereksinimler

- Node.js (v18 veya üstü)
- npm veya yarn
- Firebase hesabı

### Kurulum

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/kullanici/hatim-app.git
   cd hatim-app
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Firebase projesi oluşturun:
   - [Firebase Console](https://console.firebase.google.com/)'a gidin
   - "Proje Ekle" seçeneği ile yeni bir proje oluşturun
   - Web uygulaması ekleyin (</> simgesine tıklayın)
   - Uygulama takma adı girin ve "Kaydet"e tıklayın

### Firebase Yapılandırması

1. **Firebase konsol yapılandırma bilgilerini almak için:**
   - Firebase konsolunda projenize gidin
   - Sol menüden "Proje Ayarları" (dişli çark simgesi) seçeneğine tıklayın
   - "Genel" sekmesinde aşağıya kaydırarak "Firebase SDK snippet" bölümünü bulun
   - "Config" seçeneğini seçin ve görüntülenen yapılandırma nesnesini kopyalayın

2. **Ortam değişkenlerini ayarlayın:** 
   - `.env.development.example` dosyasını `.env.development` olarak kopyalayın
   - Firebase konsolundan aldığınız yapılandırma bilgilerini aşağıdaki gibi ekleyin:
   
     ```env
     VITE_FIREBASE_API_KEY="your-api-key"
     VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
     VITE_FIREBASE_PROJECT_ID="your-project-id"
     VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
     VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
     VITE_FIREBASE_APP_ID="your-app-id"
     VITE_FIREBASE_MEASUREMENT_ID="your-measurement-id"
     ```

3. **Firebase servisleri ayarlayın:**
   - Authentication: Email/Password kimlik doğrulamasını etkinleştirin
   - Firestore Database: Veritabanı oluşturun ve kuralları ayarlayın
   - Cloud Functions: Cloud Functions servisini etkinleştirin

### Geliştirme Ortamında Çalıştırma

Development ortamını başlatmak için:
```bash
npm run dev
```

Test ortamını başlatmak için:
```bash
npm run dev:test
```

### Build İşlemleri

Production ortamı için build:
```bash
npm run build
```

Test ortamı için build:
```bash
npm run build:test
```

Geliştirme ortamı için build:
```bash
npm run build:dev
```

## Farklı Ortamlar

Bu uygulama üç farklı ortamda çalışabilir:

1. **Development (.env.development)**: Yerel geliştirme için kullanılır
2. **Test (.env.test)**: Test ortamı için kullanılır
3. **Production (.env.production)**: Canlı ortam için kullanılır

## Deploy için
Firebase Hosting kullanabilirsiniz. Firebase CLI aracını kurarak ve yapılandırarak uygulamanızı kolayca dağıtabilirsiniz.
```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

## Katkıda Bulunanlar

- Yusuf Koçak

## Teşekkürler

Bu uygulamayı kullanarak Kur'an-ı Kerim hatmi yaparken Yusuf Koçak'a hayır dualarınızda bulunmayı unutmayınız. Yapılan her hatimde payı olması dileğiyle.

## Lisans

MIT

---

Herhangi bir soru veya sorunuz varsa, lütfen bir Issue açınız.
