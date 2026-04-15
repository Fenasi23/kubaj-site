const Delaunator = require('delaunator');

function calculateVolume(points) {
    let cut = 0, fill = 0;
    if (points.length < 3) return { cut, fill };

    const coords = points.map(p => [p.x, p.y]);
    const delaunay = Delaunator.from(coords);
    const triangles = delaunay.triangles;

    for (let i = 0; i < triangles.length; i += 3) {
        const p0 = points[triangles[i]];
        const p1 = points[triangles[i + 1]];
        const p2 = points[triangles[i + 2]];

        const area = 0.5 * Math.abs(
            p0.x * (p1.y - p2.y) +
            p1.x * (p2.y - p0.y) +
            p2.x * (p0.y - p1.y)
        );

        const diff0 = p0.z_proje - p0.z_mevcut;
        const diff1 = p1.z_proje - p1.z_mevcut;
        const diff2 = p2.z_proje - p2.z_mevcut;

        const avgDiff = (diff0 + diff1 + diff2) / 3;
        const polyVolume = area * avgDiff;

        if (polyVolume > 0) {
            fill += polyVolume;
        } else {
            cut += Math.abs(polyVolume);
        }
    }
    return { cut, fill, total: fill - cut };
}

// Test Case: 10x10 area, Mevcut 100, Proje 102
const testPoints = [
    { x: 0, y: 0, z_mevcut: 100, z_proje: 102 },
    { x: 10, y: 0, z_mevcut: 100, z_proje: 102 },
    { x: 10, y: 10, z_mevcut: 100, z_proje: 102 },
    { x: 0, y: 10, z_mevcut: 100, z_proje: 102 }
];

const result = calculateVolume(testPoints);
console.log('Result:', result);
if (Math.abs(result.total - 200) < 0.001) {
    console.log('Test Passed!');
} else {
    console.log('Test Failed! Expected 200, got', result.total);
}
