import requests
import os

url = 'http://127.0.0.1:10000/api/convert/ncn-to-dxf'
test_file_path = 'test_sample.ncn'

# Create a sample NCN file
with open(test_file_path, 'w') as f:
    f.write('1 500000 4500000 100\n')
    f.write('2 500010 4500010 102.5\n')

try:
    with open(test_file_path, 'rb') as f:
        r = requests.post(url, files={'file': f})
    
    if r.status_code == 200:
        print(f"Success! Status: {r.status_code}")
        print(f"Downloaded DXF size: {len(r.content)} bytes")
        with open('output_test.dxf', 'wb') as f:
            f.write(r.content)
        print("Output saved to output_test.dxf")
    else:
        print(f"Error! Status: {r.status_code}")
        print(f"Response: {r.text}")
finally:
    if os.path.exists(test_file_path):
        os.remove(test_file_path)
