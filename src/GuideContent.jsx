import React from 'react';
import { Info, AlertTriangle, Lightbulb, CheckCircle2, Sparkles, Smartphone, Camera, Image as ImageIcon, Target } from 'lucide-react';

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
            <li><b>Veri Yükleme:</b> .ncn veya .txt dosyalarını yükleyin.</li>
            <li><b>3D Görselleştirme:</b> Araziyi 3 boyutlu olarak inceleyin.</li>
            <li><b>Profil Modu:</b> İki nokta seçerek anlık kesit çıkarın.</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1))', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>🛸 3D Nokta Bulutu</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Drone & LiDAR:</b> Milyonlarca noktayı 3D ortamda dökün.</li>
            <li><b>Ply/Pcd Desteği:</b> Sektör standardı dosyaları sürükleyip yükleyin.</li>
            <li><b>Kot Renkleri:</b> Yüksekliğe göre otomatik renklendirilmiş arazi.</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>📸 Saha Fotoğrafları</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Konum Etiketli:</b> GPS verisi içeren fotoğrafları haritaya yerleştirin.</li>
            <li><b>İnceleme:</b> Fotoğraflar çekildikleri tam noktada ikon olarak belirir.</li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>✨ AI Saha Asistanı</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Anomali:</b> Hatalı koordinat ve kot farklarını yakalar.</li>
            <li><b>İlerleme:</b> Eski ölçümlerle kıyaslama yapar.</li>
          </ul>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>📱 Saha Modu (PWA)</h3>
          <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <li><b>Cihaza Yükle:</b> Uygulamayı ana ekrana ekleyip kullanın.</li>
            <li><b>Offline:</b> İnternet yokken verileri telefonda tutar.</li>
          </ul>
        </div>
      </div>
    </section>

    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Target size={24} color="var(--primary-color)" />
        3. Drone ve LiDAR (Point Cloud) İşlemleri
      </h2>
      <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>Geleceğin haritacılık standardı olan nokta bulutu modülünü verimli kullanmak için:</p>
        <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
          <li>Fotogrametri (Drone) veya LiDAR cihazınızdan çıkan <b>.ply</b> veya <b>.pcd</b> formatlı dosyaları hazırlayın.</li>
          <li><b>"Bulut Yükle"</b> butonu ile dosyayı seçin (Milyonlarca nokta saniyeler içinde işlenecektir).</li>
          <li>Mouse ile 3D uzayda gezinebilir, mouse wheel ile yaklaşabilirsiniz.</li>
          <li>Kot Renkleri otomatik olarak atanır; Mavi tonlar alçak, Kırmızı tonlar yüksek bölgeleri simgeler.</li>
        </ol>
        <TipBox title="Performans">
          Çok büyük veri setlerinde (1 Milyon+ nokta) akıcı performans için <b>harici ekran kartına (GPU)</b> sahip bir bilgisayar kullanmanız önerilir.
        </TipBox>
      </div>
    </section>

    <section style={{ marginBottom: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', borderBottom: '2px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        4. Ayarlar ve Yönetim
      </h2>
      <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Profil şifrenizi ve kurumsal bilgilerinizi ayarlar sekmesinden yönetebilirsiniz.</p>
      </div>
    </section>

    <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      © 2026 Muhammed BİLİCİ - Tüm Hakları Saklıdır.
    </div>
  </div>
);

export default GuideContent;
