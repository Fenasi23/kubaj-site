console.log('Loader started');
try {
    console.log('Attempting to require server.js...');
    require('./server.js');
    console.log('Server.js required successfully.');
} catch (e) {
    console.error('Loader caught error:', e);
}
