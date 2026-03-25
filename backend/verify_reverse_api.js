const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testReverseApi() {
    const url = 'http://127.0.0.1:10000/api/convert/dxf-to-ncn';
    
    // Use the DXF generated in the previous step
    if (!fs.existsSync('output_test.dxf')) {
        console.error('Error: output_test.dxf not found. Run NCN to DXF test first.');
        return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream('output_test.dxf'));

    try {
        console.log('Sending DXF to:', url);
        const response = await axios.post(url, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        console.log('Success! Status:', response.status);
        const ncnResult = Buffer.from(response.data).toString();
        console.log('Result NCN Content:\n', ncnResult);
    } catch (error) {
        console.error('Error! Status:', error.response ? error.response.status : 'N/A');
        console.error('Message:', error.message);
    }
}

testReverseApi();
