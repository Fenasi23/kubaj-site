const assert = require('assert');

function calculateEndArea(pts) {
    let totalCut = 0;
    let totalFill = 0;
    let currentCumulative = 0;
    
    for (let i = 0; i < pts.length; i++) {
        let sectionCutVolume = 0;
        let sectionFillVolume = 0;

        if (i > 0) {
            const prev = pts[i-1];
            const curr = pts[i];
            const L = curr.araUzaklik || 0;
            
            sectionCutVolume = ((prev.yarmaAlani + curr.yarmaAlani) / 2) * L;
            sectionFillVolume = ((prev.dolguAlani + curr.dolguAlani) / 2) * L;
        }

        if (sectionCutVolume > 100000 || sectionFillVolume > 100000) {
            throw new Error(`Birim hatası olabilir: ${pts[i].id} numaralı kesitte hacim 100.000 m³'ü aştı.`);
        }

        pts[i].yarmaHacmi = sectionCutVolume;
        pts[i].dolguHacmi = sectionFillVolume;

        totalCut += sectionCutVolume;
        totalFill += sectionFillVolume;
        
        currentCumulative += (sectionFillVolume - sectionCutVolume);
        pts[i].kumulatifHacim = currentCumulative;
    }
    return { pts, totalCut, totalFill };
}

// Test 1: Normal veriler
const test1 = [
    { id: 'K1', yarmaAlani: 10, dolguAlani: 0, araUzaklik: 0 },
    { id: 'K2', yarmaAlani: 20, dolguAlani: 5, araUzaklik: 50 }
];
const result1 = calculateEndArea(test1);
// Cut = (10+20)/2 * 50 = 750
// Fill = (0+5)/2 * 50 = 125
assert.strictEqual(result1.totalCut, 750);
assert.strictEqual(result1.totalFill, 125);
console.log('Test 1 Passed: 750 m3 Yarma, 125 m3 Dolgu');

// Test 2: Circuit Breaker Error
const test2 = [
    { id: 'K1', yarmaAlani: 1000, dolguAlani: 0, araUzaklik: 0 },
    { id: 'K2', yarmaAlani: 4000, dolguAlani: 0, araUzaklik: 50 } // (1000+4000)/2 * 50 = 125000 > 100000
];
try {
    calculateEndArea(test2);
    console.error('Test 2 Failed: Error was not thrown');
} catch (e) {
    assert(e.message.includes('100.000'));
    console.log('Test 2 Passed: Circuit breaker caught >100.000 m3');
}
