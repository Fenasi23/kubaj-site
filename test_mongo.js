const mongoose = require('mongoose');
const mongoUri = "mongodb+srv://yinemisenpalu_db_user:3qOfQg0ElHtBmnUF@cluster.hgggsjw.mongodb.net/kubaj_site?retryWrites=true&w=majority&appName=Cluster";

async function test() {
    console.log('Bağlanıyor...');
    try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log('BAŞARILI: MongoDB bağlantısı kuruldu.');
        process.exit(0);
    } catch (err) {
        console.error('HATA: MongoDB bağlantısı başarısız.', err.message);
        process.exit(1);
    }
}
test();
