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
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // İşlem için ölçekle (performans)
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.floor(img.width * scale);
        const h = Math.floor(img.height * scale);
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        
        // CAD koordinat sistemi
        const cadW = 1000;
        const cadH = cadW * (h / w);
        
        // --- ADIM 1: Gri tonlama ---
        const gray = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            gray[i] = 0.299 * data[idx] + 0.587 * data[idx+1] + 0.114 * data[idx+2];
        }
        
        // --- ADIM 2: Gauss bulanıklaştırma (gürültü azaltma) ---
        const blurred = new Float32Array(w * h);
        const kernel = [1,2,1, 2,4,2, 1,2,1];
        const kSum = 16;
        for (let y = 1; y < h-1; y++) {
            for (let x = 1; x < w-1; x++) {
                let sum = 0, ki = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        sum += gray[(y+ky)*w + (x+kx)] * kernel[ki++];
                    }
                }
                blurred[y*w + x] = sum / kSum;
            }
        }
        
        // --- ADIM 3: Sobel kenar algılama ---
        const edges = new Float32Array(w * h);
        let maxEdge = 0;
        for (let y = 1; y < h-1; y++) {
            for (let x = 1; x < w-1; x++) {
                const gx = -blurred[(y-1)*w+(x-1)] + blurred[(y-1)*w+(x+1)]
                         - 2*blurred[y*w+(x-1)] + 2*blurred[y*w+(x+1)]
                         - blurred[(y+1)*w+(x-1)] + blurred[(y+1)*w+(x+1)];
                const gy = -blurred[(y-1)*w+(x-1)] - 2*blurred[(y-1)*w+x] - blurred[(y-1)*w+(x+1)]
                         + blurred[(y+1)*w+(x-1)] + 2*blurred[(y+1)*w+x] + blurred[(y+1)*w+(x+1)];
                edges[y*w+x] = Math.sqrt(gx*gx + gy*gy);
                if (edges[y*w+x] > maxEdge) maxEdge = edges[y*w+x];
            }
        }
        
        // --- ADIM 4: Eşikleme ve kenar noktalarını toplama ---
        const threshold = maxEdge * 0.12;
        const step = 2;
        const edgePoints = [];
        
        for (let y = step; y < h-step; y += step) {
            for (let x = step; x < w-step; x += step) {
                if (edges[y*w+x] > threshold) {
                    edgePoints.push({
                        px: x, py: y,
                        cadX: (x / w) * cadW - (cadW / 2),
                        cadY: -((y / h) * cadH - (cadH / 2))
                    });
                }
            }
        }
        
        // --- ADIM 5: Yakın kenar noktalarını zincir halinde bağla (Polyline oluştur) ---
        const used = new Set();
        const polylines = [];
        const maxDist = step * 2.5;
        
        // Uzamsal dizin (grid-tabanlı hızlı arama)
        const gridSize = Math.ceil(maxDist);
        const grid = {};
        
        edgePoints.forEach((p, i) => {
            const gx = Math.floor(p.px / gridSize);
            const gy = Math.floor(p.py / gridSize);
            const key = `${gx},${gy}`;
            if (!grid[key]) grid[key] = [];
            grid[key].push(i);
        });
        
        const findNearest = (px, py, chainSet) => {
            const gx = Math.floor(px / gridSize);
            const gy = Math.floor(py / gridSize);
            let bestIdx = -1;
            let bestDist = maxDist * maxDist;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const key = `${gx+dx},${gy+dy}`;
                    const cell = grid[key];
                    if (!cell) continue;
                    for (const idx of cell) {
                        if (used.has(idx) || chainSet.has(idx)) continue;
                        const d = (edgePoints[idx].px - px)**2 + (edgePoints[idx].py - py)**2;
                        if (d < bestDist) {
                            bestDist = d;
                            bestIdx = idx;
                        }
                    }
                }
            }
            return bestIdx;
        };
        
        for (let i = 0; i < edgePoints.length; i++) {
            if (used.has(i)) continue;
            used.add(i);
            const chain = [edgePoints[i]];
            const chainSet = new Set([i]);
            
            // Zinciri ileri doğru takip et
            let current = edgePoints[i];
            while (true) {
                const next = findNearest(current.px, current.py, chainSet);
                if (next === -1) break;
                used.add(next);
                chainSet.add(next);
                chain.push(edgePoints[next]);
                current = edgePoints[next];
            }
            
            if (chain.length >= 4) {
                polylines.push(chain);
            }
        }
        
        // --- ADIM 6: Douglas-Peucker sadeleştirme ---
        const ptLineDist = (p, a, b) => {
            const dx = b.cadX - a.cadX, dy = b.cadY - a.cadY;
            const lenSq = dx*dx + dy*dy;
            if (lenSq === 0) return Math.sqrt((p.cadX-a.cadX)**2 + (p.cadY-a.cadY)**2);
            const t = Math.max(0, Math.min(1, ((p.cadX-a.cadX)*dx + (p.cadY-a.cadY)*dy) / lenSq));
            return Math.sqrt((p.cadX - (a.cadX + t*dx))**2 + (p.cadY - (a.cadY + t*dy))**2);
        };
        
        const simplify = (pts, tol) => {
            if (pts.length <= 2) return pts;
            let maxD = 0, maxI = 0;
            for (let i = 1; i < pts.length - 1; i++) {
                const d = ptLineDist(pts[i], pts[0], pts[pts.length-1]);
                if (d > maxD) { maxD = d; maxI = i; }
            }
            if (maxD > tol) {
                const left = simplify(pts.slice(0, maxI+1), tol);
                const right = simplify(pts.slice(maxI), tol);
                return left.slice(0, -1).concat(right);
            }
            return [pts[0], pts[pts.length-1]];
        };
        
        const tolerance = 2.0;
        const simplified = polylines.map(pl => simplify(pl, tolerance));
        
        // --- ADIM 7: CAD objeleri olarak ekle (bağlantılı polyline) ---
        if (simplified.length > 0) {
            const newEntities = simplified.map(pl => ({
                id: Date.now() + '_' + Math.random().toString(36).substr(2),
                type: 'line',
                points: pl.map(p => ({ x: Number(p.cadX.toFixed(2)), y: Number(p.cadY.toFixed(2)) })),
                layerId: '0',
                color: '#facc15'
            }));
            setCadEntities(prev => [...prev, ...newEntities]);
        } else {
            alert("Çizim algılanamadı. Lütfen daha belirgin hatları olan bir eskiz yükleyin.");
        }
        setIsTracing(false);
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
