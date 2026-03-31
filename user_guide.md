# Muhammed BİLİCİ - Harita Çözümleri Portalı: Sıfırdan Uzmanlığa Kullanım Kılavuzu

Bu kılavuz, portalın tüm özelliklerini hiç bilmeyen bir kullanıcının bile hatasız kullanabilmesi için adım adım hazırlanmıştır.

---

## 1. BAŞLANGIÇ: Giriş ve Veri Yönetimi

Sistemi kullanmaya başlamadan önce verilerinizi nasıl organize edeceğinizi bilmelisiniz.

### 🔑 Giriş Yapma
1. Tarayıcınızdan uygulama adresine gidin.
2. Size verilen **Kullanıcı Adı** ve **Şifre** ile giriş yapın.
3. **Önemli:** İlk girişte şifrenizi sağ alttaki "Ayarlar" sekmesinden değiştirmeyi unutmayın!

### 🏢 Firma ve Proje Seçimi (En Kritik Adım!)
Uygulamanın en üstünde iki adet kutucuk göreceksiniz.
*   **Firma Seçin:** Çalıştığınız kurum veya yüklenici firmayı buradan seçin. Eğer liste boşsa, yanındaki "+" butonuna basarak yeni bir firma tanımlayın.
*   **İş/Proje Seçin:** Seçtiğiniz firmaya ait olan işi seçin. Yeni bir iş/dosya açmak için yanındaki "+" butonuna basın.
> [!IMPORTANT]
> **Neden Önemli?** Yüklediğiniz tüm kubaj verileri ve hakedişler, burada seçtiğiiz Firma ve İş altına kaydedilir. Yanlış seçim yaparsanız verileriniz karışabilir!

---

## 2. MODÜLLER VE KULLANIM ADIMLARI

### 📊 2.1 Kubaj Analizi (Hacim Hesaplama)
Arazi verilerini yükleyip Kazı ve Dolgu hacimlerini hesapladığınız bölümdür.

1. **Dosya Seçimi:** "Dosya Seç (.ncn veya .txt)" butonuna basın ve koordinatlarınızı içeren dosyayı seçin.
2. **Yükleme:** "Dosyayı Analiz Et" butonuna bastığınızda verileriniz ekrana tablo olarak dökülür.
3. **AI Analizi:** Sistem otomatik olarak noktaları tarar. Eğer büyük bir hata (kot farkı vb.) bulursa sağda mor bir kutucukta sizi uyarır.
4. **3D Görüntüleme:** Ekranın altındaki 3D panelde araziyi görebilirsiniz.
    *   **Döndürme:** Mouse sol tık ile basılı tutun.
    *   **Yakınlaşma:** Mouse tekerleğini kaydırın.
5. **Rapor Alma:** Hesaplamalar bittiğinde "PDF/Excel" butonuyla resmi raporunuzu indirin.

### 🗺️ 2.2 Parsel ve Harita
Saha çalışmalarınızı uydu görüntüsü üzerinde incelediğiniz bölümdür.

*   **Koordinata Git:** Enlem ve Boylam girip "Git" butonuna basarak dünyadaki yerinizi bulun.
*   **Mesafe Ölçümü:** "Mesafe" aracını seçip haritaya tıklayarak iki nokta arası kuş uçuşu mesafeyi görün.
*   **Alan Ölçümü:** "Alan" aracını seçip en az 3 nokta işaretleyerek kapalı alanın metrekaresini (Ha/m²) görün.
*   **KML Dışa Aktarma:** Ölçtüğünüz noktaları Google Earth'te açmak için "KML İndir" butonuna basın.

### 📸 2.3 Saha Fotoğrafları (GPS'li)
Arazide çektiğiniz resimleri haritadaki çekildikleri tam noktata görebilirsiniz.

1. **Yükleme:** "Fotoğraf Yükle (GPS)" butonuna basıp resimlerinizi seçin.
2. **Görünüm:** Harita üzerinde **Kamera** ikonları belirecektir.
3. **İnceleme:** İkona tıkladığınızda fotoğraf büyük bir önizleme penceresinde açılır.
> [!CAUTION]
> Fotoğraflarınızın haritada görünmesi için telefonunuzun **GPS (Konum)** settings (ayarlar) kısmından aktif olması şarttır!

### 🛸 2.4 3D Nokta Bulutu (Drone & LiDAR)
Drone çekimlerinden çıkan milyonlarca noktayı incelediğiniz bölümdür.

1. **Dosya:** .ply veya .pcd formatlı drone çıktınızı yükleyin.
2. **Kot Renkleri:** Sistem otomatik olarak araziyi renklendirir. Mavi bölgeler en alçak, kırmızı bölgeler en yüksek kısımlardır.

### 📜 2.5 Hakediş Yönetimi
Projelerin maliyet ve ödeme cetvellerini yönetir.

1. **Veri Bağlantısı:** Kubaj modülünde hesapladığınız her şey buraya otomatik yansır.
2. **Birim Fiyat:** Kazı ve Dolgu için birim fiyat girin, toplam tutar anlık hesaplanır.
3. **Ek Kalemler:** Liste altına "Demir", "Beton", "Nakliye" gibi ek giderleri manuel tablodan ekleyin.
4. **İmza Ayarları:** PDF raporunda görünecek yetkilileri (Hazırlayan, Kontrol Eden) alt kısımdan güncelleyin.
5. **Rapor:** Sol üstteki "Hakediş PDF İndir" butonuyla imzaya hazır belgenizi alın.

### 🏁 2.6 İş Takip ve Arşiv
Eski işlerinizi tek bir yerden yönettiğiniz merkezdir.

*   **Arama:** Üstteki kutucuğa firma veya iş adını yazarak eski kayıtları saniyeler içinde bulun.
*   **Toplu Rapor:** "Toplu Özet PDF İndir" butonuyla tüm projelerin genel durumunu tek bir kağıtta görün.

### 🔄 2.7 Format Dönüştürücü
Netcad ve AutoCAD arası dosya trafik merkezidir.

*   `.ncn` → `.dxf` (Nokta verilerini AutoCAD'e aktarır)
*   `.dxf` → `.ncn` (AutoCAD çizimindeki noktaları ayıkladır)
*   `.ncz` → `.ncn` (Çizim dosyasından koordinatları çeker)

---

## 3. SAHA MODU (PWA): İnternetsiz Çalışma

Arazide internetin çekmediği anlarda uygulamayı kullanmaya devam edin.

1. **Telefona Yükleme:**
    *   **Android:** Chrome'da sağ üstteki "⋮" -> "Uygulamayı Yükle" deyin.
    *   **iPhone:** Safari'de "Paylaş (↑)" -> "Ana Ekrana Ekle" deyin.
2. **Offline Kayıt:** İnternet yokken hakediş veya parsel sorgulama yapabilirsiniz. Tüm veriler telefon hafızasına kaydedilir.
3. **Senkronizasyon:** İnternetin geldiği ilk an, telefon sistemine kaydedilen her şey otomatik olarak sunucuya gönderilir. Sizin bir şey yapmanıza gerek yoktur!

---

## 4. AYARLAR VE GÜVENLİK
*   **Şifre:** Güvenliğiniz için "Profil" sekmesinden şifrenizi güncelleyin.
*   **Logo:** Kurumsal sekmesinden firmanızın logosunu yükleyin, tüm PDF'lerde logonuz otomatik çıkar.

---
> [!TIP]
> **Uzman Tavsiyesi:** 3D modüllerinde (Kubaj ve Nokta Bulutu) en akıcı deneyim için bilgisayarınızda **Harici Ekran Kartı (GPU)** olması önerilir. Tavsiye edilen tarayıcı: **Google Chrome**.

© 2026 Muhammed BİLİCİ - Harita Çözümleri
