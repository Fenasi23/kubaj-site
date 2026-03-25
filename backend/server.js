console.log('--- SERVER STARTING ---');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');
const PDFDocument = require('pdfkit');

const { DxfWriter } = require('@tarikjabiri/dxf');
const DxfParser = require('dxf-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// --- VERİTABANI / DOSYA SİSTEMİ MODU ---
let useFileSystem = false;
const DATA_PATH = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_PATH)) fs.mkdirSync(DATA_PATH);

const getJsonPath = (name) => path.join(DATA_PATH, `${name}.json`);
const readJson = (name, defaultVal = []) => {
    const p = getJsonPath(name);
    if (!fs.existsSync(p)) return defaultVal;
    try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch (e) { return defaultVal; }
};
const writeJson = (name, data) => {
    fs.writeFileSync(getJsonPath(name), JSON.stringify(data, null, 2));
};

// --- YARDIMCI FONKSİYONLAR ---
const mapHeaders = (row) => {
    const mapped = {};
    const lowerRow = {};
    Object.keys(row).forEach(k => lowerRow[k.toLowerCase().trim()] = row[k]);
    mapped.x = parseFloat(lowerRow['x'] || lowerRow['x koordinatı'] || lowerRow['east'] || 0);
    mapped.y = parseFloat(lowerRow['y'] || lowerRow['y koordinatı'] || lowerRow['north'] || 0);
    mapped.z_mevcut = parseFloat(lowerRow['z_mevcut'] || lowerRow['mevcut kot (m)'] || lowerRow['mevcut'] || lowerRow['z1'] || lowerRow['ground'] || 0);
    mapped.z_proje = parseFloat(lowerRow['z_proje'] || lowerRow['proje kot (m)'] || lowerRow['proje'] || lowerRow['z2'] || lowerRow['design'] || 0);
    mapped.id = lowerRow['id'] || lowerRow['nokta no'] || lowerRow['no'] || 'P';
    return mapped;
};

const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri || 'mongodb://localhost:27017/kubaj', { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('MongoDB bağlantısı başarılı'))
    .catch(err => {
        console.error('MongoDB bağlantı hatası! DOSYA SİSTEMİ MODUNA GEÇİLDİ.');
        useFileSystem = true;
    });

// Veritabanı Şemaları
const FirmSchema = new mongoose.Schema({ name: String, createdAt: { type: Date, default: Date.now } });
const Firm = mongoose.model('Firm', FirmSchema);

const ProjectSchema = new mongoose.Schema({
    firmId: String,
    jobName: String,
    kubajData: Object,
    hakedisData: Array,
    updatedAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema);

const SettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' },
    userName: String,
    userTitle: String,
    companyAddress: String,
    defaultPreparer: String,
    defaultController: String
});
const Settings = mongoose.model('Settings', SettingsSchema);

// --- MIDDLEWARE (GÜVENLİK VE AYARLAR) ---

// CORS Ayarı: Vercel adresinden gelen isteklere izin verir
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-firm-id', 'x-job-name']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- REQUEST LOGGER ---
app.use((req, res, next) => {
    if (req.method === 'POST') {
        console.log(`[POST DEBUG] URL: ${req.url}, Body:`, req.body);
    }
    console.log(`[DEBUG LOG] Gelen İstek: ${req.method} ${req.url}`);
    next();
});

// GLOBAL POST YAKALAYICI (DEBUG İÇİN)
app.post('/api/firms', async (req, res, next) => {
    console.log('Firma Ekleme İsteyi Rotaya Girdi!');
    next(); // Mevcut işleyiciye devam etsin
});

// --- API ENDPOINTS (Firma, Proje, Hakediş vb.) ---

app.get('/api/firms', async (req, res) => {
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) return res.json(readJson('firms'));
        const firms = await Firm.find().sort({ createdAt: -1 });
        res.json(firms);
    } catch (err) { res.status(500).send('Firmalar çekilemedi.'); }
});

app.post('/api/firms', async (req, res) => {
    try {
        console.log('[DEBUG] POST /api/firms tetiklendi. Body:', req.body);
        
        if (!req.body || !req.body.name) {
            console.error('[HATA] Firma adı gelmedi!');
            return res.status(400).send('Hata: Firma adı gereklidir.');
        }

        if (useFileSystem || mongoose.connection.readyState !== 1) {
            console.log('[DEBUG] Dosya sistemine yazılıyor...');
            const firms = readJson('firms');
            const newFirm = { 
                id: Date.now().toString(), 
                name: req.body.name, 
                createdAt: new Date().toISOString() 
            };
            
            if (!Array.isArray(firms)) {
                console.error('[HATA] firms.json bir dizi değil!');
                throw new Error('Veritabanı dosyası bozuk.');
            }

            firms.push(newFirm);
            writeJson('firms', firms);
            console.log('[BAŞARI] Firma kaydedildi:', newFirm);
            return res.json(newFirm);
        }

        const newFirm = new Firm({ name: req.body.name });
        await newFirm.save();
        res.json(newFirm);
    } catch (err) { 
        console.error('[KRİTİK HATA] Firma ekleme işlemi başarısız:', err);
        res.status(500).json({ 
            error: 'Sunucu hatası', 
            message: err.message,
            stack: err.stack
        }); 
    }
});

// ... (other API routes moved up as well) ...

// --- STATIC FILES (FRONTEND) ---
const frontendPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
}

app.delete('/api/firms/:id', async (req, res) => {
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) {
            let firms = readJson('firms');
            firms = firms.filter(f => f.id !== req.params.id);
            writeJson('firms', firms);
            let projects = readJson('projects');
            projects = projects.filter(p => p.firmId !== req.params.id);
            writeJson('projects', projects);
            return res.json({ message: 'Firma silindi.' });
        }
        await Firm.findByIdAndDelete(req.params.id);
        await Project.deleteMany({ firmId: req.params.id });
        res.json({ message: 'Firma silindi.' });
    } catch (err) { res.status(500).send('Silme hatası.'); }
});

app.get('/api/firms/:id/projects', async (req, res) => {
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) {
            const projects = readJson('projects');
            return res.json(projects.filter(p => p.firmId === req.params.id).map(p => p.jobName));
        }
        const projects = await Project.find({ firmId: req.params.id }).select('jobName');
        res.json(projects.map(p => p.jobName));
    } catch (err) { res.status(500).send('Projeler çekilemedi.'); }
});

app.get('/api/kubaj', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) {
            const projects = readJson('projects');
            const project = projects.find(p => p.firmId === firmId && p.jobName === jobName);
            return res.json(project?.kubajData || { points: [], results: null });
        }
        const project = await Project.findOne({ firmId, jobName });
        res.json(project?.kubajData || { points: [], results: null });
    } catch (err) { res.status(500).send('Veri çekilemedi.'); }
});

app.post('/api/hakedis', async (req, res) => {
    const { 'x-firm-id': firmId, 'x-job-name': jobNameEncoded } = req.headers;
    const jobName = jobNameEncoded ? decodeURIComponent(jobNameEncoded) : null;
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) {
            const projects = readJson('projects');
            const idx = projects.findIndex(p => p.firmId === firmId && p.jobName === jobName);
            if (idx > -1) {
                projects[idx] = { ...projects[idx], hakedisData: req.body, updatedAt: new Date() };
            } else {
                projects.push({ firmId, jobName, hakedisData: req.body, updatedAt: new Date() });
            }
            writeJson('projects', projects);
            return res.json({ message: 'Hakediş kaydedildi.' });
        }
        await Project.findOneAndUpdate({ firmId, jobName }, { hakedisData: req.body, updatedAt: Date.now() }, { upsert: true });
        res.json({ message: 'Hakediş kaydedildi.' });
    } catch (err) { res.status(500).send('Hakediş kaydedilemedi.'); }
});

app.get('/api/settings', async (req, res) => {
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) {
            return res.json(readJson('settings', { companyName: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' }));
        }
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({});
        res.json(settings);
    } catch (err) { res.status(500).send('Ayarlar çekilemedi.'); }
});

app.post('/api/settings', async (req, res) => {
    try {
        if (useFileSystem || mongoose.connection.readyState !== 1) {
            writeJson('settings', req.body);
            return res.json({ message: 'Ayarlar kaydedildi.' });
        }
        await Settings.findOneAndUpdate({}, req.body, { upsert: true });
        res.json({ message: 'Ayarlar kaydedildi.' });
    } catch (err) { res.status(500).send('Hata.'); }
});

// --- DOSYA YÜKLEME VE HESAPLAMA ---
const upload = multer({ dest: 'uploads/' });
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const firmId = req.headers['x-firm-id'];
    const jobName = req.headers['x-job-name'] ? decodeURIComponent(req.headers['x-job-name']) : null;
    if (!firmId || !jobName) return res.status(400).send('Firma veya İş seçilmedi.');
    try {
        let points = [];
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext === '.ncn' || ext === '.ncz') {
            const content = fs.readFileSync(req.file.path, 'utf-8');
            const lines = content.split('\n');
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 4) {
                    points.push({
                        id: parts[0], y: parseFloat(parts[1]), x: parseFloat(parts[2]),
                        z_mevcut: parseFloat(parts[3]), z_proje: parseFloat(parts[4]) || 0 
                    });
                }
            });
        } else {
            const workbook = xlsx.readFile(req.file.path);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawPoints = xlsx.utils.sheet_to_json(sheet);
            points = rawPoints.map(p => mapHeaders(p));
        }
        let cut = 0, fill = 0;
        points.forEach(p => {
            const diff = (p.z_proje || 0) - (p.z_mevcut || 0);
            if (diff > 0) fill += diff * 25; else cut += Math.abs(diff) * 25;
        });
        const kubajData = { points, results: { cutVolume: cut, fillVolume: fill, totalVolume: fill - cut } };
        
        console.log('[DEBUG] Hesaplama Sonuçları:', kubajData.results);

        if (useFileSystem || mongoose.connection.readyState !== 1) {
            const projects = readJson('projects');
            const idx = projects.findIndex(p => p.firmId === firmId && p.jobName === jobName);
            if (idx > -1) { projects[idx] = { ...projects[idx], kubajData, updatedAt: new Date() }; }
            else { projects.push({ firmId, jobName, kubajData, updatedAt: new Date() }); }
            writeJson('projects', projects);
        } else {
            await Project.findOneAndUpdate({ firmId, jobName }, { kubajData, updatedAt: Date.now() }, { upsert: true });
        }
        
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json(kubajData);
    } catch (err) { 
        console.error('[HATA] Yükleme/Hesaplama Hatası:', err);
        res.status(500).send('Hesaplama hatası: ' + err.message); 
    }
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
                d.addPoint(y, x, z); d.addText({ x: y, y: x, z: z }, 0.5, id);
            }
        });
        const outputPath = req.file.path + '.dxf';
        fs.writeFileSync(outputPath, d.stringify());
        res.download(outputPath, 'donusturulmus.dxf', () => {
            fs.unlinkSync(req.file.path); fs.unlinkSync(outputPath);
        });
    } catch (err) { res.status(500).send('Dönüştürme hatası.'); }
});

// --- PDF/EXCEL EXPORT ---

// Font yolları
const fontRegular = path.join(__dirname, 'Roboto-Regular.ttf');
const fontBold = path.join(__dirname, 'Roboto-Bold.ttf');

app.post('/api/export/pdf', (req, res) => {
    try {
        const { points, results } = req.body;
        const doc = new PDFDocument({ margin: 50 });
        
        // Türkçe Font Desteği
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=kubaj_raporu.pdf');
        doc.pipe(res);

        // Başlık
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(20).text('KUBAJ ANALİZ RAPORU', { align: 'center' });
        doc.moveDown();
        
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.fontSize(12).text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'right' });
        doc.moveDown();

        // Özet Tablo
        doc.fontSize(14).text('Özet Sonuçlar', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Kazı Hacmi: ${results?.cutVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Dolgu Hacmi: ${results?.fillVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Net Hacim: ${results?.totalVolume?.toLocaleString('tr-TR')} m³`);
        doc.moveDown();

        // Nokta Listesi Başlığı
        doc.fontSize(14).text('Nokta Listesi (İlk 100 Nokta)', { underline: true });
        doc.moveDown(0.5);
        
        // Basit Tablo
        const tableTop = doc.y;
        doc.fontSize(10);
        doc.text('ID', 50, tableTop);
        doc.text('X', 100, tableTop);
        doc.text('Y', 200, tableTop);
        doc.text('Mevcut Z', 300, tableTop);
        doc.text('Proje Z', 400, tableTop);
        doc.text('Fark', 500, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        let currentY = tableTop + 20;
        (points || []).slice(0, 100).forEach(p => {
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
            doc.text(p.id, 50, currentY);
            doc.text(p.x.toFixed(2), 100, currentY);
            doc.text(p.y.toFixed(2), 200, currentY);
            doc.text(p.z_mevcut.toFixed(2), 300, currentY);
            doc.text(p.z_proje.toFixed(2), 400, currentY);
            doc.text((p.z_proje - p.z_mevcut).toFixed(2), 500, currentY);
            currentY += 15;
        });

        doc.end();
    } catch (err) { 
        console.error('PDF Hatası:', err);
        res.status(500).send('PDF Hatası: ' + err.message); 
    }
});

app.post('/api/export/excel', (req, res) => {
    try {
        const { points, results } = req.body;
        
        const data = (points || []).map(p => ({
            'Nokta ID': p.id,
            'X': p.x,
            'Y': p.y,
            'Mevcut Kot': p.z_mevcut,
            'Proje Kot': p.z_proje,
            'Fark': p.z_proje - p.z_mevcut,
            'Durum': (p.z_proje >= p.z_mevcut) ? 'DOLGU' : 'KAZI'
        }));

        // Özet satırlarını ekle
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
        res.setHeader('Content-Disposition', 'attachment; filename=kubaj_raporu.xlsx');
        res.send(buf);
    } catch (err) {
        console.error('Excel Hatası:', err);
        res.status(500).send('Excel Hatası: ' + err.message);
    }
});

app.post('/api/export/hakedis-pdf', (req, res) => {
    try {
        const { details, volumes, calculation, manualData } = req.body;
        const doc = new PDFDocument({ margin: 50 });
        
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(18).text('HAKEDİŞ RAPORU', { align: 'center' });
        doc.fontSize(12).text(details.isinAdi || 'İş Adı Belirtilmedi', { align: 'center' });
        doc.moveDown();

        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.fontSize(10);
        doc.text(`Yüklenici: ${details.yukleniciFirma || '-'}`);
        doc.text(`Hakediş No: ${details.hakedisNo || '-'}`);
        doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`);
        doc.moveDown();

        doc.fontSize(12).text('1. KUBAJ HESABI ÖZETİ', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Toplam Kazı Hacmi: ${volumes?.cutVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Toplam Dolgu Hacmi: ${volumes?.fillVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Hakedişe Esas Net Hacim: ${calculation?.totalVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Birim Fiyat: ${details.birimFiyat?.toLocaleString('tr-TR')} TL/m³`);
        doc.text(`Kubaj Hakediş Tutarı: ${calculation?.totalAmount?.toLocaleString('tr-TR')} TL`, { bold: true });
        doc.moveDown();

        if (manualData && manualData.length > 0) {
            doc.fontSize(12).text('2. MANUEL İŞ KALEMLERİ', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(9);
            manualData.forEach(item => {
                doc.text(`${item.pozNo || '-'} | ${item.aciklama} | ${item.miktar} ${item.birim} x ${item.birimFiyat} TL = ${(item.miktar * item.birimFiyat).toLocaleString('tr-TR')} TL`);
            });
            doc.moveDown();
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        doc.fontSize(12).text(`GENEL TOPLAM: ${(calculation.totalAmount + (manualData || []).reduce((s, r) => s + (r.miktar * r.birimFiyat), 0)).toLocaleString('tr-TR')} TL`, { align: 'right' });

        doc.moveDown(4);
        const signY = doc.y;
        doc.text('Hazırlayan', 100, signY);
        doc.text('Kontrol/Onay', 400, signY);
        doc.text(details.imzaciAdi || '....................', 100, signY + 15);
        doc.text(details.kontrolEdenAdi || '....................', 400, signY + 15);

        doc.end();
    } catch (err) {
        console.error('Hakediş PDF Hatası:', err);
        res.status(500).send('Hakediş PDF Hatası: ' + err.message);
    }
});

// SPA Routing - Tüm diğer istekleri React'e yönlendir
app.use((req, res) => {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Frontend build bulunamadı.');
});

// Sunucuyu Başlat
app.listen(port, '0.0.0.0', () => {
    console.log(`\n--- SUNUCU BAŞLATILDI ---`);
    console.log(`Port: ${port}`);
    console.log(`Erişim: http://localhost:${port}`);
});