import Delaunator from 'delaunator';

/**
 * Üçgen içindeki bir noktanın kotunu (Z) Barycentric koordinat sistemi ile hesaplar.
 */
function getZFromTIN(x, y, triangles, points, zKey = 'z') {
    for (let i = 0; i < triangles.length; i += 3) {
        const p0 = points[triangles[i]];
        const p1 = points[triangles[i+1]];
        const p2 = points[triangles[i+2]];

        const det = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
        if (Math.abs(det) < 1e-10) continue;

        const w1 = ((p1.y - p2.y) * (x - p2.x) + (p2.x - p1.x) * (y - p2.y)) / det;
        const w2 = ((p2.y - p0.y) * (x - p2.x) + (p0.x - p2.x) * (y - p2.y)) / det;
        const w3 = 1 - w1 - w2;

        if (w1 >= -1e-7 && w2 >= -1e-7 && w3 >= -1e-7) {
            const z0 = p0[zKey] || 0;
            const z1 = p1[zKey] || 0;
            const z2 = p2[zKey] || 0;
            return w1 * z0 + w2 * z1 + w3 * z2;
        }
    }
    return null;
}

function calculateDifferenceVolume(ptsMevcut, ptsProje) {
    let cut = 0, fill = 0;

    // 1. Triangulate individual surfaces
    const delMevcut = Delaunator.from(ptsMevcut.map(p => [p.x, p.y]));
    const delProje = Delaunator.from(ptsProje.map(p => [p.x, p.y]));

    // 2. Generate Difference Points
    const diffPoints = [];

    ptsMevcut.forEach(p => {
        const zp = getZFromTIN(p.x, p.y, delProje.triangles, ptsProje, 'z');
        if (zp !== null) {
            diffPoints.push({ x: p.x, y: p.y, zm: p.z, zp: zp });
        }
    });

    ptsProje.forEach(p => {
        if (diffPoints.some(dp => Math.abs(dp.x - p.x) < 0.001 && Math.abs(dp.y - p.y) < 0.001)) return;
        const zm = getZFromTIN(p.x, p.y, delMevcut.triangles, ptsMevcut, 'z');
        if (zm !== null) {
            diffPoints.push({ x: p.x, y: p.y, zm: zm, zp: p.z });
        }
    });

    // 3. Triangulate Difference TIN
    if (diffPoints.length >= 3) {
        const delDiff = Delaunator.from(diffPoints.map(p => [p.x, p.y]));
        const triDiff = delDiff.triangles;
        
        for (let i = 0; i < triDiff.length; i += 3) {
            const p0 = diffPoints[triDiff[i]];
            const p1 = diffPoints[triDiff[i+1]];
            const p2 = diffPoints[triDiff[i+2]];
            
            const area = 0.5 * Math.abs(p0.x * (p1.y - p2.y) + p1.x * (p2.y - p0.y) + p2.x * (p0.y - p1.y));
            const avgDiff = ((p0.zp - p0.zm) + (p1.zp - p1.zm) + (p2.zp - p2.zm)) / 3;
            const vol = area * avgDiff;

            if (vol > 0) fill += vol; else cut += Math.abs(vol);
        }
    }

    return { cut, fill, total: fill - cut };
}

// TEST 1: User Case (10x10)
console.log('--- TEST 1: 10x10 Alan (Beklenen: 200) ---');
const s1_1 = [{x:0,y:0,z:100}, {x:10,y:0,z:100}, {x:10,y:10,z:100}, {x:0,y:10,z:100}];
const s2_1 = [{x:0,y:0,z:102}, {x:10,y:0,z:102}, {x:10,y:10,z:102}, {x:0,y:10,z:102}];
const res1 = calculateDifferenceVolume(s1_1, s2_1);
console.log('Sonuç:', res1);
console.log(Math.abs(res1.total - 200) < 0.001 ? 'BAŞARILI' : 'HATALI');

// TEST 2: Ofsetli Noktalar (Arazi örtüşüyor ama noktalar farklı yerlerde)
console.log('\n--- TEST 2: Ofsetli Noktalar (Beklenen: 200) ---');
const s1_2 = [{x:0,y:0,z:100}, {x:10,y:0,z:100}, {x:10,y:10,z:100}, {x:0,y:10,z:100}];
const s2_2 = [{x:5,y:5,z:102}, {x:0,y:0,z:102}, {x:10,y:0,z:102}, {x:10,y:10,z:102}, {x:0,y:10,z:102}];
const res2 = calculateDifferenceVolume(s1_2, s2_2);
console.log('Sonuç:', res2);
console.log(Math.abs(res2.total - 200) < 0.001 ? 'BAŞARILI' : 'HATALI');

// TEST 3: Farklı Kapsama Alanları (Beklenen: 64)
// S1: 10x10, S2: İçeride bir üçgen (Alan=32)
console.log('\n--- TEST 3: İç Üçgen (Beklenen: 64) ---');
const s1_3 = [{x:0,y:0,z:100}, {x:10,y:0,z:100}, {x:10,y:10,z:100}, {x:0,y:10,z:100}];
const s2_3 = [{x:1,y:1,z:102}, {x:9,y:1,z:102}, {x:5,y:9,z:102}];
const res3 = calculateDifferenceVolume(s1_3, s2_3);
console.log('Sonuç:', res3);
console.log(Math.abs(res3.total - 64) < 0.001 ? 'BAŞARILI' : 'HATALI');
