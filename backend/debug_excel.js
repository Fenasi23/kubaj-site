const xlsx = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\ÖlçüAyar\\Desktop\\kubaj\\backend\\uploads\\1772783652446-ornek_kubaj_hesabi.xlsx';
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('--- RAW DATA (First 10 rows) ---');
    console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (err) {
    console.error(err);
}
