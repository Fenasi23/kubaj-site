import React, { useState, useCallback } from 'react';
import { 
  Upload, TreePine, Map as MapIcon, 
  Waves, Coffee, Baby, Dumbbell, Download, 
  Settings2, Layers, Move, Plus, Trash2, Image as ImageIcon
} from 'lucide-react';
import WebCAD from './WebCAD';

const LandscapeArchitect = () => {
  const [sketchImage, setSketchImage] = useState(null);
  const [roadWidth, setRoadWidth] = useState(7); // default 7m
  const [sidewalkWidth, setSidewalkWidth] = useState(2); // default 2m
  const [cadEntities, setCadEntities] = useState([]);
  const [activeTool, setActiveTool] = useState('none');

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

  const addLandscapeObject = (type) => {
    // Merkezi konuma (0,0) geçici bir obje ekle
    const newObj = {
      id: Date.now().toString(),
      type: 'landscape',
      subType: type,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      layerId: 'landscape'
    };
    setCadEntities(prev => [...prev, newObj]);
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

      <div className="landscape-main-viewport">
        <WebCAD 
          initialEntities={cadEntities}
          backgroundImage={sketchImage}
          onSave={data => setCadEntities(data.entities)}
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
