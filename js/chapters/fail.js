// Chapter 5: why prints fail. Three classic failures with simple, honest models:
//  - warping: plastic shrinks as it cools; the cooler the bed, the more the corners curl (glass transition ~ 60 C for PLA, ~ 80 C for PETG);
//  - stringing: runny plastic drips from the nozzle during travel moves, worse when hot, slow and without retraction;
//  - overhangs: a layer laid mostly past the edge of the one below droops. The overlap is real geometry:
//    overlap = 1 - (layer height x tan(angle)) / bead width. How much overlap is enough depends on cooling.
// The sliders show tendencies, not measurements; real prints depend on the printer and the plastic.
import { THREE, M, box, COL, clamp, lerp, approach, strut } from '../printer.js';

const MAT = { PLA: { name: 'PLA', tg: 60, nom: 210 }, PETG: { name: 'PETG', tg: 80, nom: 240 } };
const BEAD = 0.45, LH = 0.2, SC = 20;   // mm, mm, drawing exaggeration
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const warpOf = (s) => { const m = MAT[s.mat]; const risk = clamp((m.tg - s.bedT) / (m.tg - 20), 0, 1); return { risk, lift: clamp(3.4 * Math.pow(risk, 1.3) * (0.75 + 0.5 * s.fan), 0, 4.2) }; };
const stringOf = (s) => { const m = MAT[s.mat]; const hotk = clamp((s.nozzle - m.nom) / 40 + 0.4, 0, 1.2), r = s.retract ? 0.2 : 1, sp = clamp(1.25 - s.speed / 160, 0.35, 1.1); return { risk: clamp(hotk * r * sp, 0, 1), hot: clamp((s.nozzle - m.nom) / 40, 0, 1) }; };
const overOf = (s) => {
  const m = MAT[s.mat], tn = Math.tan((s.angle * Math.PI) / 180), overlap = clamp(1 - (LH * tn) / BEAD, 0, 1);
  const need = clamp(0.55 - 0.25 * s.fan + clamp((s.nozzle - m.nom) * 0.004, -0.1, 0.15) + clamp((s.speed - 60) * 0.0008, -0.04, 0.08), 0.15, 0.7);
  return { overlap, need, crit: (Math.atan(((1 - need) * BEAD) / LH) * 180) / Math.PI, droop: clamp(need - overlap, 0, 0.7) };
};

export default {
  id: 'fail',
  short: 'Why prints fail',
  title: 'Why prints go wrong',
  subtitle: 'Warping, stringing and drooping overhangs all come from hot plastic that behaves like plastic.',
  view: { pos: [9, 6, 12], target: [0, 1.6, 0] },
  learn: `<p>Plastic that is melted and then cooled is not a rigid building block. Three failures account for most bad prints.</p>
    <p><b>Warping.</b> Plastic shrinks as it cools. The top layers pull inward on the cooler ones, and the corners curl off the bed. The cure is a warm bed, near or above the plastic's <b>glass transition</b> (about 60 °C for PLA, about 80 °C for PETG), so the lower layers stay soft and stuck. <b>Stringing.</b> Hot, runny plastic dribbles from the nozzle while it travels between two parts and leaves hair-thin strings. <b>Retraction</b> pulls the filament back a little before each travel, and a cooler nozzle helps. <b>Overhangs.</b> Each layer is laid on the one below. If it sticks out too far, it hangs in the air and droops. Cooling fans freeze the plastic faster, so a good fan allows steeper overhangs.</p>
    <p class="tip"><b>Try it:</b> pick a failure with the buttons. For warping, lower the bed temperature. For stringing, turn up the nozzle and turn retraction off. For overhangs, tilt the wall past 45 degrees and see the overlap shrink.</p>
    <p class="note">These are rules of thumb drawn as models. Real results also depend on the printer, the enclosure, the filament brand and the part.</p>`,
  terms: [
    { t: 'Warping', d: 'Corners of a print curling up from the bed because the plastic shrinks as it cools.' },
    { t: 'Glass transition', d: 'The temperature range where a plastic softens from hard and glassy to rubbery. Below it, parts hold their shape.' },
    { t: 'Retraction', d: 'Pulling the filament back a little before the nozzle travels, so melted plastic does not ooze out.' },
    { t: 'Stringing', d: 'Thin hairs of plastic left between parts by an oozing nozzle.' },
    { t: 'Overhang', d: 'A part of the model that sticks out past the layers below it. Past about 45 degrees it starts to droop.' },
  ],
  defaults: { fail: 'warp', mat: 'PLA', nozzle: 210, bedT: 30, speed: 60, fan: 0.3, retract: false, angle: 30 },
  controls: [
    { key: 'fail', type: 'seg', label: 'Failure', options: [{ v: 'warp', label: 'Warping' }, { v: 'string', label: 'Stringing' }, { v: 'over', label: 'Overhang' }] },
    { key: 'mat', type: 'seg', label: 'Plastic', options: [{ v: 'PLA', label: 'PLA' }, { v: 'PETG', label: 'PETG' }] },
    { key: 'nozzle', type: 'range', label: 'Nozzle temperature', min: 180, max: 270, step: 1, fmt: (v) => `${Math.round(v)} °C` },
    { key: 'bedT', type: 'range', label: 'Bed temperature (warping)', min: 20, max: 110, step: 1, fmt: (v) => `${Math.round(v)} °C` },
    { key: 'speed', type: 'range', label: 'Speed', min: 20, max: 200, step: 5, fmt: (v) => `${v} mm/s` },
    { key: 'fan', type: 'range', label: 'Cooling fan', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'retract', type: 'toggle', label: 'Retraction (stringing)' },
    { key: 'angle', type: 'range', label: 'Overhang angle', min: 0, max: 80, step: 1, fmt: (v) => `${v}° from vertical` },
  ],
  quiz: [
    { q: 'Why do the corners of a flat print curl up?', options: ['The nozzle is too close', 'The plastic shrinks as it cools and pulls on the bed', 'The motor skipped', 'Gravity'], answer: 1, why: 'Cooling plastic shrinks. The upper layers pull inward on the lower ones and lift the corners.' },
    { q: 'What does retraction do?', options: ['Heats the bed', 'Pulls the filament back before a travel move so it does not ooze', 'Speeds up the print', 'Cools the part'], answer: 1, why: 'A small pull-back lowers the pressure in the nozzle so less melted plastic leaks out while it travels.' },
    { q: 'A wall leans out at 60 degrees from vertical. What is the problem?', options: ['The layers barely overlap the ones below, so they droop', 'The wall is too thick', 'The bed is too cold', 'Nothing'], answer: 0, why: 'At steep angles each layer is laid mostly over air. Overlap shrinks, and the plastic sags before it hardens.' },
    { q: 'How does a cooling fan help with overhangs?', options: ['It makes the plastic melt faster', 'It hardens each strand sooner, so less overlap is enough', 'It lowers the bed', 'It slows the motors'], answer: 1, why: 'Plastic that sets quickly stays where it is laid, so steeper overhangs print cleanly.' },
  ],
  onChange(s, key) { if (key === 'fail' && stageRef) stageRef.setView(...VIEWS[s.fail], 0.9); },
  reel: [
    { ms: 5400, caption: 'A cold bed lets the plastic shrink and the corners curl up. Warm the bed and it stays flat.', set: { fail: 'warp', mat: 'PLA', bedT: 25, fan: 0.3 }, anim: { bedT: [25, 68] }, view: { pos: [8, 5, 12], target: [0, 0.8, 0] }, spin: 0 },
    { ms: 5400, caption: 'Tilt a wall past about 45 degrees and each layer hangs in the air. A fan lets it go further.', set: { fail: 'over', mat: 'PLA', angle: 20, fan: 0.3 }, anim: { angle: [20, 70] }, view: { pos: [9, 5, 15], target: [0, 2.8, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    stageRef = stage;
    const root = stage.root;
    stage.floor.visible = true;
    const heat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.7 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 8), heat); bed.position.y = -0.2; bed.receiveShadow = true; root.add(bed);
    const plastic = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.5 });

    // ---- warping: a thin plate whose ends curl up
    const warp = new THREE.Group(); root.add(warp);
    const SEG = 48, pg = new THREE.BoxGeometry(10, 0.3, 4, SEG, 1, 1), base = pg.attributes.position.array.slice();
    const plate = new THREE.Mesh(pg, plastic); plate.castShadow = true; warp.add(plate);
    const gap = stage.label('', [4.6, 1.2, 0], warp, ''); const warpNote = stage.label('plastic shrinks as it cools', [0, 2.2, 0], warp, 'a');
    const arrows = []; for (const sx of [-1, 1]) { const a = box(1.8, 0.06, 0.06, M.glow(COL.cyan)); a.position.set(sx * 3.4, 0.9, 2.3); warp.add(a); arrows.push(a); }

    // ---- stringing: two pillars and an oozing nozzle
    const str = new THREE.Group(); root.add(str);
    const pillars = [-3, 3].map((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3, 28), plastic); p.position.set(x, 1.5, 0); p.castShadow = true; str.add(p); return p; });
    const strands = []; for (let i = 0; i < 14; i++) { const st = strut(0.025, M.matte(0xffd9b8)); str.add(st); strands.push(st); }
    const nz = new THREE.Group(); str.add(nz); const nzb = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.1, 0.9, 18), M.metal(0xd9a441)); nzb.position.y = 0.45; nz.add(nzb);
    const nzh = box(1.6, 1.6, 1.6, M.plastic(0x1d2230)); nzh.position.y = 1.7; nz.add(nzh);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), plastic); nz.add(drop);
    const trailS = strut(0.03, M.matte(0xffd9b8)); str.add(trailS);

    // ---- overhang: a leaning wall of beads
    const over = new THREE.Group(); root.add(over);
    const NB = 26, beads = []; for (let i = 0; i < NB; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(BEAD * SC * 0.1, LH * SC * 0.1 * 0.95, 3), new THREE.MeshStandardMaterial({ color: 0x66d98c, roughness: 0.5 })); m.castShadow = true; over.add(m); beads.push(m); }
    const lblO = stage.label('', [-2.6, 5.4, 0], over, '');

    let t = 0, k = '', travelU = 0;
    const apply = (st) => {
      const w = warp.visible = st.fail === 'warp'; str.visible = st.fail === 'string'; over.visible = st.fail === 'over';
      const hk = clamp((st.bedT - 22) / 90, 0, 1); heat.emissive.setRGB(hk * 0.8, hk * 0.25, 0);
      const W = warpOf(st), arr = pg.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) { const x = base[i], e = Math.max(0, Math.abs(x) - 1.8) / 3.2; arr[i + 1] = base[i + 1] + 0.15 + W.lift * 0.4 * e * e; }
      pg.attributes.position.needsUpdate = true; pg.computeVertexNormals();
      gap.element.textContent = `corner lift ${W.lift.toFixed(1)} mm (drawn 4× bigger)`; gap.position.set(4.6, 0.8 + W.lift * 0.4, 0);
      arrows.forEach((a) => { a.visible = W.risk > 0.15; a.scale.x = 0.5 + W.risk; });
      warpNote.element.style.opacity = W.risk > 0.15 ? 1 : 0.35;
      plastic.color.set(0xff8a3d);
      // stringing
      const S = stringOf(st), n = Math.round(S.risk * 14);
      strands.forEach((sg, i) => { sg.visible = i < n; const h = 0.4 + (i / 14) * 2.2, sag = 0.12 + rnd(i) * 0.25; sg.set(-2.35, h, (rnd(i + 3) - 0.5) * 0.9, 2.35, h - sag, (rnd(i + 9) - 0.5) * 0.9); });
      travelU += 0; 
      // overhang
      const O = overOf(st), tn = Math.tan((st.angle * Math.PI) / 180);
      beads.forEach((b, i) => {
        const lift = (i + 0.5) * LH * SC * 0.1, off = (i * LH * tn) * SC * 0.1;
        const dr = O.droop * 0.9 * (0.3 + 0.7 * (i / NB)) * 1.6;
        b.position.set(-1 + off + 0.0, lift - dr * 0.5, 0); b.rotation.z = -O.droop * 0.5 * (i > 0 ? 1 : 0);
        b.material.color.setHSL(0.37 * clamp(1 - O.droop / 0.35, 0, 1), 0.65, 0.5);
      });
      lblO.element.innerHTML = `overlap ${(O.overlap * 100).toFixed(0)}% · needs about ${(O.need * 100).toFixed(0)}%`; lblO.position.set(-2.6, NB * LH * SC * 0.1 + 0.4, 0);
    };
    return {
      update(dt, st) {
        t += dt;
        apply(st);
        if (st.fail === 'string') {
          const S = stringOf(st), sp = st.speed / 60;
          travelU += dt * 0.25 * sp; const ph = travelU % 2, u = ph < 1 ? ph : 2 - ph, ease = u * u * (3 - 2 * u), x = lerp(-3, 3, ease);
          nz.position.set(x, 3.4 + 0.2 + Math.sin(ease * Math.PI) * 0.35, 0);
          const r = 0.06 + 0.16 * S.hot * (st.retract ? 0.3 : 1); drop.scale.setScalar(r); drop.position.y = -0.05 - r * 0.5;
          const from = ph < 1 ? -3 : 3; trailS.visible = S.risk > 0.1; trailS.set(from, 3.1, 0, x, 3.4 + 0.2 + Math.sin(ease * Math.PI) * 0.35 - 0.1, 0);
        }
      },
      readout(st) {
        const m = MAT[st.mat];
        if (st.fail === 'warp') {
          const W = warpOf(st);
          const say = W.risk < 0.12 ? `The bed is near or above ${m.name}'s glass transition (about ${m.tg} °C), so the lower layers stay soft and flat.` : W.risk < 0.5 ? 'Partly warm. The corners may lift a little, especially on large flat parts.' : 'Cold bed. The part cools and shrinks unevenly and the corners peel up. Warm the bed, or glue the first layer down.';
          return `<div class="big">${W.lift.toFixed(1)} mm lift</div><p class="r-say">${say}</p><div class="row"><span>Warp tendency</span><b>${Math.round(W.risk * 100)}%</b></div><div class="row"><span>${m.name} softens at about</span><b>${m.tg} °C</b></div>`;
        }
        if (st.fail === 'string') {
          const S = stringOf(st), lvl = S.risk < 0.12 ? 'Clean' : S.risk < 0.45 ? 'Light hairs' : 'Heavy strings';
          return `<div class="big">${lvl}</div><p class="r-say">${st.retract ? 'Retraction is on: the filament is pulled back before each travel, so less plastic oozes.' : 'No retraction: plastic keeps oozing while the nozzle crosses the gap.'} ${st.nozzle > m.nom + 15 ? 'The nozzle is hotter than ' + m.name + ' needs, so the plastic is extra runny.' : ''}</p><div class="row"><span>Stringing tendency</span><b>${Math.round(S.risk * 100)}%</b></div><div class="row"><span>Nozzle</span><b>${Math.round(st.nozzle)} °C</b></div>`;
        }
        const O = overOf(st), ok = O.droop <= 0.001;
        return `<div class="big">${ok ? 'Prints clean' : 'Drooping'}</div><p class="r-say">${ok ? 'Each layer rests on enough of the one below.' : 'Each layer is laid mostly over air and sags before it sets.'} With this cooling, about ${O.crit.toFixed(0)}° from vertical is the limit. The common rule of thumb is 45°.</p><div class="row"><span>Overlap with layer below</span><b>${(O.overlap * 100).toFixed(0)}%</b></div><div class="row"><span>Overlap needed (model)</span><b>about ${(O.need * 100).toFixed(0)}%</b></div><div class="row"><span>Layer height · bead width</span><b>${LH} · ${BEAD} mm</b></div>`;
      },
      dispose() {},
    };
  },
};
let stageRef = null;
const VIEWS = { warp: [[8, 5, 12], [0, 0.8, 0]], string: [[8, 6, 12], [0, 2, 0]], over: [[9, 5, 15], [0, 2.8, 0]] };
