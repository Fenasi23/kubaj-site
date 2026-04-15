import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip as ChartTooltip, Legend, ArcElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, ChartTooltip, Legend);

import { 
  Upload, Map as MapIcon, BarChart3, Table as TableIcon, 
  FileText, Download, LayoutDashboard, Settings, 
  Menu, X, ChevronRight, HardHat, Info, Pencil, Trash2,
  LogOut, CircleUser, BookOpen, Ruler, Square, Target, MousePointer2, Save, Factory, Sparkles, TrendingDown, TrendingUp, AlertCircle, Camera, Image as ImageIcon,
  Pencil as PencilIcon, Minus as MinusIcon, TreePine, User, Search, Bell, Zap, Calendar, FileCheck, Building2, RefreshCw, Plus, PlusSquare
} from 'lucide-react';
import WebCAD from './WebCAD';
import LandscapeArchitect from './LandscapeArchitect';
import EXIF from 'exif-js';
import GuideContent from './GuideContent';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js';
import PointCloudViewer from './PointCloudViewer';
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
// Removed extend and custom MapControls to prevent R3F catalog corruption

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

// 3D Kazı (Excavation) Görselleştirme Bileşeni
import Delaunator from 'delaunator';

function Excavation3D({ points }) {
  const groupRef = useRef();

  const { meshMevcut, meshProje, center, factor, minZ } = useMemo(() => {
    if (!points || points.length < 3) return {};

    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const zs = points.map(p => Math.min(p.z_mevcut, p.z_proje));
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minZ = Math.min(...zs);
    const rangeZ = Math.max(...points.map(p => Math.max(p.z_mevcut, p.z_proje))) - minZ;

    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const maxDim = Math.max(width, height);
    const factor = 25 / maxDim;

    // Triangulation
    const coords = points.map(p => [p.x, p.y]);
    const delaunay = Delaunator.from(coords);
    const indices = delaunay.triangles;

    // Build Geometries
    const buildGeometry = (zField) => {
      const positions = new Float32Array(points.length * 3);
      points.forEach((p, i) => {
        positions[i * 3] = (p.x - center.x) * factor;
        positions[i * 3 + 1] = (p.y - center.y) * factor;
        positions[i * 3 + 2] = (p[zField] - minZ) * 2; // Z scale
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setIndex(Array.from(indices));
      geo.computeVertexNormals();
      return geo;
    };

    return { 
      meshMevcut: buildGeometry('z_mevcut'), 
      meshProje: buildGeometry('z_proje'),
      center, factor, minZ 
    };
  }, [points]);

  if (!meshMevcut) return null;

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Mevcut Arazi (Şeffaf Kahverengi/Gri) */}
      <mesh geometry={meshMevcut}>
        <meshStandardMaterial color="#8b5a2b" transparent opacity={0.4} wireframe={false} side={THREE.DoubleSide} />
      </mesh>
      
      {/* Proje/Kazı Sonu Durumu (Mavi/Kırmızı gölgeli Mesh) */}
      <mesh geometry={meshProje}>
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} side={THREE.DoubleSide} flatShading />
      </mesh>

      {/* Noktalar ve Fark Silindirleri */}
      {points.map((p, i) => {
        const px = (p.x - center.x) * factor;
        const py = (p.y - center.y) * factor;
        const zm = (p.z_mevcut - minZ) * 2;
        const zp = (p.z_proje - minZ) * 2;
        return (
          <group key={i}>
            <mesh position={[px, py, zm]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#4ade80" />
            </mesh>
            <mesh position={[px, py, zp]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#f87171" />
            </mesh>
            <mesh position={[px, py, (zm + zp) / 2]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, Math.abs(zm - zp) || 0.01]} />
              <meshStandardMaterial color={zp >= zm ? "#4ade80" : "#f87171"} />
            </mesh>
          </group>
        );
      })}

      <gridHelper args={[50, 25, "#444", "#222"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[20, 20, 50]} intensity={1.5} />
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
  // API URL Ayarı: Geliştirme ortamında proxy üzerinden, canlıda ise direkt "/api" ile çalışır.
  const API_URL = "";
  console.log("🔄 PORTAL: Uygulama başlatılıyor. API Adresi:", window.location.origin + "/api");

  const [activeModule, setActiveModule] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false); // To keep my future layout changes happy
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [points, setPoints] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('data');
  const [hakedisData, setHakedisData] = useState([]);
  
  // Çift Dosya (Mevcut vs Proje) Upload State'leri
  const [mevcutFile, setMevcutFile] = useState(null);
  const [projeFile, setProjeFile] = useState(null);
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

  // Point Cloud State
  const [pointCloudData, setPointCloudData] = useState(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  // CAD State
  const [cadData, setCadData] = useState({ entities: [], layers: [] });

  const handleSaveCAD = async (newCadData) => {
    try {
      await axios.post(`${API_URL}/api/cad`, newCadData, getHeaders());
      alert("Çizim başarıyla kaydedildi.");
      setCadData(newCadData);
    } catch(e) { alert("Kaydedilemedi."); }
  };

  const handlePointCloudUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsCloudLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const contents = event.target.result;
      let loader;

      if (file.name.endsWith('.ply')) {
        loader = new PLYLoader();
      } else if (file.name.endsWith('.pcd')) {
        loader = new PCDLoader();
      } else {
        alert("Sadece .ply ve .pcd formatları desteklenmektedir.");
        setIsCloudLoading(false);
        return;
      }

      try {
        const geometry = loader.parse(contents);
        const positions = geometry.attributes.position.array;
        const colors = geometry.attributes.color ? geometry.attributes.color.array : null;

        setPointCloudData({ positions, colors });
        setIsCloudLoading(false);
      } catch (err) {
        console.error("Point cloud parse error", err);
        alert("Dosya okunamadı!");
        setIsCloudLoading(false);
      }
    };

    if (file.name.endsWith('.ply') || file.name.endsWith('.pcd')) {
      reader.readAsArrayBuffer(file);
    }
  };

  // Geotagged Photos State
  const [photoMarkers, setPhotoMarkers] = useState([]);

  // DMS to Decimal Helper
  const convertDMSToDecimal = (dms, ref) => {
    if (!dms) return null;
    const degrees = dms[0].numerator / dms[0].denominator;
    const minutes = dms[1].numerator / dms[1].denominator;
    const seconds = dms[2].numerator / dms[2].denominator;
    let decimal = degrees + (minutes / 60) + (seconds / 3600);
    if (ref === 'S' || ref === 'W') decimal = decimal * -1;
    return decimal;
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      EXIF.getData(file, function() {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const latRef = EXIF.getTag(this, "GPSLatitudeRef");
        const lng = EXIF.getTag(this, "GPSLongitude");
        const lngRef = EXIF.getTag(this, "GPSLongitudeRef");

        if (lat && lng) {
          const decimalLat = convertDMSToDecimal(lat, latRef);
          const decimalLng = convertDMSToDecimal(lng, lngRef);
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoMarkers(prev => [...prev, {
              id: Date.now() + Math.random(),
              url: reader.result,
              lat: decimalLat,
              lng: decimalLng,
              name: file.name,
              date: EXIF.getTag(this, "DateTimeOriginal") || new Date().toLocaleString()
            }]);
          };
          reader.readAsDataURL(file);
        } else {
          alert(`"${file.name}" içinde konum verisi bulunamadı. Lütfen GPS etiketli bir fotoğraf seçin.`);
        }
      });
    });
  };

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
    { id: 'pointcloud', label: '3D Nokta Bulutu', icon: <Target size={18} /> },
    { id: 'hakedis', label: 'Hakediş Yönetimi', icon: <FileCheck size={18} /> },
    { id: 'archive', label: 'İş Takip Paneli', icon: <LayoutDashboard size={18} /> },
    { id: 'peyzaj', label: 'Peyzaj Mimarı', icon: <TreePine size={18} /> },
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
        const active = resp.data.find(f => (f.id || f._id) === savedFirmId);
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
  const fetchArchiveProjects = useCallback(async () => {
    try {
      const r = await axios.get(`${API_URL}/api/projects/all`);
      setArchiveProjects(r.data);
    } catch (e) {
      console.error('Arşiv projeleri çekilemedi', e);
      // Fail silently for dashboard, but we might want an alert if activeModule is archive
    }
  }, [API_URL]);

  React.useEffect(() => {
    if (activeModule === 'archive' || activeModule === 'dashboard') {
      fetchArchiveProjects();
    }
  }, [activeModule, fetchArchiveProjects]);

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
        
        // CAD Verilerini Çek
        try {
          const cResp = await axios.get(`${API_URL}/api/cad`, getHeaders());
          setCadData(cResp.data || { entities: [], layers: [] });
        } catch(e) { console.error("CAD çekilemedi", e); }

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
      let errorMsg = "Bilinmeyen bir hata oluştu";
      
      try {
        if (error.response?.data) {
          const data = error.response.data;
          if (typeof data === 'string') {
            errorMsg = data;
          } else if (data && typeof data === 'object') {
            errorMsg = data.message || data.error || JSON.stringify(data);
          }
        } else {
          errorMsg = error.message || "Bağlantı hatası";
        }
      } catch (e) {
        errorMsg = "Hata detayı alınamadı";
      }
      
      const debugDetails = typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg;
      alert(`❌ Firma eklenemedi!\n\nDetay: ${debugDetails}`);
    }
  };

  const handleAddProject = async (firmId) => {
    const jobName = prompt("Yeni iş (proje) adı giriniz:");
    if (!jobName) return;
    try {
      // Proje oluşturmak için boş bir kübaj verisiyle kaydediyoruz
      await axios.post(`${API_URL}/api/kubaj`, { points: [], results: null }, {
        headers: {
          'x-firm-id': firmId,
          'x-job-name': encodeURIComponent(jobName)
        }
      });
      const r = await axios.get(`${API_URL}/api/firms/${firmId}/projects`);
      setProjects(r.data);
      setSelectedProject(jobName);
    } catch (error) {
      alert("İş oluşturulamadı.");
    }
  };

  const handleDeleteProject = async (firmId, jobName) => {
    if (!confirm(`'${jobName}' işine ait tüm veriler silinecek. Emin misiniz?`)) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${firmId}/${encodeURIComponent(jobName)}`);
      const r = await axios.get(`${API_URL}/api/firms/${firmId}/projects`);
      setProjects(r.data);
      if (selectedProject === jobName) setSelectedProject('');
    } catch (error) {
      alert("İş silinemedi.");
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

  const handleFilesUpload = async () => {
    if (!selectedFirm || !selectedProject) {
      alert("Lütfen önce bir firma ve iş (proje) seçiniz veya oluşturunuz.");
      return;
    }
    if (!mevcutFile || !projeFile) {
      alert("Hesaplama yapabilmek için hem 'Mevcut (İlk Ölçüm)' hem de 'Proje (Sonraki Ölçüm)' dosyalarını seçmelisiniz.");
      return;
    }

    const formData = new FormData();
    formData.append('file_mevcut', mevcutFile);
    formData.append('file_proje', projeFile);
    
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/api/upload`, formData, getHeaders());
      setPoints(resp.data.points || []);
      setResults(resp.data.results || null);
      if (resp.data.points?.length > 0) setActiveTab('results');
      
      // Temizle
      setMevcutFile(null);
      setProjeFile(null);
      
      // AI Analizini tetikle
      performAIAnalysis(resp.data.points || [], resp.data.results?.totalVolume);
      
      // Analiz yüklendiğinde hakediş bilgilerini de güncelle (eğer boşsa)
      setHakedisDetails(prev => ({
        ...prev,
        isinAdi: prev.isinAdi || selectedProject || '',
        yukleniciFirma: prev.yukleniciFirma || selectedFirm?.name || ''
      }));
    } catch (error) {
      alert('Hata: ' + (error.response?.data?.error || error.response?.data || error.message));
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

  const handleDeleteArchiveProject = async (firmId, jobName) => {
    if (!window.confirm(`"${jobName}" projesini ve tüm analiz verilerini silmek istediğinize emin misiniz?`)) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${firmId}/${encodeURIComponent(jobName)}`, getAuthHeaders());
      alert("Proje başarıyla silindi.");
      fetchArchiveProjects();
    } catch(e) {
      alert("Silme hatası: " + (e.response?.data || e.message));
    }
  };

  // Hata durumunda render koruması
  if (loginError && !authToken) {
    console.warn("⚠️ AUTH HATASI:", loginError);
  }

  const renderDashboard = () => {
    const stats = [
      { id: 'total', label: 'Toplam Proje', value: archiveProjects.length, trend: `+${archiveProjects.length > 0 ? 1 : 0} bu ay`, icon: <LayoutDashboard size={24} />, type: 'active' },
      { id: 'active', label: 'Aktif Analiz', value: firms.length, trend: `+${firms.length > 0 ? 1 : 0} bu hafta`, icon: <Zap size={24} />, type: 'warning' },
      { id: 'done', label: 'Tamamlanan', value: archiveProjects.filter(p => (p.kubaj?.totalVolume || 0) !== 0).length, trend: '+0 bu ay', icon: <FileCheck size={24} />, type: 'success' },
      { id: 'waiting', label: 'Bekleyen', value: 0, trend: '0 bu hafta', icon: <Calendar size={24} />, type: 'active' },
    ];

    const chartData = {
      labels: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
      datasets: [
        {
          label: 'Analiz',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, archiveProjects.length],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Tamamlanan',
          data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, archiveProjects.filter(p => (p.kubaj?.totalVolume || 0) !== 0).length],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.4,
          fill: true,
        }
      ]
    };

    const donutData = {
      labels: ['Kubaj Analizi', 'Diğer'],
      datasets: [{
        data: [archiveProjects.length, 0],
        backgroundColor: ['#6366f1', '#94a3b8'],
        borderWidth: 0,
        hoverOffset: 10
      }]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    };

    return (
      <div className="anim-fade-in" style={{ paddingBottom: '2rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Web Portal Dashboard</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Ana Sayfa <ChevronRight size={12} /> Modüller <ChevronRight size={12} /> <span style={{color: 'var(--primary-color)'}}>Dashboard</span>
          </div>
        </header>

        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.id} className={`stat-card ${s.type}`}>
              <div className="stat-icon-box">{s.icon}</div>
              <div className="stat-info">
                <div className="value">{s.value}</div>
                <div className="label">{s.label}</div>
                <div className={`stat-trend ${s.id === 'waiting' ? 'down' : 'up'}`}>{s.trend}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Aylık Analiz Trendi</h3>
            <div style={{ flex: 1, position: 'relative' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
          <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Sistem Kullanım Dağılımı</h3>
            <div style={{ flex: 1, position: 'relative', padding: '1rem' }}>
              <Doughnut data={donutData} options={{...chartOptions, cutout: '70%'}} />
            </div>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Son Aktiviteler</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Proje Adı</th>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Modül</th>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Tarih</th>
                <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {archiveProjects.slice(0, 5).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 12px', fontWeight: 600 }}>{p.jobName}</td>
                  <td style={{ padding: '16px 12px' }}>Kubaj Analizi</td>
                  <td style={{ padding: '16px 12px' }}>{new Date(p.updatedAt).toLocaleDateString('tr-TR')}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Tamamlandı</span>
                  </td>
                </tr>
              ))}
              {archiveProjects.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Henüz bir aktivite bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    try {
      if (activeModule === 'dashboard') return renderDashboard();
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
                    <TableIcon size={18} /> Tablo Editörü
                  </button>
                  <button onClick={() => setActiveTab('results')} className={`btn ${activeTab === 'results' ? '' : 'btn-secondary'}`}>
                    <BarChart3 size={18} /> Analiz Sonuçları (3D)
                  </button>
                </nav>
              </div>
            </header>

            <main>
              {activeTab === 'data' && (
                <section className="glass-card dual-upload-section">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                    {/* Mevcut Durum */}
                    <div className={`upload-zone ${mevcutFile ? 'selected' : ''}`} onClick={() => document.getElementById('mevcutFileInput').click()}>
                      <Upload size={36} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>1. Mevcut Arazi Zemin</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Mevcut, Kazı Öncesi Ölçüm (.ncz, .ncn, .xls)</p>
                      {mevcutFile && <div style={{marginTop: '1rem', color: '#10b981', fontWeight: 'bold'}}>{mevcutFile.name}</div>}
                      <input id="mevcutFileInput" type="file" accept=".xlsx,.xls,.ncn,.ncz" hidden onChange={(e) => setMevcutFile(e.target.files[0])} />
                    </div>
                    
                    {/* Proje Durum */}
                    <div className={`upload-zone ${projeFile ? 'selected' : ''}`} onClick={() => document.getElementById('projeFileInput').click()}>
                      <Upload size={36} color="var(--primary-color)" style={{ marginBottom: '1rem' }} />
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>2. Proje Arazi Zemin</h3>
                      <p style={{ color: 'var(--text-muted)' }}>Temel veya Kazı Sonrası Ölçüm (.ncz, .ncn, .xls)</p>
                      {projeFile && <div style={{marginTop: '1rem', color: '#10b981', fontWeight: 'bold'}}>{projeFile.name}</div>}
                      <input id="projeFileInput" type="file" accept=".xlsx,.xls,.ncn,.ncz" hidden onChange={(e) => setProjeFile(e.target.files[0])} />
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <button 
                       className="btn" 
                       style={{ background: 'var(--primary-color)', fontSize: '1.2rem', padding: '1rem 3rem' }} 
                       onClick={handleFilesUpload}
                       disabled={loading || !mevcutFile || !projeFile}
                    >
                      {loading ? 'Sistem İki Dosyayı Karşılaştırıyor...' : 'Mevcut ve Proje Dosyalarını Karşılaştır'}
                    </button>
                    {(!mevcutFile || !projeFile) && <p style={{marginTop: '1rem', color: 'var(--text-muted)'}}>Devam etmek için her iki ölçümü de yukarıdaki kutulara yüklemelisiniz.</p>}
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

                  <section className="glass-card" style={{ marginTop: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3 style={{ margin: 0 }}>3D Kazı İzleme ve Arazi Modeli</h3>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, background: '#8b5a2b', opacity: 0.5 }}></div> Mevcut</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 10, height: 10, background: '#3b82f6' }}></div> Proje</span>
                      </div>
                    </div>
                    <div style={{ height: '500px', background: '#020617', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      <Canvas camera={{ position: [30, 30, 30], fov: 40 }}>
                        <OrbitControls enableDamping={true} />
                        <Excavation3D points={points} />
                      </Canvas>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      * Fare ile döndürebilir, tekerlek ile yakınlaşabilirsiniz. Renkli silindirler kazı/dolgu derinliğini temsil eder.
                    </p>
                  </section>
                </div>
              )}

              {activeTab === 'map' && (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                  <Info size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Bu bölüm Kubaj Sonuçları sayfasına "3D Kazı İzleme" olarak taşınmıştır.</p>
                  <button onClick={() => setActiveTab('results')} className="btn" style={{ marginTop: '1rem' }}>Analiz Sonuçlarına Git</button>
                </div>
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

      case 'peyzaj':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Peyzaj Mimarı</h2>
                <p style={{ color: 'var(--text-muted)' }}>Eskizden Profesyonel Peyzaj Planına Dönüşüm</p>
              </div>
            </header>
            <main>
              <LandscapeArchitect />
            </main>
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
                        <th style={{ textAlign: 'center' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchives.map((proj, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{proj.firmName}</td>
                          <td style={{ fontWeight: 600 }}>{proj.jobName}</td>
                          <td style={{ color: 'var(--error-color)' }}>{(proj.kubaj?.cutVolume || 0).toLocaleString('tr-TR')} m³</td>
                          <td style={{ color: 'var(--accent-color)' }}>{(proj.kubaj?.fillVolume || 0).toLocaleString('tr-TR')} m³</td>
                          <td style={{ fontWeight: 800 }}>{(proj.kubaj?.totalVolume || 0).toLocaleString('tr-TR')} m³</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(proj.updatedAt).toLocaleDateString('tr-TR')}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                className="btn-icon-small" 
                                style={{ color: 'var(--primary-color)' }}
                                title="Detayları Görüntüle"
                                onClick={() => {
                                  const firm = firms.find(f => f.id === proj.firmId || f._id === proj.firmId);
                                  if (firm) setSelectedFirm(firm);
                                  setSelectedProject(proj.jobName);
                                  setActiveModule('kubaj');
                                }}
                              >
                                <ChevronRight size={18} />
                              </button>
                              <button 
                                className="btn-icon-small" 
                                style={{ color: 'var(--error-color)' }}
                                title="Projeyi Sil"
                                onClick={() => handleDeleteArchiveProject(proj.firmId, proj.jobName)}
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredArchives.length === 0 && (
                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{archiveProjects.length === 0 ? 'Henüz kaydedilmiş bir proje bulunmuyor.' : 'Aramanızla eşleşen proje bulunamadı.'}</td></tr>
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
                <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', background: 'var(--accent-color)' }}>
                  <Camera size={18} style={{ marginRight: '8px' }} />
                  Fotoğraf Yükle (GPS)
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    hidden 
                    onChange={handlePhotoUpload} 
                  />
                </label>
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

                {/* Geotagged Photos */}
                {photoMarkers.map((photo) => (
                  <Marker 
                    key={photo.id} 
                    position={[photo.lat, photo.lng]}
                    icon={L.divIcon({
                      className: 'custom-camera-icon',
                      html: `<div style="background: var(--accent-color); border: 2px solid white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); color: white;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg></div>`,
                      iconSize: [30, 30],
                      iconAnchor: [15, 15]
                    })}
                  >
                    <Popup className="photo-popup">
                      <div style={{ maxWidth: '200px' }}>
                        <img src={photo.url} alt={photo.name} style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{photo.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{photo.date}</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </main>
          </div>
        );
      case 'archive':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>İş Takip Paneli (Arşiv)</h2>
                <p style={{ color: 'var(--text-muted)' }}>Tüm firmalara ait kayıtlı projeler ve analiz sonuçları</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="search-box" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input 
                    type="text" 
                    placeholder="Arşivde ara..." 
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.85rem' }} 
                  />
                </div>
                <button onClick={fetchArchiveProjects} className="btn btn-secondary">
                   <RefreshCw size={18} /> Yenile
                </button>
              </div>
            </header>

            <main className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Firma Adı</th>
                      <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem' }}>İş / Proje Adı</th>
                      <th style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Son İşlem</th>
                      <th style={{ padding: '15px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hacim (m³)</th>
                      <th style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveProjects
                      .filter(p => !archiveSearch || p.jobName?.toLowerCase().includes(archiveSearch.toLowerCase()) || p.firmName?.toLowerCase().includes(archiveSearch.toLowerCase()))
                      .map((p, i) => (
                      <tr key={p._id || i} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="table-row-hover">
                        <td style={{ padding: '15px', fontWeight: 700, color: 'var(--primary-color)' }}>{p.firmName}</td>
                        <td style={{ padding: '15px', fontWeight: 600 }}>{p.jobName}</td>
                        <td style={{ padding: '15px', textAlign: 'center', fontSize: '0.85rem' }}>{new Date(p.updatedAt).toLocaleDateString('tr-TR')}</td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 800 }}>
                          {p.kubaj?.totalVolume ? `${p.kubaj.totalVolume.toLocaleString('tr-TR')} m³` : '-'}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              className="btn-icon-small" 
                              style={{ color: 'var(--primary-color)' }}
                              title="Detayları Görüntüle"
                              onClick={() => {
                                const firm = firms.find(f => f.id === p.firmId || f._id === p.firmId);
                                if (firm) setSelectedFirm(firm);
                                setSelectedProject(p.jobName);
                                setActiveModule('kubaj');
                              }}
                            >
                              <ChevronRight size={18} />
                            </button>
                            <button 
                              className="btn-icon-small" 
                              style={{ color: 'var(--error-color)' }}
                              title="Projeyi Sil"
                              onClick={() => handleDeleteArchiveProject(p.firmId, p.jobName)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {archiveProjects.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <LayoutDashboard size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                          <p>Arşivde henüz kayıtlı proje bulunmuyor.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </main>
          </div>
        );
      case 'pointcloud':
        return (
          <div className="module-container anim-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
            <header className="module-header" style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--glass-border)', background: 'var(--sidebar-bg)' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>3D Nokta Bulutu (Drone/LiDAR)</h2>
                <p style={{ color: 'var(--text-muted)' }}>Milyonlarca noktayı 3D olarak inceleyin ve görselleştirin</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label className="btn" style={{ cursor: 'pointer', display: 'inline-flex', background: 'var(--primary-color)' }}>
                  <Target size={18} style={{ marginRight: '8px' }} />
                  Bulut Yükle (.ply, .pcd)
                  <input 
                    type="file" 
                    accept=".ply,.pcd" 
                    hidden 
                    onChange={handlePointCloudUpload} 
                  />
                </label>
                {pointCloudData && (
                  <button className="btn btn-secondary" onClick={() => setPointCloudData(null)}>
                    <Trash2 size={18} /> Veriyi Temizle
                  </button>
                )}
              </div>
            </header>

            <main style={{ flex: 1, position: 'relative', background: '#020617' }}>
              {isCloudLoading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                  <RefreshCw className="anim-spin" size={48} color="var(--primary-color)" />
                  <p style={{ marginTop: '1rem', fontWeight: 700 }}>Noktalar İşleniyor...</p>
                </div>
              )}

              {!pointCloudData && !isCloudLoading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', opacity: 0.5 }}>
                  <Target size={64} style={{ marginBottom: '1rem' }} />
                  <h3>Henüz veri yüklenmedi</h3>
                  <p>PLY veya PCD formatındaki drone çıktılarını buraya yükleyin.</p>
                </div>
              )}

              {pointCloudData && (
                <div style={{ height: '100%', width: '100%' }}>
                  <Canvas 
                    camera={{ position: [50, 50, 50], fov: 45 }}
                    style={{ background: '#020617' }}
                  >
                    <ambientLight intensity={0.5} />
                    <pointLight position={[100, 100, 100]} />
                    <PointCloudViewer data={pointCloudData} />
                    <OrbitControls minDistance={1} maxDistance={2000} />
                  </Canvas>
                </div>
              )}
            </main>
          </div>
        );
      case 'admin':
        return (
          <div className="module-container anim-fade-in">
            <header className="module-header">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Admin Kontrol Paneli</h2>
                <p style={{ color: 'var(--text-muted)' }}>Sistem genel yönetimi ve kullanıcı istatistikleri</p>
              </div>
              <button className="btn btn-secondary" onClick={() => fetchAdminData()}>
                <RefreshCw size={18} /> Verileri Güncelle
              </button>
            </header>

            <main>
              <div className="stats-grid">
                <div className="stat-card active">
                  <div className="stat-icon-box"><Factory size={24} /></div>
                  <div className="stat-info">
                    <div className="value">{firms.length}</div>
                    <div className="label">Kayıtlı Firma</div>
                  </div>
                </div>
                <div className="stat-card success">
                  <div className="stat-icon-box"><LayoutDashboard size={24} /></div>
                  <div className="stat-info">
                    <div className="value">{archiveProjects.length}</div>
                    <div className="label">Toplam Proje</div>
                  </div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-icon-box"><User size={24} /></div>
                  <div className="stat-info">
                    <div className="value">{adminUsers.length}</div>
                    <div className="label">Sistem Kullanıcısı</div>
                  </div>
                </div>
              </div>

              <div className="grid" style={{ marginTop: '2rem' }}>
                <section className="glass-card">
                   <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <Settings size={20} color="var(--primary-color)" /> Hızlı Erişim
                   </h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                     <button onClick={() => { setActiveModule('settings'); setAdminSettingsTab('users'); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                        <User size={18} /> Kullanıcı Yönetimine Git
                     </button>
                     <button onClick={() => { setActiveModule('settings'); setAdminSettingsTab('logs'); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                        <BookOpen size={18} /> Sistem Loglarını İncele
                     </button>
                     <button onClick={() => { setActiveModule('settings'); setAdminSettingsTab('company'); }} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                        <Building2 size={18} /> Kurumsal Ayarları Düzenle
                     </button>
                   </div>
                </section>

                <section className="glass-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Son Giriş Özetleri</h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto', fontSize: '0.85rem' }}>
                    {loginLogs.slice(0, 10).map((log, i) => (
                      <div key={i} style={{ padding: '10px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                        <span><strong>{log.username}</strong> ({log.ip})</span>
                        <span style={{ color: log.success ? '#10b981' : '#f87171' }}>{log.success ? 'BAŞARILI' : 'HATALI'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </main>
          </div>
        );
      }
    } catch (err) {
      console.error("❌ MODÜL RENDER HATASI:", err);
      return <div style={{ padding: '2rem', color: '#ef4444' }}><h4>Modül yüklenirken bir hata oluştu.</h4><p>{err.message}</p></div>;
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
      <div className="mesh-bg"></div>

      {/* Sidebar Overlay for Mobile */}
      <div className={`sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>

      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{ transition: 'all 0.3s ease' }}>
        <div className="sidebar-header" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', background: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HardHat size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Harita Portalı</h1>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>GIS Dashboard</div>
            </div>
          </div>
          <button className="mobile-only" onClick={() => setMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-card">
            <div className="avatar">
              <User size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser || 'Kullanıcı'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentRole === 'admin' ? 'ADMIN' : 'MÜHENDİS'}</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="sidebar-menu" style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          <div style={{ padding: '0 1.5rem 0.5rem', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Modüller</div>
          
          <div onClick={() => { setActiveModule('dashboard'); setMobileMenuOpen(false); }} className={`nav-item ${activeModule === 'dashboard' ? 'active' : ''}`}>
             <LayoutDashboard size={18} /> Dashboard
          </div>

          {navigationItems.map(item => (
            <div key={item.id} onClick={() => { setActiveModule(item.id); setMobileMenuOpen(false); }} className={`nav-item ${activeModule === item.id ? 'active' : ''}`}>
              {item.icon} {item.label}
            </div>
          ))}
          
          {currentRole === 'admin' && (
            <div onClick={() => { setActiveModule('admin'); setMobileMenuOpen(false); }} className={`nav-item ${activeModule === 'admin' ? 'active' : ''}`}>
              <HardHat size={18} /> Admin Paneli
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          © 2024 Muhammed BİLİCİ
        </div>
      </aside>

      <div className="main-content">
        <header className="top-app-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button className="mobile-only" onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: '#fff', marginRight: '10px' }}>
               <Menu size={24} />
             </button>
             <div className="search-box hide-mobile" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '350px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Proje veya veri ara..." style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '0.9rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Bell size={20} /></button>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Settings size={20} /></button>
            </div>
            
            <div style={{ height: '24px', width: '1px', background: 'var(--glass-border)' }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="firm-selector" style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', padding: '2px 10px', border: '1px solid rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <select 
                  className="top-select"
                  value={selectedFirm?.id || ''} 
                  onChange={(e) => {
                    const f = firms.find(f => f.id === e.target.value);
                    setSelectedFirm(f);
                    localStorage.setItem('selectedFirmId', e.target.value);
                  }}
                >
                  <option value="">Firma Seçin</option>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button onClick={() => setShowAddFirm(true)} className="btn-icon-small" style={{ color: 'var(--primary-color)', background: 'transparent', border: 'none' }}><Plus size={16} /></button>
                {selectedFirm && (
                  <button onClick={() => handleDeleteFirm(selectedFirm.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none' }}><Trash2 size={16} /></button>
                )}
              </div>

              {selectedFirm && (
                <div className="project-selector" style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', padding: '2px 10px', border: '1px solid rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <select 
                    className="top-select"
                    value={selectedProject} 
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    <option value="">İş Seçin</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button onClick={() => handleAddProject(selectedFirm.id)} className="btn-icon-small" style={{ color: 'var(--accent-color)', background: 'transparent', border: 'none' }}><Plus size={16} /></button>
                  {selectedProject && (
                    <button onClick={() => handleDeleteProject(selectedFirm.id, selectedProject)} style={{ color: '#ef4444', background: 'transparent', border: 'none' }}><Trash2 size={16} /></button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'auto', padding: '2rem' }}>
          {renderContent()}
        </div>
      </div>

      {showAddFirm && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card anim-scale-in" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Yeni Firma Ekle</h3>
            <input 
              type="text" 
              className="table-input" 
              placeholder="Firma adını giriniz..." 
              value={newFirmName} 
              onChange={e => setNewFirmName(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddFirm(false)} style={{ flex: 1 }}>İptal</button>
              <button className="btn" onClick={handleAddFirm} style={{ flex: 1 }}>Firma Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
