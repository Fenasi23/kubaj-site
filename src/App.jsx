import React, { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, Map as MapIcon, BarChart3, Table as TableIcon, 
  FileText, Download, LayoutDashboard, Settings, 
  Menu, X, ChevronRight, HardHat, Info, Pencil, Trash2,
  Plus, PlusSquare, Building2, FileCheck, RefreshCw
} from 'lucide-react';
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
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.6} />
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
  const [activeModule, setActiveModule] = useState('kubaj');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [points, setPoints] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('data');
  const [hakedisData, setHakedisData] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // FIRMA YÖNETİMİ DURUMLARI
  const [firms, setFirms] = useState([]);
  const [selectedFirm, setSelectedFirm] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [showAddFirm, setShowAddFirm] = useState(false);
  const [newFirmName, setNewFirmName] = useState('');
  const [settings, setSettings] = useState({
    userName: '',
    userTitle: '',
    companyName: '',
    companyAddress: '',
    defaultPreparer: '',
    defaultController: ''
  });

  const navigationItems = [
    { id: 'kubaj', label: 'Kubaj Analizi', icon: <BarChart3 size={18} /> },
    { id: 'hakedis', label: 'Hakediş Yönetimi', icon: <FileCheck size={18} /> },
    { id: 'converter', label: 'Format Dönüştürücü', icon: <RefreshCw size={18} /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings size={18} /> },
  ];

  const [hakedisDetails, setHakedisDetails] = useState({
    birimFiyat: 0,
    isinAdi: '',
    yukleniciFirma: '',
    hakedisNo: '',
    imzaciAdi: '',
    kontrolEdenAdi: ''
  });


  // API URL Ayarı: Proxy ve Vercel rewrite sayesinde her ortamda sadece "/api" kullanıyoruz.
  const API_URL = ""; 

  console.log("DEBUG: API Çağrısı Yapılıyor. Mevcut Adres:", window.location.origin + API_URL);

  // Firmaya Özel Header Hazırla
  const getHeaders = React.useCallback(() => {
    if (!selectedFirm || !selectedProject) return { headers: {} };
    return { 
      headers: { 
        'x-firm-id': selectedFirm.id,
        'x-job-name': encodeURIComponent(selectedProject)
      } 
    };
  }, [selectedFirm, selectedProject]);

  // Firmaları Yükle
  React.useEffect(() => {
    const fetchFirms = async () => {
      try {
        const resp = await axios.get(`${API_URL}/api/firms`);
        setFirms(resp.data);
        const savedFirmId = localStorage.getItem('selectedFirmId');
        const active = resp.data.find(f => f.id === savedFirmId);
        if (active) {
          setSelectedFirm(active);
        } else {
          setSelectedFirm(null);
          setSelectedProject('');
        }
      } catch (error) {
        console.error("Firmalar yüklenemedi:", error);
      }
    };
    const fetchSettings = async () => {
      try {
        const resp = await axios.get(`${API_URL}/api/settings`);
        setSettings(resp.data);
      } catch (error) {
        console.error("Ayarlar yüklenemedi:", error);
      }
    };
    fetchFirms();
    fetchSettings();
  }, [API_URL]);

  // Projeleri Yükle
  React.useEffect(() => {
    if (selectedFirm) {
      axios.get(`${API_URL}/api/firms/${selectedFirm.id}/projects`).then(r => {
        setProjects(r.data);
      });
    }
  }, [selectedFirm, API_URL]);

  const lastFetchedRef = useRef({ firmId: null, jobName: null });

  // Firma veya Proje Değiştiğinde Verileri Yenile
  React.useEffect(() => {
    const fetchData = async () => {
      if (!selectedFirm || !selectedProject) return;
      
      // Eğer zaten bu veri yüklüyse tekrar çekme (flashing engelleme)
      if (lastFetchedRef.current.firmId === selectedFirm.id && lastFetchedRef.current.jobName === selectedProject) {
        return;
      }

      setLoading(true);
      try {
        const hResp = await axios.get(`${API_URL}/api/hakedis`, getHeaders());
        if (hResp.data && hResp.data.details) {
            setHakedisDetails({
              ...hResp.data.details,
              birimFiyat: hResp.data.details.birimFiyat ?? 0
            });
            setHakedisData(Array.isArray(hResp.data.data) ? hResp.data.data : []);
        } else {
            // Eski yapı veya boş veri ise temizle
            const legacyData = Array.isArray(hResp.data) ? hResp.data : [];
            setHakedisData(legacyData);
            setHakedisDetails({ 
              birimFiyat: 0, 
              isinAdi: selectedProject, 
              yukleniciFirma: '', 
              hakedisNo: '01', 
              imzaciAdi: settings.defaultPreparer || settings.userName || '', 
              kontrolEdenAdi: settings.defaultController || '' 
            });
        }

        const kResp = await axios.get(`${API_URL}/api/kubaj`, getHeaders());
        setPoints(kResp.data.points || []);
        setResults(kResp.data.results || null);
        
        lastFetchedRef.current = { firmId: selectedFirm.id, jobName: selectedProject };
      } catch (error) {
        console.error("Veriler yenilenemedi:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedFirm, selectedProject, API_URL, settings.userName, settings.defaultPreparer, settings.defaultController, getHeaders]);

  // Firma veya Proje Değiştiğinde Verileri Yenile

  const handleAddFirm = async () => {
    if (!newFirmName) return;
    try {
      console.log("Firma ekleniyor:", newFirmName);
      const resp = await axios.post(`${API_URL}/api/firms`, { name: newFirmName });
      console.log("Firma eklendi:", resp.data);
      setFirms([...firms, resp.data]);
      setSelectedFirm(resp.data);
      setNewFirmName('');
      setShowAddFirm(false);
    } catch (error) {
      console.error("Firma ekleme hatasi:", error);
      const errorMsg = error.response?.data?.message || error.response?.data || error.message;
      alert("Firma eklenemedi: " + errorMsg);
    }
  };

  const handleUpdateFirm = async (id, name) => {
    const newName = prompt("Yeni firma adını giriniz:", name);
    if (!newName || newName === name) return;
    try {
      const resp = await axios.put(`${API_URL}/api/firms/${id}`, { name: newName });
      setFirms(firms.map(f => f.id === id ? resp.data : f));
      if (selectedFirm?.id === id) setSelectedFirm(resp.data);
    } catch (error) {
      alert("Firma güncellenemedi.");
    }
  };

  const handleDeleteFirm = async (id) => {
    if (!confirm("Firma ve tüm verileri silinecek. Emin misiniz?")) return;
    try {
      await axios.delete(`${API_URL}/api/firms/${id}`);
      const remainingFirms = firms.filter(f => f.id !== id);
      setFirms(remainingFirms);
      if (selectedFirm?.id === id) setSelectedFirm(remainingFirms[0]);
    } catch (error) {
      alert("Firma silinemedi.");
    }
  };

  const handleBackupFirm = async (firmId, firmName) => {
    try {
      const response = await axios.get(`${API_URL}/api/firms/${firmId}/backup`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `yedek_${firmName.replace(/\s+/g, '_')}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("Yedekleme başarısız oldu.");
    }
  };

  const handleFileUpload = async (e) => {
    if (!selectedFirm || !selectedProject) {
      alert("Lütfen önce bir firma ve iş (proje) seçiniz veya oluşturunuz.");
      e.target.value = null;
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/api/upload`, formData, getHeaders());
      setPoints(resp.data.points || []);
      setResults(resp.data.results || null);
      if (resp.data.points?.length > 0) setActiveTab('results');
    } catch (error) {
      alert('Hata: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleConversion = async (e, endpoint) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/convert/${endpoint}`, formData, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = endpoint.split('-to-')[1]; // ncn-to-dxf -> dxf, ncz-to-ncn -> ncn
      link.setAttribute('download', `donusturulmus_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Dönüştürme hatası: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleDownload = async (type) => {
    if (!selectedProject) {
      alert("Lütfen bir iş seçin.");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/export/${type}`, { points, results }, { 
        ...getHeaders(),
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kubaj_raporu_${selectedProject}.${type === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      alert('İndirme hatası: Ayarlarınızı ve bağlantınızı kontrol edin.');
    }
  };

  const handleSaveHakedis = async () => {
    if (!selectedProject) return alert("Lütfen önce bir iş seçiniz.");
    try {
      const payload = {
        details: hakedisDetails,
        data: hakedisData
      };
      await axios.post(`${API_URL}/api/hakedis`, payload, getHeaders());
      alert('Hakediş ve form bilgileri başarıyla kaydedildi.');
    } catch (error) {
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  const addHakedisRow = () => {
    setHakedisData([...hakedisData, { id: Date.now(), pozNo: '', aciklama: '', birim: '', miktar: 0, birimFiyat: 0 }]);
  };

  const updateHakedisRow = (id, field, value) => {
    setHakedisData(hakedisData.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const removeHakedisRow = (id) => {
    setHakedisData(hakedisData.filter(row => row.id !== id));
  };

  const totalHakedis = useMemo(() => {
    return hakedisData.reduce((sum, row) => sum + (row.miktar * row.birimFiyat), 0);
  }, [hakedisData]);

  const hakedisCalculation = useMemo(() => {
    if (!results) return { totalVolume: 0, totalAmount: 0 };
    const totalVolume = results.totalVolume || 0;
    const totalAmount = totalVolume * (hakedisDetails.birimFiyat || 0);
    return { totalVolume, totalAmount };
  }, [results, hakedisDetails.birimFiyat]);

  const handleDownloadHakedisPdf = async () => {
    if (!selectedProject) {
      alert("Lütfen bir iş seçin.");
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/api/export/hakedis-pdf`, {
        details: hakedisDetails,
        volumes: results,
        calculation: hakedisCalculation,
        manualData: hakedisData
      }, { 
        ...getHeaders(),
        responseType: 'blob' 
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hakedis_raporu_${selectedProject}_${hakedisDetails.hakedisNo || '1'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      alert('İndirme hatası: Ayarlarınızı ve bağlantınızı kontrol edin.');
    }
  };

  // İŞ İŞLEMLERİ
  const handleAddProject = async (firmId) => {
    const pName = prompt("Yeni İş Adı Giriniz:");
    if (!pName) return;
    try {
      const trimmedName = pName.trim();
      await axios.post(`${API_URL}/api/hakedis`, { details: {}, data: [] }, {
        headers: { 'x-firm-id': firmId, 'x-job-name': encodeURIComponent(trimmedName) }
      });
      // Listeyi tazele
      const r = await axios.get(`${API_URL}/api/firms/${firmId}/projects`);
      setProjects(r.data);
      setSelectedProject(trimmedName);
    } catch (err) {
      alert("İş eklenemedi.");
    }
  };

  const handleDeleteProject = async (firmId, projectName) => {
    if (!confirm(`"${projectName}" işini ve tüm verilerini silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API_URL}/api/firms/${firmId}/projects/${encodeURIComponent(projectName)}`);
      const r = await axios.get(`${API_URL}/api/firms/${firmId}/projects`);
      setProjects(r.data);
      if (selectedProject === projectName) setSelectedProject('');
    } catch (err) {
      alert("İş silinemedi.");
    }
  };

  const renderContent = () => {
    switch (activeModule) {
      case 'kubaj':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  Kubaj Analizi 
                  {selectedFirm ? (
                    <span style={{ color: 'var(--primary-color)', fontSize: '1rem', marginLeft: '10px' }}>
                      ({selectedFirm.name} <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /> {selectedProject || <span style={{color: '#f87171'}}>İş Seçilmedi</span>})
                    </span>
                  ) : (
                    <span style={{ color: '#f87171', fontSize: '1rem', marginLeft: '10px' }}>
                      (Firma Seçilmedi)
                    </span>
                  )}
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Hassas 3D Arazi Analizi ve Hacim Hesaplama</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <nav className="tab-nav">
                  <button onClick={() => setActiveTab('data')} className={`btn ${activeTab === 'data' ? '' : 'btn-secondary'}`}>
                    <Upload size={18} /> Veri
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
              </div>
            </header>

            <main>
              {activeTab === 'data' && (
                <section className="glass-card">
                  <div className="upload-zone" onClick={() => document.getElementById('fileInput').click()}>
                    <Upload size={48} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{loading ? 'Analiz Ediliyor...' : 'Excel veya NCN Yükleyin'}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>.xlsx, .xls ve .ncn formatları desteklenir.</p>
                    <input id="fileInput" type="file" accept=".xlsx,.xls,.ncn,.ncz" hidden onChange={handleFileUpload} />
                  </div>
                </section>
              )}

              {activeTab === 'table' && (
                <section className="glass-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Saha Ölçüm Noktaları</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th><th>X</th><th>Y</th><th>Mevcut</th><th>Proje</th><th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {points.length > 0 ? points.map((p, i) => (
                          <tr key={i}>
                            <td>{p.id}</td><td>{typeof p.x === 'number' ? p.x.toFixed(2) : p.x}</td><td>{typeof p.y === 'number' ? p.y.toFixed(2) : p.y}</td>
                            <td>{p.z_mevcut.toFixed(2)}</td><td>{p.z_proje.toFixed(2)}</td>
                            <td style={{ color: p.z_proje >= p.z_mevcut ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                              {p.z_proje >= p.z_mevcut ? 'DOLGU' : 'KAZI'}
                            </td>
                          </tr>
                        )) : <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Henüz veri yüklenmedi.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'results' && results && (
                <div className="anim-fade-in">
                  <div className="grid">
                    <div className="glass-card">
                      <h4 style={{ color: 'var(--text-muted)' }}>Kazı Hacmi</h4>
                      <div className="volume-value cut">{results.cutVolume.toLocaleString('tr-TR')} m³</div>
                    </div>
                    <div className="glass-card">
                      <h4 style={{ color: 'var(--text-muted)' }}>Dolgu Hacmi</h4>
                      <div className="volume-value fill">{results.fillVolume.toLocaleString('tr-TR')} m³</div>
                    </div>
                    <div className="glass-card">
                      <h4 style={{ color: 'var(--text-muted)' }}>Net Hacim</h4>
                      <div className="volume-value total">{results.totalVolume.toLocaleString('tr-TR')} m³</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
                    <button onClick={() => handleDownload('pdf')} className="btn" style={{ background: '#ef4444' }}>
                      <FileText size={18} /> PDF Rapor
                    </button>
                    <button onClick={() => handleDownload('excel')} className="btn" style={{ background: '#10b981' }}>
                      <Download size={18} /> Excel Rapor
                    </button>
                  </div>

                  <section className="glass-card" style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Hızlı 3D Arazi Modeli</h3>
                    <div style={{ height: '400px', background: '#0a0a0a', borderRadius: '12px' }}>
                      <Canvas camera={{ position: [20, 20, 20], fov: 45 }}>
                        <Terrain3D points={points} />
                      </Canvas>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'map' && (
                <section className="glass-card" style={{ height: '600px', padding: 0, background: '#000', overflow: 'hidden' }}>
                  <Canvas camera={{ position: [30, 30, 30], fov: 40 }}>
                    <Terrain3D points={points} />
                  </Canvas>
                </section>
              )}
            </main>
          </div>
        );
      case 'hakedis':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  Hakediş Yönetimi 
                  {selectedFirm ? (
                    <span style={{ color: 'var(--primary-color)', fontSize: '1rem', marginLeft: '10px' }}>
                      ({selectedFirm.name} <ChevronRight size={14} style={{ verticalAlign: 'middle' }} /> {selectedProject || <span style={{color: '#f87171'}}>İş Seçilmedi</span>})
                    </span>
                  ) : (
                    <span style={{ color: '#f87171', fontSize: '1rem', marginLeft: '10px' }}>
                      (Firma Seçilmedi)
                    </span>
                  )}
                </h2>
                <p style={{ color: 'var(--text-muted)' }}>Kubaj Verileri ve Hakediş Hesaplamaları</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleSaveHakedis} className="btn" style={{ background: 'var(--primary-color)' }}>
                  <Upload size={18} /> Verileri Kaydet
                </button>
                <button onClick={handleDownloadHakedisPdf} className="btn" style={{ background: '#ef4444' }}>
                  <FileText size={18} /> PDF İndir
                </button>
              </div>
            </header>

            <main>
              <section className="glass-card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--primary-color)' }}>Hakediş Bilgi Formu</h3>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>İşin Adı</label>
                    <input 
                      type="text" 
                      value={hakedisDetails.isinAdi} 
                      onChange={(e) => setHakedisDetails(prev => ({...prev, isinAdi: e.target.value}))} 
                      className="table-input" 
                      placeholder="İşin adını giriniz..."
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Yüklenici Firma</label>
                    <input 
                      type="text" 
                      value={hakedisDetails.yukleniciFirma} 
                      onChange={(e) => setHakedisDetails(prev => ({...prev, yukleniciFirma: e.target.value}))} 
                      className="table-input" 
                      placeholder="Yüklenici firma..."
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Hakediş No</label>
                    <input 
                      type="text" 
                      value={hakedisDetails.hakedisNo} 
                      onChange={(e) => setHakedisDetails(prev => ({...prev, hakedisNo: e.target.value}))} 
                      className="table-input" 
                      placeholder="Örn: 01"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Birim Fiyat (TL/m³)</label>
                    <input 
                      type="text" 
                      value={hakedisDetails.birimFiyat ?? ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        if (!isNaN(val) || val === '') {
                          setHakedisDetails(prev => ({...prev, birimFiyat: val}));
                        }
                      }} 
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setHakedisDetails(prev => ({...prev, birimFiyat: val}));
                      }}
                      className="table-input" 
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Hazırlayan Adı Soyadı</label>
                    <input 
                      type="text" 
                      value={hakedisDetails.imzaciAdi} 
                      onChange={(e) => setHakedisDetails(prev => ({...prev, imzaciAdi: e.target.value}))} 
                      className="table-input" 
                      placeholder="Hazırlayan imzacısı..."
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>Kontrol/Onay Adı Soyadı</label>
                    <input 
                      type="text" 
                      value={hakedisDetails.kontrolEdenAdi} 
                      onChange={(e) => setHakedisDetails(prev => ({...prev, kontrolEdenAdi: e.target.value}))} 
                      className="table-input" 
                      placeholder="Kontrol eden imzacısı..."
                    />
                  </div>
                </div>

                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'center' }}>
                  <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Toplam Hakediş Tutarı</h4>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    {(hakedisCalculation.totalAmount + totalHakedis).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                  </div>
                </div>
              </section>

              <section className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem' }}>Manuel İş Kalemleri</h3>
                  <button onClick={addHakedisRow} className="btn-icon-small" style={{ background: 'var(--primary-color)', color: 'white' }}>
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Poz No</th>
                        <th>Açıklama</th>
                        <th>Birim</th>
                        <th>Miktar</th>
                        <th>B.Fiyat</th>
                        <th>Tutar</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {hakedisData.map((row) => (
                        <tr key={row.id}>
                          <td><input value={row.pozNo} onChange={e => updateHakedisRow(row.id, 'pozNo', e.target.value)} className="table-input" style={{ width: '80px' }} /></td>
                          <td><input value={row.aciklama} onChange={e => updateHakedisRow(row.id, 'aciklama', e.target.value)} className="table-input" /></td>
                          <td><input value={row.birim} onChange={e => updateHakedisRow(row.id, 'birim', e.target.value)} className="table-input" style={{ width: '60px' }} /></td>
                          <td><input type="number" value={row.miktar} onChange={e => updateHakedisRow(row.id, 'miktar', parseFloat(e.target.value) || 0)} className="table-input" style={{ width: '80px' }} /></td>
                          <td><input type="number" value={row.birimFiyat} onChange={e => updateHakedisRow(row.id, 'birimFiyat', parseFloat(e.target.value) || 0)} className="table-input" style={{ width: '80px' }} /></td>
                          <td style={{ fontWeight: 600 }}>{(row.miktar * row.birimFiyat).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                          <td><button onClick={() => removeHakedisRow(row.id)} className="btn-icon-small" style={{ color: 'var(--error-color)' }}><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                      {hakedisData.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Henüz manuel kalem eklenmedi.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="glass-card">
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Hakediş Özeti (Kubaj Analizinden)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="hakedis-table">
                    <thead>
                      <tr>
                        <th>Analiz Türü</th>
                        <th>Toplam Hacim (m³)</th>
                        <th>Birim Fiyat</th>
                        <th>Toplam Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Kazı Hacmi</td>
                        <td>{(results?.cutVolume || 0).toLocaleString('tr-TR')} m³</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Dolgu Hacmi</td>
                        <td>{(results?.fillVolume || 0).toLocaleString('tr-TR')} m³</td>
                        <td>-</td>
                        <td>-</td>
                      </tr>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <td style={{ fontWeight: 800, color: 'var(--primary-color)' }}>Net Hacim (Hakedişe Esas)</td>
                        <td style={{ fontWeight: 800 }}>{(hakedisCalculation.totalVolume || 0).toLocaleString('tr-TR')} m³</td>
                        <td style={{ fontWeight: 800 }}>{(hakedisDetails.birimFiyat || 0).toLocaleString('tr-TR')} ₺</td>
                        <td style={{ fontWeight: 800, color: 'var(--primary-color)', fontSize: '1.1rem' }}>
                          {(hakedisCalculation.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </div>
        );
      case 'converter':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Format Dönüştürücü</h2>
                <p style={{ color: 'var(--text-muted)' }}>NCN (Netcad) ve DXF (AutoCAD) Arası Hızlı Dönüşüm</p>
              </div>
            </header>
            <main className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <section className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                  <FileText size={48} />
                </div>
                <h3 style={{ marginBottom: '1rem' }}>NCN → DXF</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Netcad nokta verilerini AutoCAD uyumlu DXF formatına dönüştürün.
                </p>
                <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <Upload size={18} style={{ marginRight: '8px' }} />
                  Dosya Yükle (.ncn)
                  <input 
                    type="file" 
                    accept=".ncn" 
                    hidden 
                    onChange={(e) => handleConversion(e, 'ncn-to-dxf')} 
                  />
                </label>
              </section>

              <section className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem', color: '#10b981' }}>
                  <RefreshCw size={48} />
                </div>
                <h3 style={{ marginBottom: '1rem' }}>DXF → NCN</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  AutoCAD DXF dosyalarındaki nokta ve yazıları NCN formatına aktarın.
                </p>
                <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', background: '#10b981' }}>
                  <Upload size={18} style={{ marginRight: '8px' }} />
                  Dosya Yükle (.dxf)
                  <input 
                    type="file" 
                    accept=".dxf" 
                    hidden 
                    onChange={(e) => handleConversion(e, 'dxf-to-ncn')} 
                  />
                </label>
              </section>

              <section className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>
                  <FileCheck size={48} />
                </div>
                <h3 style={{ marginBottom: '1rem' }}>NCZ → DXF</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Netcad NCZ dosyasından koordinatları ayıklayıp DXF'e dönüştürün.
                </p>
                <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                  <Upload size={18} style={{ marginRight: '8px' }} />
                  Dosya Yükle (.ncz)
                  <input 
                    type="file" 
                    accept=".ncz" 
                    hidden 
                    onChange={(e) => handleConversion(e, 'ncz-to-dxf')} 
                  />
                </label>
              </section>

              <section className="glass-card" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem', color: '#6366f1' }}>
                  <RefreshCw size={48} />
                </div>
                <h3 style={{ marginBottom: '1rem' }}>NCZ → NCN</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  NCZ çizim dosyasındaki tüm noktaları NCN formatına aktarın.
                </p>
                <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', background: '#6366f1' }}>
                  <Upload size={18} style={{ marginRight: '8px' }} />
                  Dosya Yükle (.ncz)
                  <input 
                    type="file" 
                    accept=".ncz" 
                    hidden 
                    onChange={(e) => handleConversion(e, 'ncz-to-ncn')} 
                  />
                </label>
              </section>
            </main>
            <div style={{ marginTop: '2rem', padding: '1rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Not:</strong> Dönüştürme işlemi sırasında noktalar ve nokta adları (yazılar) otomatik olarak eşleştirilir. 
                DXF dosyalarında sadece POINT ve TEXT objeleri işlenmektedir.
              </p>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Ayarlar</h2>
                <p style={{ color: 'var(--text-muted)' }}>Profil, Firma ve Uygulama Tercihleri</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    await axios.post(`${API_URL}/api/settings`, settings);
                    alert("Ayarlar başarıyla kaydedildi.");
                  } catch(e) { alert("Kaydetme hatası!"); }
                }} 
                className="btn"
              >
                Değişiklikleri Kaydet
              </button>
            </header>

            <main className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
              <section className="glass-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Building2 size={20} color="var(--primary-color)" /> Kurumsal Bilgiler
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Firma/Kurum Adı</label>
                    <input 
                      className="table-input" 
                      value={settings.companyName} 
                      onChange={e => setSettings({...settings, companyName: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Adres / İletişim</label>
                    <textarea 
                      className="table-input" 
                      style={{ height: '80px', padding: '10px' }}
                      value={settings.companyAddress} 
                      onChange={e => setSettings({...settings, companyAddress: e.target.value})} 
                    />
                  </div>
                </div>
              </section>

              <section className="glass-card">
                <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <HardHat size={20} color="var(--primary-color)" /> Profil ve İmzalar
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ad Soyad</label>
                    <input 
                      className="table-input" 
                      value={settings.userName} 
                      onChange={e => setSettings({...settings, userName: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ünvan</label>
                    <input 
                      className="table-input" 
                      value={settings.userTitle} 
                      onChange={e => setSettings({...settings, userTitle: e.target.value})} 
                    />
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '0.5rem 0' }} />
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Varsayılan Hazırlayan (İmza)</label>
                    <input 
                      className="table-input" 
                      placeholder="Örn: Muhammed Bilici - Harita Mühendisi"
                      value={settings.defaultPreparer} 
                      onChange={e => setSettings({...settings, defaultPreparer: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Varsayılan Kontrol/Onay (İmza)</label>
                    <input 
                      className="table-input" 
                      value={settings.defaultController} 
                      onChange={e => setSettings({...settings, defaultController: e.target.value})} 
                    />
                  </div>
                </div>
              </section>
            </main>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Mobil Toggle */}
      <button 
        className="sidebar-toggle-mobile"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        title={mobileMenuOpen ? "Menüyü Kapat" : "Menüyü Aç"}
      >
        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Karartma Overlay (Mobilde) */}
      <div 
        className={`overlay ${mobileMenuOpen ? 'visible' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '8px' }}>
            <MapIcon size={24} color="white" />
          </div>
          {!isSidebarCollapsed && (
            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.5px' }}>Harita Portalı</span>
          )}
        </div>

        {!isSidebarCollapsed && (
          <div style={{ padding: '0 1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '1rem' }}>ANA MENÜ</span>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navigationItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    width: '100%',
                    textAlign: 'left',
                    background: activeModule === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    borderLeft: activeModule === item.id ? '3px solid var(--primary-color)' : '3px solid transparent',
                    color: activeModule === item.id ? 'var(--primary-color)' : 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.icon}
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}

        {!isSidebarCollapsed && (
          <div style={{ padding: '0 1rem 1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FİRMALAR VE İŞLER</span>
              <button onClick={() => setShowAddFirm(!showAddFirm)} className="btn-icon-small">
                <Plus size={16} />
              </button>
            </div>

            {showAddFirm && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)' }} className="anim-fade-in">
                <input 
                  type="text" 
                  placeholder="Yeni Firma Adı..." 
                  className="table-input" 
                  value={newFirmName} 
                  onChange={e => setNewFirmName(e.target.value)}
                  style={{ marginBottom: '0.5rem' }}
                />
                <button onClick={handleAddFirm} className="btn" style={{ width: '100%', padding: '0.4rem', justifyContent: 'center' }}>Firma Ekle</button>
              </div>
            )}

            <div className="firm-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {firms.map(firm => (
                <div key={firm.id} className="firm-group">
                  <div 
                    className={`nav-item nav-item-firm ${selectedFirm?.id === firm.id ? 'active' : ''}`}
                    onClick={() => setSelectedFirm(firm)}
                    style={{ 
                      padding: '0.75rem', 
                      borderRadius: '10px', 
                      borderLeft: 'none', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      background: selectedFirm?.id === firm.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      <Building2 size={18} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{firm.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleBackupFirm(firm.id, firm.name); }} className="btn-icon-small" title="Yedek Al">
                        <Download size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleAddProject(firm.id); }} className="btn-icon-small" title="İş Ekle">
                        <PlusSquare size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); const newName = prompt('Yeni firma adı:', firm.name); if(newName) handleUpdateFirm(firm.id, newName); }} className="btn-icon-small" title="Düzenle">
                        <Pencil size={14} />
                      </button>
                      {firm.id !== 'default' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteFirm(firm.id); }} className="btn-icon-small" style={{ color: 'var(--error-color)' }} title="Sil">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedFirm?.id === firm.id && (
                    <div style={{ paddingLeft: '2rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '4px' }} className="anim-fade-in">
                      {projects.length > 0 ? projects.map(proj => (
                        <div 
                          key={proj}
                          className={`nav-item ${selectedProject === proj ? 'active' : ''}`}
                          onClick={() => setSelectedProject(proj)}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            borderRadius: '8px', 
                            borderLeft: 'none', 
                            fontSize: '0.85rem', 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            background: selectedProject === proj ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <FileCheck size={14} />
                            <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{proj}</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(firm.id, proj); }} className="btn-icon-small" style={{ opacity: 0.6 }} title="İşi Sil">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )) : (
                        <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>Henüz iş eklenmedi.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <X size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="header-title-group">
            <h1 className="header-title" style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Muhammed BİLİCİ - Harita Çözümleri
            </h1>
            <p className="header-subtitle" style={{ fontSize: 'clamp(0.7rem, 2vw, 0.875rem)', color: 'var(--text-muted)' }}>
              Mühendislik ve CBS Portalı
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--sidebar-bg)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
              <Info size={18} color="var(--primary-color)" />
            </div>
          </div>
        </header>

        {renderContent()}
      </div>
    </div>
  );
}

export default App;
