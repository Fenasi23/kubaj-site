import React, { useState, useCallback, useEffect } from 'react';
import { 
  Upload, TreePine, Map as MapIcon, 
  Waves, Coffee, Baby, Dumbbell, Download, 
  Settings2, Layers, Move, Plus, Trash2, Image as ImageIcon,
  Sparkles, Loader2
} from 'lucide-react';
import WebCAD from './WebCAD';

const LandscapeArchitect = () => {
  const [sketchImage, setSketchImage] = useState(null);
  const [roadWidth, setRoadWidth] = useState(7); // default 7m
  const [sidewalkWidth, setSidewalkWidth] = useState(2); // default 2m
  const [cadEntities, setCadEntities] = useState([]);
  const [activeTool, setActiveTool] = useState('none');
  const [isTracing, setIsTracing] = useState(false);
  const [placementMode, setPlacementMode] = useState(null); // Yeni eklenti

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setPlacementMode(null);
  }, []);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleAutoTrace = () => {
    if (!sketchImage) return alert("Önce bir eskiz yükleyin.");
    setIsTracing(true);
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // UI güncellemesi için bir tick bekle, sonra ağır hesaplamaya başla
      setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        const maxWidth = 1000;
        const sc = Math.min(1, maxWidth / img.width);
        const w = Math.floor(img.width * sc);
        const h = Math.floor(img.height * sc);
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        const data = ctx.getImageData(0, 0, w, h).data;
        const cadW = 1000;
        const cadH = cadW * (h / w);
        
        // ===== ADIM 1: Gri tonlama =====
        const gray = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
          const idx = i * 4;
          gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2]);
        }
        
        // ===== ADIM 1.5: Gauss Bulanıklaştırma (kağıt dokusunu yok et) =====
        const blurred = new Uint8Array(w * h);
        for (let y = 2; y < h-2; y++) {
          for (let x = 2; x < w-2; x++) {
            let sum = 0, cnt = 0;
            for (let ky = -2; ky <= 2; ky++) {
              for (let kx = -2; kx <= 2; kx++) {
                sum += gray[(y+ky)*w + (x+kx)];
                cnt++;
              }
            }
            blurred[y*w+x] = Math.round(sum / cnt);
          }
        }
        
        // ===== ADIM 2: Adaptif Eşikleme =====
        const integral = new Float64Array((w+1) * (h+1));
        for (let y = 0; y < h; y++) {
          let rowSum = 0;
          for (let x = 0; x < w; x++) {
            rowSum += blurred[y * w + x];
            integral[(y+1) * (w+1) + (x+1)] = integral[y * (w+1) + (x+1)] + rowSum;
          }
        }
        
        const binary = new Uint8Array(w * h);
        const blockHalf = 25; // Daha geniş pencere (51x51)
        const C = 25; // Çok daha katı: sadece gerçek kalem çizgileri geçer
        
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const x1 = Math.max(0, x - blockHalf);
            const y1 = Math.max(0, y - blockHalf);
            const x2 = Math.min(w - 1, x + blockHalf);
            const y2 = Math.min(h - 1, y + blockHalf);
            const count = (x2 - x1 + 1) * (y2 - y1 + 1);
            const sum = integral[(y2+1)*(w+1)+(x2+1)] - integral[y1*(w+1)+(x2+1)]
                      - integral[(y2+1)*(w+1)+x1] + integral[y1*(w+1)+x1];
            const mean = sum / count;
            binary[y * w + x] = (blurred[y * w + x] < mean - C) ? 1 : 0;
          }
        }
        
        // ===== ADIM 3: Güçlü Gürültü Temizleme =====
        const cleaned = new Uint8Array(w * h);
        for (let y = 1; y < h-1; y++) {
          for (let x = 1; x < w-1; x++) {
            if (binary[y*w+x] === 0) continue;
            let nb = 0;
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++)
                if (!(dy === 0 && dx === 0) && binary[(y+dy)*w+(x+dx)] === 1) nb++;
            cleaned[y*w+x] = nb >= 3 ? 1 : 0; // En az 3 komşu gerekli
          }
        }
        
        // ===== ADIM 4: Zhang-Suen İskelet İncelme =====
        // Kalın çizgileri tek piksel genişliğine indirir
        const skel = new Uint8Array(cleaned);
        
        const getN = (x, y) => [
          skel[(y-1)*w+x],     // P2 (kuzey)
          skel[(y-1)*w+(x+1)], // P3
          skel[y*w+(x+1)],     // P4 (doğu)
          skel[(y+1)*w+(x+1)], // P5
          skel[(y+1)*w+x],     // P6 (güney)
          skel[(y+1)*w+(x-1)], // P7
          skel[y*w+(x-1)],     // P8 (batı)
          skel[(y-1)*w+(x-1)]  // P9
        ];
        
        const transitions = (n) => {
          let c = 0;
          for (let i = 0; i < 8; i++) if (n[i] === 0 && n[(i+1)%8] === 1) c++;
          return c;
        };
        
        const sumArr = (n) => n.reduce((a, b) => a + b, 0);
        
        let changed = true;
        let maxIter = 50; // Sonsuz döngüyü engelle
        while (changed && maxIter-- > 0) {
          changed = false;
          
          // Alt-iterasyon 1
          const rem1 = [];
          for (let y = 1; y < h-1; y++) {
            for (let x = 1; x < w-1; x++) {
              if (skel[y*w+x] === 0) continue;
              const n = getN(x, y);
              const B = sumArr(n);
              if (B < 2 || B > 6) continue;
              if (transitions(n) !== 1) continue;
              if (n[0]*n[2]*n[4] !== 0) continue; // P2*P4*P6
              if (n[2]*n[4]*n[6] !== 0) continue; // P4*P6*P8
              rem1.push(y*w+x);
            }
          }
          for (const idx of rem1) { skel[idx] = 0; changed = true; }
          
          // Alt-iterasyon 2
          const rem2 = [];
          for (let y = 1; y < h-1; y++) {
            for (let x = 1; x < w-1; x++) {
              if (skel[y*w+x] === 0) continue;
              const n = getN(x, y);
              const B = sumArr(n);
              if (B < 2 || B > 6) continue;
              if (transitions(n) !== 1) continue;
              if (n[0]*n[2]*n[6] !== 0) continue; // P2*P4*P8
              if (n[0]*n[4]*n[6] !== 0) continue; // P2*P6*P8
              rem2.push(y*w+x);
            }
          }
          for (const idx of rem2) { skel[idx] = 0; changed = true; }
        }
        
        // ===== ADIM 5: İskelet Üzerinde Zincir Takibi =====
        const edgePoints = [];
        for (let y = 1; y < h-1; y++) {
          for (let x = 1; x < w-1; x++) {
            if (skel[y*w+x] === 1) {
              edgePoints.push({
                px: x, py: y,
                cadX: (x / w) * cadW - (cadW / 2),
                cadY: -((y / h) * cadH - (cadH / 2))
              });
            }
          }
        }
        
        const used = new Set();
        const polylines = [];
        const maxChainDist = 3;
        
        // Grid-tabanlı hızlı arama
        const gs = 4;
        const grid = {};
        edgePoints.forEach((p, i) => {
          const key = `${Math.floor(p.px/gs)},${Math.floor(p.py/gs)}`;
          if (!grid[key]) grid[key] = [];
          grid[key].push(i);
        });
        
        const findNext = (px, py, exc) => {
          const gx = Math.floor(px / gs), gy = Math.floor(py / gs);
          let best = -1, bestD = maxChainDist * maxChainDist;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const cell = grid[`${gx+dx},${gy+dy}`];
              if (!cell) continue;
              for (const idx of cell) {
                if (used.has(idx) || exc.has(idx)) continue;
                const d = (edgePoints[idx].px-px)**2 + (edgePoints[idx].py-py)**2;
                if (d < bestD) { bestD = d; best = idx; }
              }
            }
          }
          return best;
        };
        
        for (let i = 0; i < edgePoints.length; i++) {
          if (used.has(i)) continue;
          used.add(i);
          const chain = [edgePoints[i]];
          const cSet = new Set([i]);
          let cur = edgePoints[i];
          while (true) {
            const nx = findNext(cur.px, cur.py, cSet);
            if (nx === -1) break;
            used.add(nx); cSet.add(nx);
            chain.push(edgePoints[nx]);
            cur = edgePoints[nx];
          }
          if (chain.length >= 10) polylines.push(chain); // Kısa gürültü zincirlerini at
        }
        
        // ===== ADIM 6: Douglas-Peucker Sadeleştirme =====
        const ptDist = (p, a, b) => {
          const dx = b.cadX-a.cadX, dy = b.cadY-a.cadY;
          const len2 = dx*dx+dy*dy;
          if (len2 === 0) return Math.hypot(p.cadX-a.cadX, p.cadY-a.cadY);
          const t = Math.max(0, Math.min(1, ((p.cadX-a.cadX)*dx+(p.cadY-a.cadY)*dy)/len2));
          return Math.hypot(p.cadX-(a.cadX+t*dx), p.cadY-(a.cadY+t*dy));
        };
        
        const simplify = (pts, tol) => {
          if (pts.length <= 2) return pts;
          let mxD = 0, mxI = 0;
          for (let i = 1; i < pts.length-1; i++) {
            const d = ptDist(pts[i], pts[0], pts[pts.length-1]);
            if (d > mxD) { mxD = d; mxI = i; }
          }
          if (mxD > tol) {
            const l = simplify(pts.slice(0, mxI+1), tol);
            const r = simplify(pts.slice(mxI), tol);
            return l.slice(0,-1).concat(r);
          }
          return [pts[0], pts[pts.length-1]];
        };
        
        const result = polylines.map(pl => simplify(pl, 1.5));
        
        // ===== ADIM 7: CAD Objeleri Olarak Ekle =====
        if (result.length > 0) {
          const ents = result.map(pl => ({
            id: Date.now() + '_' + Math.random().toString(36).substr(2),
            type: 'line',
            points: pl.map(p => ({ x: +p.cadX.toFixed(2), y: +p.cadY.toFixed(2) })),
            layerId: '0',
            color: '#facc15'
          }));
          setCadEntities(prev => [...prev, ...ents]);
        } else {
          alert("Çizim algılanamadı. Lütfen daha belirgin hatları olan bir eskiz yükleyin.");
        }
        setIsTracing(false);
      }, 50);
    };
    img.src = sketchImage;
  };

  const handleSketchUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSketchImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addLandscapeObject = (subType) => {
    const w = prompt('Lütfen projedeki En/Genişlik ölçüsünü (metre cinsinden) girin:', '10');
    if (!w) return;
    
    let h = w;
    if (subType !== 'pool') {
      const respH = prompt('Lütfen projedeki Boy/Yükseklik ölçüsünü (metre cinsinden) girin:', '10');
      if (!respH) return;
      h = respH;
    }
    
    setPlacementMode({ 
      id: Date.now().toString(),
      type: 'landscape', 
      subType, 
      w: parseFloat(w), 
      h: parseFloat(h),
      layerId: 'landscape' 
    });
  };

  const landscapeTools = [
    { id: 'pool', label: 'Yüzme Havuzu', icon: <Waves size={18} />, color: '#0ea5e9' },
    { id: 'park', label: 'Çocuk Parkı', icon: <Baby size={18} />, color: '#22c55e' },
    { id: 'cafe', label: 'Kafe / Kamelya', icon: <Coffee size={18} />, color: '#f59e0b' },
    { id: 'court', label: 'Spor Sahası', icon: <Dumbbell size={18} />, color: '#f87171' },
  ];

  return (
    <div className="landscape-architect-container anim-fade-in">
      <div className="landscape-sidebar glass-card">
        <section className="sidebar-section">
          <h4><Upload size={16} /> Eskiz Yükle</h4>
          <div className="upload-mini-zone" onClick={() => document.getElementById('sketchInput').click()}>
            <ImageIcon size={24} color={sketchImage ? 'var(--success-color)' : 'var(--text-muted)'} />
            <span>{sketchImage ? 'Eskiz Değiştir' : 'El Çizimi (Resim 1)'}</span>
            <input id="sketchInput" type="file" accept="image/*" hidden onChange={handleSketchUpload} />
          </div>
          {sketchImage && (
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', background: 'rgba(250, 204, 21, 0.1)', color: '#facc15', border: '1px solid #facc15' }}
              onClick={handleAutoTrace}
              disabled={isTracing}
            >
              {isTracing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {isTracing ? 'İşleniyor...' : 'Otomatik Çizime Çevir'}
            </button>
          )}
        </section>

        <section className="sidebar-section">
          <h4><Settings2 size={16} /> Yol Standartları</h4>
          <div className="input-group">
            <label>Araç Yolu (m)</label>
            <input 
              type="number" 
              value={roadWidth} 
              onChange={e => setRoadWidth(parseFloat(e.target.value))} 
              className="table-input"
            />
          </div>
          <div className="input-group">
            <label>Kaldırım (m)</label>
            <input 
              type="number" 
              value={sidewalkWidth} 
              onChange={e => setSidewalkWidth(parseFloat(e.target.value))} 
              className="table-input"
            />
          </div>
        </section>

        <section className="sidebar-section">
          <h4><Plus size={16} /> Peyzaj Elemanları</h4>
          <div className="landscape-library">
            {landscapeTools.map(tool => (
              <button 
                key={tool.id} 
                className="library-item"
                onClick={() => addLandscapeObject(tool.id)}
                style={{ '--item-color': tool.color }}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="sidebar-section info-box">
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>İpucu:</strong> Eskiziniz arka planda görünür. Çizgi aracıyla eskizdeki yolların üzerinden geçip "DXF İndir" diyerek AutoCAD'e aktarabilirsiniz.
          </p>
        </section>
      </div>

      <div className="landscape-main-viewport" style={{ position: 'relative' }}>
        {placementMode && (
          <div style={{ position: 'absolute', top: 20, zIndex: 1000, background: 'var(--primary-color)', color: 'white', padding: '10px 20px', borderRadius: '20px', left: '50%', transform: 'translateX(-50%)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', fontWeight: 'bold' }}>
            📍 Yerleştirmek için plana tıklayın (İptal etmek için ESC)
          </div>
        )}
        <WebCAD 
          initialEntities={cadEntities}
          backgroundImage={sketchImage}
          onSave={data => setCadEntities(data.entities)}
          placementMode={placementMode}
          onPlacementComplete={(newEnt) => {
            setCadEntities(prev => [...prev, newEnt]);
            setPlacementMode(null);
          }}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .landscape-architect-container {
          display: flex;
          height: calc(100vh - 180px);
          gap: 1.5rem;
        }
        .landscape-sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
          overflow-y: auto;
        }
        .landscape-main-viewport {
          flex: 1;
          height: 100%;
        }
        .sidebar-section h4 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: var(--primary-color);
        }
        .upload-mini-zone {
          border: 2px dashed var(--glass-border);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-mini-zone:hover {
          background: rgba(255,255,255,0.03);
          border-color: var(--primary-color);
        }
        .upload-mini-zone span { font-size: 0.75rem; color: var(--text-muted); }
        
        .input-group { margin-bottom: 0.75rem; }
        .input-group label { display: block; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; }
        
        .landscape-library {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .library-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          padding: 0.75rem 0.5rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-muted);
        }
        .library-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--item-color);
          color: white;
        }
        .library-item span { font-size: 0.65rem; font-weight: 600; text-align: center; }
        .info-box {
          background: rgba(59, 130, 246, 0.05);
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid rgba(59, 130, 246, 0.1);
        }
      `}} />
    </div>
  );
};

export default LandscapeArchitect;
