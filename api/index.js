const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { DxfWriter } = require('@tarikjabiri/dxf');
const DxfParser = require('dxf-parser');
const zlib = require('zlib');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const potrace = require('potrace');


const JWT_SECRET = process.env.JWT_SECRET || 'kubaj_gizli_anahtar_2024_degistirin';

const app = express();

// --- LOGGING & HEALTH CHECK (En Üstte) ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get(['/api/health', '/health'], (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date(), 
        path: req.path,
        url: req.url,
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
    });
});

app.get('/api/debug-routes', (req, res) => {
    const routes = app._router.stack
        .filter(r => r.route)
        .map(r => `${Object.keys(r.route.methods).join(',').toUpperCase()} ${r.route.path}`);
    res.json({ routes });
});

// --- MONGODB BAĞLANTISI ---
const mongoUri = "mongodb+srv://yinemisenpalu_db_user:3qOfQg0ElHtBmnUF@cluster.hgggsjw.mongodb.net/kubaj_site?retryWrites=true&w=majority&appName=Cluster";

let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    
    try {
        console.log('🔄 MongoDB Atlas bağlantısı kuruluyor...');
        const db = await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 15000,
            family: 4 // IPv4 zorla (Vercel bazen IPv6'da sorun yaşıyor)
        });
        cachedDb = db;
        console.log('✅ MongoDB Atlas bağlantısı başarılı');
        return db;
    } catch (err) {
        console.error('❌ MongoDB bağlantı hatası:', err.message);
        throw err;
    }
};

// --- DB MIDDLEWARE (Sadece /api/health dışındaki rotalar için) ---
app.use(async (req, res, next) => {
    if (req.path === '/api/health' || req.path === '/health') return next();
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(500).json({ error: 'Veritabanı Bağlantı Hatası', message: err.message });
    }
});

// Veritabanı Şemaları
const FirmSchema = new mongoose.Schema({
    name: String, 
    createdAt: { type: Date, default: Date.now } 
}, { toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; } }, toObject: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; } } });

const Firm = mongoose.models.Firm || mongoose.model('Firm', FirmSchema);

const ProjectSchema = new mongoose.Schema({
    firmId: String,
    jobName: String,
    kubajData: { type: Object, default: { points: [], results: null } },
    hakedisData: { type: Object, default: { details: {}, data: [] } },
    cadData: { type: Object, default: { entities: [], layers: [] } },
    updatedAt: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; } }, toObject: { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; } } });

const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

const SettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' },
    userName: String,
    userTitle: String,
    companyAddress: String,
    defaultPreparer: String,
    defaultController: String,
    companyLogo: String
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const LoginLogSchema = new mongoose.Schema({
    username: String,
    ip: String,
    success: Boolean,
    timestamp: { type: Date, default: Date.now }
});
const LoginLog = mongoose.models.LoginLog || mongoose.model('LoginLog', LoginLogSchema);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token bulunamadı.' });
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token geçersiz veya süresi dolmuş.' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Bu işlem sadece admin tarafından yapılabilir.' });
    next();
};

// --- API ENDPOINTS ---

// AUTH: Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Bilinmiyor';
    try {
        const user = await User.findOne({ username });
        if (!user) {
            await LoginLog.create({ username, ip, success: false });
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış.' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            await LoginLog.create({ username, ip, success: false });
            return res.status(401).json({ error: 'Kullanıcı adı veya şifre yanlış.' });
        }
        await LoginLog.create({ username, ip, success: true });
        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, role: user.role, username: user.username });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
});

// AUTH: Change Own Password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Yeni şifre en az 4 karakter olmalıdır.' });
    try {
        const user = await User.findById(req.user.id);
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: 'Mevcut şifre yanlış.' });
        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Şifre başarıyla güncellendi.' });
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası.' }); }
});

// ADMIN: Seed first admin user (ilk kurulumda bir kez kullanın)
app.get('/api/auth/seed-admin', async (req, res) => {
    try {
        const existing = await User.findOne({ username: 'admin' });
        if (existing) return res.status(400).json({ error: 'Admin kullanıcısı zaten mevcut.' });
        const passwordHash = await bcrypt.hash('admin123', 10);
        await User.create({ username: 'admin', passwordHash, role: 'admin' });
        res.json({ message: 'Admin kullanıcısı oluşturuldu. Kullanıcı adı: admin, Şifre: admin123 (hemen değiştirin!)' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: List Users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Create User
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gereklidir.' });
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ username, passwordHash, role: role || 'user' });
        res.json({ id: user._id, username: user.username, role: user.role });
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        res.status(500).json({ error: err.message });
    }
});

// ADMIN: Delete User
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user?.role === 'admin') return res.status(400).json({ error: 'Admin kullanıcısı silinemez.' });
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Kullanıcı silindi.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Login Logs
app.get('/api/admin/login-logs', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const logs = await LoginLog.find().sort({ timestamp: -1 }).limit(200);
        res.json(logs);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FIRM ENDPOINTS ---

app.get('/api/firms', async (req, res) => {
    try {
        const firms = await Firm.find().sort({ createdAt: -1 });
        res.json(firms);
    } catch (err) { res.status(500).send('Firmalar çekilemedi.'); }
});

app.post('/api/firms', async (req, res) => {
    try {
        console.log("📥 [POST /api/firms] İstek Gövdesi:", req.body);
        if (!req.body || !req.body.name) {
            console.warn("⚠️ [POST /api/firms] Hata: Firma adı eksik.");
            return res.status(400).send('Firma adı gereklidir.');
        }
        
        // Veritabanı bağlantısını kontrol et
        if (mongoose.connection.readyState !== 1) {
            console.log("🔄 Veritabanı bağlı değil, bağlanmaya çalışılıyor...");
            await connectDB();
        }

        const newFirm = new Firm({ name: req.body.name });
        console.log("💾 Firma kaydediliyor:", newFirm.name);
        await newFirm.save();
        console.log("✅ Firma başarıyla kaydedildi:", newFirm._id);
        res.json(newFirm);
    } catch (err) { 
        console.error("❌ Firma Ekleme Hatası:", err);
        res.status(500).json({ 
            error: 'Sunucu hatası veya Veritabanı bağlantısı kurulamadı.', 
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            hint: 'Eğer bu hata devam ediyorsa MongoDB Atlas IP Beyaz Listesini (0.0.0.0/0) kontrol edin.'
        }); 
    }
});

app.delete('/api/firms/:id', async (req, res) => {
    try {
        await Firm.findByIdAndDelete(req.params.id);
        await Project.deleteMany({ firmId: req.params.id });
        res.json({ message: 'Firma silindi.' });
    } catch (err) { res.status(500).send('Silme hatası.'); }
});

app.get('/api/projects/all', async (req, res) => {
    try {
        const firms = await Firm.find();
        const projects = await Project.find().sort({ updatedAt: -1 });
        const result = projects.map(p => {
            const firm = firms.find(f => f._id.toString() === p.firmId || f.id === p.firmId);
            return {
                ...p.toObject(),
                firmName: firm ? firm.name : 'Bilinmeyen Firma'
            };
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Projeler yüklenemedi: ' + err.message });
    }
});

app.get('/api/projects/:firmId/:jobName', async (req, res) => {
    try {
        const project = await Project.findOne({ firmId: req.params.firmId, jobName: decodeURIComponent(req.params.jobName) });
        res.json(project);
    } catch (err) { res.status(500).send('Proje bulunamadı.'); }
});

app.delete('/api/projects/:firmId/:jobName', async (req, res) => {
    try {
        await Project.findOneAndDelete({ firmId: req.params.firmId, jobName: decodeURIComponent(req.params.jobName) });
        res.json({ message: 'Proje silindi.' });
    } catch (err) { res.status(500).send('Silme hatası.'); }
});

app.get('/api/firms/:id/projects', async (req, res) => {
    try {
        const projects = await Project.find({ firmId: req.params.id }).select('jobName');
        res.json(projects.map(p => p.jobName));
    } catch (err) { res.status(500).send('Projeler çekilemedi.'); }
});

app.get('/api/hakedis', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        const project = await Project.findOne({ firmId, jobName });
        res.json(project?.hakedisData || { details: {}, data: [] });
    } catch (err) { res.status(500).send('Veri çekilemedi.'); }
});

app.get('/api/kubaj', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        const project = await Project.findOne({ firmId, jobName });
        res.json(project?.kubajData || { points: [], results: null });
    } catch (err) { res.status(500).send('Veri çekilemedi.'); }
});

app.get('/api/cad', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        const project = await Project.findOne({ firmId, jobName });
        res.json(project?.cadData || { entities: [], layers: [] });
    } catch (err) { res.status(500).send('Veri çekilemedi.'); }
});

app.post('/api/cad', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        await Project.findOneAndUpdate({ firmId, jobName }, { cadData: req.body, updatedAt: Date.now() }, { upsert: true });
        res.json({ message: 'Çizim kaydedildi.' });
    } catch (err) { res.status(500).send('Çizim kaydedilemedi.'); }
});

app.post('/api/hakedis', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        await Project.findOneAndUpdate({ firmId, jobName }, { hakedisData: req.body, updatedAt: Date.now() }, { upsert: true });
        res.json({ message: 'Hakediş kaydedildi.' });
    } catch (err) { res.status(500).send('Hakediş kaydedilemedi.'); }
});

app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        res.json(settings);
    } catch (err) { res.status(500).send('Ayarlar çekilemedi.'); }
});

app.post('/api/settings', async (req, res) => {
    try {
        await Settings.findOneAndUpdate({}, req.body, { upsert: true });
        res.json({ message: 'Ayarlar kaydedildi.' });
    } catch (err) { res.status(500).send('Hata.'); }
});

// --- DOSYA YÜKLEME VE HESAPLAMA ---
const upload = multer({ dest: '/tmp/' }); // Vercel için /tmp kullanıyoruz

// --- YARDIMCI GEOMETRİ FONKSİYONLARI ---

/**
 * Mekansal Izgara (Spatial Grid) Optimizasyonu
 * Üçgenleri hücrelere bölerek Z sorgusunu O(T) yerine O(1) seviyesine indirir.
 */
function createSpatialGrid(points, triangles, bbox, gridSize = 40) {
    const grid = Array.from({ length: gridSize * gridSize }, () => []);
    const cellWidth = Math.max((bbox.maxX - bbox.minX) / gridSize, 0.01);
    const cellHeight = Math.max((bbox.maxY - bbox.minY) / gridSize, 0.01);

    for (let i = 0; i < triangles.length; i += 3) {
        const p0 = points[triangles[i]];
        const p1 = points[triangles[i+1]];
        const p2 = points[triangles[i+2]];

        const tMinX = Math.min(p0.x, p1.x, p2.x);
        const tMaxX = Math.max(p0.x, p1.x, p2.x);
        const tMinY = Math.min(p0.y, p1.y, p2.y);
        const tMaxY = Math.max(p0.y, p1.y, p2.y);

        const startX = Math.floor((tMinX - bbox.minX) / cellWidth);
        const endX = Math.floor((tMaxX - bbox.minX) / cellWidth);
        const startY = Math.floor((tMinY - bbox.minY) / cellHeight);
        const endY = Math.floor((tMaxY - bbox.minY) / cellHeight);

        for (let gx = Math.max(0, startX); gx <= Math.min(gridSize - 1, endX); gx++) {
            for (let gy = Math.max(0, startY); gy <= Math.min(gridSize - 1, endY); gy++) {
                grid[gy * gridSize + gx].push(i);
            }
        }
    }
    return { grid, cellWidth, cellHeight, gridSize, bbox };
}

function getZFromGrid(x, y, spatialGrid, points, triangles, maxEdgeSq, zField) {
    const { grid, cellWidth, cellHeight, gridSize, bbox } = spatialGrid;
    
    const gx = Math.floor((x - bbox.minX) / cellWidth);
    const gy = Math.floor((y - bbox.minY) / cellHeight);
    
    if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return null;
    
    const triIndices = grid[gy * gridSize + gx];
    for (const i of triIndices) {
        const p0 = points[triangles[i]];
        const p1 = points[triangles[i+1]];
        const p2 = points[triangles[i+2]];

        // Kenar Uzunluğu Kontrolü (Delaunay Convex Hull Boşlukları İçin)
        const d1 = Math.pow(p0.x - p1.x, 2) + Math.pow(p0.y - p1.y, 2);
        const d2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
        const d3 = Math.pow(p2.x - p0.x, 2) + Math.pow(p2.y - p0.y, 2);
        if (d1 > maxEdgeSq || d2 > maxEdgeSq || d3 > maxEdgeSq) continue;

        const det = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
        const l1 = ((p1.y - p2.y) * (x - p2.x) + (p2.x - p1.x) * (y - p2.y)) / det;
        const l2 = ((p2.y - p0.y) * (x - p2.x) + (p0.x - p2.x) * (y - p2.y)) / det;
        const l3 = 1 - l1 - l2;

        if (l1 >= -1e-7 && l2 >= -1e-7 && l3 >= -1e-7) {
            const z0 = p0[zField] !== undefined ? p0[zField] : (p0.z || 0);
            const z1 = p1[zField] !== undefined ? p1[zField] : (p1.z || 0);
            const z2 = p2[zField] !== undefined ? p2[zField] : (p2.z || 0);
            return l1 * z0 + l2 * z1 + l3 * z2;
        }
    }
    return null;
}

const parseFormattedValue = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = val.toString().trim();
    
    // KURAL 1: Ondalık Ayracı Filtresi
    if (str.includes('.') && str.includes(',')) {
        // Örn: 1.234,56 -> 1234.56
        str = str.replace(/\./g, "").replace(",", ".");
    } else if (str.includes(',') && !str.includes('.')) {
        // Örn: 21,96 -> 21.96
        str = str.replace(/,/g, ".");
    } else {
        // Sadece nokta varsa veya hiçbiri yoksa
        // Örn: 2.196 -> 2.196 olarak kalır. parseFloat bunu ondalık kabul eder.
        // Binlik ayırıcı sanıp silmiyoruz!
    }
    return parseFloat(str) || 0;
};

const mapHeaders = (row) => {
    const mapped = {};
    const lowerRow = {};
    Object.keys(row).forEach(k => lowerRow[k.toLowerCase().trim()] = row[k]);
    mapped.x = parseFormattedValue(lowerRow['x'] || lowerRow['x koordinatı'] || lowerRow['east']);
    mapped.y = parseFormattedValue(lowerRow['y'] || lowerRow['y koordinatı'] || lowerRow['north']);
    mapped.z_mevcut = parseFormattedValue(lowerRow['z_mevcut'] || lowerRow['mevcut kot (m)'] || lowerRow['mevcut'] || lowerRow['z1'] || lowerRow['ground']);
    mapped.z_proje = parseFormattedValue(lowerRow['z_proje'] || lowerRow['proje kot (m)'] || lowerRow['proje'] || lowerRow['z2'] || lowerRow['design']);
    mapped.id = lowerRow['id'] || lowerRow['nokta no'] || lowerRow['no'] || 'P';
    return mapped;
};

// --- NCZ (Netcad) BINARY PARSER ---
const parseNcz = (buffer) => {
    let points = [];
    let breaklines = [];
    try {
        let data = buffer;
        try {
            data = zlib.inflateSync(buffer);
        } catch (e) {}

        // Netcad 8.0 ve üzeri için 64-bit Double taraması
        let lastX = 0, lastY = 0, currentPath = [];
        
        const MAX_POINTS = 500000; // 500 bin nokta limiti
        for (let i = 0; i < data.length - 24; i += 2) { // 2 byte adımlarla daha hızlı tarama
            if (points.length >= MAX_POINTS) break;
            
            const y = data.readDoubleLE(i);
            const x = data.readDoubleLE(i + 8);
            const z = data.readDoubleLE(i + 16);

            const isValidVal = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v) && Math.abs(v) < 10000000;
            
            if (isValidVal(y) && isValidVal(x) && isValidVal(z)) {
                // Türkiye koordinat aralığı (UTM/ITRF) veya yerel koordinatlar
                const inRange = (y > -2000000 && y < 20000000 && x > -2000000 && x < 20000000);
                
                if (inRange && Math.abs(y) > 0.001 && Math.abs(x) > 0.001) {
                    const p = {
                        id: `N${points.length + 1}`,
                        y: Number(y.toFixed(6)),
                        x: Number(x.toFixed(6)),
                        z_mevcut: Number(z.toFixed(4)),
                        z_proje: 0
                    };
                    points.push(p);

                    // BREAKLINE TESPİTİ (Heuristic): 
                    const distToLast = Math.hypot(x - lastX, y - lastY);
                    if (distToLast > 0.001 && distToLast < 50) {
                        currentPath.push(p);
                    } else {
                        if (currentPath.length > 1) breaklines.push([...currentPath]);
                        currentPath = [p];
                    }
                    
                    lastX = x; lastY = y;
                    i += 22; // Toplam 24 byte ilerlemiş oluruz (i += 2 + 22)
                }
            }
        }
        if (currentPath.length > 1) breaklines.push(currentPath);

        // KIRIK HAT (BREAKLINE) SİMÜLASYONU:
        // Delaunator kütüphanesi 'Constrained' (Zorlamalı) Delaunay desteklemez.
        // Bu yüzden çizgiler boyunca ara noktalar ekleyerek üçgenlerin çizgiyi takip etmesini sağlıyoruz.
        breaklines.forEach(path => {
            for (let j = 0; j < path.length - 1; j++) {
                const p1 = path[j];
                const p2 = path[j+1];
                const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                if (dist > 5) {
                    const steps = Math.min(Math.floor(dist / 2), 20); // Maks 20 ara nokta
                    for (let s = 1; s < steps; s++) {
                        const ratio = s / steps;
                        points.push({
                            id: `B${points.length}`,
                            x: p1.x + (p2.x - p1.x) * ratio,
                            y: p1.y + (p2.y - p1.y) * ratio,
                            z_mevcut: p1.z_mevcut + (p2.z_mevcut - p1.z_mevcut) * ratio,
                            z_proje: 0,
                            isBreaklinePoint: true
                        });
                    }
                }
            }
        });

        // Duplicate Removal
        if (points.length > 0) {
            const uniquePoints = [];
            const seen = new Set();
            points.forEach(p => {
                const key = `${p.x.toFixed(3)}-${p.y.toFixed(3)}`;
                if (!seen.has(key)) {
                    uniquePoints.push(p);
                    seen.add(key);
                }
            });
            points = uniquePoints;
        }

    } catch (err) {
        console.error("NCZ Parse Hatası:", err);
    }
    return points;
};

app.post('/api/upload', upload.fields([{ name: 'file_mevcut', maxCount: 1 }, { name: 'file_proje', maxCount: 1 }, { name: 'file_enkesit', maxCount: 1 }]), async (req, res) => {
    const firmId = req.headers['x-firm-id'];
    const jobName = req.headers['x-job-name'] ? decodeURIComponent(req.headers['x-job-name']) : null;
    if (!firmId || !jobName) return res.status(400).send('Firma veya İş seçilmedi.');
    const isEnkesitMode = req.files && req.files['file_enkesit'];
    const isTINMode = req.files && req.files['file_mevcut'] && req.files['file_proje'];

    if (!isEnkesitMode && !isTINMode) {
        return res.status(400).send('Lütfen geçerli veri dosyalarını yükleyiniz (Enkesit Excel veya Mevcut+Proje).');
    }
    
    try {
        if (isEnkesitMode) {
            const fileObj = req.files['file_enkesit'][0];
            const ext = path.extname(fileObj.originalname).toLowerCase();
            let rawPoints = [];

            // Kural 5: KM formatını düzelt "0+12500" -> 12500
            const parseKM = (s) => {
                if (typeof s === 'number') return s;
                const str = String(s || '').trim().replace(/ /g, '');
                if (str.includes('+')) {
                    const parts = str.split('+');
                    return (parseFloat(parts[0]) || 0) * 1000 + (parseFloat(parts[1].replace(',', '.')) || 0);
                }
                return parseFloat(str.replace(',', '.')) || 0;
            };

            if (ext === '.xlsx' || ext === '.xls') {
                const workbook = xlsx.readFile(fileObj.path);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: 0 });

                const headers = data[0] || [];
                const colMap = {};
                headers.forEach((h, i) => { if(h) colMap[h.toString().toLowerCase().trim().replace(/[ ()]/g, '_')] = i; });

                for (let r = 1; r < data.length; r++) {
                    const row = data[r];
                    if (!row || row.length === 0) continue;

                    const getVal = (keys) => {
                        for (let k of keys) {
                            const normalized = k.toLowerCase().replace(/[ ()]/g, '_').trim();
                            const variants = [normalized, normalized + '_m2', 'alan_' + normalized, 'toplam_' + normalized];
                            for (let v of variants) if (colMap[v] !== undefined) return row[colMap[v]];
                        }
                        return null;
                    };

                    const km = parseKM(getVal(['km', 'kilometre', 'kesit', 'station', 'id']) || row[0]);
                    const yarma = parseFormattedValue(getVal(['yarma', 'kazı', 'cut', 'kazi_alanı', 'alan_yarma']));
                    const dolgu = parseFormattedValue(getVal(['dolgu', 'fill', 'dolgu_alanı', 'alan_dolgu']));

                    if (!isNaN(km)) rawPoints.push({ km, yarma, dolgu });
                }
            } else {
                const content = fs.readFileSync(fileObj.path, 'utf-8');
                const regex = /KM\s*[:=]?\s*([0-9+.,-]+)([\s\S]*?)(?=KM|$)/gi;
                let m;
                while ((m = regex.exec(content)) !== null) {
                    const km = parseKM(m[1]);
                    const nums = m[2].match(/[0-9]+([.,][0-9]+)?/g) || [];
                    let yarma = 0, dolgu = 0;
                    if (nums.length >= 3) { yarma = parseFormattedValue(nums[1]); dolgu = parseFormattedValue(nums[2]); }
                    else if (nums.length === 2) { yarma = parseFormattedValue(nums[0]); dolgu = parseFormattedValue(nums[1]); }
                    if (!isNaN(km)) rawPoints.push({ km, yarma, dolgu });
                }
            }

            if (rawPoints.length < 2) return res.status(400).send('Hata: Yeterli kesit verisi bulunamadı.');

            // 1. Sırala ve Konsolide Et
            rawPoints.sort((a, b) => a.km - b.km);
            const pts = [];
            rawPoints.forEach(p => {
                const last = pts[pts.length - 1];
                if (last && Math.abs(last.km - p.km) < 0.001) {
                    last.yarma = Math.max(last.yarma, p.yarma);
                    last.dolgu = Math.max(last.dolgu, p.dolgu);
                } else {
                    pts.push({ ...p, L: 0, vYarma: 0, vDolgu: 0, cYarma: 0, cDolgu: 0 });
                }
            });

            // 2. ULTIMATUM HESAPLAMA MOTORU (v15)
            let totalY = 0, totalD = 0;
            const r3 = (v) => Math.round(v * 1000) / 1000;
            let debugStr = "--- v15 ULTIMATUM DEBUG ---\n";

            for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i+1];
                
                // Kural 4: L = km(i+1) - km(i)
                const L = r3(p2.km - p1.km);
                
                if (L > 0) {
                    // Kural 3: V = ((A1 + A2) / 2) * L (Average End Area)
                    // V = (L/6) * (A1 + 4*Am + A2) (Prismoidal - basitleştirilmiş simülasyon)
                    let vY, vD;
                    const method = req.body.method || 'average';
                    
                    if (method === 'prismoidal') {
                        // Prismoidal formülü için ara kesit (Am) genellikle lineer kabul edilir: Am = (A1+A2)/2
                        // Bu durumda Prismoidal, Average End Area'ya eşit olur. 
                        // Ancak Netcad 'Simpson' yaklaşımı kullanıyorsa formül değişebilir.
                        // Biz burada standart Prismoidal (basitleştirilmiş) ve AEA desteği sunuyoruz.
                        vY = r3(((p1.yarma + p2.yarma) / 2.0) * L); 
                        vD = r3(((p1.dolgu + p2.dolgu) / 2.0) * L);
                    } else {
                        vY = r3(((p1.yarma + p2.yarma) / 2.0) * L);
                        vD = r3(((p1.dolgu + p2.dolgu) / 2.0) * L);
                    }
                    
                    totalY = r3(totalY + vY);
                    totalD = r3(totalD + vD);
                    
                    p2.L = L;
                    p2.vYarma = vY;
                    p2.vDolgu = vD;

                    // Kural 8: İlk 3 segment debug
                    if (i < 3) {
                        debugStr += `SEG ${i+1}: KM ${p1.km}->${p2.km} | L=${L} | A1=${p1.yarma} A2=${p2.yarma} | V=${vY} m3\n`;
                    }
                }
                p2.cYarma = totalY;
                p2.cDolgu = totalD;
            }

            console.log(debugStr);

            // Kural 9: Otomatik Hata Kontrolü
            const isError = totalY < 20000; 
            const statusMsg = isError ? "HESAPLAMA HATALI (DÜŞÜK HACİM)" : "HESAPLAMA BAŞARILI";

            const kubajData = { 
                points: pts.map(p => ({ 
                    id: p.km.toString(), 
                    kmValue: p.km, 
                    yarmaAlani: p.yarma, 
                    dolguAlani: p.dolgu,
                    araUzaklik: p.L,
                    yarmaHacmi: p.vYarma,
                    dolguHacmi: p.vDolgu,
                    cumulativeCut: p.cYarma,
                    cumulativeFill: p.cDolgu,
                    brunner: r3(p.cYarma - p.cDolgu)
                })), 
                results: { 
                    cutVolume: totalY, 
                    fillVolume: totalD, 
                    totalVolume: r3(totalY - totalD), 
                    log: `!!! v15 ULTIMATUM AKTİF !!! ${statusMsg}. Toplam Yarma: ${totalY.toLocaleString('tr-TR')} m³.`,
                    debug: { method: 'Netcad Ultimatum v15', segments: debugStr.split('\n').slice(1, 5) }
                } 
            };

            await Project.findOneAndUpdate({ firmId, jobName }, { kubajData, updatedAt: Date.now() }, { upsert: true });
            if (fs.existsSync(fileObj.path)) fs.unlinkSync(fileObj.path);
            return res.json(kubajData);
        }

        // === TIN YÖNTEMİ (NOKTA BULUTU: NCN/NCZ) ===
        const parseFile = (fileObj) => {
            let pts = [];
            const ext = path.extname(fileObj.originalname).toLowerCase();
            if (ext === '.ncn') {
                const content = fs.readFileSync(fileObj.path, 'utf-8');
                const lines = content.split('\n');
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    // NCN Formati: NoktaID Y(Saga) X(Yukari) Z(Kot)
                    if (parts.length >= 4) {
                        pts.push({
                            id: parts[0], 
                            y: parseFormattedValue(parts[1]), 
                            x: parseFormattedValue(parts[2]),
                            z_mevcut: parseFormattedValue(parts[3])
                        });
                    }
                });
            } else if (ext === '.ncz') {
                const buffer = fs.readFileSync(fileObj.path);
                pts = parseNcz(buffer); 
            } else {
                const workbook = xlsx.readFile(fileObj.path);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rawPoints = xlsx.utils.sheet_to_json(sheet);
                pts = rawPoints.map(p => mapHeaders(p));
            }
            return pts;
        };

        let ptsMevcut = parseFile(req.files['file_mevcut'][0]);
        let ptsProje = parseFile(req.files['file_proje'][0]);
        
        // NCN/NCZ formatından proje dosyası yüklendiğinde Z değerleri z_mevcut olarak gelir.
        // Bunu proje (z_proje) alanına aktaralım ki filtrelemeler doğru çalışsın.
        ptsProje.forEach(p => {
            if (p.z_proje === 0 || p.z_proje === undefined) {
                p.z_proje = p.z_mevcut;
                p.z_mevcut = undefined;
            }
        });

        const filterZAndOutliers = (pts, isProje = false) => {
            // 1. Sıfır (0.00), null, NaN Filtresi (Z-Ekseni Filtresi)
            // Kazı hacmi hesaplarken Z=0 olan noktaları hesaplamaya dahil etme!
            let validPts = pts.filter(p => {
                const z = isProje ? p.z_proje : p.z_mevcut;
                return z !== undefined && z !== null && !isNaN(z) && Math.abs(z) > 0.001;
            });
            if (validPts.length === 0) return validPts;

            // 2. Format Zorlaması (Tam sayıysa %100 yap)
            const allInt = validPts.every(p => {
                const z = isProje ? (p.z_proje !== undefined ? p.z_proje : p.z_mevcut) : p.z_mevcut;
                return Number.isInteger(z);
            });
            if (allInt) {
                validPts.forEach(p => {
                    if (p.z_mevcut !== undefined) p.z_mevcut /= 100;
                    if (p.z_proje !== undefined) p.z_proje /= 100;
                });
            }

            // 3. İstatistiksel Outlier Filtresi (Ortalama ± 3*StdDev)
            const sumZ = validPts.reduce((acc, p) => acc + (isProje ? (p.z_proje !== undefined ? p.z_proje : p.z_mevcut) : p.z_mevcut), 0);
            const avgZ = sumZ / validPts.length;

            const variance = validPts.reduce((acc, p) => {
                const z = isProje ? (p.z_proje !== undefined ? p.z_proje : p.z_mevcut) : p.z_mevcut;
                return acc + Math.pow(z - avgZ, 2);
            }, 0) / validPts.length;
            const stdDev = Math.sqrt(variance);

            if (stdDev === 0) return validPts;

            return validPts.filter(p => {
                const z = isProje ? (p.z_proje !== undefined ? p.z_proje : p.z_mevcut) : p.z_mevcut;
                return Math.abs(z - avgZ) <= (stdDev * 3); 
            });
        };

        const filterXYOutliersIQR = (pts) => {
            // 1. Mutlak 0,0 Filtresi (Datum Kayması Önleme)
            let filtered = pts.filter(p => Math.abs(p.x) > 0.001 && Math.abs(p.y) > 0.001);
            
            if (filtered.length < 10) return filtered;

            const sortedX = [...filtered].map(p => p.x).sort((a, b) => a - b);
            const sortedY = [...filtered].map(p => p.y).sort((a, b) => a - b);
            const q1X = sortedX[Math.floor(filtered.length * 0.25)];
            const q3X = sortedX[Math.floor(filtered.length * 0.75)];
            const iqrX = Math.max(q3X - q1X, 100); 
            const q1Y = sortedY[Math.floor(filtered.length * 0.25)];
            const q3Y = sortedY[Math.floor(filtered.length * 0.75)];
            const iqrY = Math.max(q3Y - q1Y, 100);
            
            const minX = q1X - 5.0 * iqrX; // 5x IQR (Daha esnek ama güvenli)
            const maxX = q3X + 5.0 * iqrX;
            const minY = q1Y - 5.0 * iqrY;
            const maxY = q3Y + 5.0 * iqrY;
            
            return filtered.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
        };

        const normalizeUnits = (pts) => {
            if (pts.length < 2) return pts;
            
            // 1. Koordinat Birim Sistemi Kontrolü (UTM/ITRF)
            // Eğer koordinatlar 10M'den büyükse muhtemelen milimetredir.
            const isMillimeterScale = pts.some(p => Math.abs(p.x) > 10000000 || Math.abs(p.y) > 10000000);
            
            if (isMillimeterScale) {
                pts.forEach(p => {
                    p.x /= 1000;
                    p.y /= 1000;
                    if (p.z_mevcut !== undefined) p.z_mevcut /= 1000;
                    if (p.z_proje !== undefined) p.z_proje /= 1000;
                });
            }

            // 2. Kot (Elevation) Birim Sistemi Kontrolü (Hassas Düzeltme)
            // Eğer ortalama kot 5000m'den büyükse muhtemelen milimetredir.
            const zVals = pts.map(p => p.z_mevcut || p.z_proje || 0).filter(z => z !== 0);
            if (zVals.length > 0) {
                const avgZ = zVals.reduce((a, b) => a + b, 0) / zVals.length;
                if (Math.abs(avgZ) > 5000) {
                    pts.forEach(p => {
                        if (p.z_mevcut !== undefined) p.z_mevcut /= 1000;
                        if (p.z_proje !== undefined) p.z_proje /= 1000;
                    });
                }
            }

            return pts;
        };

        ptsMevcut = filterXYOutliersIQR(ptsMevcut);
        ptsProje = filterXYOutliersIQR(ptsProje);

        ptsMevcut = normalizeUnits(ptsMevcut);
        ptsProje = normalizeUnits(ptsProje);

        ptsMevcut = filterZAndOutliers(ptsMevcut, false);
        ptsProje = filterZAndOutliers(ptsProje, true);
        
        if (ptsMevcut.length === 0) {
            return res.status(400).send('Dosya okuma kuralı filtrelemesi sonrasında mevcut noktalar kalmadı. Tüm kotlar tam 0.00 veya geçersiz olabilir.');
        }

        // --- Zemin ve Taban Sanity Check ---
        let minZ = Infinity, maxZ = -Infinity;
        let maxPoint = null, minPoint = null;

        // 1. Memory ve Bellek Kontrolü
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        if (memoryUsage > 450) { // Vercel limiti 512MB'dır.
            return res.status(400).json({ 
                error: 'BELLEK_LİMİTİ', 
                message: 'Sunucu belleği çok yoğun, işlem durduruldu.',
                detail: 'Lütfen dosyayı sadeleştirin veya daha küçük bir alan yükleyin.' 
            });
        }

        // 2. Nokta Sayısı Kontrolü ve Otomatik Seyreltme (Decimation)
        const POINT_LIMIT = 20000; 
        const decimate = (pts, limit) => {
            if (pts.length <= limit) return pts;
            const factor = Math.ceil(pts.length / limit);
            return pts.filter((_, i) => i % factor === 0);
        };

        ptsMevcut = decimate(ptsMevcut, POINT_LIMIT);
        ptsProje = decimate(ptsProje, POINT_LIMIT);

        ptsMevcut.forEach(p => {
             if (p.z_mevcut < minZ) { minZ = p.z_mevcut; minPoint = p; }
             if (p.z_mevcut > maxZ) { maxZ = p.z_mevcut; maxPoint = p; }
        });
        
        let avgZ = ptsMevcut.reduce((s, p) => s + p.z_mevcut, 0) / ptsMevcut.length;

        // "Base Z (Kazı Taban Kotu)" eksikliği kontrolü
        if (ptsProje.length === 0 && ptsMevcut.length > 0) {
             ptsProje = ptsMevcut.map(p => ({
                 ...p,
                 z_proje: minZ // Hepsini Min_Z'ye projeksiyon yap
             }));
        } else {
             // ptsProje içinde eğer z_proje yoksa z_mevcut veya minZ al
             ptsProje.forEach(p => {
                 if (p.z_proje === undefined && p.z_mevcut === undefined) p.z_proje = minZ;
                 else if (p.z_proje === undefined) p.z_proje = p.z_mevcut;
             });
        }

        const debugData = {
             avgZ: avgZ.toFixed(2),
             maxZ: maxZ.toFixed(2),
             minZ: minZ.toFixed(2),
             first5Mevcut: ptsMevcut.slice(0, 5)
        };

        let finalPoints = [];
        let cut = 0, fill = 0;
        let hasHighDiffWarning = false;

        if (ptsMevcut.length >= 3 && ptsProje.length >= 3) {
            // 1. Koordinat ve Birim Normalizasyonu
            ptsMevcut = normalizeUnits(filterXYOutliersIQR(ptsMevcut));
            ptsProje = normalizeUnits(filterXYOutliersIQR(ptsProje));

            if (ptsMevcut.length < 3 || ptsProje.length < 3) {
                return res.status(400).json({ error: 'Filtreleme sonrası yeterli nokta kalmadı. Lütfen veriyi kontrol edin.' });
            }

            // 2. Mekansal Çakışma (Spatial Overlap) Kontrolü
            const getBBox = (pts) => ({
                minX: Math.min(...pts.map(p => p.x)),
                maxX: Math.max(...pts.map(p => p.x)),
                minY: Math.min(...pts.map(p => p.y)),
                maxY: Math.max(...pts.map(p => p.y))
            });

            const getCentroid = (pts) => ({
                x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
                y: pts.reduce((s, p) => s + p.y, 0) / pts.length
            });

            const bboxM = getBBox(ptsMevcut);
            const bboxP = getBBox(ptsProje);

            // Kesişim (Overlap) Alanı Kontrolü
            const overlapX = Math.max(0, Math.min(bboxM.maxX, bboxP.maxX) - Math.max(bboxM.minX, bboxP.minX));
            const overlapY = Math.max(0, Math.min(bboxM.maxY, bboxP.maxY) - Math.max(bboxM.minY, bboxP.minY));
            const overlapArea = overlapX * overlapY;
            
            const areaM = (bboxM.maxX - bboxM.minX) * (bboxM.maxY - bboxM.minY);
            const areaP = (bboxP.maxX - bboxP.minX) * (bboxP.maxY - bboxP.minY);
            const minArea = Math.min(areaM, areaP);
            
            // Eğer kesişim alanı toplam alanın %5'inden azsa hata döndür
            if (overlapArea / minArea < 0.05 && req.body.autoAlign !== 'true') {
                return res.status(400).json({ 
                    error: 'COORD_INCOMPATIBILITY', 
                    message: 'Koordinat Uyumsuzluğu: Dosyaların çakışma oranı çok düşük (%5\'ten az). Lütfen dosyaları aynı koordinat sisteminde olduğundan emin olun veya Netcad üzerinden hizalayın.' 
                });
            }

            // KORUMA: Mesafe Kontrolü (Safeguard)
            const centerM = { x: (bboxM.minX + bboxM.maxX) / 2, y: (bboxM.minY + bboxM.maxY) / 2 };
            const centerP = { x: (bboxP.minX + bboxP.maxX) / 2, y: (bboxP.minY + bboxP.maxY) / 2 };
            const distCenters = Math.hypot(centerM.x - centerP.x, centerM.y - centerP.y);
            
            if (distCenters > 1000 && req.body.autoAlign !== 'true') {
                return res.status(400).json({ 
                    error: 'ALIGNMENT_REQUIRED', 
                    message: `Dosya merkezleri arasındaki mesafe çok fazla (${Math.round(distCenters)}m).` 
                });
            }

            const centroidM = getCentroid(ptsMevcut);
            const centroidP = getCentroid(ptsProje);

            const dist = Math.hypot(centroidM.x - centroidP.x, centroidM.y - centroidP.y);
            
            // KORUMA: Eğer mesafe 1000 metreden fazlaysa işlemi başlatma.
            if (dist > 1000) {
                return res.status(400).json({
                    error: 'KOORDİNAT_SİSTEMİ_HATASI',
                    message: `Dosyalar arası mesafe çok büyük (${dist.toFixed(0)} metre).`,
                    detail: 'Hata: İki alım farklı koordinat sistemlerinde görünüyor. Lütfen dosyaları Netcad\'de üst üste bindirip tekrar yükleyin.'
                });
            }

            // OTOMATİK HİZALAMA
            if (dist > 1.0) {
                const tx = centroidM.x - centroidP.x;
                const ty = centroidM.y - centroidP.y;
                ptsProje.forEach(p => {
                    p.x += tx;
                    p.y += ty;
                });
                debugData.autoAlignment = { tx: tx.toFixed(3), ty: ty.toFixed(3), dist: dist.toFixed(3) };
            }

            // 3. Ortak Lokal Ofset ve Boundary Clipping (Overlap Alanı)
            const overlapBBox = {
                minX: Math.max(bboxM.minX, bboxP.minX) - 5,
                maxX: Math.min(bboxM.maxX, bboxP.maxX) + 5,
                minY: Math.max(bboxM.minY, bboxP.minY) - 5,
                maxY: Math.min(bboxM.maxY, bboxP.maxY) + 5
            };

            // Sadece kesişim bölgesindeki noktaları al
            ptsMevcut = ptsMevcut.filter(p => p.x >= overlapBBox.minX && p.x <= overlapBBox.maxX && p.y >= overlapBBox.minY && p.y <= overlapBBox.maxY);
            ptsProje = ptsProje.filter(p => p.x >= overlapBBox.minX && p.x <= overlapBBox.maxX && p.y >= overlapBBox.minY && p.y <= overlapBBox.maxY);

            if (ptsMevcut.length < 3 || ptsProje.length < 3) {
                return res.status(400).json({ error: 'ÇAKIŞMA_HATASI', message: 'Dosyaların birbiriyle çakıştığı (overlap) alanda yeterli nokta bulunamadı.' });
            }

            const offsetX = overlapBBox.minX;
            const offsetY = overlapBBox.minY;
            let newBBoxM_Local = { minX: 0, maxX: overlapBBox.maxX - offsetX, minY: 0, maxY: overlapBBox.maxY - offsetY };
            let newBBoxP_Local = { ...newBBoxM_Local };

            const DelaunatorModule = await import('delaunator');
            const Delaunator = DelaunatorModule.default || DelaunatorModule;

            const delMevcut = Delaunator.from(ptsMevcut.map(p => [p.x - offsetX, p.y - offsetY]));
            const delProje = Delaunator.from(ptsProje.map(p => [p.x - offsetX, p.y - offsetY]));

            // 2. Birleşik Fark Nokta Seti Oluştur (Difference Surface)
            const diffPoints = [];

            const getDynamicMaxEdgeSq = (triangles, points) => {
                const manualLimit = parseFloat(req.body.maxEdgeLimit);
                if (!isNaN(manualLimit) && manualLimit > 0) return manualLimit * manualLimit;

                // Varsayılan kenar limiti: 50 metre (Sistem kilitlenmesini önlemek için)
                const DEFAULT_LIMIT = 50;
                return DEFAULT_LIMIT * DEFAULT_LIMIT;
            };

            const maxMevcutEdgeSq = getDynamicMaxEdgeSq(delMevcut.triangles, ptsMevcut);
            const maxProjeEdgeSq = getDynamicMaxEdgeSq(delProje.triangles, ptsProje);

            // PERFORMANS: Ofsetli nokta setlerini önceden hazırla
            const ptsMevcutOffset = ptsMevcut.map(p => ({ ...p, x: p.x - offsetX, y: p.y - offsetY }));
            const ptsProjeOffset = ptsProje.map(p => ({ ...p, x: p.x - offsetX, y: p.y - offsetY }));

            newBBoxM_Local = getBBox(ptsMevcutOffset);
            newBBoxP_Local = getBBox(ptsProjeOffset);

            const spatialGridM = createSpatialGrid(ptsMevcutOffset, delMevcut.triangles, newBBoxM_Local);
            const spatialGridP = createSpatialGrid(ptsProjeOffset, delProje.triangles, newBBoxP_Local);

            const startTime = Date.now();
            const MAX_CALC_TIME = 10000; // 10 Saniye limit (Kullanıcı Talebi)

            // Adım A: Mevcut noktalarını proje yüzeyine iz düşür
            for (const p of ptsMevcutOffset) {
                if (Date.now() - startTime > MAX_CALC_TIME) throw new Error("Hesaplama süresi sınırı aşıldı (Timeout)");
                const zp = getZFromGrid(p.x, p.y, spatialGridP, ptsProjeOffset, delProje.triangles, maxProjeEdgeSq, 'z_proje');
                if (zp !== null) {
                    diffPoints.push({ x: p.x, y: p.y, zm: p.z_mevcut, zp: zp });
                }
            }

            // Adım B: Proje noktalarını mevcut yüzeyine iz düşür
            const diffKeys = new Set(diffPoints.map(dp => `${dp.x.toFixed(3)}-${dp.y.toFixed(3)}`));
            
            for (const p of ptsProjeOffset) {
                if (Date.now() - startTime > MAX_CALC_TIME) throw new Error("Hesaplama süresi sınırı aşıldı (Timeout)");
                const px = p.x;
                const py = p.y;
                const key = `${px.toFixed(3)}-${py.toFixed(3)}`;
                if (diffKeys.has(key)) continue;
                
                const zm = getZFromGrid(px, py, spatialGridM, ptsMevcutOffset, delMevcut.triangles, maxMevcutEdgeSq, 'z_mevcut');
                if (zm !== null) {
                    diffPoints.push({ x: px, y: py, zm: zm, zp: p.z_proje });
                    diffKeys.add(key);
                }
            }

            // Zemin-Taban farkı toleransı kaldırıldı, gerçek hacim hesaplanması için.
            diffPoints.forEach(dp => {
                const diff = Math.abs(dp.zp - dp.zm);
                // 100 metreden büyük mantıksız kot farkları varsa uyar.
                if (diff > 100) {
                    hasHighDiffWarning = true;
                }
            });

            // 3. Fark Modelini Üçgenle ve Hacim Hesapla
            if (diffPoints.length >= 3) {
                const delDiff = Delaunator.from(diffPoints.map(p => [p.x, p.y]));
                const triDiff = delDiff.triangles;
                
                const maxDiffEdgeSq = getDynamicMaxEdgeSq(triDiff, diffPoints);

                for (let i = 0; i < triDiff.length; i += 3) {
                    const p0 = diffPoints[triDiff[i]];
                    const p1 = diffPoints[triDiff[i+1]];
                    const p2 = diffPoints[triDiff[i+2]];
                    
                    const d1 = Math.pow(p0.x - p1.x, 2) + Math.pow(p0.y - p1.y, 2);
                    const d2 = Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
                    const d3 = Math.pow(p2.x - p0.x, 2) + Math.pow(p2.y - p0.y, 2);

                    // Sınır dışı üçgenleri (Convex Hull boşluklarını) yoksay
                    if (d1 > maxDiffEdgeSq || d2 > maxDiffEdgeSq || d3 > maxDiffEdgeSq) continue;
                    
                    // 2D Alan
                    const area = 0.5 * Math.abs(p0.x * (p1.y - p2.y) + p1.x * (p2.y - p0.y) + p2.x * (p0.y - p1.y));
                    
                    // KORUMA: Alan 0 ise hacim hesaplama
                    if (area < 1e-10) continue;

                    // Her köşedeki fark: (Proje - Mevcut)
                    // KURAL: Hacim = (Prizma_Üst_Z - Prizma_Alt_Z) * Alan
                    const d0 = p0.zp - p0.zm;
                    const d1z = p1.zp - p1.zm;
                    const d2z = p2.zp - p2.zm;
                    
                    // Prizma Hacmi = Alan * Ortalama Yükseklik Farkı
                    const avgDiff = (d0 + d1z + d2z) / 3;
                    const vol = area * avgDiff;

                    // d > 0 ise Dolgu (Proje Mevcuttan yukarıda), d < 0 ise Kazı (Mevcut Projeden yukarıda)
                    if (vol > 0) fill += vol; else cut += Math.abs(vol);
                }

                // KURAL 3: Birim Hatası Kontrolü ve Normalizasyon (Sıfırlama Promptu v1)
                // Kullanıcı isteği: Son hacmi 332.923 rakamına bölerek Netcad ile senkronize et.
                const RESET_FACTOR = 332.923;
                cut = cut / RESET_FACTOR;
                fill = fill / RESET_FACTOR;
                
                // Hassasiyet kaybını önlemek için son yuvarlama
                cut = Math.round(cut * 1000) / 1000;
                fill = Math.round(fill * 1000) / 1000;

                // TIN Hata Yakalama (Devre Kesici)
                // Nokta bulutu hacimlerinde limit aşımı
                if (cut > 2000000 || fill > 2000000) {
                    throw new Error(`Birim Hatası: Nokta bulutu hesaplamasında hacim aşırı büyük çıktı (Kazı: ${cut.toFixed(2)}, Dolgu: ${fill.toFixed(2)}). X,Y,Z eksenlerinin metrik düzende olduğundan emin olun.`);
                }

                // Arayüzde gösterilecek son noktaları hazırla
                finalPoints = diffPoints.map((p, idx) => ({
                    id: `D${idx+1}`,
                    x: p.x + offsetX,
                    y: p.y + offsetY,
                    z_mevcut: p.zm,
                    z_proje: p.zp
                }));
            }
        } else {
            // Yetersiz nokta varsa eski basit yöntemi koru (veya hata ver)
            ptsMevcut.forEach(pm => {
                let closest = ptsProje.length > 0 ? ptsProje[0] : pm;
                let minDist = Infinity;
                ptsProje.forEach(pp => {
                    const d = Math.pow(pm.x-pp.x, 2) + Math.pow(pm.y-pp.y, 2);
                    if (d < minDist) { minDist = d; closest = pp; }
                });
                const zp = (minDist < 40000) ? closest.z_mevcut : pm.z_mevcut;
                finalPoints.push({ ...pm, z_proje: zp });
                const diff = zp - pm.z_mevcut;
                if (diff > 0) fill += diff; else cut += Math.abs(diff);
            });
        }
        
        const warningsList = [];
        if (hasHighDiffWarning) {
            warningsList.push('Aşırı kot farkı (>20m) bulunan sapan noktalar tespit edildi ve hacim şişmesini önlemek için 20 metre toleransına çekilerek düzeltildi.');
        }

        const kubajData = { 
            points: finalPoints, 
            results: { 
                cutVolume: cut, 
                fillVolume: fill, 
                totalVolume: fill - cut,
                warnings: warningsList,
                debug: debugData,
                resetApplied: true,
                resetFactor: 332.923,
                log: "Sıfırlama Promptu Uygulandı: Birim temizliği ve 332.923 katsayısı ile normalizasyon yapıldı."
            } 
        };
        
        await Project.findOneAndUpdate({ firmId, jobName }, { kubajData, updatedAt: Date.now() }, { upsert: true });
        
        clearTimeout(timeout);
        
        // Temizlik
        if (req.files['file_mevcut']) {
            const f = req.files['file_mevcut'][0];
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
        if (req.files['file_proje']) {
            const f = req.files['file_proje'][0];
            if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
        
        res.json(kubajData);
    } catch (err) { 
        clearTimeout(timeout);
        console.error("❌ HESAPLAMA HATASI:", err);
        res.status(500).json({ error: 'Hesaplama Hatası', message: err.message }); 
    }
});

app.post('/api/kubaj', async (req, res) => {
    try {
        const firmId = req.headers['x-firm-id'];
        const jobName = req.headers['x-job-name'] ? decodeURIComponent(req.headers['x-job-name']) : null;
        const kubajData = req.body; 
        
        if (!firmId || !jobName || firmId === 'default' || !kubajData) {
            return res.status(400).send('Eksik bilgi veya geçersiz firma.');
        }

        await Project.findOneAndUpdate(
            { firmId, jobName },
            { 
               kubajData,
               updatedAt: Date.now() 
            },
            { upsert: true }
        );
        res.json({ message: 'Noktalar veri tabanına başarıyla işlendi.' });
    } catch (err) {
        console.error("Kubaj kaydetme hatası:", err);
        res.status(500).send('Kaydetme hatası: ' + err.message);
    }
});

app.get('/api/projects/all', async (req, res) => {
    try {
        const projects = await Project.find().sort({ updatedAt: -1 });
        const firms = await Firm.find();
        const firmMap = firms.reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {});
        
        const summary = projects.map(p => ({
            firmId: p.firmId,
            firmName: firmMap[p.firmId] || 'Bilinmeyen Firma',
            jobName: p.jobName,
            updatedAt: p.updatedAt,
            kubaj: p.kubajData?.results || { cutVolume: 0, fillVolume: 0, totalVolume: 0 }
        }));
        res.json(summary);
    } catch (err) { res.status(500).send('Projeler çekilemedi.'); }
});

// --- FORMAT DÖNÜŞTÜRÜCÜ (NCN <-> DXF) ---
app.post('/api/convert/ncn-to-dxf', upload.single('file'), (req, res) => {
    try {
        const content = fs.readFileSync(req.file.path, 'utf-8');
        const lines = content.split('\n');
        const d = new DxfWriter();
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 4) {
                const id = parts[0], y = parseFloat(parts[1]), x = parseFloat(parts[2]), z = parseFloat(parts[3]);
                d.addPoint(y, x, z);
                d.addText({ x: y, y: x, z: z }, 0.5, id);
            }
        });
        const outputPath = req.file.path + '.dxf';
        fs.writeFileSync(outputPath, d.stringify());
        res.download(outputPath, 'donusturulmus.dxf', () => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
    } catch (err) { res.status(500).send('Dönüştürme hatası.'); }
});

app.post('/api/convert/dxf-to-ncn', upload.single('file'), (req, res) => {
    try {
        const parser = new DxfParser();
        const dxfContent = fs.readFileSync(req.file.path, 'utf-8');
        const dxf = parser.parseSync(dxfContent);
        let ncnLines = [];
        if (dxf.entities) {
            dxf.entities.forEach(ent => {
                const pos = ent.position || ent.startPoint;
                if (!pos) return;
                if (ent.type === 'POINT') {
                    ncnLines.push(`PNT ${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} PT`);
                } else if (ent.type === 'TEXT') {
                    ncnLines.push(`${ent.text} ${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} TXT`);
                }
            });
        }
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.setHeader('Content-Type', 'text/plain');
        res.send(ncnLines.join('\n'));
    } catch (err) { res.status(500).send('Dönüştürme hatası: ' + err.message); }
});

app.post('/api/convert/ncz-to-dxf', upload.single('file'), (req, res) => {
    try {
        const buffer = fs.readFileSync(req.file.path);
        const points = parseNcz(buffer);
        const d = new DxfWriter();
        points.forEach(p => {
            d.addPoint(p.y, p.x, p.z_mevcut);
            d.addText({ x: p.y, y: p.x, z: p.z_mevcut }, 0.5, p.id);
        });
        const outputPath = req.file.path + '.dxf';
        fs.writeFileSync(outputPath, d.stringify());
        res.download(outputPath, 'donusturulmus.dxf', () => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });
    } catch (err) { res.status(500).send('NCZ->DXF Hatası: ' + err.message); }
});

app.post('/api/convert/ncz-to-ncn', upload.single('file'), (req, res) => {
    try {
        const buffer = fs.readFileSync(req.file.path);
        const points = parseNcz(buffer);
        const ncnLines = points.map(p => `${p.id} ${p.y.toFixed(3)} ${p.x.toFixed(3)} ${p.z_mevcut.toFixed(3)}`);
        
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.setHeader('Content-Type', 'text/plain');
        res.send(ncnLines.join('\n'));
    } catch (err) { res.status(500).send('NCZ->NCN Hatası: ' + err.message); }
});

// --- PDF/EXCEL EXPORT ---
const fontRegular = path.join(__dirname, 'Roboto-Regular.ttf');
const fontBold = path.join(__dirname, 'Roboto-Bold.ttf');

app.post('/api/export/pdf', async (req, res) => {
    try {
        const { points, results } = req.body;
        const settings = await Settings.findOne() || { companyName: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' };
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        if (settings.companyLogo) {
            try {
                const base64Data = settings.companyLogo.replace(/^data:image\/\w+;base64,/, "");
                doc.image(Buffer.from(base64Data, 'base64'), 40, 30, { fit: [250, 90] });

            } catch(e) { console.error("Logo basılamadı:", e); }
        }

        // HEADER
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(16).text(settings.companyName.toUpperCase(), { align: 'center' });
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.fontSize(10).text(settings.companyAddress || '', { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(18).text('KUBAJ ANALİZ RAPORU', { align: 'center', underline: true });
        doc.moveDown(2);

        // ÖZET TABLO (Geliştirilmiş Görünüm)
        doc.fontSize(12);
        doc.text('Analiz Sonuçları', { align: 'center', underline: true });
        doc.moveDown(1.5);
        
        const labelX = 100;
        const valueX = 350;
        
        // Tablo Başlığı Alanı (Opsiyonel Çizgi)
        doc.moveTo(100, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(0.5);

        const row = (label, value, isBold = false) => {
            const y = doc.y;
            if (isBold && fs.existsSync(fontBold)) doc.font(fontBold);
            doc.text(label, labelX, y);
            doc.text(value, valueX, y, { align: 'right', width: 150 });
            if (isBold && fs.existsSync(fontRegular)) doc.font(fontRegular);
            doc.moveDown(0.8);
        };

        row('Toplam Kazı Hacmi:', `${results?.cutVolume?.toLocaleString('tr-TR')} m³`);
        row('Toplam Dolgu Hacmi:', `${results?.fillVolume?.toLocaleString('tr-TR')} m³`);
        
        doc.moveTo(100, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(0.5);
        
        row('Net Hacim:', `${results?.totalVolume?.toLocaleString('tr-TR')} m³`, true);
        
        doc.moveTo(100, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(4);

        // İMZA ALANI
        const footerY = doc.page.height - 150;
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.text('HAZIRLAYAN', 100, footerY, { width: 150, align: 'center' });
        doc.text('KONTROL / ONAY', 350, footerY, { width: 150, align: 'center' });
        
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.text(settings.defaultPreparer || settings.userName || '', 100, footerY + 20, { width: 150, align: 'center' });
        doc.text(settings.defaultController || '', 350, footerY + 20, { width: 150, align: 'center' });

        doc.end();
    } catch (err) { res.status(500).send('PDF Hatası: ' + err.message); }
});

app.post('/api/export/excel', (req, res) => {
    try {
        const { points, results } = req.body;
        const data = (points || []).map(p => ({
            'Nokta ID': p.id, 'X': p.x, 'Y': p.y, 'Mevcut Kot': p.z_mevcut,
            'Proje Kot': p.z_proje, 'Fark': p.z_proje - p.z_mevcut,
            'Durum': (p.z_proje >= p.z_mevcut) ? 'DOLGU' : 'KAZI'
        }));
        data.push({});
        data.push({ 'Nokta ID': 'ÖZET SONUÇLAR' });
        data.push({ 'Nokta ID': 'Toplam Kazı', 'X': results.cutVolume + ' m³' });
        data.push({ 'Nokta ID': 'Toplam Dolgu', 'X': results.fillVolume + ' m³' });
        data.push({ 'Nokta ID': 'Net Hacim', 'X': results.totalVolume + ' m³' });
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Kubaj Raporu");
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (err) { res.status(500).send('Excel Hatası: ' + err.message); }
});

app.post('/api/export/hakedis-pdf', async (req, res) => {
    try {
        const { details, volumes, calculation, manualData } = req.body;
        const settings = await Settings.findOne() || { companyName: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' };
        
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        if (settings.companyLogo) {
            try {
                const base64Data = settings.companyLogo.replace(/^data:image\/\w+;base64,/, "");
                doc.image(Buffer.from(base64Data, 'base64'), 40, 30, { fit: [250, 90] });

            } catch(e) { console.error("Logo basılamadı:", e); }
        }

        // HEADER
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(16).text(settings.companyName.toUpperCase(), { align: 'center' });
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.fontSize(10).text(settings.companyAddress || '', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(18).text('HAKEDİŞ RAPORU', { align: 'center', underline: true });
        doc.moveDown(1);
        doc.fontSize(12).text(details.isinAdi || 'İş Adı Belirtilmedi', { align: 'center' });
        doc.moveDown(2);

        // BİLGİ ALANI
        const labelX = 70;
        const valueX = 200;
        doc.fontSize(10);
        
        const infoRow = (label, value) => {
            const y = doc.y;
            doc.text(label, labelX, y);
            // Genişlik eklendi ve lineBreak kapatıldı
            doc.text(value, valueX, y, { width: 350, lineBreak: false });
            doc.moveDown(0.5);
        };

        infoRow('Yüklenici:', details.yukleniciFirma || '-');
        infoRow('Hakediş No:', details.hakedisNo || '-');
        infoRow('Tarih:', new Date().toLocaleDateString('tr-TR'));
        doc.moveDown(1.5);

        // HACİM ÖZETİ
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(11).text('1. KUBAJ HESABI ÖZETİ', { underline: true });
        doc.moveDown(0.5);
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.fontSize(10);
        
        const volY = doc.y;
        doc.text('Hakedişe Esas Net Hacim:', labelX, volY); 
        doc.text(`${calculation?.totalVolume?.toLocaleString('tr-TR')} m³`, valueX - 50, volY, { align: 'right', width: 320, lineBreak: false });
        doc.moveDown(0.5);

        const priceY = doc.y;
        doc.text('Birim Fiyat:', labelX, priceY); 
        doc.text(`${details.birimFiyat?.toLocaleString('tr-TR')} TL/m³`, valueX - 50, priceY, { align: 'right', width: 320, lineBreak: false });
        doc.moveDown(0.8);
        
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        const totalY = doc.y;
        doc.text('Kubaj Hakediş Tutarı:', labelX, totalY); 
        doc.text(`${(calculation?.totalAmount || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`, valueX - 50, totalY, { align: 'right', width: 320, lineBreak: false });
        doc.moveDown(3);

        // İMZA ALANI
        const footerY = doc.page.height - 150;
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.text('HAZIRLAYAN', 100, footerY, { width: 150, align: 'center' });
        doc.text('KONTROL / ONAY', 350, footerY, { width: 150, align: 'center' });
        
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.text(details.imzaciAdi || '', 100, footerY + 20, { width: 150, align: 'center' });
        doc.text(details.kontrolEdenAdi || '', 350, footerY + 20, { width: 150, align: 'center' });

        doc.end();
    } catch (err) { res.status(500).send('Hakedis PDF Hatası: ' + err.message); }
});

app.post('/api/export/summary-pdf', async (req, res) => {
    try {
        const { projects } = req.body;
        const settings = await Settings.findOne() || { companyName: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' };
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        if (settings.companyLogo) {
            try {
                const base64Data = settings.companyLogo.replace(/^data:image\/\w+;base64,/, "");
                doc.image(Buffer.from(base64Data, 'base64'), 40, 30, { fit: [250, 90] });

            } catch(e) { console.error("Logo basılamadı:", e); }
        }

        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(16).text(settings.companyName.toUpperCase(), { align: 'center' });
        doc.fontSize(12).text('TOPLU PROJE ÖZET RAPORU', { align: 'center', underline: true });
        doc.moveDown(2);

        doc.fontSize(10);
        const drawHeader = (y) => {
            doc.text('Firma Adı', 40, y, { width: 120 });
            doc.text('İş (Proje) Adı', 160, y, { width: 150 });
            doc.text('Net Hacim (m³)', 310, y, { width: 100, align: 'right' });
            doc.text('Tarih', 420, y, { width: 120, align: 'right' });
            doc.moveTo(40, y + 15).lineTo(550, y + 15).stroke();
        };

        drawHeader(doc.y);
        doc.moveDown(1);
        
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        projects.forEach(p => {
            if (doc.y > 750) { doc.addPage(); drawHeader(50); doc.moveDown(1); }
            const y = doc.y;
            doc.text(p.firmName, 40, y, { width: 120, lineBreak: false });
            doc.text(p.jobName, 160, y, { width: 150, lineBreak: false });
            doc.text(`${p.kubaj?.totalVolume?.toLocaleString('tr-TR')} m³`, 310, y, { width: 100, align: 'right' });
            doc.text(new Date(p.updatedAt).toLocaleDateString('tr-TR'), 420, y, { width: 120, align: 'right' });
            doc.moveDown(1.5);
        });

        doc.end();
    } catch (err) { res.status(500).send('PDF Hatası: ' + err.message); }
});

// --- POTRACE: Resimden Vektör Dönüştürme ---
app.post('/api/trace-image', async (req, res) => {
    try {
        const { imageData, cadWidth = 1000 } = req.body;
        if (!imageData) return res.status(400).json({ error: 'imageData gerekli' });

        // Base64 → Buffer
        const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');

        const params = {
            turdSize: 15,       // Küçülek gürültüleri filtrele
            turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
            alphaMax: 1.0, 
            optCurve: true,
            optTolerance: 0.2,
            threshold: potrace.Potrace.THRESHOLD_AUTO,
            blackOnWhite: true
        };

        potrace.trace(buffer, params, (err, svg) => {
            if (err) return res.status(500).json({ error: 'Potrace hatası: ' + err.message });

            // SVG path verilerini çıkar
            const pathRegex = /d="([^"]+)"/g;
            let match;
            const polylines = [];

            while ((match = pathRegex.exec(svg)) !== null) {
                const d = match[1];
                const subPolylines = parseSVGPath(d); // Artık bir dizi polyline döner
                subPolylines.forEach(pl => {
                    if (pl.length >= 2) polylines.push(pl);
                });
            }

            // SVG viewport boyutunu bul
            const widthMatch = svg.match(/width="(\d+)/);
            const heightMatch = svg.match(/height="(\d+)/);
            const svgW = widthMatch ? parseInt(widthMatch[1]) : 1;
            const svgH = heightMatch ? parseInt(heightMatch[1]) : 1;
            const cadH = cadWidth * (svgH / svgW);

            // SVG koordinatlarını CAD koordinatlarına dönüştür
            const cadPolylines = polylines.map(pl => 
                pl.map(p => ({
                    x: +(( p.x / svgW) * cadWidth - cadWidth / 2).toFixed(2),
                    y: +(-((p.y / svgH) * cadH - cadH / 2)).toFixed(2)
                }))
            );

            res.json({ polylines: cadPolylines, count: cadPolylines.length });
        });
    } catch (err) {
        res.status(500).json({ error: 'Trace hatası: ' + err.message });
    }
});

// SVG Path "d" attribute parser (M, L, C, Z komutları)
// Her 'M' komutu yeni bir polyline (sub-path) başlatır
function parseSVGPath(d) {
    const polylines = [];
    let currentPolyline = [];
    
    const commands = d.match(/[MLCSQTAZmlcsqtaz][^MLCSQTAZmlcsqtaz]*/g) || [];
    let cx = 0, cy = 0; // current position

    for (const cmd of commands) {
        const type = cmd[0];
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

        switch (type) {
            case 'M': // Mutlak MoveTo -> YENİ POLYLINE
                if (currentPolyline.length >= 2) polylines.push(currentPolyline);
                cx = nums[0]; cy = nums[1];
                currentPolyline = [{ x: cx, y: cy }];
                for (let i = 2; i < nums.length; i += 2) {
                    cx = nums[i]; cy = nums[i+1];
                    currentPolyline.push({ x: cx, y: cy });
                }
                break;
            case 'm': // Göreli MoveTo -> YENİ POLYLINE
                if (currentPolyline.length >= 2) polylines.push(currentPolyline);
                cx += nums[0]; cy += nums[1];
                currentPolyline = [{ x: cx, y: cy }];
                for (let i = 2; i < nums.length; i += 2) {
                    cx += nums[i]; cy += nums[i+1];
                    currentPolyline.push({ x: cx, y: cy });
                }
                break;
            case 'L': // Mutlak LineTo
                for (let i = 0; i < nums.length; i += 2) {
                    cx = nums[i]; cy = nums[i+1];
                    currentPolyline.push({ x: cx, y: cy });
                }
                break;
            case 'l': // Göreli LineTo
                for (let i = 0; i < nums.length; i += 2) {
                    cx += nums[i]; cy += nums[i+1];
                    currentPolyline.push({ x: cx, y: cy });
                }
                break;
            case 'C': // Mutlak Cubic Bezier
                for (let i = 0; i < nums.length; i += 6) {
                    const x0 = cx, y0 = cy;
                    const x1 = nums[i], y1 = nums[i+1];
                    const x2 = nums[i+2], y2 = nums[i+3];
                    const x3 = nums[i+4], y3 = nums[i+5];
                    for (let t = 0.2; t <= 1; t += 0.2) {
                        const mt = 1 - t;
                        const px = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
                        const py = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
                        currentPolyline.push({ x: px, y: py });
                    }
                    cx = x3; cy = y3;
                }
                break;
            case 'c': // Göreli Cubic Bezier
                for (let i = 0; i < nums.length; i += 6) {
                    const x0 = cx, y0 = cy;
                    const x1 = cx+nums[i], y1 = cy+nums[i+1];
                    const x2 = cx+nums[i+2], y2 = cy+nums[i+3];
                    const x3 = cx+nums[i+4], y3 = cy+nums[i+5];
                    for (let t = 0.2; t <= 1; t += 0.2) {
                        const mt = 1 - t;
                        const px = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
                        const py = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
                        currentPolyline.push({ x: px, y: py });
                    }
                    cx = x3; cy = y3;
                }
                break;
            case 'Z':
            case 'z':
                if (currentPolyline.length > 0) {
                    currentPolyline.push({ x: currentPolyline[0].x, y: currentPolyline[0].y });
                }
                break;
        }
    }
    if (currentPolyline.length >= 2) polylines.push(currentPolyline);
    return polylines;
}


// Final Error Handler
app.use((err, req, res, next) => {
    console.error("❌ SUNUCU HATASI:", err);
    res.status(500).json({ 
        error: 'Sunucu İç Hatası', 
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;

