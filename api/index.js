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

const app = express();

// --- MONGODB BAĞLANTISI ---
const mongoUri = "mongodb+srv://yinemisenpalu_db_user:3qOfQg0ElHtBmnUF@cluster.hgggsjw.mongodb.net/kubaj_site?retryWrites=true&w=majority&appName=Cluster";

let cachedDb = null;

const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) return cachedDb;
    
    console.log('MongoDB Atlas bağlantısı kuruluyor...');
    try {
        const db = await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 saniye sonra timeout ver (10 bekletme)
        });
        cachedDb = db;
        console.log('MongoDB Atlas bağlantısı başarılı');
        return db;
    } catch (err) {
        console.error('MongoDB bağlantı hatası detayları:', err.message);
        throw new Error('Veritabanı bağlantısı kurulamadı. Lütfen MongoDB Atlas IP Whitelist ayarlarını kontrol edin.');
    }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
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
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Firm = mongoose.models.Firm || mongoose.model('Firm', FirmSchema);

const ProjectSchema = new mongoose.Schema({
    firmId: String,
    jobName: String,
    kubajData: Object,
    hakedisData: Object,
    updatedAt: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

const SettingsSchema = new mongoose.Schema({
    companyName: { type: String, default: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' },
    userName: String,
    userTitle: String,
    companyAddress: String,
    defaultPreparer: String,
    defaultController: String
});
const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API ENDPOINTS ---

app.get('/api/firms', async (req, res) => {
    try {
        const firms = await Firm.find().sort({ createdAt: -1 });
        res.json(firms);
    } catch (err) { res.status(500).send('Firmalar çekilemedi.'); }
});

app.post('/api/firms', async (req, res) => {
    try {
        if (!req.body || !req.body.name) return res.status(400).send('Firma adı gereklidir.');
        const newFirm = new Firm({ name: req.body.name });
        await newFirm.save();
        res.json(newFirm);
    } catch (err) { res.status(500).json({ error: 'Sunucu hatası', message: err.message }); }
});

app.delete('/api/firms/:id', async (req, res) => {
    try {
        await Firm.findByIdAndDelete(req.params.id);
        await Project.deleteMany({ firmId: req.params.id });
        res.json({ message: 'Firma silindi.' });
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

// --- NCZ (Netcad) BINARY PARSER ---
const parseNcz = (buffer) => {
    let points = [];
    try {
        // NCZ dosyaları genellikle sıkıştırılmıştır.
        let data = buffer;
        try {
            data = zlib.inflateSync(buffer);
        } catch (e) {
            // Sıkıştırılmamış olabilir, devam et
        }

        // Basit ikili tarama: 3'lü double (8-byte) grupları ara
        // Türkiye koordinat sistemleri (ITRF/ED50) için tipik aralıklar:
        // Y (East): 200.000 - 800.000
        // X (North): 3.500.000 - 5.000.000
        // Bu aralıklara uyan 8-byte double çiftlerini bulmaya çalışıyoruz.
        
        // Daha hassas tarama: 1-byte adımlarla ilerle (Tüm versiyonlar için en kesin sonuç)
        for (let i = 0; i < data.length - 24; i++) {
            const y = data.readDoubleLE(i);
            const x = data.readDoubleLE(i + 8);
            const z = data.readDoubleLE(i + 16);

            // Koordinat aralığı kontrolü: NaN/Sonsuz olmayan ve makul büyüklükteki sayıları yakala
            const isValidVal = (v) => !isNaN(v) && isFinite(v) && Math.abs(v) < 10000000;
            
            if (isValidVal(y) && isValidVal(x) && Math.abs(z) < 1000000) {
                // Türkiye UTM (ITRF/ED50) veya Yerel Koordinat (0-1.000.000) aralıkları
                const inRange = (y > -1000000 && y < 2000000 && x > -1000000 && x < 8000000);
                
                if (inRange && Math.abs(y) > 0.001 && Math.abs(x) > 0.001) {
                    points.push({
                        id: `N${points.length + 1}`,
                        y: y,
                        x: x,
                        z_mevcut: z,
                        z_proje: 0
                    });
                    i += 23; // Nokta bulunduğunda bloğu atla
                }
            }
        }

        // Eğer hiç nokta bulunamadıysa, eski versiyonlarda 4-byte (float) kullanımını kontrol et
        if (points.length === 0) {
            for (let i = 0; i < data.length - 12; i++) {
                const y = data.readFloatLE(i);
                const x = data.readFloatLE(i + 4);
                const z = data.readFloatLE(i + 8);
                const isValidVal = (v) => !isNaN(v) && isFinite(v) && Math.abs(v) < 10000000;
                if (isValidVal(y) && isValidVal(x) && Math.abs(z) < 1000000) {
                    const inRange = (y > -1000000 && y < 2000000 && x > -1000000 && x < 8000000);
                    if (inRange && Math.abs(y) > 1 && Math.abs(x) > 1) {
                        points.push({ id: `NF${points.length + 1}`, y: y, x: x, z_mevcut: z, z_proje: 0 });
                        i += 11;
                    }
                }
            }
        }

        // Benzer noktaları temizle (duplicate removal)
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

app.post('/api/upload', upload.single('file'), async (req, res) => {
    const firmId = req.headers['x-firm-id'];
    const jobName = req.headers['x-job-name'] ? decodeURIComponent(req.headers['x-job-name']) : null;
    if (!firmId || !jobName) return res.status(400).send('Firma veya İş seçilmedi.');
    try {
        let points = [];
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext === '.ncn') {
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
        } else if (ext === '.ncz') {
            const buffer = fs.readFileSync(req.file.path);
            points = parseNcz(buffer);
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
        
        await Project.findOneAndUpdate({ firmId, jobName }, { kubajData, updatedAt: Date.now() }, { upsert: true });
        
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json(kubajData);
    } catch (err) { res.status(500).send('Hesaplama hatası: ' + err.message); }
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
app.post('/api/export/summary-pdf', async (req, res) => {
    try {
        const { projects } = req.body;
        const settings = await Settings.findOne() || { companyName: 'MUHAMMED BİLİCİ - HARİTA ÇÖZÜMLERİ' };
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

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

module.exports = app;

