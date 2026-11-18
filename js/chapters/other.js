// Chapter 6: other ways to print. Resin printers (SLA with a laser, DLP with a projector) harden liquid with light, hanging the
// part upside down and lifting it a layer at a time. Powder-bed printers (SLS for nylon, SLM/DMLS for metal) melt a thin layer
// of powder with a laser, lower the bed and spread a new layer; the loose powder holds the part up.
// Typical figures: resin layers about 25-100 micrometres; SLS powder grains about 15-100 micrometres; metal layers about 20-100 micrometres.
import { THREE, M, box, COL, clamp, lerp, approach, slice, layerMesh, strut, MODELS } from '../printer.js';

let stageRef = null;
const VIEWS = { resin: [[16, 12, 20], [0, 5, 0]], sls: [[18, 12, 20], [0, 4, 0]], metal: [[18, 12, 20], [0, 4, 0]] };
const TECH = {
  resin: { n: 'Resin (SLA / DLP)', say: 'Light turns liquid resin to solid. A laser draws each layer (SLA), or a projector flashes the whole layer at once (DLP). The part hangs upside down from a plate that lifts a little each layer. Afterwards it is washed and cured under more light.', layer: 'about 0.025 to 0.1 mm', material: 'Liquid photopolymer resin', needs: 'Supports for overhangs; washing and curing' },
  sls: { n: 'Powder (SLS)', say: 'A roller spreads a thin layer of nylon powder. A laser fuses the shape of the layer. The bed drops, fresh powder is spread, and so on. The unfused powder holds everything in place, so no supports are needed, and parts can be packed together.', layer: 'around 0.1 mm', material: 'Nylon (polyamide) powder, grains about 15–100 µm', needs: 'No supports; shake out the powder' },
  metal: { n: 'Metal powder (SLM / DMLS)', say: 'The same idea, with metal powder and a powerful laser that fully melts it, in a chamber of argon so the metal does not burn. The part is welded to a steel plate by supports that also carry heat away. Afterwards it is cut off and the supports are removed.', layer: 'about 0.02 to 0.1 mm', material: 'Metal powder: steel, titanium, aluminium and more', needs: 'Supports anchored to the plate; the part is cut off' },
};

export default {
  id: 'other',
  short: 'Other technologies',
  title: 'Resin, powder and metal',
  subtitle: 'Plastic string is only one way. Light and lasers can build layers out of liquid or dust.',
  view: { pos: [16, 12, 20], target: [0, 5, 0] },
  learn: `<p>Every 3D printer builds layer by layer, but what it does to each layer varies. <b>Resin printers</b> hold a plate in a vat of liquid <b>photopolymer</b>. Violet or ultraviolet light, from a laser (<b>SLA</b>) or a projector (<b>DLP</b>), turns the liquid to solid wherever it shines. The plate lifts one layer and the next is cured under the last. The part hangs upside down, and the surface can be very smooth.</p>
    <p><b>Selective laser sintering (SLS)</b> uses powder instead. A roller spreads a thin layer, a laser fuses the outline and inside of the part, the bed drops, and the roller spreads more. The loose powder around the part acts as its own support. <b>Metal powder-bed printers</b> (SLM and DMLS) do the same with a stronger laser, steel or titanium powder and a shielding gas such as argon. They need supports, which anchor the part to a plate and carry away heat.</p>
    <p class="tip"><b>Try it:</b> switch technology and press play. In resin, flip between laser and projector. In the powder printers, watch the roller sweep before each laser pass, and see how the metal version needs the green supports.</p>
    <p class="note">Layer thicknesses are typical ranges. Machines differ, and the drawings here are simplified.</p>`,
  terms: [
    { t: 'Photopolymer', d: 'A liquid plastic that hardens when exposed to light of the right colour.' },
    { t: 'SLA / DLP', d: 'Stereolithography cures resin point by point with a laser. Digital light processing flashes a whole layer from a projector.' },
    { t: 'SLS', d: 'Selective laser sintering: a laser fuses powder, usually nylon, layer by layer in a powder bed.' },
    { t: 'SLM / DMLS', d: 'Selective laser melting and direct metal laser sintering: lasers fully melt metal powder to build solid metal parts.' },
    { t: 'Post-processing', d: 'The work after printing: washing and curing resin, shaking out powder, removing supports.' },
  ],
  defaults: { tech: 'resin', sub: 'sla', p: 0.5, playing: true, speed: 1 },
  controls: [
    { key: 'tech', type: 'seg', label: 'Technology', options: Object.entries(TECH).map(([v, t]) => ({ v, label: t.n.split(' (')[0] })) },
    { key: 'sub', type: 'seg', label: 'Resin light source', options: [{ v: 'sla', label: 'Laser (SLA)' }, { v: 'dlp', label: 'Projector (DLP)' }] },
    { key: 'p', type: 'range', label: 'Print progress', min: 0, max: 1, step: 0.001, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'playing', type: 'toggle', label: 'Play' },
    { key: 'speed', type: 'range', label: 'Speed', min: 0.3, max: 4, step: 0.1, fmt: (v) => `${v.toFixed(1)}×` },
  ],
  onChange(s, key) { if (key === 'tech' && stageRef) stageRef.setView(...VIEWS[s.tech], 0.9); },
  quiz: [
    { q: 'What makes liquid resin turn solid in an SLA printer?', options: ['Heat from the nozzle', 'Light of the right colour', 'Cooling', 'Air'], answer: 1, why: 'The resin is a photopolymer. It hardens where violet or ultraviolet light shines.' },
    { q: 'Why does an SLS printer not need supports?', options: ['The part is very light', 'The surrounding loose powder holds the part up', 'It prints only flat things', 'The laser holds it'], answer: 1, why: 'Unmelted powder fills every gap and supports each layer, then is shaken away.' },
    { q: 'Why do metal powder printers work in a chamber of argon?', options: ['To cool the laser', 'So hot metal does not burn or react with air', 'To make the powder flow', 'To make the part magnetic'], answer: 1, why: 'Molten metal reacts with oxygen. A shielding gas such as argon keeps it clean.' },
    { q: 'In a resin printer, where is the part while it prints?', options: ['On the bottom of the vat', 'Hanging upside down from a lifting plate', 'Floating loose', 'Outside the vat'], answer: 1, why: 'The plate lifts a layer at a time, and each new layer is cured against the vat window under the last.' },
  ],
  reel: [
    { ms: 5600, caption: 'Resin printers harden liquid with light. The part hangs upside down and rises, layer by layer.', set: { tech: 'resin', sub: 'sla', p: 0.2, playing: true, speed: 1.5 }, anim: { p: [0.2, 0.7] }, view: { pos: [15, 10, 19], target: [0, 5, 0] }, spin: 0 },
    { ms: 5400, caption: 'Powder printers melt one layer, then spread more. The loose powder is the support.', set: { tech: 'sls', p: 0.3, playing: true, speed: 1.5 }, anim: { p: [0.3, 0.8] }, view: { pos: [17, 11, 19], target: [0, 4, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stageRef = stage;
    const root = stage.root; stage.floor.visible = true;
    const alu = M.metal(0x8a93a6, { roughness: 0.45 }), dark = M.plastic(0x1d2230), frame = M.plastic(0x2b3142);
    const glowM = (c, o = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const dot = (c) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), M.glow(c)); return d; };
    const base = box(26, 1, 22, frame); base.position.y = -0.5; root.add(base);

    // ---------- resin
    const sRes = slice('pawn', { lh: 0.6, walls: 99, infill: 1, scale: 2, order: true });
    const resin = new THREE.Group(); root.add(resin);
    const resColor = 0xffb347, partPal = [0, 0xe9d8b4, 0xe9d8b4, 0xe9d8b4, COL.lime, 0xe9d8b4];
    const rl = layerMesh(sRes, { pal: partPal });
    const vat = new THREE.Mesh(new THREE.BoxGeometry(13, 7, 13), M.clear(resColor, 0.22)); vat.position.y = 3.6; resin.add(vat);
    const vatw = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.3, 13.4), M.plastic(0x3a4256)); vatw.position.y = -0.1; resin.add(vatw);
    const win = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 11), M.clear(0x9fd4ff, 0.5)); win.position.y = 0.0; resin.add(win);
    const plate = box(8, 0.5, 8, alu); resin.add(plate);
    const rod = box(1, 20, 1, alu); resin.add(rod);
    const partG = new THREE.Group(); partG.scale.y = -1; resin.add(partG); partG.add(rl.mesh);
    // light source below: laser (galvo + beam + dot) and projector (glowing mask)
    const galvo = box(2, 1.2, 2, dark); galvo.position.set(0, -2.5, 0); resin.add(galvo);
    const beam = strut(0.05, glowM(0xb27cff, 0.8)); resin.add(beam); const rdot = dot(0xd8b8ff); resin.add(rdot);
    const proj = box(5, 2.2, 3, dark); proj.position.set(0, -3.2, 0); resin.add(proj);
    const maskC = document.createElement('canvas'); maskC.width = maskC.height = 128; const mg = maskC.getContext('2d'); const maskT = new THREE.CanvasTexture(maskC); maskT.colorSpace = THREE.SRGBColorSpace;
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), new THREE.MeshBasicMaterial({ map: maskT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); mask.rotation.x = -Math.PI / 2; mask.position.y = 0.08; resin.add(mask);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 3.2, 4, 1, true), glowM(0xb27cff, 0.2)); cone.position.y = -1.6; cone.rotation.y = Math.PI / 4; resin.add(cone);
    stage.label('Build plate (lifts)', [4.5, 8, 0], resin, 'a'); const lblLight = stage.label('UV laser + mirror', [0, -4.4, 0], resin, 'a'); stage.label('Liquid resin', [-6.2, 2, 6.8], resin, 'a');
    let maskLayer = -1;

    // ---------- powder (nylon and metal share a build)
    function powderBuild(id, sup, pal, color) {
      const sl = slice('hook', { lh: 0.6, walls: 99, infill: 1, scale: 2, order: true, supports: sup });
      const g = new THREE.Group(); root.add(g); const pm = layerMesh(sl, { pal });
      const H0 = 9.4;
      const tub = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 14), M.plastic(0x3a4256)); tub.position.y = -0.1; g.add(tub);
      for (const [x, z, w, d] of [[-7.1, 0, 0.3, 14], [7.1, 0, 0.3, 14], [0, -7.1, 14, 0.3], [0, 7.1, 14, 0.3]]) { const wl = new THREE.Mesh(new THREE.BoxGeometry(w, H0 + 0.6, d), M.clear(0x9fd4ff, 0.18)); wl.position.set(x, (H0 + 0.6) / 2, z); g.add(wl); }
      const platform = box(13.6, 0.5, 13.6, id === 'metal' ? M.metal(0x9aa3b4) : alu); g.add(platform);
      const powder = new THREE.Mesh(new THREE.BoxGeometry(13.6, 1, 13.6), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: id === 'metal' ? 0.5 : 0.38, roughness: 0.95, depthWrite: false })); g.add(powder);
      const part = new THREE.Group(); part.add(pm.mesh); g.add(part);
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 14.4, 20), alu); roller.rotation.x = Math.PI / 2; g.add(roller);
      const src = box(3, 1.6, 3, dark); src.position.set(0, 17, 0); g.add(src);
      const lbeam = strut(0.05, glowM(id === 'metal' ? 0xffffff : 0xff4a4a, 0.75)); g.add(lbeam); const ld = dot(id === 'metal' ? 0xffffff : 0xff6a6a); g.add(ld);
      stage.label(id === 'metal' ? 'Fibre laser' : 'CO₂ laser', [0, 18.5, 0], g, 'a'); stage.label('Roller', [-8.6, H0 + 0.6, 0], g, 'a');
      stage.label(id === 'metal' ? 'Metal powder, argon gas' : 'Loose nylon powder', [7.6, 4, 7.6], g, 'a');
      if (id === 'metal') stage.label('Supports (green) weld to plate', [-6, 1.2, 7.6], g, 'a');
      return { g, sl, pm, platform, powder, part, roller, lbeam, ld, H0 };
    }
    const sls = powderBuild('sls', false, [0, 0xf3efe6, 0xf3efe6, 0xf3efe6, COL.lime, 0xf3efe6], 0xeee8dc);
    const metal = powderBuild('metal', true, [0, 0xaab4c4, 0xaab4c4, 0xaab4c4, COL.lime, 0xaab4c4], 0xb8c0cc);
    let sig = '', layerF = 0;

    function setTech(t) { resin.visible = t === 'resin'; sls.g.visible = t === 'sls'; metal.g.visible = t === 'metal'; }
    function drawFrame(st) {
      const t = st.tech;
      setTech(t);
      if (t === 'resin') {
        const L = st.p * sRes.nL, l = Math.min(sRes.nL - 1, Math.floor(L)), u = L - l, done = Math.floor(L);
        rl.setLayers(Math.min(sRes.nL, u > 0.15 ? l + 1 : l));
        const top = l * sRes.lh * 0.1 + 0.12 + (u < 0.15 ? Math.sin((u / 0.15) * Math.PI) * 0.9 : 0);
        plate.position.y = top + 0.25 + (sRes.lh * 0.1); rod.position.y = plate.position.y + 10; partG.position.y = plate.position.y - 0.25;
        const exposing = u > 0.15, k = clamp((u - 0.15) / 0.85, 0, 1);
        const laser = st.sub === 'sla';
        beam.visible = rdot.visible = laser && exposing; galvo.visible = laser; proj.visible = !laser; mask.visible = !laser && exposing; cone.visible = !laser && exposing;
        lblLight.element.textContent = laser ? 'UV laser + mirror' : 'Projector (DLP)';
        if (laser && exposing) { const a = lm(sRes, l, k, 0.1); rdot.position.set(a.x, 0.1, a.z); beam.set(0, -2, 0, a.x, 0.1, a.z); }
        if (!laser && l !== maskLayer) { maskLayer = l; mg.clearRect(0, 0, 128, 128); mg.fillStyle = '#b27cff'; const px = 128 / (sRes.cell * 72); for (let i = sRes.start[l]; i < sRes.start[l + 1]; i++) mg.fillRect((sRes.X[i] + sRes.cell * 36) * px, (sRes.Y[i] + sRes.cell * 36) * px, Math.max(1.5, sRes.cell * px), Math.max(1.5, sRes.cell * px)); maskT.needsUpdate = true; }
      } else {
        const P = t === 'sls' ? sls : metal, sl = P.sl, L = st.p * sl.nL, l = Math.min(sl.nL - 1, Math.floor(L)), u = L - l;
        P.pm.setLayers(u > 0.25 ? l + 1 : l);
        const surf = P.H0, platY = surf - (l + 1) * sl.lh * 0.1 - 0.6;
        P.platform.position.y = platY - 0.25; P.part.position.y = platY; P.powder.scale.y = Math.max(0.01, surf - platY + 0.0); P.powder.position.y = platY + (surf - platY) / 2;
        const sweep = u < 0.25 ? u / 0.25 : 1; P.roller.position.set(lerp(-7.4, 7.4, sweep), surf + 0.45, 0); P.roller.rotation.z = 0; P.roller.rotation.y = sweep * 14;
        const lasing = u >= 0.25, k = clamp((u - 0.25) / 0.75, 0, 1);
        P.lbeam.visible = P.ld.visible = lasing;
        if (lasing) { const a = lm(sl, l, k, 0.1); P.ld.position.set(a.x, surf + 0.1 - 0.0, a.z); P.lbeam.set(0, 16.2, 0, a.x, surf + 0.1, a.z); }
      }
    }
    // a point inside layer l at fraction k, in cm, in model coordinates (x, z)
    function lm(sl, l, k, kk) { const a = sl.start[l], b = sl.start[l + 1], n = Math.max(1, b - a), i = Math.min(b - 1, a + Math.floor(k * n)); return { x: sl.X[i] * kk, z: sl.Y[i] * kk }; }
    setTech(s.tech);
    return {
      update(dt, st) {
        if (st.playing) { st.p = Math.min(1, st.p + (dt * st.speed) / 28); if (st.p >= 1) st.playing = false; }
        drawFrame(st);
      },
      readout(st) {
        const T = TECH[st.tech], sl = st.tech === 'resin' ? sRes : st.tech === 'sls' ? sls.sl : metal.sl, n = Math.min(sl.nL, Math.round(st.p * sl.nL));
        return `<div class="big">${T.n}</div><p class="r-say">${T.say}</p>
          <div class="row"><span>Layer thickness (typical)</span><b>${T.layer}</b></div>
          <div class="row"><span>Made from</span><b>${T.material}</b></div>
          <div class="row"><span>Afterwards</span><b>${T.needs}</b></div>
          <div class="row"><span>Layer shown (coarse model)</span><b>${n} of ${sl.nL}</b></div>`;
      },
      dispose() {},
    };
  },
};
