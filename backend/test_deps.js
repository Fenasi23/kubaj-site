console.log('Testing dependencies...');
try {
    require('express'); console.log('express OK');
    require('multer'); console.log('multer OK');
    require('cors'); console.log('cors OK');
    require('mongoose'); console.log('mongoose OK');
    require('@tarikjabiri/dxf'); console.log('@tarikjabiri/dxf OK');
    require('dxf-parser'); console.log('dxf-parser OK');
    console.log('All dependencies loaded successfully.');
} catch (e) {
    console.error('Error loading dependency:', e.message);
}
