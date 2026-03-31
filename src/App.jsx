import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Upload, Map as MapIcon, BarChart3, Table as TableIcon, 
  FileText, Download, LayoutDashboard, Settings, 
  Menu, X, ChevronRight, HardHat, Info, Pencil, Trash2,
  Plus, PlusSquare, Building2, FileCheck, RefreshCw,
  PlusSquare, FileCheck, Building2, FileCheck, RefreshCw,
  LogOut, CircleUser, BookOpen, Ruler, Square, Target, MousePointer2, Save, Factory, Sparkles, TrendingDown, TrendingUp, AlertCircle
} from 'lucide-react';
import GuideContent from './GuideContent';
import { Canvas, useFrame, extend, useThree } from 'react-three-fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  MapContainer, TileLayer, Marker, Popup, useMap, 
  LayersControl, useMapEvents, Polyline, Polygon, Tooltip 
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet Marker Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Helper component for map flying
function FlyToLocation({ lat, lng }) {
  const map = useMap();
  React.useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 16, { duration: 2 });
    }
  }, [lat, lng, map]);
  return null;
}

extend({ OrbitControls });

function MapControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  useFrame(() => controlsRef.current && controlsRef.current.update());
  return <orbitControls ref={controlsRef} args={[camera, gl.domElement]} enableDamping={true} />;
}

// AI Assistant Insights Card Component
function AIAssistantCard({ insights }) {
  if (!insights || insights.length === 0) return null;
  
  return (
    <div className="glass-card ai-card anim-fade-in" style={{ marginBottom: '2rem' }}>
      <div className="ai-badge">
        <Sparkles size={14} /> AI Saha Asistanı
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {insights.map((insight, idx) => (
          <div key={idx} className={`ai-insight-item ${insight.type}`}>
            <div style={{ color: insight.type === 'critical' ? 'var(--error-color)' : (insight.type === 'warning' ? 'var(--warning-color)' : 'var(--accent-color)') }}>
              {insight.icon}
            </div>
            <div style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#fff' }}>
              {insight.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3D Arazi Bileşeni
function Terrain3D({ points, onSelectPoint, selectedPoints = [], isProfileMode = false }) {
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
    // groupRef.current.rotation.z += 0.005; // Auto-rotation kapatıldı
  });

  if (normalizedPoints.length === 0) return null;

  return (
    <group ref={groupRef} rotation={[-Math.PI / 4, 0, 0]}>
      {normalizedPoints.map((p, i) => (
        <group 
          key={`pt-${i}`}
          onClick={(e) => {
            if (isProfileMode && onSelectPoint) {
              e.stopPropagation();
              onSelectPoint({ ...points[i], _index: i });
            }
          }}
        >
          <mesh position={[p.x, p.y, p.z_m]}>
            <sphereGeometry args={[isProfileMode && selectedPoints.some(sp => sp._index === i) ? 0.6 : 0.3, 16, 16]} />
            <meshStandardMaterial 
              color={isProfileMode && selectedPoints.some(sp => sp._index === i) ? "#facc15" : "#4ade80"} 
              emissive={isProfileMode && selectedPoints.some(sp => sp._index === i) ? "#facc15" : "#000000"}
            />
          </mesh>
          <mesh position={[p.x, p.y, p.z_p]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color={isProfileMode && selectedPoints.some(sp => sp._index === i) ? "#facc15" : "#3b82f6"} transparent opacity={0.6} />
          </mesh>
          <mesh position={[p.x, p.y, (p.z_m + p.z_p) / 2]}>
            <cylinderGeometry args={[0.05, 0.05, Math.abs(p.z_p - p.z_m) || 0.1]} />
            <meshStandardMaterial color={isProfileMode && selectedPoints.some(sp => sp._index === i) ? "#facc15" : (p.z_p >= p.z_m ? "#4ade80" : "#f87171")} />
          </mesh>
        </group>
      ))}
      <gridHelper args={[40, 20, "#444", "#222"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 20]} intensity={1} />
    </group>
  );
}

function Login({ username, password, setUsername, setPassword, error, loading, onLogin }) {
  return (
    <div className="login-container">
      <div className="login-card anim-scale-in">
        <div className="login-logo">
          <HardHat size={32} color="white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Harita Portalı</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Lütfen devam etmek için giriş yapın</p>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={onLogin}>
          <div className="login-input-group">
            <label>Kullanıcı Adı</label>
            <input 
              type="text" 
              className="login-input" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div className="login-input-group">
            <label>Şifre</label>
            <input 
              type="password" 
              className="login-input" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', padding: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          © 2024 Muhammed BİLİCİ - Tüm Hakları Saklıdır.
        </p>
      </div>
    </div>
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

  // AUTH STATE
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('auth_username'));
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('auth_role'));
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ADMIN PANEL STATE
  const [adminUsers, setAdminUsers] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [newUserForm, setNewUserForm] = useState({ username: '', password: '', role: 'user' });
  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [adminSettingsTab, setAdminSettingsTab] = useState('profile');
  
  // Profil (Kesit) State
  const [isProfileMode, setIsProfileMode] = useState(false);
  const [selectedProfilePoints, setSelectedProfilePoints] = useState([]);
  
  const lastFetchedRef = useRef({ firmId: null, jobName: null });
  
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
  const [archiveProjects, setArchiveProjects] = useState([]);
  const [archiveSearch, setArchiveSearch] = useState('');

  // Parsel ve Harita State
  const [mapLat, setMapLat] = useState('');
  const [mapLng, setMapLng] = useState('');
  const [targetLocation, setTargetLocation] = useState(null);

  // Advanced Map Tools State
  const [measureMode, setMeasureMode] = useState(null); // 'distance' | 'area'
  const [measurePoints, setMeasurePoints] = useState([]);
  const [calculatedResult, setCalculatedResult] = useState('');

  // PWA Offline / Online States
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Senkronizasyon Mantığı
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // İnternet geldiğinde bekleyen verileri gönder (opsiyonel geliştirme)
      console.log("İnternet geldi, senkronize ediliyor...");
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // OTOMATİK SENKRONİZASYON (İnternet Gelince)
  useEffect(() => {
    if (isOnline) {
      const syncData = async () => {
        const pendingKubaj = localStorage.getItem('pending_kubaj');
        const pendingHakedis = localStorage.getItem('pending_hakedis');

        if (pendingKubaj) {
          try {
            const data = JSON.parse(pendingKubaj);
            await axios.post(`${API_URL}/api/kubaj`, { points: data.points }, { headers: data.headers });
            localStorage.removeItem('pending_kubaj');
            console.log("Offline Kubaj verileri senkronize edildi.");
          } catch(e) { console.error("Kubaj senkronizasyon hatası", e); }
        }

        if (pendingHakedis) {
          try {
            const data = JSON.parse(pendingHakedis);
            await axios.post(`${API_URL}/api/hakedis`, data.payload, { headers: data.headers });
            localStorage.removeItem('pending_hakedis');
            console.log("Offline Hakediş verileri senkronize edildi.");
          } catch(e) { console.error("Hakediş senkronizasyon hatası", e); }
        }
      };
      syncData();
    }
  }, [isOnline, API_URL]);

  // AI Assistant State
  const [aiInsights, setAiInsights] = useState([]);

  // AI Analysis Logic
  const performAIAnalysis = useCallback((newPoints, currentVolume = null) => {
    const insights = [];
    
    // 1. Elevation Anomaly Detection (Kot Farkı Analizi)
    if (newPoints && newPoints.length > 1) {
      let anomalyFound = false;
      for (let i = 0; i < newPoints.length - 1; i++) {
        const p1 = newPoints[i];
        const p2 = newPoints[i+1];
        const zDiff = Math.abs((p1.z_mevcut || p1.z) - (p2.z_mevcut || p2.z));
        
        if (zDiff > 5) {
          insights.push({
            type: 'critical',
            text: `Anomali Tespiti: ${p1.no || i} ve ${p2.no || i+1} numaralı noktalar arasında ${zDiff.toFixed(2)}m kot farkı var. Lütfen kontrol edin.`,
            icon: <AlertCircle size={18} />
          });
          anomalyFound = true;
          break; // Sadece ilk büyük hatayı göster
        }
      }
      if (!anomalyFound) {
        insights.push({
          type: 'success',
          text: 'Kot Analizi: Noktalar arası kot geçişleri normal görünüyor.',
          icon: <FileCheck size={18} />
        });
      }
    }

    // 2. Progress Analysis (İlerleme Analizi)
    if (currentVolume !== null && archiveProjects && archiveProjects.length > 0) {
      const pastVersions = archiveProjects.filter(p => p.jobName === selectedProject && p.firmName === selectedFirm?.name);
      if (pastVersions.length > 0) {
        // En son kaydedilen versiyonu bul
        const lastVersion = pastVersions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
        const oldVol = lastVersion.kubaj?.totalVolume || 0;
        const diff = currentVolume - oldVol;
        const percent = oldVol !== 0 ? ((diff / oldVol) * 100).toFixed(1) : 0;

        if (diff > 0) {
          insights.push({
            type: 'warning',
            text: `İlerleme Analizi: Proje hacmi geçen kayda göre ${percent}% arttı. Artış hızı: ${diff.toLocaleString('tr-TR')} m³.`,
            icon: <TrendingUp size={18} />
          });
        } else if (diff < 0) {
          insights.push({
            type: 'critical',
            text: `Performans Uyarısı: İlerleme hızı geçen aya göre ${Math.abs(percent)}% daha düşük.`,
            icon: <TrendingDown size={18} />
          });
        }
      }
    }

    setAiInsights(insights);
  }, [selectedProject, selectedFirm, archiveProjects]);

  // Calculations
  const calculateDistance = (points) => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < points.length - 1; i++) {
      total += L.latLng(points[i]).distanceTo(L.latLng(points[i+1]));
    }
    return total;
  };

  const calculateArea = (points) => {
    if (points.length < 3) return 0;
    // Simple Shoelace Formula for Area (Planar approximation for small areas)
    let area = 0;
    const factor = 111319.9; // approx meters per degree
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const x1 = points[i].lng * factor * Math.cos(points[i].lat * Math.PI / 180);
      const y1 = points[i].lat * factor;
      const x2 = points[j].lng * factor * Math.cos(points[j].lat * Math.PI / 180);
      const y2 = points[j].lat * factor;
      area += (x1 * y2) - (x2 * y1);
    }
    return Math.abs(area) / 2;
  };

  useEffect(() => {
    if (measurePoints.length > 0) {
      if (measureMode === 'distance') {
        const d = calculateDistance(measurePoints);
        setCalculatedResult(d > 1000 ? `${(d/1000).toFixed(3)} km` : `${Math.round(d)} m`);
      } else if (measureMode === 'area') {
        const a = calculateArea(measurePoints);
        setCalculatedResult(a > 10000 ? `${(a/10000).toFixed(2)} Ha (Hektar)` : `${Math.round(a)} m²`);
      }
    } else {
      setCalculatedResult('');
    }
  }, [measurePoints, measureMode]);

  const handleDownloadKml = () => {
    if (measurePoints.length === 0) return;
    
    let coordinatesStr = measurePoints.map(p => `${p.lng},${p.lat},0`).join(' ');
    if (measureMode === 'area') coordinatesStr += ` ${measurePoints[0].lng},${measurePoints[0].lat},0`;

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Portal Olcum Export</name>
    <Style id="polyStyle">
      <LineStyle><color>ff3b82f6</color><width>3</width></LineStyle>
      <PolyStyle><color>4d3b82f6</color></PolyStyle>
    </Style>
    <Placemark>
      <name>${measureMode === 'area' ? 'Olculen Alan' : 'Olculen Mesafe'}</name>
      <styleUrl>#polyStyle</styleUrl>
      ${measureMode === 'area' ? `
      <Polygon>
        <outerBoundaryIs><LinearRing><coordinates>${coordinatesStr}</coordinates></LinearRing></outerBoundaryIs>
      </Polygon>` : `
      <LineString>
        <coordinates>${coordinatesStr}</coordinates>
      </LineString>`}
    </Placemark>
  </Document>
</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mesafe_ölçüm_${new Date().getTime()}.kml`;
    a.click();
  };

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (measureMode) {
          setMeasurePoints(prev => [...prev, e.latlng]);
        }
      }
    });
    return null;
  };

  const navigationItems = [
    { id: 'kubaj', label: 'Kubaj Analizi', icon: <BarChart3 size={18} /> },
    { id: 'parsel', label: 'Parsel ve Harita', icon: <MapIcon size={18} /> },
    { id: 'hakedis', label: 'Hakediş Yönetimi', icon: <FileCheck size={18} /> },
    { id: 'archive', label: 'İş Takip Paneli', icon: <LayoutDashboard size={18} /> },
    { id: 'converter', label: 'Format Dönüştürücü', icon: <RefreshCw size={18} /> },
    { id: 'settings', label: 'Ayarlar', icon: <Settings size={18} /> },
    { id: 'guide', label: 'Kullanım Kılavuzu', icon: <BookOpen size={18} /> },
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

  // AUTH Header Hazırla
  const getAuthHeaders = React.useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return token ? { headers: { 'Authorization': `Bearer ${token}` } } : { headers: {} };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const resp = await axios.post(`${API_URL}/api/auth/login`, { username: loginUsername, password: loginPassword });
      localStorage.setItem('auth_token', resp.data.token);
      localStorage.setItem('auth_username', resp.data.username);
      localStorage.setItem('auth_role', resp.data.role);
      setAuthToken(resp.data.token);
      setCurrentUser(resp.data.username);
      setCurrentRole(resp.data.role);
      setLoginUsername('');
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Giriş yapılamadı.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_role');
    setAuthToken(null);
    setCurrentUser(null);
    setCurrentRole(null);
  };

  const fetchAdminData = async () => {
    try {
      const [usersRes, logsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/users`, getAuthHeaders()),
        axios.get(`${API_URL}/api/admin/login-logs`, getAuthHeaders())
      ]);
      setAdminUsers(usersRes.data);
      setLoginLogs(logsRes.data);
    } catch(e) { console.error('Admin veri çekilemedi', e); }
  };

  const handleAddUser = async () => {
    if (!newUserForm.username || !newUserForm.password) return alert('Kullanıcı adı ve şifre gereklidir.');
    try {
      await axios.post(`${API_URL}/api/admin/users`, newUserForm, getAuthHeaders());
      setNewUserForm({ username: '', password: '', role: 'user' });
      await fetchAdminData();
    } catch(e) { alert(e.response?.data?.error || 'Kullanıcı eklenemedi.'); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${id}`, getAuthHeaders());
      await fetchAdminData();
    } catch(e) { alert(e.response?.data?.error || 'Silinemedi.'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/auth/change-password`, changePasswordForm, getAuthHeaders());
      alert('Şifreniz başarıyla değiştirildi!');
      setChangePasswordForm({ currentPassword: '', newPassword: '' });
    } catch(e) { alert(e.response?.data?.error || 'Şifre değiştirilemedi.'); }
  };

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

  // Arşiv Projelerini Yükle
  React.useEffect(() => {
    if (activeModule === 'archive') {
      axios.get(`${API_URL}/api/projects/all`).then(r => {
        setArchiveProjects(r.data);
      });
    }
  }, [activeModule, API_URL]);

  // Hakediş Bilgilerini Seçimle Senkronize Et (Otomatik Doldurma)
  React.useEffect(() => {
    if (selectedProject || selectedFirm) {
      setHakedisDetails(prev => {
        const needsUpdatePath = !prev.isinAdi || prev.isinAdi === '';
        const needsUpdateFirm = !prev.yukleniciFirma || prev.yukleniciFirma === '';
        
        if (needsUpdatePath || needsUpdateFirm) {
          return {
            ...prev,
            isinAdi: needsUpdatePath ? (selectedProject || '') : prev.isinAdi,
            yukleniciFirma: needsUpdateFirm ? (selectedFirm?.name || '') : prev.yukleniciFirma
          };
        }
        return prev;
      });
    }
  }, [selectedProject, selectedFirm]);

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
              birimFiyat: hResp.data.details.birimFiyat ?? 0,
              isinAdi: hResp.data.details.isinAdi || selectedProject || '',
              yukleniciFirma: hResp.data.details.yukleniciFirma || selectedFirm?.name || ''
            });
            setHakedisData(Array.isArray(hResp.data.data) ? hResp.data.data : []);
        } else {
            // Eski yapı veya boş veri ise temizle
            const legacyData = Array.isArray(hResp.data) ? hResp.data : [];
            setHakedisData(legacyData);
            setHakedisDetails({ 
              birimFiyat: 0, 
              isinAdi: selectedProject || '', 
              yukleniciFirma: selectedFirm?.name || '', 
              hakedisNo: '01', 
              imzaciAdi: settings.defaultPreparer || settings.userName || '', 
              kontrolEdenAdi: settings.defaultController || '' 
            });
        }

        const kResp = await axios.get(`${API_URL}/api/kubaj`, getHeaders());
        setPoints(kResp.data.points || []);
        setResults(kResp.data.results || null);
        
        // AI Analizini tetikle
        performAIAnalysis(kResp.data.points || [], kResp.data.results?.totalVolume);
        
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
      
      // AI Analizini tetikle
      performAIAnalysis(resp.data.points || [], resp.data.results?.totalVolume);
      
      // Analiz yüklendiğinde hakediş bilgilerini de güncelle (eğer boşsa)
      setHakedisDetails(prev => ({
        ...prev,
        isinAdi: prev.isinAdi || selectedProject || '',
        yukleniciFirma: prev.yukleniciFirma || selectedFirm?.name || ''
      }));
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
    const payload = { details: hakedisDetails, data: hakedisData };
    const headers = getHeaders().headers;

    if (!isOnline) {
      localStorage.setItem('pending_hakedis', JSON.stringify({ payload, headers }));
      alert('Saha Modu: İnternet yok, veriler telefonunuza kaydedildi. Bağlantı gelince otomatik senkronize edilecek.');
      return;
    }

    try {
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

  const profileData = useMemo(() => {
    if (selectedProfilePoints.length !== 2) return null;
    const [pA, pB] = selectedProfilePoints;
    
    const distAB = Math.hypot(pB.x - pA.x, pB.y - pA.y);
    if (distAB === 0) return null;

    const dx = (pB.x - pA.x) / distAB;
    const dy = (pB.y - pA.y) / distAB;

    const tolerance = 15;
    const profilePoints = points.map(p => {
      const apx = p.x - pA.x;
      const apy = p.y - pA.y;
      const projection = apx * dx + apy * dy;
      const perpDist = Math.abs(apx * -dy + apy * dx);
      return { p, projection, perpDist };
    }).filter(item => item.perpDist <= tolerance && item.projection >= -tolerance && item.projection <= distAB + tolerance)
      .sort((a, b) => a.projection - b.projection);

    return { 
      points: profilePoints.map(item => ({...item.p, dist: item.projection})), 
      distAB 
    };
  }, [selectedProfilePoints, points]);

  const recalculateKubaj = (pts) => {
    let cut = 0, fill = 0;
    pts.forEach(p => {
        const diff = (parseFloat(p.z_proje) || 0) - (parseFloat(p.z_mevcut) || 0);
        if (diff > 0) fill += diff * 25; else cut += Math.abs(diff) * 25;
    });
    setResults({ cutVolume: cut, fillVolume: fill, totalVolume: fill - cut });
  };

  const handlePointChange = (index, field, value) => {
    const newPoints = [...points];
    const val = field === 'id' ? value : parseFloat(value);
    newPoints[index] = { ...newPoints[index], [field]: field === 'id' ? value : (isNaN(val) ? 0 : val) };
    setPoints(newPoints);
    recalculateKubaj(newPoints);
  };

  const handleAddPoint = () => {
    const newPoints = [...points, { id: `N${points.length + 1}`, x: 0, y: 0, z_mevcut: 0, z_proje: 0 }];
    setPoints(newPoints);
    recalculateKubaj(newPoints);
  };

  const handleDeletePoint = (index) => {
    const newPoints = points.filter((_, i) => i !== index);
    setPoints(newPoints);
    recalculateKubaj(newPoints);
  };
  
  const savePointsToDb = async () => {
    if (!selectedFirm || !selectedProject) return alert("Firma veya iş seçili değil.");
    try {
      setLoading(true);
      const kubajData = { points, results };
      await axios.post(`${API_URL}/api/kubaj`, kubajData, getHeaders());
      alert("Düzenlemeler veritabanına başarıyla kaydedildi!");
    } catch(e) {
      alert("Kaydetme hatası: " + (e.response?.data || e.message));
    } finally {
      setLoading(false);
    }
  };


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

  const handleDownloadSummaryPdf = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/export/summary-pdf`, {
        projects: archiveProjects
      }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `toplu_proje_ozeti_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("PDF oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500 * 1024) {
        alert("Dosya boyutu çok büyük! Lütfen 500KB altında bir logo seçin.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({...prev, companyLogo: reader.result}));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderContent = () => {
    switch (activeModule) {
      case 'kubaj':
        return (
          <div className="module-container anim-fade-in">
            {!isOnline && (
              <div style={{ 
                background: 'linear-gradient(90deg, #f59e0b, #d97706)', 
                color: 'white', 
                padding: '8px 20px', 
                textAlign: 'center', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                borderRadius: '8px', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
              }}>
                <Sparkles size={16} /> SAHA MODU AKTİF (Çevrimdışı Çalışıyorsunuz - Değişiklikler Yerel Olarak Saklanır)
              </div>
            )}
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
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{loading ? 'Analiz Ediliyor...' : 'Excel, NCN veya NCZ Yükleyin'}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>.xlsx, .xls, .ncn ve .ncz formatları desteklenir.</p>
                    <input id="fileInput" type="file" accept=".xlsx,.xls,.ncn,.ncz" hidden onChange={handleFileUpload} />
                  </div>
                </section>
              )}

              {activeTab === 'table' && (
                <section className="glass-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Canlı Nokta Editörü</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleAddPoint} className="btn" style={{ background: '#10b981', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                        <Plus size={16} /> Nokta Ekle
                      </button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                    <table>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--sidebar-bg)', zIndex: 1 }}>
                        <tr>
                          <th>Nokta ID</th>
                          <th>Y (Sağa)</th>
                          <th>X (Yukarı)</th>
                          <th>Z Mevcut</th>
                          <th>Z Proje</th>
                          <th>Durum</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {points.length > 0 ? points.map((p, i) => (
                          <tr key={`point-edit-${i}`}>
                            <td style={{ width: '100px' }}>
                              <input type="text" className="table-input" value={p.id} onChange={(e) => handlePointChange(i, 'id', e.target.value)} />
                            </td>
                            <td style={{ width: '120px' }}>
                              <input type="number" step="0.01" className="table-input" value={p.y} onChange={(e) => handlePointChange(i, 'y', e.target.value)} />
                            </td>
                            <td style={{ width: '120px' }}>
                              <input type="number" step="0.01" className="table-input" value={p.x} onChange={(e) => handlePointChange(i, 'x', e.target.value)} />
                            </td>
                            <td style={{ width: '120px' }}>
                              <input type="number" step="0.01" className="table-input" value={p.z_mevcut} onChange={(e) => handlePointChange(i, 'z_mevcut', e.target.value)} />
                            </td>
                            <td style={{ width: '120px' }}>
                              <input type="number" step="0.01" className="table-input" value={p.z_proje} onChange={(e) => handlePointChange(i, 'z_proje', e.target.value)} />
                            </td>
                            <td style={{ color: p.z_proje >= p.z_mevcut ? '#4ade80' : '#f87171', fontWeight: 600, width: '100px' }}>
                              {p.z_proje >= p.z_mevcut ? 'DOLGU' : 'KAZI'}
                            </td>
                            <td style={{ width: '60px', textAlign: 'center' }}>
                              <button onClick={() => handleDeletePoint(i)} className="btn-icon-small" style={{ color: 'var(--error-color)' }} title="Sil">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )) : <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Henüz veri yüklenmedi. Tabloya veri girmek için "Nokta Ekle" butonunu kullanabilirsiniz.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={savePointsToDb} className="btn" style={{ background: 'var(--primary-color)' }}>
                      <Upload size={16} /> Değişiklikleri Veritabanına Kaydet
                    </button>
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

                  <AIAssistantCard insights={aiInsights} />

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
                        <MapControls />
                        <Terrain3D points={points} />
                      </Canvas>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'map' && (
                <section className="glass-card" style={{ height: '600px', padding: 0, background: '#000', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
                    <button 
                      className={`btn ${isProfileMode ? 'active' : 'btn-secondary'}`} 
                      onClick={() => {
                        setIsProfileMode(!isProfileMode);
                        setSelectedProfilePoints([]);
                      }}
                      style={{ background: isProfileMode ? '#facc15' : '', color: isProfileMode ? '#000' : '' }}
                    >
                      <MapIcon size={18} /> {isProfileMode ? 'Kesit Modundan Çık' : 'Kesit (Profil) Oluştur'}
                    </button>
                    {isProfileMode && (
                      <div style={{ background: 'rgba(0,0,0,0.7)', padding: '10px 15px', borderRadius: '8px', marginTop: '10px', color: '#fff', fontSize: '0.9rem', border: '1px solid var(--glass-border)' }}>
                        {selectedProfilePoints.length === 0 && 'Araziden başlangıç noktasını (A) seçin.'}
                        {selectedProfilePoints.length === 1 && 'Bitiş noktasını (B) seçin.'}
                        {selectedProfilePoints.length === 2 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Kesit oluşturuldu!</span>
                            <button className="btn-icon-small" onClick={() => setSelectedProfilePoints([])} style={{ background: '#ef4444', color: 'white', marginLeft: '10px', padding: '4px 8px' }}>
                              Temizle
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Canvas camera={{ position: [30, 30, 30], fov: 40 }}>
                    <MapControls />
                    <Terrain3D 
                      points={points} 
                      isProfileMode={isProfileMode}
                      selectedPoints={selectedProfilePoints}
                      onSelectPoint={(pt) => {
                        if (selectedProfilePoints.length < 2) {
                          setSelectedProfilePoints(prev => {
                            if (prev.some(p => p._index === pt._index)) return prev;
                            return [...prev, pt];
                          });
                        }
                      }}
                    />
                  </Canvas>

                  {isProfileMode && selectedProfilePoints.length === 2 && profileData && profileData.points.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'var(--sidebar-bg)', borderTop: '1px solid var(--glass-border)', padding: '15px' }} className="anim-fade-in">
                      <h4 style={{ color: '#fff', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Arazi Kesit Profili</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mesafe: {profileData.distAB.toFixed(2)}m</span>
                      </h4>
                      {(() => {
                        const pts = profileData.points;
                        const width = 1000;
                        const height = 150;
                        const distAB = profileData.distAB;
                        const zVals = pts.flatMap(p => [p.z_mevcut, p.z_proje]);
                        const minZ = Math.min(...zVals) - 2;
                        const maxZ = Math.max(...zVals) + 2;
                        const rangeZ = (maxZ - minZ) || 10;

                        const getPath = (field) => pts.map((pt, i) => {
                          const x = (pt.dist / distAB) * width;
                          const y = height - ((pt[field] - minZ) / rangeZ) * height;
                          return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                        }).join(' ');

                        const areaPathMevcut = pts.map((pt, i) => {
                           const x = (pt.dist / distAB) * width;
                           const y = height - ((pt.z_mevcut - minZ) / rangeZ) * height;
                           return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
                        }).join(' ');
                        const areaPathProje = [...pts].reverse().map(pt => {
                           const x = (pt.dist / distAB) * width;
                           const y = height - ((pt.z_proje - minZ) / rangeZ) * height;
                           return `L ${x},${y}`;
                        }).join(' ');
                        const areaPath = areaPathMevcut + ' ' + areaPathProje + ' Z';
                        
                        return (
                         <div style={{ width: '100%', height: 'calc(100% - 30px)', position: 'relative' }}>
                          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                            <defs>
                              <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="var(--error-color)" stopOpacity="0.4" />
                              </linearGradient>
                            </defs>
                            <path d={areaPath} fill="url(#fillGrad)" />
                            
                            <path d={getPath('z_mevcut')} fill="none" stroke="#4ade80" strokeWidth="3" />
                            <path d={getPath('z_proje')} fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="5,5" />
                            
                            {pts.map((pt, i) => {
                               const x = (pt.dist / distAB) * width;
                               const ym = height - ((pt.z_mevcut - minZ) / rangeZ) * height;
                               const yp = height - ((pt.z_proje - minZ) / rangeZ) * height;
                               return (
                                 <g key={`pt-${i}`}>
                                   <circle cx={x} cy={ym} r="3" fill="#4ade80" />
                                   <circle cx={x} cy={yp} r="3" fill="#3b82f6" />
                                 </g>
                               );
                            })}
                          </svg>
                          <div style={{ position: 'absolute', right: 10, top: 10, display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px' }}>
                            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>— Mevcut</span>
                            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>- - Proje</span>
                          </div>
                         </div>
                        );
                      })()}
                    </div>
                  )}
                </section>
              )}
            </main>
          </div>
        );
      case 'hakedis':
        return (
          <div className="module-container anim-fade-in">
            {!isOnline && (
              <div style={{ 
                background: 'linear-gradient(90deg, #f59e0b, #d97706)', 
                color: 'white', 
                padding: '8px 20px', 
                textAlign: 'center', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                borderRadius: '8px', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
              }}>
                <Sparkles size={16} /> SAHA MODU AKTİF (İnternet Bağlantısı Yok)
              </div>
            )}
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
              <AIAssistantCard insights={aiInsights} />

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
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Ayarlar ve Profil</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  {adminSettingsTab === 'profile' && 'Kişisel profil ve şifre işlemleri'}
                  {adminSettingsTab === 'company' && 'Kurumsal bilgiler ve uygulama tercihleri'}
                  {adminSettingsTab === 'users' && 'Sistem kullanıcılarını yönetin'}
                  {adminSettingsTab === 'logs' && 'Sisteme erişim kayıtlarını inceleyin'}
                </p>
              </div>
              {adminSettingsTab === 'company' && (
                <button 
                  onClick={async () => {
                    try {
                      await axios.post(`${API_URL}/api/settings`, settings, getAuthHeaders());
                      alert('Ayarlar başarıyla kaydedildi.');
                    } catch(e) { alert("Kaydetme hatası!"); }
                  }} 
                  className="btn"
                >
                  Değişiklikleri Kaydet
                </button>
              )}
            </header>

            <div className="settings-tabs">
              <button 
                className={`settings-tab-btn ${adminSettingsTab === 'profile' ? 'active' : ''}`}
                onClick={() => setAdminSettingsTab('profile')}
              >
                Profil (Şifre)
              </button>
              <button 
                className={`settings-tab-btn ${adminSettingsTab === 'company' ? 'active' : ''}`}
                onClick={() => setAdminSettingsTab('company')}
              >
                Kurumsal
              </button>
              {currentRole === 'admin' && (
                <>
                  <button 
                    className={`settings-tab-btn ${adminSettingsTab === 'users' ? 'active' : ''}`}
                    onClick={() => { setAdminSettingsTab('users'); fetchAdminData(); }}
                  >
                    Kullanıcı Yönetimi
                  </button>
                  <button 
                    className={`settings-tab-btn ${adminSettingsTab === 'logs' ? 'active' : ''}`}
                    onClick={() => { setAdminSettingsTab('logs'); fetchAdminData(); }}
                  >
                    Giriş Logları
                  </button>
                </>
              )}
            </div>

            <main>
              {adminSettingsTab === 'profile' && (
                <div style={{ maxWidth: '500px' }}>
                  <section className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <HardHat size={20} color="var(--primary-color)" /> Şifre Değiştir
                    </h3>
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Mevcut Şifre</label>
                        <input 
                          type="password" 
                          className="table-input" 
                          required
                          value={changePasswordForm.currentPassword}
                          onChange={e => setChangePasswordForm({...changePasswordForm, currentPassword: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Yeni Şifre (En az 4 karakter)</label>
                        <input 
                          type="password" 
                          className="table-input" 
                          required
                          value={changePasswordForm.newPassword}
                          onChange={e => setChangePasswordForm({...changePasswordForm, newPassword: e.target.value})}
                        />
                      </div>
                      <button type="submit" className="btn" style={{ marginTop: '1rem' }}>Şifreyi Güncelle</button>
                    </form>
                  </section>
                </div>
              )}

              {adminSettingsTab === 'company' && (
                <div className="grid">
                  <section className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={20} color="var(--primary-color)" /> Kurumsal Bilgiler
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Firma/Kurum Adı</label>
                        <input 
                          className="table-input" 
                          value={settings.companyName} 
                          onChange={e => setSettings({...settings, companyName: e.target.value})} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Adres / İletişim</label>
                        <textarea 
                          className="table-input" 
                          style={{ height: '80px', padding: '10px' }}
                          value={settings.companyAddress} 
                          onChange={e => setSettings({...settings, companyAddress: e.target.value})} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Firma Logosu (Maks: 500KB)</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          {settings.companyLogo ? (
                            <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                              <img src={settings.companyLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                              <button onClick={() => setSettings({...settings, companyLogo: ''})} style={{ position: 'absolute', top: 2, right: 2, background: 'red', border: 'none', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}>✕</button>
                            </div>
                          ) : <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px dashed #444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Yok</div>}
                          <input type="file" id="logoUp" hidden onChange={handleLogoUpload} />
                          <label htmlFor="logoUp" className="btn btn-secondary" style={{ cursor: 'pointer', padding: '0.4rem 0.8rem' }}>Logo Seç</label>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Pencil size={20} color="var(--primary-color)" /> Varsayılan İmzalar
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="form-group">
                        <label>Varsayılan Hazırlayan</label>
                        <input className="table-input" value={settings.defaultPreparer} onChange={e => setSettings({...settings, defaultPreparer: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Varsayılan Kontrol Eden</label>
                        <input className="table-input" value={settings.defaultController} onChange={e => setSettings({...settings, defaultController: e.target.value})} />
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {adminSettingsTab === 'users' && currentRole === 'admin' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <section className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Yeni Kullanıcı Oluştur</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                      <div className="form-group">
                        <label>Kullanıcı Adı</label>
                        <input className="table-input" value={newUserForm.username} onChange={e => setNewUserForm({...newUserForm, username: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Şifre</label>
                        <input className="table-input" type="password" value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Rol</label>
                        <select className="table-input" value={newUserForm.role} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}>
                          <option value="user">Normal Kullanıcı</option>
                          <option value="admin">Admin (Tam Yetki)</option>
                        </select>
                      </div>
                      <button onClick={handleAddUser} className="btn"><Plus size={18} /> Ekle</button>
                    </div>
                  </section>

                  <section className="glass-card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Sistem Kullanıcıları</h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Kullanıcı Adı</th>
                            <th>Rol</th>
                            <th>Oluşturulma</th>
                            <th>İşlemler</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminUsers.map(u => (
                            <tr key={u._id}>
                              <td style={{ fontWeight: 600 }}>{u.username}</td>
                              <td><span style={{ padding: '2px 8px', borderRadius: '4px', background: u.role === 'admin' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? 'var(--primary-color)' : 'inherit', fontSize: '0.8rem' }}>{u.role.toUpperCase()}</span></td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                              <td>
                                {u.username !== 'admin' && (
                                  <button onClick={() => handleDeleteUser(u._id)} className="btn-icon-small" style={{ color: 'var(--error-color)' }}><Trash2 size={16} /></button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {adminSettingsTab === 'logs' && currentRole === 'admin' && (
                <section className="glass-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Son Giriş Denemeleri</h3>
                  <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
                    <table>
                      <thead style={{ position: 'sticky', top: 0, background: 'var(--sidebar-bg)' }}>
                        <tr>
                          <th>Kullanıcı</th>
                          <th>IP Adresi</th>
                          <th>Tarih / Saat</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map((log, i) => (
                          <tr key={i}>
                            <td>{log.username}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ip}</td>
                            <td style={{ fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString('tr-TR')}</td>
                            <td>
                              <span style={{ color: log.success ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>
                                {log.success ? 'BAŞARILI' : 'HATALI'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </main>
          </div>
        );
      case 'archive':
        const filteredArchives = archiveProjects.filter(p => 
          (p.jobName || '').toLowerCase().includes(archiveSearch.toLowerCase()) || 
          (p.firmName || '').toLowerCase().includes(archiveSearch.toLowerCase())
        );

        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>İş Takip ve Arşiv Paneli</h2>
                <p style={{ color: 'var(--text-muted)' }}>Tüm firmaların ve projelerin merkezi özeti</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleDownloadSummaryPdf} className="btn" style={{ background: '#ef4444' }} disabled={loading}>
                  <FileText size={18} /> {loading ? 'Hazırlanıyor...' : 'Toplu Özet PDF İndir'}
                </button>
              </div>
            </header>

            <main>
              <section className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem' }}>Kayıtlı Projeler</h3>
                  <input 
                    type="text" 
                    placeholder="İş veya Firma Ara..." 
                    className="table-input" 
                    style={{ width: '300px', maxWidth: '100%' }}
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                  />
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className="hakedis-table">
                    <thead>
                      <tr>
                        <th>Firma Adı</th>
                        <th>İş Adı</th>
                        <th>Kazı Hacmi</th>
                        <th>Dolgu Hacmi</th>
                        <th>Net Hacim</th>
                        <th>Son Güncelleme</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchives.map((proj, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{proj.firmName}</td>
                          <td>{proj.jobName}</td>
                          <td style={{ color: 'var(--error-color)' }}>{(proj.kubaj?.cutVolume || 0).toLocaleString('tr-TR')} m³</td>
                          <td style={{ color: 'var(--accent-color)' }}>{(proj.kubaj?.fillVolume || 0).toLocaleString('tr-TR')} m³</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{(proj.kubaj?.totalVolume || 0).toLocaleString('tr-TR')} m³</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(proj.updatedAt).toLocaleDateString('tr-TR')}</td>
                        </tr>
                      ))}
                      {filteredArchives.length === 0 && (
                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{archiveProjects.length === 0 ? 'Henüz kaydedilmiş bir proje bulunmuyor.' : 'Aramanızla eşleşen proje bulunamadı.'}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </div>
        );
      case 'guide':
        return (
          <div className="module-container anim-fade-in" style={{ padding: '2rem' }}>
            <GuideContent />
          </div>
        );
      case 'parsel':
        return (
          <div className="module-container anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            <header className="module-header" style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--sidebar-bg)' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Parsel ve Harita</h2>
                <p style={{ color: 'var(--text-muted)' }}>Gerçek dünya üzerinde konum inceleme ve sorgulama</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <a 
                  href="https://parselsorgu.tkgm.gov.tr/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn" 
                  style={{ background: '#3b82f6', textDecoration: 'none' }}
                >
                  <MapIcon size={18} /> TKGM Parsel Sorgu
                </a>
              </div>
            </header>
            
            <main style={{ flex: 1, position: 'relative' }}>
              {/* Measurement Result Badge */}
              {calculatedResult && (
                <div className="measure-badge">
                   {measureMode === 'distance' ? <Ruler size={16} /> : <Square size={16} />}
                   {calculatedResult}
                </div>
              )}

              {/* Advanced Tool Panel */}
              <div className="map-measure-panel">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Ölçüm Araçları</div>
                <div className="map-btn-group">
                  <button 
                    className={`map-tool-btn ${measureMode === 'distance' ? 'active' : ''}`}
                    onClick={() => { setMeasureMode(measureMode === 'distance' ? null : 'distance'); setMeasurePoints([]); }}
                  >
                    <Ruler size={18} /> Mesafe
                  </button>
                  <button 
                    className={`map-tool-btn ${measureMode === 'area' ? 'active' : ''}`}
                    onClick={() => { setMeasureMode(measureMode === 'area' ? null : 'area'); setMeasurePoints([]); }}
                  >
                    <Square size={18} /> Alan
                  </button>
                </div>
                <div className="map-btn-group" style={{ marginTop: '4px' }}>
                  <button 
                    className="map-tool-btn"
                    onClick={() => { setMeasurePoints([]); setCalculatedResult(''); }}
                  >
                    <Trash2 size={18} /> Temizle
                  </button>
                  <button 
                    className="map-tool-btn"
                    onClick={handleDownloadKml}
                    disabled={measurePoints.length < 2}
                    style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                  >
                    <Save size={18} /> KML İndir
                  </button>
                </div>
                {measureMode && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--primary-color)', marginTop: '8px', fontStyle: 'italic' }}>
                    * Harita üzerine tıklayarak nokta ekleyin.
                  </div>
                )}
              </div>

              <div style={{ position: 'absolute', top: 20, left: 60, zIndex: 1000, background: 'rgba(15, 23, 42, 0.85)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)', backdropFilter: 'blur(10px)' }}>
                <h4 style={{ color: '#fff', marginBottom: '10px', fontSize: '1rem' }}>Koordinata Git</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enlem (Lat)</label>
                    <input 
                      type="text" 
                      className="table-input" 
                      style={{ width: '120px' }} 
                      placeholder="Örn: 39.92"
                      value={mapLat}
                      onChange={e => setMapLat(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Boylam (Lng)</label>
                    <input 
                      type="text" 
                      className="table-input" 
                      style={{ width: '120px' }} 
                      placeholder="Örn: 32.85"
                      value={mapLng}
                      onChange={e => setMapLng(e.target.value)}
                    />
                  </div>
                  <button 
                    className="btn" 
                    style={{ background: 'var(--primary-color)', padding: '0.5rem 1rem' }}
                    onClick={() => setTargetLocation({ lat: parseFloat(mapLat), lng: parseFloat(mapLng) })}
                  >
                    Git
                  </button>
                </div>
              </div>

              <MapContainer 
                center={[39.92077, 32.85411]} 
                zoom={6} 
                style={{ height: '100%', width: '100%', background: '#0f172a' }}
              >
                <MapClickHandler />
                <LayersControl position="topright">
                  <LayersControl.BaseLayer name="OpenStreetMap">
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked name="Google Uydu">
                    <TileLayer
                      attribution='Map data &copy; Google'
                      url="http://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}"
                      maxZoom={20}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Google Hibrit">
                    <TileLayer
                      attribution='Map data &copy; Google'
                      url="http://mt0.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}"
                      maxZoom={20}
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                
                {measurePoints.map((p, i) => (
                  <Marker key={i} position={p} icon={L.divIcon({ className: 'custom-div-icon', html: `<div style="background: var(--primary-color); width: 8px; height: 8px; border-radius: 50%; border: 2px solid white;"></div>`, iconSize: [8, 8], iconAnchor: [4, 4] })} />
                ))}

                {measureMode === 'distance' && measurePoints.length > 1 && (
                  <Polyline positions={measurePoints} color="var(--primary-color)" weight={4} dashArray="10, 10" />
                )}

                {measureMode === 'area' && measurePoints.length > 2 && (
                  <Polygon positions={measurePoints} color="var(--primary-color)" fillColor="var(--primary-color)" fillOpacity={0.3} weight={3} />
                )}

                {targetLocation && (
                  <>
                    <Marker position={[targetLocation.lat, targetLocation.lng]} />
                    <FlyToLocation lat={targetLocation.lat} lng={targetLocation.lng} />
                  </>
                )}
              </MapContainer>
            </main>
          </div>
        );
      default:
        return null;
    }
  };

  if (!authToken) {
    return (
      <Login 
        username={loginUsername}
        password={loginPassword}
        setUsername={setLoginUsername}
        setPassword={setLoginPassword}
        error={loginError}
        loading={loginLoading}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="dashboard-container">
      {/* Premium Background Effects */}
      <div className="mesh-bg"></div>
      
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
        <div className="sidebar-header" style={{ marginBottom: '1.5rem', padding: '2rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, var(--primary-color), var(--primary-hover))', 
              padding: '0.6rem', 
              borderRadius: '12px',
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)' 
            }}>
              <MapIcon size={22} color="white" />
            </div>
            {!isSidebarCollapsed && (
              <span style={{ fontWeight: 900, fontSize: '1.15rem', letterSpacing: '-0.8px', color: '#fff' }}>HARİTA PORTALI</span>
            )}
          </div>
        </div>

        {/* User Profile Section at Top */}
        <div className={`user-profile-top ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{
          padding: '0.75rem 1rem',
          margin: '0 0.5rem 1.5rem',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            minWidth: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'var(--primary-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <CircleUser size={20} />
          </div>
          
          {!isSidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  color: '#fff', 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}>
                  {currentUser}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {currentRole}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="btn-icon-small"
                title="Çıkış Yap"
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  marginLeft: '8px',
                  padding: '6px'
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Nav (Main Tools Only) */}
        <div style={{ padding: '0 1rem 1rem', flex: 1, overflowY: 'auto' }}>
          {!isSidebarCollapsed && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '1rem', paddingLeft: '1rem' }}>ARAÇLAR</span>
          )}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  setMobileMenuOpen(false);
                }}
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
                {!isSidebarCollapsed && <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer" style={{ padding: '0.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center' }}>
          <button 
            className="nav-item" 
            style={{ 
              width: '100%', 
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: '0.75rem',
              color: 'var(--text-muted)',
              border: 'none',
              background: 'transparent'
            }}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Sidebar'ı Genişlet" : "Sidebar'ı Daralt"}
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : (
              <>
                <X size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Menüyü Daralt</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="main-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem', 
          flexWrap: 'wrap', 
          gap: '1.5rem',
          background: 'rgba(30, 41, 59, 0.4)',
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="header-title-group" style={{ minWidth: '200px' }}>
            <h1 className="header-title" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              Harita Çözümleri
            </h1>
            <p className="header-subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Muhammed BİLİCİ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {/* Firm Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <Building2 size={16} color="var(--primary-color)" />
              <select 
                className="top-select"
                value={selectedFirm?.id || ''} 
                onChange={(e) => {
                  const firm = firms.find(f => f.id === e.target.value);
                  setSelectedFirm(firm);
                  setSelectedProject('');
                }}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'pointer', padding: '5px' }}
              >
                <option value="" disabled style={{background: '#1e293b'}}>Firma Seçin...</option>
                {firms.map(f => <option key={f.id} value={f.id} style={{background: '#1e293b'}}>{f.name}</option>)}
              </select>
              <button onClick={() => setShowAddFirm(!showAddFirm)} className="btn-icon-small" title="Firma Ekle">
                <Plus size={16} />
              </button>
            </div>

            {/* Project Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
              <FileCheck size={16} color="var(--accent-color)" />
              <select 
                className="top-select"
                value={selectedProject} 
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={!selectedFirm}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'pointer', padding: '5px', opacity: !selectedFirm ? 0.5 : 1 }}
              >
                <option value="" disabled style={{background: '#1e293b'}}>İş Seçin...</option>
                {projects.map(p => <option key={p} value={p} style={{background: '#1e293b'}}>{p}</option>)}
              </select>
              <button 
                onClick={() => selectedFirm && handleAddProject(selectedFirm.id)} 
                className="btn-icon-small" 
                title="İş Ekle"
                disabled={!selectedFirm}
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {selectedProject && (
                <button 
                  onClick={() => handleDeleteProject(selectedFirm.id, selectedProject)} 
                  className="btn-icon-small" 
                  style={{ color: 'var(--error-color)', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}
                  title="Seçili İşi Sil"
                >
                  <Trash2 size={16} />
                </button>
              )}
              {selectedFirm && (
                <button 
                  onClick={() => handleBackupFirm(selectedFirm.id, selectedFirm.name)} 
                  className="btn-icon-small" 
                  style={{ color: 'var(--primary-color)', background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px' }}
                  title="Firma Yedeği Al"
                >
                  <Download size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

        {showAddFirm && (
          <div className="anim-scale-in" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="glass-card" style={{ width: '400px', margin: 'auto' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Yeni Firma Ekle</h3>
              <input 
                type="text" 
                placeholder="Firma Adı..." 
                className="table-input" 
                value={newFirmName} 
                onChange={e => setNewFirmName(e.target.value)}
                style={{ marginBottom: '1.5rem' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowAddFirm(false)} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>İptal</button>
                <button onClick={handleAddFirm} className="btn" style={{ flex: 1, justifyContent: 'center' }}>Ekle</button>
              </div>
            </div>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}

export default App;
