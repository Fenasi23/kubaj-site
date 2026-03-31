import React from 'react';
import { Info, AlertTriangle, Lightbulb, CheckCircle2, Sparkles, Smartphone, Camera, Image as ImageIcon } from 'lucide-react';

const TipBox = ({ children, title = "İpucu" }) => (
  <div style={{ 
    background: 'rgba(16, 185, 129, 0.1)', 
    border: '1px solid rgba(16, 185, 129, 0.2)', 
    borderRadius: '12px', 
    padding: '1.25rem', 
    margin: '1.5rem 0',
    display: 'flex',
    gap: '12px'
  }}>
    <Lightbulb size={24} color="var(--accent-color)" style={{ flexShrink: 0 }} />
    <div>
      <div style={{ fontWeight: 800, color: 'var(--accent-color)', marginBottom: '0.25rem', fontSize: '0.85rem', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: 1.6 }}>{children}</div>
    </div>
  </div>
);

const WarningBox = ({ children, title = "Önemli" }) => (
  <div style={{ 
    background: 'rgba(239, 68, 68, 0.1)', 
    border: '1px solid rgba(239, 68, 68, 0.2)', 
    borderRadius: '12px', 
    padding: '1.25rem', 
    margin: '1.5rem 0',
    display: 'flex',
    gap: '12px'
  }}>
    <AlertTriangle size={24} color="var(--error-color)" style={{ flexShrink: 0 }} />
    <div>
      <div style={{ fontWeight: 800, color: 'var(--error-color)', marginBottom: '0.25rem', fontSize: '0.85rem', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: 1.6 }}>{children}</div>
    </div>
  </div>
);

const GuideContent = () => (
  <div className="guide-container anim-fade-in" style={{ maxWidth: '900px', margin: '0 auto', color: '#fff' }}>
    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Sistem Kullanım Kılavuzu</h1>
      <p style={{ color: 'var(--text-muted)' }}>Muhammed BİLİCİ - Harita Çözümleri Portalı</p>
    </div>

    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <CheckCircle2 size={24} color="var(--primary-color)" />
        1. Giriş ve Güvenlik
      </h2>
      <p style={{ lineHeight: 1.6, marginBottom: '1rem', color: 'var(--text-muted)' }}>
        Uygulamayı kullanmaya başlamak için yetkili kullanıcı adı ve şifrenizle giriş yapmalısınız.
      </p>
      <WarningBox>
        İlk kurulumda varsayılan bilgiler: <b>Kullanıcı: admin</b> / <b>Şifre: admin123</b>. Güvenliğiniz için lütfen ilk girişte şifrenizi Ayarlar sekmesinden güncelleyin.
      </WarningBox>
    </section>

    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Info size={24} color="var(--primary-color)" />
        2. Ana Modüller
      </h2>
      
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>📊 Kubaj Analizi</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Veri Yükleme:</b> .ncn veya .txt formatındaki koordinat dosyalarını yükleyin.</li>
            <li><b>3D Görselleştirme:</b> Araziyi 3 boyutlu olarak inceleyin ve döndürün.</li>
            <li><b>Profil Modu:</b> İki nokta seçerek anlık kesit çıkarın.</li>
            <li><b>Raporlama:</b> Resmi Kazı/Dolgu raporlarını PDF/Excel olarak alın.</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>🗺️ Parsel ve Harita</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Koordinata Git:</b> Enlem ve Boylam girerek noktayı bulun.</li>
            <li><b>Ölçüm Araçları:</b> Harita üzerinden mesafe ve alan hesabı yapın.</li>
            <li><b>Katmanlar:</b> Uydu ve Harita görünümleri arasında geçiş yapın.</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>📸 Saha Fotoğrafları</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Konum Etiketli:</b> GPS verisi içeren fotoğrafları haritaya yükleyin.</li>
            <li><b>Otomatik Yerleşim:</b> Fotoğraflar çekildikleri tam noktada belirir.</li>
            <li><b>Popup Önizleme:</b> İkonlara tıklayarak fotoğrafları büyük görün.</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Saha Asistanı</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Anomali Tespiti:</b> Hatalı veri ve ani kot farklarını bulur.</li>
            <li><b>İlerleme Analizi:</b> Mevcut işi eski hakedişlerle kıyaslar.</li>
          </ul>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>📱 Saha Modu (PWA)</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Cihaza Yükle:</b> Uygulamayı ana ekrana ekleyip kullanın.</li>
            <li><b>Offline Kayıt:</b> İnternet yokken verileri telefon hafızasında tutar.</li>
          </ul>
        </div>
      </div>
    </section>

    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Smartphone size={24} color="var(--primary-color)" />
        3. Saha Modu ve Fotoğraflar
      </h2>
      <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>Saha çalışmalarını profesyonelleştiren yeni araçlarımız:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Mobil Yükleme</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chrome veya Safari ayarlarından "Ana Ekrana Ekle" diyerek uygulamayı sahada daha hızlı kullanın.</p>
          </div>
          <div>
            <h4 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>GPS'li Fotoğraflar</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Parsel modülündeki <b>"Fotoğraf Yükle"</b> butonu ile çekilen resimleri haritaya dökün.</p>
          </div>
        </div>
        <TipBox title="Dikkat">
          Fotoğraflarınızın haritada görünmesi için çekim sırasında telefonunuzun <b>Konum Etiketleme</b> özelliğinin açık olması şarttır.
        </TipBox>
      </div>
    </section>

    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        4. Ayarlar ve Yönetim
      </h2>
      <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ color: '#fff', marginBottom: '0.5rem' }}>⚙️ Genel Ayarlar</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Profil şifrenizi ve kurumsal bilgilerinizi buradan yönetebilirsiniz.</p>
        </div>
      </div>
    </section>

    <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      © 2026 Muhammed BİLİCİ - Tüm Hakları Saklıdır.
    </div>
  </div>
);

export default GuideContent;
