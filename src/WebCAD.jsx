import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useThree, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  MousePointer2, Pencil, Trash2, Layers, Download, 
  Save, Crosshair, Circle, Square, Minus, Target, 
  Eye, EyeOff, Lock, Unlock, Plus, Palette, FileDown
} from 'lucide-react';

// Extend OrbitControls for react-three-fiber
extend({ OrbitControls });

// --- CAD ENGINE HELPERS ---

const MapControls = ({ enableRotate = false }) => {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  
  // Custom MapControls logic (Top-down 2D pan and zoom)
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <orbitControls 
      ref={controlsRef} 
      args={[camera, gl.domElement]} 
      enableRotate={enableRotate}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE, // Allow normal click events for Left mouse, rotate is disabled on orbitControls anyway via enableRotate=false
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
    />
  );
};

const Grid = ({ size = 2000, divisions = 200 }) => {
  return (
    <>
      <gridHelper args={[size, divisions, "#1e293b", "#0f172a"]} rotation={[Math.PI / 2, 0, 0]} />
      <axesHelper args={[100]} />
    </>
  );
};

const EntityRenderer = ({ entities, layers }) => {
  return (
    <group>
      {entities.map((ent, idx) => {
        const layer = layers.find(l => l.id === ent.layerId);
        if (layer && !layer.visible) return null;
        
        const color = ent.color || layer?.color || "#ffffff";

        if (ent.type === 'point') {
          return (
            <mesh key={`ent-${idx}`} position={[ent.x, ent.y, 0]}>
              <circleGeometry args={[0.2, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          );
        }
        if (ent.type === 'line') {
          const points = ent.points.map(p => new THREE.Vector3(p.x, p.y, 0));
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          return (
            <line key={`ent-${idx}`} geometry={geometry}>
              <lineBasicMaterial color={color} linewidth={2} />
            </line>
          );
        }
        if (ent.type === 'landscape') {
          // Özel peyzaj objeleri ( Havuz, Park vb.)
          const w = ent.w || 10;
          const h = ent.h || 10;
          const rotation = ent.rotation || 0;
          return (
            <group key={`ent-${idx}`} position={[ent.x, ent.y, 0.1]} rotation={[0, 0, rotation]}>
              {ent.subType === 'pool' && (
                <mesh>
                  <circleGeometry args={[w / 2, 32]} />
                  <meshBasicMaterial color="#0ea5e9" transparent opacity={0.6} />
                </mesh>
              )}
              {ent.subType === 'park' && (
                <mesh>
                  <boxGeometry args={[w, h, 0.1]} />
                  <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
                </mesh>
              )}
              {ent.subType === 'court' && (
                <mesh>
                  <boxGeometry args={[w, h, 0.1]} />
                  <meshBasicMaterial color="#f87171" transparent opacity={0.5} />
                </mesh>
              )}
              {ent.subType === 'cafe' && (
                <mesh>
                  <boxGeometry args={[w, h, 0.1]} />
                  <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
                </mesh>
              )}
            </group>
          );
        }
        if (ent.type === 'trace') {
          const pts = [];
          ent.lines.forEach(line => {
             pts.push(new THREE.Vector3(line[0].x, line[0].y, 0));
             pts.push(new THREE.Vector3(line[1].x, line[1].y, 0));
          });
          const geometry = new THREE.BufferGeometry().setFromPoints(pts);
          return (
            <lineSegments key={`ent-${idx}`} geometry={geometry}>
              <lineBasicMaterial color={color} opacity={0.5} transparent />
            </lineSegments>
          );
        }
        return null;
      })}
    </group>
  );
};

const Scene = ({ 
  activeTool, 
  onPointAdded, 
  entities, 
  onMouseMove, 
  snapConfig, 
  layers, 
  currentLinePoints,
  backgroundImage,
  bgOpacity = 0.5
}) => {
  const { camera, size } = useThree();
  const [snappedPoint, setSnappedPoint] = useState(null);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });

  const [bgTexture, setBgTexture] = useState(null);
  const [bgDimensions, setBgDimensions] = useState([1000, 1000]);

  useEffect(() => {
    if (!backgroundImage) {
      setBgTexture(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(backgroundImage, (tex) => {
      const ar = tex.image.width / tex.image.height;
      setBgDimensions([1000, 1000 / ar, 1]); 
      setBgTexture(tex);
    });
  }, [backgroundImage]);

  const handlePointerMove = (e) => {
    e.stopPropagation();
    const coords = { x: e.point.x, y: e.point.y };
    setCursorCoords(coords);
    
    let closest = null;
    let minDist = 0.8 / (camera.zoom / 10);

    if (snapConfig.endpoint) {
      entities.forEach(ent => {
        if (ent.points) {
          ent.points.forEach(p => {
            const d = Math.sqrt((p.x - coords.x)**2 + (p.y - coords.y)**2);
            if (d < minDist) {
              minDist = d;
              closest = { x: p.x, y: p.y };
            }
          });
        } else if (ent.type === 'point' || ent.type === 'landscape') {
          const px = ent.x || 0;
          const py = ent.y || 0;
          const d = Math.sqrt((px - coords.x)**2 + (py - coords.y)**2);
          if (d < minDist) {
            minDist = d;
            closest = { x: px, y: py };
          }
        }
      });
    }

    setSnappedPoint(closest);
    onMouseMove(closest || coords);
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const finalCoords = snappedPoint || { x: e.point.x, y: e.point.y };
    onPointAdded(finalCoords);
  };

  return (
    <>
      <ambientLight intensity={1} />
      <Grid />
      
      {/* Background Image (Eskiz) */}
      {bgTexture && (
        <mesh position={[0, 0, -1]} scale={bgDimensions}>
          <planeGeometry />
          <meshBasicMaterial map={bgTexture} transparent opacity={bgOpacity} />
        </mesh>
      )}

      <EntityRenderer entities={entities} layers={layers} />
      
      {snappedPoint && (
        <group position={[snappedPoint.x, snappedPoint.y, 0.2]}>
          <mesh>
            <ringGeometry args={[0.3, 0.4, 4]} rotation={[0, 0, Math.PI/4]} />
            <meshBasicMaterial color="#facc15" />
          </mesh>
        </group>
      )}

      <mesh 
        position={[0, 0, -0.1]} 
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[5000, 5000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {activeTool === 'line' && currentLinePoints.length === 1 && (
        <line>
          <bufferGeometry attach="geometry" {...new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(currentLinePoints[0].x, currentLinePoints[0].y, 0),
            new THREE.Vector3(snappedPoint ? snappedPoint.x : cursorCoords.x, snappedPoint ? snappedPoint.y : cursorCoords.y, 0)
          ])} />
          <lineBasicMaterial attach="material" color="#facc15" linewidth={2} dashed />
        </line>
      )}

      <MapControls enableRotate={false} />
    </>
  );
};

const WebCAD = ({ initialEntities = [], initialLayers = [], onSave, backgroundImage, onPointSelected, placementMode, onPlacementComplete }) => {
  const [entities, setEntities] = useState(initialEntities);
  const [layers, setLayers] = useState(initialLayers.length > 0 ? initialLayers : [
    { id: '0', name: '0 (Ana Tabaka)', color: '#ffffff', visible: true, locked: false }
  ]);
  const [activeLayerId, setActiveLayerId] = useState('0');
  const [activeTool, setActiveTool] = useState('line');
  const [currentLinePoints, setCurrentLinePoints] = useState([]);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0 });
  const [snapConfig, setSnapConfig] = useState({ endpoint: true });
  const [commandText, setCommandText] = useState('');

  // Sync with initial props
  useEffect(() => {
    if (initialEntities.length > 0) setEntities(initialEntities);
    if (initialLayers.length > 0) setLayers(initialLayers);
  }, [initialEntities]);

  const handlePointAdded = (coords) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (activeLayer?.locked) return;
    
    // Eğer dışarıdan "Yerleştirme Modu" (ör: Havuz Ekleme) açıksa
    if (placementMode && onPlacementComplete) {
      const placedEnt = {
        ...placementMode,
        x: coords.x,
        y: coords.y,
        layerId: activeLayerId,
        color: activeLayer.color || placementMode.color
      };
      onPlacementComplete(placedEnt);
      return;
    }

    if (activeTool === 'point') {
      setEntities(prev => [...prev, { 
        type: 'point', 
        x: coords.x, 
        y: coords.y, 
        layerId: activeLayerId, 
        color: activeLayer.color 
      }]);
    } else if (activeTool === 'line') {
      const newPoints = [...currentLinePoints, coords];
      if (newPoints.length === 2) {
        setEntities(prev => [...prev, { 
          type: 'line', 
          points: newPoints, 
          layerId: activeLayerId, 
          color: activeLayer.color 
        }]);
        setCurrentLinePoints([]);
      } else {
        setCurrentLinePoints(newPoints);
      }
    }
  };

  const executeCommand = (e) => {
    if (e.key === 'Enter') {
      const txt = commandText.toLowerCase();
      // Ondalıklı sayıları yakala (virgül veya nokta)
      const nums = txt.match(/\d+([.,]\d+)?/g)?.map(n => parseFloat(n.replace(',', '.'))) || [];
      const activeLayer = layers.find(l => l.id === activeLayerId);
      const color = activeLayer?.color || '#fff';
      
      if (activeLayer?.locked) {
        alert("Seçili tabaka kilitli!");
        return;
      }

      let newEnts = [];
      // Fare o an neredeyse veya merkeze (0,0) çiz
      const cx = cursorCoords.x;
      const cy = cursorCoords.y;

      if (txt.includes('dikdörtgen') || txt.includes('kutu')) {
        const w = nums[0] || 1;
        const h = nums[1] || w; // Eğer ikinci sayı yoksa kare yapar
        const pts = [
          {x: cx, y: cy},
          {x: cx + w, y: cy},
          {x: cx + w, y: cy + h},
          {x: cx, y: cy + h},
          {x: cx, y: cy} // kapanış noktası
        ];
        newEnts.push({ type: 'line', points: pts, layerId: activeLayerId, color });

      } else if (txt.includes('daire') || txt.includes('çember')) {
        const r = nums[0] || 1;
        const pts = [];
        // DXF ve CAD sistemleri için çemberi 32 kısa çizgiye böleriz
        for(let i=0; i<=32; i++){
           const ang = (i/32) * Math.PI * 2;
           pts.push({ x: cx + Math.cos(ang)*r, y: cy + Math.sin(ang)*r });
        }
        newEnts.push({ type: 'line', points: pts, layerId: activeLayerId, color });

      } else if (txt.includes('üçgen')) {
        const w = nums[0] || 1;
        const h = nums[1] || (w * Math.sqrt(3)/2); // Eşkenar üçgene yakın
        const pts = [
          {x: cx, y: cy},
          {x: cx + w, y: cy},
          {x: cx + w/2, y: cy + Math.abs(h)},
          {x: cx, y: cy}
        ];
        newEnts.push({ type: 'line', points: pts, layerId: activeLayerId, color });
      } else {
        alert("Geçerli bir komut anlaşılamadı. Lütfen şekil (dikdörtgen, daire, üçgen) ve ölçü belirtin. Örn: '1'e 1.5 dikdörtgen çiz' veya 'yarıçapı 5 daire'");
        return;
      }

      if (newEnts.length > 0) {
         setEntities(prev => [...prev, ...newEnts]);
         setCommandText('');
      }
    }
  };

  const toggleLayerVisibility = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const toggleLayerLock = (id) => {
    setLayers(layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const addLayer = () => {
    const name = prompt("Tabaka Adı:");
    if (!name) return;
    const newLayer = {
      id: Date.now().toString(),
      name,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      visible: true,
      locked: false
    };
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const deleteLayer = (id) => {
    if (id === '0') {
      alert("Ana tabaka silinemez!");
      return;
    }
    if (confirm("Bu tabakayı ve içindeki TÜM ÇİZİMLERİ silmek istediğinize emin misiniz?")) {
      setLayers(prev => prev.filter(l => l.id !== id));
      setEntities(prev => prev.filter(e => e.layerId !== id));
      if (activeLayerId === id) setActiveLayerId('0');
    }
  };

  const handleDownloadDXF = async () => {
    if (entities.length === 0) {
      alert("İndirilecek herhangi bir çizim bulunamadı.");
      return;
    }
    try {
      // Dinamik import ile uygulamanın çökmesini (Runtime Error) engelliyoruz
      const { DxfWriter } = await import('@tarikjabiri/dxf');
      const dxf = new DxfWriter();
      
      // İlk olarak tabakaları DXF'ye ekleyelim (isimleriyle)
      layers.forEach(l => {
        dxf.addLayer(l.name, 7, l.name); // 7 is usually white/black default ACI
      });

      // Öğeleri DXF'ye çizelim
      entities.forEach(ent => {
        const layer = layers.find(l => l.id === ent.layerId);
        const layerName = layer ? layer.name : '0';
        
        if (ent.type === 'point') {
          // DXF noktası
          dxf.addPoint(ent.x, ent.y, 0, { layerName });
        } else if (ent.type === 'line' && ent.points?.length > 1) {
          // Ardışık noktalardan çizgiler oluştur
          for (let i = 0; i < ent.points.length - 1; i++) {
            const p1 = ent.points[i];
            const p2 = ent.points[i+1];
            dxf.addLine({ x: p1.x, y: p1.y, z: 0 }, { x: p2.x, y: p2.y, z: 0 }, { layerName });
          }
        } else if (ent.type === 'landscape') {
          // Peyzaj objelerini DXF'e dikdörtgen veya daire olarak aktar
          const w = ent.w || 10;
          const h = ent.h || 10;
          if (ent.subType === 'pool') {
             // Çember olarak ekle (DXF circle)
             dxf.addCircle(ent.x, ent.y, w / 2, { layerName });
          } else {
             // Diğerlerini kapalı kare/dikdörtgen olarak ekle
             const w2 = w / 2;
             const h2 = h / 2;
             dxf.addPolyline([
               [ent.x - w2, ent.y - h2, 0],
               [ent.x + w2, ent.y - h2, 0],
               [ent.x + w2, ent.y + h2, 0],
               [ent.x - w2, ent.y + h2, 0],
               [ent.x - w2, ent.y - h2, 0]
             ], { layerName, closed: true });
          }
        } else if (ent.type === 'trace') {
          ent.lines.forEach(line => {
             dxf.addLine({ x: line[0].x, y: line[0].y, z: 0 }, { x: line[1].x, y: line[1].y, z: 0 }, { layerName });
          });
        }
      });

      const dxfString = dxf.stringify();
      const blob = new Blob([dxfString], { type: 'application/dxf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `cizim_${Date.now()}.dxf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("DXF oluşturma hatası:", err);
      // Eğer tarayıcıda Buffer hatası verirse kullanıcıya alternatif sunacağız
      alert("DXF kütüphanesini tarayıcıda çalıştırırken bir hata oluştu. Tarayıcınız desteklemiyor olabilir.");
    }
  };

  return (
    <div className="cad-container">
      <div className="cad-toolbar glass-card">
        <button 
          className={`cad-tool-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTool('select')}
          title="Seç (S)"
        >
          <MousePointer2 size={18} />
        </button>
        <div className="toolbar-divider" />
        <button 
          className={`cad-tool-btn ${activeTool === 'point' ? 'active' : ''}`}
          onClick={() => setActiveTool('point')}
          title="Nokta At (N)"
        >
          <Target size={18} />
        </button>
        <button 
          className={`cad-tool-btn ${activeTool === 'line' ? 'active' : ''}`}
          onClick={() => { setActiveTool('line'); setCurrentLinePoints([]); }}
          title="Çizgi Çiz (C)"
        >
          <Minus size={18} />
        </button>
        <div className="toolbar-divider" />
        <button className="cad-tool-btn" onClick={() => setEntities([])} title="Ekranı Temizle">
          <Trash2 size={18} />
        </button>
      </div>

      <div className="cad-sidebar glass-card">
        <div className="sidebar-header">
          <Layers size={16} />
          <span>Tabaka Yönetimi</span>
        </div>
        <div className="layer-list">
          {layers.map(layer => (
            <div 
              key={layer.id} 
              className={`layer-item ${activeLayerId === layer.id ? 'active-layer' : ''}`}
              onClick={() => setActiveLayerId(layer.id)}
            >
              <div className="layer-color" style={{ backgroundColor: layer.color }} />
              <span className="layer-name">{layer.name}</span>
              <div className="layer-controls" onClick={e => e.stopPropagation()}>
                <button onClick={() => toggleLayerVisibility(layer.id)} className="layer-control-btn" title="Gizle/Göster">
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} className="inactive" />}
                </button>
                <button onClick={() => toggleLayerLock(layer.id)} className="layer-control-btn" title="Kilitle/Aç">
                  {layer.locked ? <Lock size={12} className="locked" /> : <Unlock size={12} />}
                </button>
                {layer.id !== '0' && (
                  <button onClick={() => deleteLayer(layer.id)} className="layer-control-btn" title="Tabakayı Sil" style={{ color: 'var(--error-color)' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: '1rem', width: '100%', fontSize: '0.75rem' }} onClick={addLayer}>
          <Plus size={14} /> Yeni Tabaka
        </button>
      </div>

      <div className="cad-viewport">
        {/* Akıllı Çizim Komut Satırı */}
        <div style={{ 
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', 
          zIndex: 100, background: 'rgba(15, 23, 42, 0.85)', padding: '8px 16px', 
          borderRadius: '20px', border: '1px solid var(--primary-color)', 
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
           <Target size={18} color="var(--primary-color)" />
           <input 
             type="text" 
             value={commandText} 
             onChange={e => setCommandText(e.target.value)} 
             onKeyDown={executeCommand}
             placeholder="Örn: 20'ye 15 dikdörtgen çiz..." 
             style={{ 
               background: 'transparent', border: 'none', color: '#fff', 
               outline: 'none', width: '280px', fontSize: '0.85rem' 
             }} 
           />
        </div>

        <Canvas 
          orthographic 
          camera={{ zoom: 30, position: [0, 0, 100], near: 0.1, far: 1000 }}
          style={{ background: '#020617' }}
        >
          <Scene 
            activeTool={activeTool} 
            onPointAdded={handlePointAdded} 
            entities={entities}
            onMouseMove={setCursorCoords}
            snapConfig={snapConfig}
            layers={layers}
            currentLinePoints={currentLinePoints}
            backgroundImage={backgroundImage}
          />
        </Canvas>

        <div className="cad-status-bar">
          <div className="status-coord">
            <span className="coord-label">Y:</span>
            <span className="coord-value">{cursorCoords.x.toFixed(3)}</span>
          </div>
          <div className="status-coord">
            <span className="coord-label">X:</span>
            <span className="coord-value">{cursorCoords.y.toFixed(3)}</span>
          </div>
          <div className="status-divider" />
          <div className="status-item" onClick={() => setSnapConfig({ ...snapConfig, endpoint: !snapConfig.endpoint })} style={{ cursor: 'pointer' }}>
            <Crosshair size={14} className={snapConfig.endpoint ? 'text-primary' : ''} />
            <span>Yakalama: {snapConfig.endpoint ? 'AÇIK' : 'KAPALI'}</span>
          </div>
          <div className="status-item" style={{ marginLeft: 'auto' }}>
            <span>{entities.length} Obje</span>
          </div>
        </div>
      </div>

      <div className="cad-actions">
        <button className="btn" style={{ background: 'var(--success-color)' }} onClick={handleDownloadDXF}>
          <FileDown size={16} /> DXF İndir
        </button>
        <button className="btn btn-secondary" onClick={() => onSave({ entities, layers })}>
          <Save size={16} /> Kaydet
        </button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .cad-container { display: flex; height: 100%; gap: 1rem; position: relative; }
        .cad-viewport { flex: 1; border-radius: 20px; overflow: hidden; border: 1px solid var(--glass-border); position: relative; }
        .cad-toolbar { width: 56px; display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem 0.6rem; align-items: center; }
        .cad-tool-btn { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); color: var(--text-muted); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .cad-tool-btn:hover { background: rgba(255,255,255,0.08); color: white; }
        .cad-tool-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); box-shadow: 0 4px 12px var(--primary-glow); }
        .toolbar-divider { width: 100%; height: 1px; background: var(--glass-border); margin: 0.2rem 0; }
        .cad-sidebar { width: 220px; display: flex; flex-direction: column; padding: 1.25rem; }
        .sidebar-header { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 0.85rem; margin-bottom: 1.25rem; color: var(--text-color); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.75rem; }
        .layer-list { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; overflow-y: auto; }
        .layer-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.6rem; background: rgba(255,255,255,0.02); border-radius: 6px; font-size: 0.75rem; border: 1px solid transparent; cursor: pointer; transition: all 0.2s; }
        .layer-item:hover { background: rgba(255,255,255,0.05); }
        .active-layer { border-color: var(--primary-color); background: rgba(59, 130, 246, 0.1); }
        .layer-color { width: 10px; height: 10px; border-radius: 2px; }
        .layer-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
        .layer-controls { display: flex; gap: 4px; }
        .layer-control-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
        .layer-control-btn:hover { color: white; }
        .layer-control-btn .inactive { color: var(--error-color); opacity: 0.6; }
        .layer-control-btn .locked { color: var(--warning-color); }
        
        .cad-status-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 32px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); border-top: 1px solid var(--glass-border); display: flex; align-items: center; padding: 0 1rem; gap: 1rem; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; z-index: 100; }
        .status-coord { display: flex; gap: 0.4rem; min-width: 80px; }
        .coord-label { color: var(--text-muted); }
        .coord-value { color: var(--primary-color); font-weight: 700; }
        .status-divider { width: 1px; height: 14px; background: var(--glass-border); }
        .status-item { display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); }
        .text-primary { color: var(--primary-color) !important; }
        .cad-actions { position: absolute; top: 1.25rem; right: 3rem; display: flex; gap: 0.75rem; z-index: 100; }
      `}} />
    </div>
  );
};

export default WebCAD;
