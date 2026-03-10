const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

const trToEn = (str) => {
    if (!str) return "";
    return str.toString()
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .toLowerCase()
        .trim();
};

app.post('/api/upload', upload.single('file'), async (req, res) => {
    console.log('--- EXCEL ISLEME BASLADI ---');
    let debugLog = [];
    try {
        if (!req.file) return res.status(400).send('Dosya bulunamadı.');

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 1) return res.status(400).send('Dosya boş.');

        debugLog.push(`Dosya okundu. Toplam satır sayısı: ${rows.length}`);

        // Başlık satırını bul
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const rowStr = trToEn(rows[i].join(' '));
            if (rowStr.includes('koordinat') || rowStr.includes('kot') || rowStr.includes('nokta')) {
                headerRowIdx = i;
                break;
            }
        }
        if (headerRowIdx === -1) headerRowIdx = 0;

        debugLog.push(`Başlık satırı indeksi: ${headerRowIdx}`);

        const rawHeaders = rows[headerRowIdx] || [];
        const headers = rawHeaders.map(h => trToEn(h).replace(/[^a-z0-9]/g, ''));
        debugLog.push(`Bulunan Başlıklar: ${JSON.stringify(rawHeaders)}`);

        const findIdx = (searchKeys, priorityKey = null) => {
            // Önce tam eşleşme ve öncelikli anahtar (priorityKey) kontrolü
            if (priorityKey) {
                let pidx = headers.findIndex(h => h.includes(priorityKey));
                if (pidx !== -1) return pidx;
            }

            // Standart arama
            let index = headers.findIndex(h => searchKeys.some(sk => h === sk));
            if (index === -1) {
                index = headers.findIndex(h => searchKeys.some(sk => h.includes(sk)));
            }
            return index;
        };

        const idx = {
            no: findIdx(['noktano', 'no', 'nokta']),
            x: findIdx(['xkoordinati', 'xkoordinat', 'koordinatx', 'easting', 'x'], 'xkoordinat'),
            y: findIdx(['ykoordinati', 'ykoordinat', 'koordinaty', 'northing', 'y'], 'ykoordinat'),
            zm: findIdx(['mevcutkotm', 'mevcutkot', 'kotmevcut', 'mevcut', 'elevation'], 'mevcut'),
            zp: findIdx(['projekotm', 'projekot', 'kotproje', 'proje', 'design'], 'proje'),
            alan: findIdx(['gridalanim2', 'gridalani', 'alan', 'm2'], 'grid')
        };

        debugLog.push(`Eşleşen İndeksler: ${JSON.stringify(idx)}`);

        const parseNum = (val) => {
            if (val === null || val === undefined || val === "") return 0;
            if (typeof val === 'number') return val;
            let s = val.toString().trim().replace(/ /g, '');

            // Türkiye formatı desteği (1.000,00 -> 1000.00)
            if (s.includes('.') && s.includes(',')) {
                s = s.replace(/\./g, '').replace(',', '.');
            } else if (s.includes(',')) {
                s = s.replace(',', '.');
            }

            const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
            return isNaN(n) ? 0 : n;
        };

        const formattedPoints = [];
        for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 2) continue;

            // X ve Y kolonları en kritikler
            const x = parseNum(row[idx.x]);
            const y = parseNum(row[idx.y]);

            // Eğer X ve Y ikisi de sıfırsa veya bulunamadıysa bu geçerli bir nokta değildir
            if (x === 0 && y === 0) continue;

            const zm = parseNum(row[idx.zm]);
            const zp = parseNum(row[idx.zp]);
            const alan = parseNum(row[idx.alan]) || 25;

            formattedPoints.push({
                id: row[idx.no] || (formattedPoints.length + 1),
                x, y, z_mevcut: zm, z_proje: zp, grid_alan: alan
            });
        }

        debugLog.push(`İşlenen geçerli nokta sayısı: ${formattedPoints.length}`);

        let fillVol = 0, cutVol = 0;
        formattedPoints.forEach(p => {
            const diff = p.z_proje - p.z_mevcut;
            const vol = Math.abs(diff) * p.grid_alan;
            if (diff > 0) fillVol += vol;
            else if (diff < 0) cutVol += vol;
        });

        res.json({
            points: formattedPoints,
            results: {
                cutVolume: cutVol,
                fillVolume: fillVol,
                totalVolume: fillVol - cutVol
            },
            debug: debugLog
        });
    } catch (err) {
        console.error('SERVER HATASI:', err);
        res.status(500).json({ error: err.message, debug: debugLog });
    }
});

const PDFDocument = require('pdfkit');

app.post('/api/export/pdf', (req, res) => {
    console.log('--- PDF EXPORT ISTEGI GELDI ---');
    console.log('Gelen veri yapisi:', { hasPoints: !!req.body.points, hasResults: !!req.body.results });
    try {
        const { points, results } = req.body;
        const doc = new PDFDocument();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=kubaj_raporu.pdf');

        doc.pipe(res);

        doc.fontSize(20).text('Kubaj Hesaplama Raporu', { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text('Hesaplama Ozeti');
        doc.fontSize(12).text(`Kazi Hacmi: ${results.cutVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} m3`);
        doc.text(`Dolgu Hacmi: ${results.fillVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} m3`);
        doc.text(`Toplam Hacim: ${results.totalVolume.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} m3`);
        doc.moveDown();

        doc.fontSize(14).text('Nokta Listesi');
        points.forEach((p, i) => {
            doc.fontSize(10).text(`${p.id}: X=${p.x.toFixed(2)}, Y=${p.y.toFixed(2)}, Mevcut=${p.z_mevcut.toFixed(2)}, Proje=${p.z_proje.toFixed(2)}`);
        });

        doc.end();
    } catch (err) {
        res.status(500).send('PDF olusturma hatasi');
    }
});

app.post('/api/export/excel', (req, res) => {
    console.log('--- EXCEL EXPORT ISTEGI GELDI ---');
    try {
        const { points, results } = req.body;

        const data = points.map(p => ({
            'Nokta No': p.id,
            'X Koordinatı': p.x,
            'Y Koordinatı': p.y,
            'Mevcut Kot': p.z_mevcut,
            'Proje Kot': p.z_proje,
            'Fark': (p.z_proje - p.z_mevcut).toFixed(2),
            'Islem': (p.z_proje - p.z_mevcut) >= 0 ? 'DOLGU' : 'KAZI'
        }));

        const summary = [
            {},
            { 'Nokta No': 'ÖZET SONUÇLAR' },
            { 'Nokta No': 'Kazı Hacmi', 'X Koordinatı': results.cutVolume },
            { 'Nokta No': 'Dolgu Hacmi', 'X Koordinatı': results.fillVolume },
            { 'Nokta No': 'Toplam Hacim', 'X Koordinatı': results.totalVolume }
        ];

        const ws = xlsx.utils.json_to_sheet([...data, ...summary]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Kubaj Raporu");

        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=kubaj_raporu.xlsx');
        res.send(buf);
    } catch (err) {
        res.status(500).send('Excel olusturma hatasi');
    }
});

app.listen(port, () => console.log(`Sunucu aktif: http://127.0.0.1:${port}`));
