import React, { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { Upload, Map as MapIcon, BarChart3, Table as TableIcon, MousePointer2, FileText, Download } from 'lucide-react';
import { Canvas, useFrame } from 'react-three-fiber';
import * as THREE from 'three';

// 3D Arazi Bileşeni
function Terrain3D({ points }) {
  const groupRef = useRef();

  const { normalizedPoints } = useMemo(() => {
    if (!points || points.length === 0) return { normalizedPoints: [] };

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...points.map(p => Math.min(p.z_mevcut, p.z_proje)));

    const width = maxX - minX || 10;
    const height = maxY - minY || 10;
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

    const maxDim = Math.max(width, height);
    const factor = 20 / (maxDim || 1);

    return {
      normalizedPoints: points.map(p => ({
        x: (p.x - center.x) * factor,
        y: (p.y - center.y) * factor,
        z_m: (p.z_mevcut - minZ) * 2,
        z_p: (p.z_proje - minZ) * 2
      }))
    };
  }, [points]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z += 0.005;
  });

  if (normalizedPoints.length === 0) return null;

  return (
    <group ref={groupRef} rotation={[-Math.PI / 4, 0, 0]}>
      {normalizedPoints.map((p, i) => (
        <group key={`pt-${i}`}>
          <mesh position={[p.x, p.y, p.z_m]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#4ade80" />
          </mesh>
          <mesh position={[p.x, p.y, p.z_p]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#6366f1" transparent opacity={0.6} />
          </mesh>
          <mesh position={[p.x, p.y, (p.z_m + p.z_p) / 2]}>
            <cylinderGeometry args={[0.05, 0.05, Math.abs(p.z_p - p.z_m) || 0.1]} />
            <meshStandardMaterial color={p.z_p >= p.z_m ? "#4ade80" : "#f87171"} />
          </mesh>
        </group>
      ))}
      <gridHelper args={[40, 20, "#444", "#222"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 20]} intensity={1} />
    </group>
  );
}

function App() {
  const [points, setPoints] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('data');

  // Yayınlarken burayı internet adresinizle değiştireceğiz
 const API_URL = import.meta.env.VITE_API_URL || "https://kubaj-backend.onrender.com";

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/api/upload`, formData);
      setPoints(resp.data.points || []);
      setResults(resp.data.results || null);
      if (resp.data.points?.length > 0) setActiveTab('results');
    } catch (error) {
      alert('Hata: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type) => {
    try {
      const response = await axios.post(`${API_URL}/api/export/${type}`, { points, results }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kubaj_raporu.${type === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('İndirme hatası: ' + error.message);
    }
  };

  return (
    <div className="container">
      <header className="header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Kubaj Hesapla</h1>
        <p style={{ color: 'var(--text-muted)' }}>Hassas 3D Arazi Analiz ve Raporlama Platformu</p>
      </header>

      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('data')} className={`btn ${activeTab === 'data' ? '' : 'btn-secondary'}`}>
          <Upload size={18} /> Veri Yükle
        </button>
        <button onClick={() => setActiveTab('table')} className={`btn ${activeTab === 'table' ? '' : 'btn-secondary'}`}>
          <TableIcon size={18} /> Tablo
        </button>
        <button onClick={() => setActiveTab('results')} className={`btn ${activeTab === 'results' ? '' : 'btn-secondary'}`}>
          <BarChart3 size={18} /> Sonuçlar
        </button>
        <button onClick={() => setActiveTab('map')} className={`btn ${activeTab === 'map' ? '' : 'btn-secondary'}`}>
          <MapIcon size={18} /> 3D Harita
        </button>
      </nav>

      <main>
        {activeTab === 'data' && (
          <section className="glass-card">
            <div className="upload-zone" onClick={() => document.getElementById('fileInput').click()}>
              <Upload size={48} color="var(--primary-color)" />
              <h3>{loading ? 'Analiz Ediliyor...' : 'Doğrudan Excel Yükleyin'}</h3>
              <p>X, Y, Mevcut Kot ve Proje Kot sütunları otomatik taranır.</p>
              <input id="fileInput" type="file" hidden onChange={handleFileUpload} />
            </div>
          </section>
        )}

        {activeTab === 'table' && (
          <section className="glass-card" style={{ overflowX: 'auto' }}>
            <h2 style={{ marginBottom: '1rem' }}>Saha Ölçüm Noktaları</h2>
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
                  <th>ID</th><th>X</th><th>Y</th><th>Mevcut</th><th>Proje</th><th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {points.length > 0 ? points.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                    <td>{p.id}</td><td>{p.x.toFixed(2)}</td><td>{p.y.toFixed(2)}</td>
                    <td>{p.z_mevcut.toFixed(2)}</td><td>{p.z_proje.toFixed(2)}</td>
                    <td style={{ color: p.z_proje >= p.z_mevcut ? '#4ade80' : '#f87171' }}>
                      {p.z_proje >= p.z_mevcut ? 'DOLGU' : 'KAZI'}
                    </td>
                  </tr>
                )) : <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Henüz veri yüklenmedi.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'results' && results && (
          <div>
            <div className="grid">
              <div className="glass-card result-card">
                <h3>Kazı Hacmi</h3>
                <div className="volume-value cut">{results.cutVolume.toLocaleString('tr-TR')} m³</div>
              </div>
              <div className="glass-card result-card">
                <h3>Dolgu Hacmi</h3>
                <div className="volume-value fill">{results.fillVolume.toLocaleString('tr-TR')} m³</div>
              </div>
              <div className="glass-card result-card">
                <h3>Hedeflenen Net</h3>
                <div className="volume-value total">{results.totalVolume.toLocaleString('tr-TR')} m³</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
              <button onClick={() => handleDownload('pdf')} className="btn" style={{ background: '#c0392b' }}>
                <FileText size={18} /> Raporu PDF İndir
              </button>
              <button onClick={() => handleDownload('excel')} className="btn" style={{ background: '#27ae60' }}>
                <Download size={18} /> Raporu Excel İndir
              </button>
            </div>

            <section className="glass-card" style={{ marginTop: '2rem', textAlign: 'center' }}>
              <h3>Hızlı 3D Arazi Modeli</h3>
              <div style={{ height: '400px', background: '#0a0a0a', borderRadius: '12px', marginTop: '1rem' }}>
                <Canvas camera={{ position: [20, 20, 20], fov: 45 }}>
                  <Terrain3D points={points} />
                </Canvas>
              </div>
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#888' }}>
                Model otomatik dönmektedir. Fare ile farklı açılardan bakabilirsiniz.
              </p>
            </section>
          </div>
        )}

        {activeTab === 'map' && (
          <section className="glass-card" style={{ height: '600px', padding: 0, background: '#000' }}>
            <Canvas camera={{ position: [30, 30, 30], fov: 40 }}>
              <Terrain3D points={points} />
            </Canvas>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
