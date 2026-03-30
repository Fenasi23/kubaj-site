const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoUri = "mongodb+srv://yinemisenpalu_db_user:3qOfQg0ElHtBmnUF@cluster.hgggsjw.mongodb.net/kubaj_site?retryWrites=true&w=majority&appName=Cluster";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

async function seed() {
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB bağlantısı başarılı');

        // Mevcut admini kontrol et
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin zaten mevcut. Şifresi admin123 olarak güncelleniyor...');
            const newHash = await bcrypt.hash('admin123', 10);
            await User.updateOne({ username: 'admin' }, { passwordHash: newHash });
        } else {
            console.log('Yeni admin oluşturuluyor...');
            const newHash = await bcrypt.hash('admin123', 10);
            await User.create({ username: 'admin', passwordHash: newHash, role: 'admin' });
        }

        console.log('İşlem tamamlandı. Kullanıcı: admin, Şifre: admin123');
        process.exit(0);
    } catch (err) {
        console.error('Hata:', err);
        process.exit(1);
    }
}

seed();
