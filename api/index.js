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

const app = express();

// --- MONGODB BAĞLANTISI ---
const mongoUri = "mongodb+srv://yinemisenpalu_db_user:3qOfQg0ElHtBmnUF@cluster.hgggsjw.mongodb.net/kubaj_site?retryWrites=true&w=majority&appName=Cluster";

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;
    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false, // Don't buffer if connection is not ready
        });
        isConnected = true;
        console.log('MongoDB Atlas bağlantısı başarılı');
    } catch (err) {
        console.error('MongoDB bağlantı hatası:', err);
    }
};

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Veritabanı Şemaları
const FirmSchema = new mongoose.Schema({ name: String, createdAt: { type: Date, default: Date.now } });
const Firm = mongoose.models.Firm || mongoose.model('Firm', FirmSchema);

const ProjectSchema = new mongoose.Schema({
    firmId: String,
    jobName: String,
    kubajData: Object,
    hakedisData: Array,
    updatedAt: { type: Date, default: Date.now }
});
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
        
        await Project.findOneAndUpdate({ firmId, jobName }, { kubajData, updatedAt: Date.now() }, { upsert: true });
        
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.json(kubajData);
    } catch (err) { res.status(500).send('Hesaplama hatası: ' + err.message); }
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

// --- PDF/EXCEL EXPORT ---
const fontRegular = path.join(__dirname, 'Roboto-Regular.ttf');
const fontBold = path.join(__dirname, 'Roboto-Bold.ttf');

app.post('/api/export/pdf', (req, res) => {
    try {
        const { points, results } = req.body;
        const doc = new PDFDocument({ margin: 50 });
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        if (fs.existsSync(fontBold)) doc.font(fontBold);
        doc.fontSize(20).text('KUBAJ ANALİZ RAPORU', { align: 'center' });
        doc.moveDown();
        if (fs.existsSync(fontRegular)) doc.font(fontRegular);
        doc.fontSize(12).text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'right' });
        doc.moveDown();
        doc.fontSize(14).text('Özet Sonuçlar', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Kazı Hacmi: ${results?.cutVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Dolgu Hacmi: ${results?.fillVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Net Hacim: ${results?.totalVolume?.toLocaleString('tr-TR')} m³`);
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
        doc.fontSize(10).text(`Hakedişe Esas Net Hacim: ${calculation?.totalVolume?.toLocaleString('tr-TR')} m³`);
        doc.text(`Birim Fiyat: ${details.birimFiyat?.toLocaleString('tr-TR')} TL/m³`);
        doc.text(`Kubaj Hakediş Tutarı: ${calculation?.totalAmount?.toLocaleString('tr-TR')} TL`, { bold: true });
        doc.end();
    } catch (err) { res.status(500).send('Hakediş PDF Hatası: ' + err.message); }
});

module.exports = app;

