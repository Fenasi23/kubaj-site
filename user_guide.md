# Muhammed BİLİCİ - Harita Çözümleri Portalı Kullanıcı Kılavuzu

Bu belge, portalda yer alan modüllerin işlevlerini ve nasıl verimli kullanılacağını açıklamaktadır.

---

## 1. Giriş ve Güvenlik

Uygulamayı kullanmaya başlamak için kullanıcı adı ve şifrenizle giriş yapmalısınız.

> [!IMPORTANT]
> İlk kurulumda varsayılan bilgiler: **Kullanıcı:** `admin` / **Şifre:** `admin123`. Lütfen ilk girişte şifrenizi Ayarlar sekmesinden değiştirin.

---

## 2. Modüller

### 📊 Kubaj Analizi

Hacim hesaplamaları ve arazi modellemesi için kullanılan ana modüldür.

*   **Veri Yükleme:** `.ncn` veya `.txt` formatındaki koordinat dosyalarını yükleyerek analizi başlatın.
*   **3D Görselleştirme:** Mevcut ve proje kotları arasındaki farkı 3D olarak inceleyin.
*   **AI Asistanı:** Hatalı kot farklarını ve ilerleme hızını otomatik analiz eder.

### 🛸 3D Nokta Bulutu (Drone & LiDAR)

Geleceğin haritacılık standardı olan milyonlarca noktalı veri setlerini inceleme modülüdür.

*   **Dosya Desteği:** Drone çıktısı olan **.ply** ve LiDAR çıktısı olan **.pcd** dosyalarını yükleyin.
*   **Yüksek Performans:** GPU (Ekran Kartı) kullanarak milyonlarca noktayı 3D ortamda dökün.
*   **Kot Renklendirme:** Araziyi yüksekliğe göre (Mavi -> Kırmızı) otomatik renklendirilmiş şekilde görün.
*   **Navigasyon:** Mouse ile 3D uzayda özgürce gezinin, yaklaşın ve detayları inceleyin.

### 🗺️ Parsel ve Harita

Konum tabanlı sorgulama ve haritalama modülüdür.

*   **Koordinata Git:** Belirlediğiniz Enlem/Boylam değerlerini girerek konumu bulun.
*   **Ölçüm Araçları:** Mesafe ve alan hesabı yapın, KML olarak indirin.
*   **Saha Fotoğrafları:** GPS'li fotoğrafları haritaya yükleyin.

### 📸 Saha Fotoğrafları (GPS)

Arazide çektiğiniz fotoğrafları harita üzerinde çekildikleri tam noktata görebilirsiniz.

*   **Yükleme:** Parsel modülündeki **"Fotoğraf Yükle (GPS)"** butonu ile fotoğrafları seçin.
*   **İnceleme:** İkona tıkladığınızda fotoğraf büyük bir önizleme penceresinde açılır.

### 📱 Saha Modu ve Çevrimdışı Çalışma (PWA)

İnternetin çekmediği durumlar için uygulama **PWA** desteği ile donatılmıştır.

*   **Telefona Yükleme:** Tarayıcıdan "Ana Ekrana Ekle" diyerek portalı uygulama olarak kullanın.
*   **Offline Kayıt:** İnternet yokken yapılan kayıtlar telefon hafızasında tutulur.

---

## 3. Ayarlar ve Yönetim

*   **Şifre İşlemleri:** Profil sekmesinden şifrenizi güncelleyebilirsiniz.
*   **Kurumsal:** Firma logosunu ve imza yetkililerini düzenleyebilirsiniz.

---

> [!TIP]
> **Donanım Önerisi:** 3D Nokta Bulutu modülünde milyonlarca noktayı akıcı izlemek için harici ekran kartına (GPU) sahip cihazlar kullanmanızı öneririz.
