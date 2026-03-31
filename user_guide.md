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

*   **Veri Yükleme:** `.ncn` veya `.txt` formatındaki koordinat dosyalarınızı (Nokta No, X, Y, Z_Mevcut, Z_Proje) yükleyerek analizi başlatın.
*   **3D Görselleştirme:** Mevcut ve proje kotları arasındaki farkı 3D olarak inceleyebilir, fare ile döndürerek detaylı bakabilirsiniz.
*   **Profil Modu:** İki nokta seçerek bu noktalar arasındaki kesiti (profil) anlık olarak görebilirsiniz.
*   **Raporlama:** Hesaplanan Kazı/Dolgu hacimlerini PDF veya Excel formatında "Resmi Rapor" olarak indirebilirsiniz.

### 🗺️ Parsel ve Harita

Konum tabanlı sorgulama ve haritalama modülüdür.

*   **Koordinata Git:** Belirlediğiniz Enlem/Boylam değerlerini girerek harita üzerinde tam konumu görebilirsiniz.
*   **Mesafe ve Alan Ölçümü:** Harita üzerindeki "Ölçüm Araçları" ile noktalar koyarak mesafe ve alan hesabı yapabilirsiniz.
*   **KML Dışa Aktarma:** Ölçtüğün alanı veya hattı Google Earth uyumlu `.kml` formatında indirebilirsin.
*   **Katman Kontrolü:** "Google Uydu", "Hibrit" veya "OpenStreetMap" katmanları arasında geçiş yapabilirsiniz.

### 📜 Hakediş Yönetimi

Projelerin finansal hesaplamalarını ve resmi hakediş belgelerini yönetir.

*   **Otomatik Veri Çekme:** Kubaj Analizindeki hacim sonuçları buraya otomatik yansır.
*   **Birim Fiyat:** İşin birim fiyatını girerek toplam hakediş tutarını hesaplayabilirsiniz.
*   **Manuel Kalemler:** Analiz dışındaki ek işleri (nakliye, demir vb.) tabloya manuel ekleyebilirsiniz.
*   **İmza Alanları:** PDF raporunda görünecek "Hazırlayan" ve "Kontrol Eden" bilgilerini düzenleyebilirsiniz.

### ✨ AI Saha Asistanı (Yapay Zeka Analizi)

Sistem, yüklenen her veriyi akıllı algoritmalarla denetleyerek sizi uyarır.

*   **Anomali Tespiti:** Koordinat yüklemelerinde ardışık noktalar arasında aşırı kot farkı (örn: 5m+) varsa "Anomali Tespiti" uyarısı verir.
*   **İlerleme Takibi:** Yeni bir hacim hesaplandığında, arşivdeki eski versiyonlarla kıyaslama yaparak ilerleme hızını raporlar.
*   **Fiyat Denetimi:** Hakediş tablosundaki maliyet ve miktar sapmalarını analiz ederek bütçe kontrolü sağlar.

### 📂 İş Takip ve Arşiv Paneli

Tüm firmalara ait tüm projeleri tek bir merkezden görmenizi sağlar.

*   **Merkezi Liste:** Hangi firmanın hangi işinde ne kadar hacim yapıldığını özet olarak görün.
*   **Hızlı Arama:** İş adına veya firma adına göre anlık filtreleme yapın.
*   **Toplu Özet PDF:** Tüm projelerin listesini içeren tek bir toplu rapor oluşturun.

---

## 3. Ayarlar ve Yönetim

### ⚙️ Genel Ayarlar

*   **Profil:** Kendi kullanıcı şifrenizi güncelleyebilirsiniz.
*   **Kurumsal:** Firma logonuzu yükleyebilir, imzalarda görünecek varsayılan isimleri tanımlayabilirsiniz.

### 🛡️ Admin Paneli (Yalnızca Yöneticiler)

*   **Kullanıcı Yönetimi:** Yeni personel ekleyebilir veya mevcut kullanıcıları silebilirsiniz.
*   **Giriş Logları:** Sisteme kimlerin giriş denemesi yaptığını IP ve tarih bilgisiyle takip edebilirsiniz.

---

> [!TIP]
> **Firma ve İş Yönetimi:** Üst menüde bulunan seçicilerden yeni firma oluşturabilir, her firmanın altına sınırsız sayıda proje ekleyerek verilerinizi düzenli tutabilirsiniz.
