const fs = require('fs');
const { DxfWriter } = require('@tarikjabiri/dxf');
const DxfParser = require('dxf-parser');

// 1. Mock NCN Content
const sampleNcn = `1 500000.000 4500000.000 100.00
2 500010.000 4500010.000 102.50
3 500020.000 4500020.000 105.00`;

console.log('--- NCN -> DXF Test ---');
const d = new DxfWriter();
sampleNcn.split('\n').forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
        const id = parts[0];
        const y = parseFloat(parts[1]);
        const x = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if (!isNaN(x) && !isNaN(y)) {
            console.log(`Adding Point: ${id} (${y}, ${x}, ${z})`);
            d.addPoint(y, x, z);
            d.addText({ x: y, y: x, z: z }, 0.5, id);
        }
    }
});

const dxfString = d.stringify();
console.log('Generated DXF length:', dxfString.length);

console.log('\n--- DXF -> NCN Test ---');
const parser = new DxfParser();
try {
    const dxf = parser.parseSync(dxfString);
    let ncnLines = [];
    if (dxf.entities) {
        dxf.entities.forEach(ent => {
            const pos = ent.position || ent.startPoint;
            if (!pos) return;

            if (ent.type === 'POINT') {
                ncnLines.push(`PNT ${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} PT`);
            } else if (ent.type === 'TEXT') {
                ncnLines.push(`${ent.text} ${pos.x.toFixed(3)} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} TXT`);
            }
        });
    }
    const resultNcn = ncnLines.join('\n');
    console.log('Result NCN:\n', resultNcn);
    console.log('\nTest Successful!');
} catch (err) {
    console.error('Test Failed:', err);
}
