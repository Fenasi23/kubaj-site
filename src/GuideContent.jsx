import React from 'react';
import { 
  Info, AlertTriangle, Lightbulb, CheckCircle2, Sparkles, 
  Smartphone, Camera, Image as ImageIcon, Target, BarChart3, 
  MapIcon, FileCheck, LayoutDashboard, RefreshCw, Settings, 
  BookOpen, ChevronRight, HardHat, Building2, Pencil 
} from 'lucide-react';

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

const SectionHeader = ({ icon: Icon, title, color = "var(--primary-color)" }) => (
  <h2 style={{ 
    fontSize: '1.5rem', 
    borderBottom: '2px solid var(--glass-border)', 
    paddingBottom: '0.75rem', 
    marginBottom: '2rem', 
    marginTop: '3rem',
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px' 
  }}>
    <Icon size={28} color={color} />
    {title}
  </h2>
);

const GuideContent = () => (
  <div className="guide-container anim-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', color: '#fff', paddingBottom: '5rem' }}>
    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
      <div style={{ 
        display: 'inline-flex', 
        padding: '1rem', 
        borderRadius: '24px', 
        background: 'rgba(59, 130, 246, 0.1)', 
        marginBottom: '1.5rem' 
      }}>
        <BookOpen size={48} color="var(--primary-color)" />
      </div>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-1px' }}>Portal Kullanım El Kitabı</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Muhammed BİLİCİ - Harita Çözümleri İçin Adım Adım Rehber</p>
    </div>

    <section>
      <SectionHeader icon={HardHat} title="1. Başlangıç ve Veri Temelleri" />
      <p style={{ lineHeight: 1.8, marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
        Portalın en önemli kuralı şudur: <b>Her şey seçtiğiniz Firma ve İş başlığı altına kaydedilir.</b>
      </p>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h4 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>🏢 Firma Yönetimi</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            En üstteki listeden çalıştığınız firmayı seçin. Yeni bir firma eklemek için "+" butonuna basıp ismini yazmanız yeterlidir.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>📁 İş/Proje Yönetimi</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Verilerinizi (NCN, Hakediş vb.) yüklemeden önce doğru proje ismini seçtiğinizden emin olun. Yeni bir proje için "+" butonuna basın.
          </p>
        </div>
      </div>
      <WarningBox title="Veri Güvenliği">
        Yanlış firma altında veri yüklerseniz, hakediş raporlarınızda yanlış isimler çıkabilir. Lütfen yükleme yapmadan önce üst paneli kontrol edin.
      </WarningBox>
    </section>

    <section>
      <SectionHeader icon={BarChart3} title="2. Kubaj Analizi (Hacim Hesaplama)" />
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
           Nasıl Yapılır?
        </h3>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0 }}>
          <li style={{ display: 'flex', gap: '15px' }}>
            <span style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>1</span>
            <div><b>Dosya Hazırla:</b> Koordinatlarınızın .ncn veya .txt (No, Y, X, Z) formatında olduğundan emin olun.</div>
          </li>
          <li style={{ display: 'flex', gap: '15px' }}>
            <span style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>2</span>
            <div><b>Yükle:</b> "Dosya Seç" butonuyla veriyi seçin ve saniyeler içinde analizi bitirin.</div>
          </li>
          <li style={{ display: 'flex', gap: '15px' }}>
            <span style={{ minWidth: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900 }}>3</span>
            <div><b>3D İncele:</b> Mouse sol tık ile araziyi çevirin, tekerlek ile yakınlaşın.</div>
          </li>
        </ul>
      </div>
      <TipBox title="Yapay Zeka (AI) Desteği">
        Sisteme yüklediğiniz her veri otomatik taranır. Eğer arazide ani bir çukur veya hatalı bir kot varsa mor renkli AI paneli sizi uyaracaktır.
      </TipBox>
    </section>

    <section>
      <SectionHeader icon={MapIcon} title="3. Parsel, Harita ve Saha Fotoğrafları" color="var(--accent-color)" />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card">
          <h4 style={{ marginBottom: '1rem' }}>📍 Konum ve Ölçüm</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            "Mesafe" veya "Alan" aracını seçip haritaya tıklayın. Ölçümler otomatik hesaplanır. Google Earth için "KML İndir" butonunu kullanın.
          </p>
        </div>
        <div className="glass-card">
          <h4 style={{ marginBottom: '1rem' }}>📸 GPS'li Fotoğraflar</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Arazide çektiğiniz fotoğrafları "Fotoğraf Yükle" butonuyla yükleyin. Haritadaki kamera ikonlarına tıklayarak o anki durumu görebilirsiniz.
          </p>
        </div>
      </div>
    </section>

    <section>
      <SectionHeader icon={Target} title="4. 3D Nokta Bulutu (Drone & LiDAR)" color="#6366f1" />
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))' }}>
        <p style={{ marginBottom: '1.5rem', lineHeight: 1.8 }}>
          Drone çıktısı olan <b>.ply</b> veya <b>.pcd</b> dosyalarını yüklediğinizde, arazi kot farklarına göre otomatik renklendirilir.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 800 }}>MAVİ = ALÇAK KOT</span>
          <span style={{ padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.2)', color: 'var(--error-color)', fontSize: '0.75rem', fontWeight: 800 }}>KIRMIZI = YÜKSEK KOT</span>
        </div>
      </div>
    </section>

    <section>
      <SectionHeader icon={FileCheck} title="5. Hakediş ve Resmi Raporlama" color="#f59e0b" />
      <div className="glass-card">
        <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li><b>Birim Fiyat Girin:</b> Kazı-Dolgu tutarlarının yanındaki kutucuklara fiyatları yazın.</li>
          <li><b>Manuel İşler:</b> Alt kısımdaki boş satırlara ek kalemlerinizi (Demir, Beton vb.) ekleyin.</li>
          <li><b>İmza Bilgileri:</b> PDF'de kimin ismi çıkacaksa alt kısımdaki imza alanlarını güncelleyin.</li>
          <li><b>PDF İndir:</b> "Hakediş PDF İndir" butonuna basın. Belgeniz imzaya hazırdır.</li>
        </ol>
      </div>
    </section>

    <section>
      <SectionHeader icon={Smartphone} title="6. Saha Modu (PWA) Kurulumu" />
      <div className="glass-card" style={{ border: '1px dashed var(--primary-color)' }}>
        <h4 style={{ marginBottom: '1rem' }}>Nasıl Yüklenir?</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            <div style={{ fontWeight: 800, marginBottom: '5px' }}>Android (Chrome)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>"⋮" -&gt; "Uygulamayı YÜKLE"</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
            <div style={{ fontWeight: 800, marginBottom: '5px' }}>iPhone (Safari)</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>"↑" -&gt; "Ana Ekrana EKLE"</div>
          </div>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 700 }}>
          🛸 İnternet yokken yaptığınız tüm işlemler, internet geldiğinde otomatik sunucuya yüklenir!
        </p>
      </div>
    </section>

    <div style={{ 
      marginTop: '5rem', 
      textAlign: 'center', 
      padding: '3rem', 
      borderTop: '1px solid var(--glass-border)',
      background: 'rgba(255,255,255,0.01)'
    }}>
      <Sparkles size={32} color="#f59e0b" style={{ marginBottom: '1.5rem' }} />
      <h3 style={{ marginBottom: '1rem' }}>Haritacılıkta Geleceğin Çözümü</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Bu portal, saha mühendislerinin iş akışını profesyonelleştirmek için tasarlanmıştır. <br/>
        Sorularınız ve destek için bize her zaman ulaşabilirsiniz.
      </p>
      <div style={{ marginTop: '2rem', fontSize: '0.85rem', fontWeight: 700 }}>
        © 2026 MUHAMMED BİLİCİ - TÜM HAKLARI SAKLIDIR.
      </div>
    </div>
  </div>
);

export default GuideContent;
