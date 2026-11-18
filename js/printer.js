// Shared parts for PrinterThreeDClear: a small real slicer on a voxel grid (walls, skin, infill, supports,
// overhang check), instanced toolpath meshes, solid-model "ghosts", struts and steppers.
// World units for drawing: 1 unit = 1 cm. The slicer works in millimetres.
import { THREE, M, box, clamp, lerp, smooth, approach } from './kit.js';

export { THREE, M, box, clamp, lerp, smooth, approach };
export const COL = { wall: 0xff7a59, skin: 0xffb547, infill: 0x8ef0ff, support: 0xa3e635, sag: 0xff3b3b, cyan: 0x8ef0ff, amber: 0xffb547, coral: 0xff7a59, lime: 0xa3e635, violet: 0xc49bff, steel: 0xb9bec8, dark: 0x1b1f2a, frame: 0x2b3142 };
export const TYPE_COL = [0, COL.wall, COL.skin, COL.infill, COL.support, COL.sag];
export const TYPE_NAME = ['', 'Perimeters', 'Top and bottom skin', 'Infill', 'Supports', 'Sagging overhang'];

// ---------------------------------------------------------------- models (millimetres, z up, centred on x,y = 0)
export const MODELS = {
  pawn: { name: 'Pawn', h: 26, prims: [
    { t: 'cyl', x: 0, y: 0, r: 9, z0: 0, z1: 2 },
    { t: 'cone', x: 0, y: 0, r0: 7.5, r1: 3.5, z0: 2, z1: 14 },
    { t: 'cyl', x: 0, y: 0, r: 6, z0: 14, z1: 15.5 },
    { t: 'sph', x: 0, y: 0, z: 20, r: 5.5 },
  ] },
  hook: { name: 'Hook', h: 22, prims: [
    { t: 'box', x0: -10, x1: 10, y0: -10, y1: 10, z0: 0, z1: 3 },
    { t: 'cyl', x: -5, y: 0, r: 3.5, z0: 3, z1: 22 },
    { t: 'box', x0: -5, x1: 13, y0: -3, y1: 3, z0: 18, z1: 22 },
  ] },
  arch: { name: 'Bridge', h: 17, prims: [
    { t: 'box', x0: -14, x1: -8, y0: -5, y1: 5, z0: 0, z1: 13 },
    { t: 'box', x0: 8, x1: 14, y0: -5, y1: 5, z0: 0, z1: 13 },
    { t: 'box', x0: -14, x1: 14, y0: -5, y1: 5, z0: 13, z1: 17 },
  ] },
};
function hit(prims, x, y, z) {
  for (const p of prims) {
    if (p.t === 'box') { if (x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1 && z >= p.z0 && z <= p.z1) return true; }
    else if (p.t === 'cyl') { if (z >= p.z0 && z <= p.z1 && (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r) return true; }
    else if (p.t === 'cone') { if (z >= p.z0 && z <= p.z1) { const r = p.r0 + (p.r1 - p.r0) * ((z - p.z0) / (p.z1 - p.z0)); if ((x - p.x) ** 2 + (y - p.y) ** 2 <= r * r) return true; } }
    else if (p.t === 'sph') { if ((x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2 <= p.r * p.r) return true; }
  }
  return false;
}

// ---------------------------------------------------------------- the slicer
export const CELL = 0.5, N = 72;   // 0.5 mm cells on a 36 mm square (scaled up by `scale`)
const RINGS = []; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (dx || dy) RINGS.push([dx, dy, dx * dx + dy * dy]); RINGS.sort((a, b) => a[2] - b[2]);

function chamfer(g) {
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = g[i] ? 1e3 : 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x; if (!d[i]) continue; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (y > 0) { v = Math.min(v, d[i - N] + 1); if (x > 0) v = Math.min(v, d[i - N - 1] + 1.414); if (x < N - 1) v = Math.min(v, d[i - N + 1] + 1.414); }
    d[i] = v;
  }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    const i = y * N + x; if (!d[i]) continue; let v = d[i];
    if (x < N - 1) v = Math.min(v, d[i + 1] + 1);
    if (y < N - 1) { v = Math.min(v, d[i + N] + 1); if (x < N - 1) v = Math.min(v, d[i + N + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + N - 1] + 1.414); }
    d[i] = v;
  }
  return d;
}

// Greedy nearest-neighbour walk so a head can follow the cells like a toolpath.
function walk(cells, occ) {
  if (cells.length < 3) return cells;
  cells.forEach((c, i) => { occ[c[1] * N + c[0]] = i; });
  const done = new Uint8Array(cells.length), out = []; let cur = 0, left = cells.length, scan = 0;
  while (left) {
    done[cur] = 1; left--; out.push(cells[cur]);
    let nxt = -1; const [cx, cy] = cells[cur];
    for (const [dx, dy] of RINGS) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue; const j = occ[y * N + x]; if (j >= 0 && !done[j]) { nxt = j; break; } }
    if (nxt < 0) { while (scan < cells.length && done[scan]) scan++; let best = 1e9; for (let j = scan; j < cells.length; j++) { if (done[j]) continue; const d = (cells[j][0] - cx) ** 2 + (cells[j][1] - cy) ** 2; if (d < best) { best = d; nxt = j; } } }
    cur = nxt;
  }
  cells.forEach((c) => { occ[c[1] * N + c[0]] = -1; });
  return out;
}
const PRI = [0, 3, 2, 1, 0, 3];

export function slice(id, { lh = 0.2, walls = 2, infill = 0.2, supports = false, scale = 1, order = false } = {}) {
  const m = MODELS[id], cell = CELL * scale, half = (N * cell) / 2, nL = Math.max(1, Math.round((m.h * scale) / lh));
  const inside = [];
  for (let l = 0; l < nL; l++) {
    const g = new Uint8Array(N * N), z = ((l + 0.5) * lh) / scale;
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) g[iy * N + ix] = hit(m.prims, ((ix + 0.5) * cell - half) / scale, ((iy + 0.5) * cell - half) / scale, z) ? 1 : 0;
    inside.push(g);
  }
  const skinN = Math.max(2, Math.ceil(0.8 / lh)), K = Math.max(1, Math.ceil(cell / lh)), period = infill >= 0.99 ? 1 : Math.max(2, Math.round(1 / Math.max(0.02, infill)));
  const over = [], sup = new Array(nL);
  const X = [], Y = [], L = [], T = [], start = [0], occ = new Int32Array(N * N).fill(-1), st = [0, 0, 0, 0, 0, 0];
  for (let l = 0; l < nL; l++) {   // overhang map
    const o = new Uint8Array(N * N), g = inside[l];
    if (l >= K) { const b = inside[l - K]; for (let iy = 1; iy < N - 1; iy++) for (let ix = 1; ix < N - 1; ix++) { const i = iy * N + ix; if (!g[i]) continue; let ok = false; for (let dy = -1; dy <= 1 && !ok; dy++) for (let dx = -1; dx <= 1; dx++) if (b[i + dy * N + dx]) { ok = true; break; } if (!ok) o[i] = 1; } }
    over.push(o);
  }
  let above = new Uint8Array(N * N);
  for (let l = nL - 1; l >= 0; l--) {   // support columns grow downwards from overhangs until they hit the model or bed
    const s = new Uint8Array(N * N), g = inside[l];
    if (supports && l + 1 < nL) for (let i = 0; i < N * N; i++) if (!g[i] && (over[l + 1][i] || above[i])) s[i] = 1;
    sup[l] = s; above = s;
  }
  for (let l = 0; l < nL; l++) {
    const g = inside[l], d = chamfer(g), list = [];
    for (let iy = 0; iy < N; iy++) for (let ix = 0; ix < N; ix++) {
      const i = iy * N + ix;
      if (g[i]) {
        let t = 0;
        if (d[i] <= walls + 0.01) t = 1;
        else {
          let skin = false;
          for (let k = 1; k <= skinN && !skin; k++) { if (l - k < 0 || !inside[l - k][i] || l + k >= nL || !inside[l + k][i]) skin = true; }
          if (skin) t = 2; else if (infill > 0 && (l & 1 ? iy : ix) % period === 0) t = 3;
        }
        if (t && over[l][i] && !supports) t = 5;
        if (t) list.push([ix, iy, t]);
      } else if (sup[l][i] && ix % 3 === 0 && (iy % 3 === 0 || l % 4 === 0)) list.push([ix, iy, 4]);
    }
    let out = list;
    if (order) { out = []; for (let p = 0; p < 4; p++) { const grp = list.filter((c) => PRI[c[2]] === p); out.push(...walk(grp, occ)); } }
    for (const [ix, iy, t] of out) { X.push((ix + 0.5) * cell - half); Y.push((iy + 0.5) * cell - half); L.push(l); T.push(t); st[t]++; }
    start.push(X.length);
  }
  const count = X.length, bead = cell * 0.9, vol = count * cell * bead * lh;   // mm^3 of plastic
  return { id, lh, nL, cell, scale, count, X, Y, L, T, start, stats: { cells: st, pathM: (count * cell) / 1000, filamentM: vol / (Math.PI * 0.875 * 0.875) / 1000, grams: vol * 1.24e-3, minutes: (count * cell) / 50 / 60 }, height: m.h * scale };
}

// ---------------------------------------------------------------- drawing a slice
export function layerMesh(sl, opts = {}) {
  const k = 0.1, mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, Math.max(1, sl.count));
  const o = new THREE.Object3D(), c = new THREE.Color(), pal = opts.pal || TYPE_COL;
  for (let i = 0; i < sl.count; i++) {
    o.position.set(sl.X[i] * k, (sl.L[i] + 0.5) * sl.lh * k, sl.Y[i] * k);
    o.scale.set(sl.cell * k * 0.97, sl.lh * k * 0.97, sl.cell * k * 0.97);
    o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    c.setHex(pal[sl.T[i]]).multiplyScalar(0.8 + 0.2 * ((i * 2654435761 >>> 0) % 97) / 97);
    mesh.setColorAt(i, c);
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; mesh.count = sl.count;
  return {
    mesh, total: sl.count,
    setCount(n) { mesh.count = clamp(Math.round(n), 0, sl.count); },
    setLayers(n) { mesh.count = sl.start[clamp(Math.round(n), 0, sl.nL)]; },
    // position of the nozzle after cell fi (fractional), in cm, plus the layer index
    at(fi) { const i = clamp(Math.floor(fi), 0, sl.count - 1), j = Math.min(sl.count - 1, i + 1), f = clamp(fi - i, 0, 1); return { x: lerp(sl.X[i], sl.X[j], f) * k, z: lerp(sl.Y[i], sl.Y[j], f) * k, layer: sl.L[i], i }; },
    dispose() { mesh.geometry.dispose(); mat.dispose(); mesh.dispose(); },
  };
}

// A see-through copy of a model, in the same coordinates as layerMesh.
export function ghostModel(id, scale = 1, opacity = 0.16) {
  const g = new THREE.Group(), k = 0.1 * scale, mat = M.clear(0xcfe8ff, opacity);
  for (const p of MODELS[id].prims) {
    let m;
    if (p.t === 'box') { m = new THREE.Mesh(new THREE.BoxGeometry((p.x1 - p.x0) * k, (p.z1 - p.z0) * k, (p.y1 - p.y0) * k), mat); m.position.set(((p.x0 + p.x1) / 2) * k, ((p.z0 + p.z1) / 2) * k, ((p.y0 + p.y1) / 2) * k); }
    else if (p.t === 'cyl') { m = new THREE.Mesh(new THREE.CylinderGeometry(p.r * k, p.r * k, (p.z1 - p.z0) * k, 40), mat); m.position.set(p.x * k, ((p.z0 + p.z1) / 2) * k, p.y * k); }
    else if (p.t === 'cone') { m = new THREE.Mesh(new THREE.CylinderGeometry(p.r1 * k, p.r0 * k, (p.z1 - p.z0) * k, 40), mat); m.position.set(p.x * k, ((p.z0 + p.z1) / 2) * k, p.y * k); }
    else { m = new THREE.Mesh(new THREE.SphereGeometry(p.r * k, 32, 20), mat); m.position.set(p.x * k, p.z * k, p.y * k); }
    g.add(m);
  }
  return g;
}

// ---------------------------------------------------------------- small mechanical helpers
// A thin cylinder you can re-aim every frame: strut.set(ax,ay,az, bx,by,bz).
export function strut(r, mat, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  m.castShadow = true;
  m.set = (ax, ay, az, bx, by, bz) => {
    d.set(bx - ax, by - ay, bz - az); const len = Math.max(1e-5, d.length());
    m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); m.scale.set(1, len, 1); m.quaternion.setFromUnitVectors(up, d.multiplyScalar(1 / len)); return m;
  };
  return m;
}
// Stripes that scroll along a belt or screw to show motion.
export function stripeTex(w = 64, h = 8, a = '#2a2f3c', b = '#8a93a8') {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; g.fillRect(0, 0, w / 2, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// A NEMA-style stepper motor: body, a rotating shaft with a marker, axis along +z. spin(angle).
export function stepper(size = 4, body = COL.dark) {
  const g = new THREE.Group();
  const b = box(size, size, size * 0.85, M.plastic(body, { roughness: 0.5 })); g.add(b);
  const cap = box(size * 1.02, size * 1.02, size * 0.12, M.metal(0x9aa3b4)); cap.position.z = size * 0.5; g.add(cap);
  const sh = new THREE.Group(); sh.position.z = size * 0.62;
  const rodm = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.1, size * 0.1, size * 0.3, 16), M.metal(0xd8dde8)); rodm.rotation.x = Math.PI / 2; sh.add(rodm);
  const mk = box(size * 0.28, size * 0.07, size * 0.07, M.glow(COL.amber)); mk.position.set(size * 0.14, 0, size * 0.1); sh.add(mk);
  g.add(sh); g.spin = (a) => { sh.rotation.z = a; };
  return g;
}
export const fmtT = (v) => `${Math.round(v)} °C`;
export const mm = (cm) => `${(cm * 10).toFixed(1)} mm`;
export function gradTex() { const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d'), t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { tex: t, canvas: c, g }; }
