// Package-free smoke checks for the TypeScript-independent behaviour duplicated at the application boundary.
import assert from 'node:assert/strict';
function flat(consumption, rate, fixed = 0, extra = 0) {
  if ([consumption, rate, fixed, extra].some((n) => !Number.isFinite(n) || n < 0)) throw Error('invalid');
  return consumption * rate + fixed + extra;
}
function slab(consumption, bands, fixed = 0, extra = 0) {
  if (!Number.isFinite(consumption) || consumption < 0) throw Error('invalid consumption');
  let lower = 0, remaining = consumption, cost = 0, unlimited = false;
  let lastThreshold = 0;
  let completeBands = bands.length > 0 && bands[bands.length - 1].upTo === null;
  for (let i=0;i<bands.length;i++) {
    const band = bands[i];
    if (band.upTo === null && i !== bands.length-1) throw Error('unlimited band must be last');
    if (band.upTo !== null && band.upTo <= lastThreshold) throw Error('threshold');
    if (band.upTo !== null) lastThreshold = band.upTo;
    if (band.upTo === null) { unlimited = true; cost += remaining * band.rate; remaining = 0; break; }
    if (band.upTo <= lower) throw Error('threshold');
    const units = Math.min(Math.max(remaining, 0), band.upTo - lower);
    cost += units * band.rate; remaining -= units; lower = band.upTo;
    if (remaining <= 0) break;
  }
  if (bands.some((band, i) => band.upTo !== null && bands.slice(0, i).some((previous) => previous.upTo !== null && previous.upTo >= band.upTo))) throw Error('threshold');
  if (remaining > 0 && !unlimited) throw Error('incomplete bands');
  if (!completeBands) throw Error('final unlimited band required');
  return cost + fixed + extra;
}
function goal(baseline, percent, current) {
  if (![baseline, percent, current].every(Number.isFinite) || baseline <= 0 || percent < 0 || percent > 100 || current < 0) return { target: null, progress: null, remaining: null };
  const target = baseline * (1 - percent / 100), desired = baseline - target;
  const progress = desired === 0 ? (current <= target ? 100 : 0) : current <= target ? 100 : Math.min(100, Math.max(0, (baseline-current)/desired*100));
  return { target, progress, remaining: Math.max(0,current-target) };
}
assert.equal(flat(128, 8.5, 50, 12), 1150);
assert.throws(() => flat(-1, 8));
assert.equal(slab(250,[{upTo:100,rate:3},{upTo:200,rate:5},{upTo:null,rate:8}],20,5),1225);
assert.throws(() => slab(300,[{upTo:100,rate:3}]));
assert.throws(() => slab(3,[{upTo:100,rate:3},{upTo:100,rate:4},{upTo:null,rate:5}]));
assert.equal(goal(100,20,70).progress, 100);
assert.equal(goal(100,20,90).progress, 50);
assert.equal(goal(0,20,90).progress, null);
const students = [
 ['Ujjawal Priyadarshi','12629952','RK4P26HBA10'],
 ['Harsh Raj','12629955','RK4P26HBA13'],
 ['Vivek Raj','12630001','RK4P26HBA33'],
];
assert.equal(students.length,3);
assert.equal(new Set(students.map(s=>s[1])).size,3);
console.log('Package-free smoke tests passed: 10 assertions.');
