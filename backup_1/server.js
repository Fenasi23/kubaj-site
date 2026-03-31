const app = require('./api/index.js');
const port = 3002;

app.listen(port, () => {
  console.log(`API Sunucusu http://localhost:${port} üzerinden çalışıyor.`);
});
