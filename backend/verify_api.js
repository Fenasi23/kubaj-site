const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testApi() {
    const url = 'http://127.0.0.1:10000/api/convert/ncn-to-dxf';
    const ncnContent = '1 500000 4500000 100\n2 500010 4500010 102.5';
    fs.writeFileSync('test_sample.ncn', ncnContent);

    const form = new FormData();
    form.append('file', fs.createReadStream('test_sample.ncn'));

    try {
        console.log('Sending request to:', url);
        const response = await axios.post(url, form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        console.log('Success! Status:', response.status);
        console.log('Downloaded DXF size:', response.data.length, 'bytes');
        fs.writeFileSync('output_test.dxf', response.data);
        console.log('Output saved to output_test.dxf');
    } catch (error) {
        console.error('Error! Status:', error.response ? error.response.status : 'N/A');
        console.error('Message:', error.message);
        if (error.response && error.response.data) {
            console.error('Response:', Buffer.from(error.response.data).toString());
        }
    } finally {
        if (fs.existsSync('test_sample.ncn')) fs.unlinkSync('test_sample.ncn');
    }
}

testApi();
