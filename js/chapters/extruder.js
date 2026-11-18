// Chapter 2: filament in, plastic out. A cutaway of the extruder (a stepper-driven gear pushing filament) and the hotend
// (a heat break, a heated block and a nozzle). The melt model is illustrative: a hotend can melt only so many cubic
// millimetres of plastic a second, and that limit rises with temperature. Typical print temperatures are manufacturer ranges.
import { THREE, M, box, COL, clamp, lerp, approach, gradTex, stepper, stripeTex } from '../printer.js';

const MAT = {
  PLA: { name: 'PLA', lo: 190, hi: 230, nom: 210, note: 'PLA is usually printed at roughly 190 to 230 °C.' },
  PETG: { name: 'PETG', lo: 225, hi: 260, nom: 240, note: 'PETG is usually printed at roughly 230 to 250 °C, a little hotter than PLA.' },
};
const AREA = Math.PI * 0.875 * 0.875;   // mm^2 of 1.75 mm filament
const qmax = (T, m) => clamp((T - (m.lo - 40)) * 0.17, 0.3, 40);   // mm^3/s a hotend can melt (illustrative)

export default {
  id: 'extruder',
  short: 'Filament to melt',
  title: 'Filament in, hot plastic out',
  subtitle: 'A gear pushes a plastic string into a heater. The soft plastic squeezes out of a 0.4 mm hole.',
  view: { pos: [1.6, 6.5, 14], target: [0.4, 5.3, 0] },
  learn: `<p>Most desktop printers use <b>fused filament fabrication</b>. A reel of <b>filament</b>, a plastic string 1.75 mm thick, feeds into the <b>extruder</b>: a small stepper motor turns a toothed <b>drive gear</b> that grips the filament against a spring-loaded idler and pushes it forward.</p>
    <p>The filament slides down a <b>heat break</b>, a thin metal tube that keeps the top cool, into a <b>heater block</b> held at a set temperature, about 190 to 230 °C for PLA and 230 to 250 °C for PETG. The solid filament itself acts as the piston: it pushes the melted plastic through the <b>nozzle</b>, a brass tip with a hole usually 0.4 mm wide, and the printer lays the strand down onto the layer below.</p>
    <p class="tip"><b>Try it:</b> lower the temperature while the filament feeds. The solid core reaches further down, the gear starts to skip and the line thins out. Raise the feed rate and the same thing happens, because the heater cannot melt plastic fast enough.</p>
    <p class="note">The melting limit here is a simple model, not a measurement. Real limits depend on the hotend, the nozzle and the plastic.</p>`,
  terms: [
    { t: 'Filament', d: 'The plastic string the printer eats, usually 1.75 mm or 2.85 mm thick and sold on a reel.' },
    { t: 'Hotend', d: 'The heated part: heat break, heater block with a thermistor, and nozzle.' },
    { t: 'Heat break', d: 'A thin-walled tube between the cold and hot ends that slows heat flowing up the filament.' },
    { t: 'Volumetric flow', d: 'Cubic millimetres of plastic pushed per second. It is the feed speed times the filament’s cross-section.' },
    { t: 'Under-extrusion', d: 'Less plastic comes out than the slicer asked for, from a clog, a cold nozzle or feeding too fast.' },
  ],
  defaults: { mat: 'PLA', temp: 210, feed: 3.2 },
  controls: [
    { key: 'mat', type: 'seg', label: 'Plastic', options: [{ v: 'PLA', label: 'PLA' }, { v: 'PETG', label: 'PETG' }], onSet: true },
    { key: 'temp', type: 'range', label: 'Nozzle temperature', min: 150, max: 290, step: 1, fmt: (v) => `${Math.round(v)} °C`, hint: 'Cold nozzle: stiff plastic. Very hot: the plastic degrades and drips.' },
    { key: 'feed', type: 'range', label: 'Feed speed', min: 0, max: 8, step: 0.1, fmt: (v, s) => `${v.toFixed(1)} mm/s · ${(v * AREA).toFixed(1)} mm³/s` },
    { key: 'preset', type: 'buttons', label: 'Presets', items: [
      { label: 'Good PLA', act: (s) => { s.mat = 'PLA'; s.temp = 210; s.feed = 3.2; } },
      { label: 'Too cold', act: (s) => { s.temp = 170; s.feed = 3.2; } },
      { label: 'Too fast', act: (s) => { s.feed = 7.5; } },
      { label: 'Too hot', act: (s) => { s.temp = 275; s.feed = 3.2; } },
    ] },
  ],
  quiz: [
    { q: 'What pushes the melted plastic out of the nozzle?', options: ['A pump below the nozzle', 'The solid filament, pushed by the drive gear, acts as a piston', 'Air pressure', 'Gravity'], answer: 1, why: 'The gear pushes solid filament into the hotend. The solid part is a plunger that forces the melt out of the hole.' },
    { q: 'What is the heat break for?', options: ['To cool the bed', 'To keep the top of the filament path cool so it does not soften early', 'To hold the nozzle on', 'To measure temperature'], answer: 1, why: 'A thin metal tube carries little heat upward. It keeps the filament stiff until it reaches the heater block.' },
    { q: 'You print too fast and the extruder gear starts clicking. What is the likely cause?', options: ['The plastic is melting too early', 'The hotend cannot melt plastic fast enough, so the solid core jams', 'The bed is too cold', 'The spool is empty'], answer: 1, why: 'Feeding faster than the heater can melt pushes a solid core against the nozzle. The gear slips and the line thins.' },
    { q: 'About what nozzle temperature is typical for PLA?', options: ['60 °C', '100 °C', '190 to 230 °C', '400 °C'], answer: 2, why: 'PLA melts well in the low 200s. PETG likes it a bit hotter.' },
  ],
  reel: [
    { ms: 5600, caption: 'A gear pushes plastic string into a heater. Too cold or too fast and the gear skips.', set: { mat: 'PLA', temp: 215, feed: 3.2 }, anim: { temp: [215, 168], feed: [3.2, 5.5] }, view: { pos: [2.2, 5.4, 11], target: [0.4, 4.4, 0] }, spin: 0 },
  ],
  build({ stage, s }) {
    const root = stage.root;
    stage.floor.visible = false;
    const metal = M.metal(0xc3c8d2), dark = M.plastic(0x232733), brass = M.metal(0xd9a441, { roughness: 0.35 });
    const bed = box(14, 0.3, 7, M.matte(0x2a3040)); bed.position.set(2, -0.35, 0); root.add(bed);
    // extruder: motor, drive gear, idler
    const motor = stepper(4.2, 0x1d2230); motor.position.set(-0.95, 10.4, -2.4); root.add(motor);
    const gear = new THREE.Group(); gear.position.set(-0.95, 10.4, 0.05);
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.6, 14), M.metal(0xe4e8f0, { flatShading: true })); gm.rotation.x = Math.PI / 2; gear.add(gm);
    for (let i = 0; i < 14; i++) { const t = box(0.14, 0.14, 0.6, M.metal(0xe4e8f0)); const a = (i / 14) * Math.PI * 2; t.position.set(Math.cos(a) * 0.66, Math.sin(a) * 0.66, 0); t.rotation.z = a; gear.add(t); }
    const idler = new THREE.Group(); idler.position.set(1.0, 10.4, 0.05);
    const im = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 28), M.metal(0x8892a6)); im.rotation.x = Math.PI / 2; idler.add(im);
    const imk = box(0.5, 0.12, 0.55, M.glow(COL.amber)); imk.position.x = 0.3; idler.add(imk);
    const arm = box(0.3, 1.6, 0.5, dark); arm.position.set(1.9, 10.4, 0.05); const spring = box(0.5, 0.18, 0.5, M.metal(0x6a7388)); spring.position.set(1.6, 10.4, 0.05);
    root.add(gear, idler, arm, spring);
    // filament
    const stripes = stripeTex(8, 64, '#e8e1d2', '#d96b4b'); stripes.repeat.set(1, 8);
    const filMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.55 });
    const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 24), filMat); root.add(fil);
    // heatsink, fan, heat break, block, nozzle
    for (let i = 0; i < 8; i++) { const f = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.1, 28), metal); f.position.y = 5.0 + i * 0.36; f.castShadow = true; root.add(f); }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 3.1, 20), metal); core.position.y = 6.4; root.add(core);
    const fan = box(0.5, 2.4, 2.4, dark); fan.position.set(2.1, 6.4, 0); root.add(fan);
    const blades = new THREE.Group(); blades.position.set(2.4, 6.4, 0); for (let i = 0; i < 5; i++) { const b = box(0.06, 1.0, 0.3, M.plastic(0x4a5266)); b.position.y = 0.5; const g = new THREE.Group(); g.rotation.x = (i / 5) * Math.PI * 2; g.add(b); blades.add(g); } root.add(blades);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 20), M.metal(0x9aa3b4)); hb.position.y = 4.1; root.add(hb);
    const hbT = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.5, 20), M.metal(0x9aa3b4)); hbT.visible = false;
    const blockMat = new THREE.MeshStandardMaterial({ color: 0xa8b0c0, metalness: 0.85, roughness: 0.35, emissive: 0x000000, transparent: true, opacity: 0.55 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 2), blockMat); block.position.y = 2.2; block.castShadow = true; root.add(block);
    const heater = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 10), M.glow(0xff5a3a)); heater.rotation.x = Math.PI / 2; heater.position.set(0.9, 2.2, 0); heater.rotation.z = 0; root.add(heater);
    heater.rotation.set(Math.PI / 2, 0, 0); heater.scale.set(1, 0.9, 1);
    const therm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 10), M.metal(0xffb547)); therm.rotation.z = Math.PI / 2; therm.position.set(-1.5, 2.4, 0); root.add(therm);
    const nozzleHex = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.35, 6), brass); nozzleHex.position.y = 0.85; root.add(nozzleHex);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.2, 0.7, 24), brass); nozzle.position.y = 0.42; nozzle.castShadow = true; root.add(nozzle);
    // melt: a cylinder in the block and a cone in the nozzle
    const meltMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff5a1a, emissiveIntensity: 1.1, roughness: 0.3 });
    const melt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1, 20), meltMat), meltTip = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.1, 0.78, 20), meltMat);
    meltTip.position.y = 0.45; root.add(melt, meltTip);
    // deposited bead on the bed
    const beadMat = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.5 });
    const bead = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), beadMat); root.add(bead);
    // temperature strip
    const gt = gradTex();
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 11), new THREE.MeshBasicMaterial({ map: gt.tex })); strip.position.set(-3.7, 5.5, 0.4); root.add(strip);
    // labels
    stage.label('Drive gear', [-3.2, 9.3, 0.5], root, 'a'); stage.label('Idler', [2.7, 11.4, 0], root, 'a'); stage.label('Stepper motor', [-0.95, 12.8, -2.4], root, 'a');
    stage.label('Filament · 1.75 mm', [-1.3, 8.6, 0], root, 'a'); stage.label('Heatsink and fan', [3.9, 6.4, 0], root, 'a'); stage.label('Heat break', [-2.2, 4.1, 0], root, 'a');
    stage.label('Heater block', [3.3, 2.9, 0], root, 'a'); stage.label('Nozzle · 0.4 mm hole', [3.2, 0.5, 0], root, 'a');
    const lblT = stage.label('', [-3.7, -0.9, 0.4], root, ''); lblT.element.style.fontSize = '11px';

    let gAng = 0, texY = 0, clock = 0, front = 3.3, ratio = 0, lastKey = '', jit = 0;
    function strip_(T, m) {
      const g = gt.g, h = 256;
      for (let i = 0; i < h; i++) { const y = 11 - (i / h) * 11; let t; if (y <= 3.4) t = T; else if (y <= 4.8) t = lerp(T, 60, (y - 3.4) / 1.4); else t = lerp(60, 35, clamp((y - 4.8) / 5, 0, 1)); const k = clamp((t - 30) / 260, 0, 1); g.fillStyle = `hsl(${(1 - k) * 230},85%,${45 + k * 8}%)`; g.fillRect(0, i, 8, 1); }
      const yl = h - ((m.lo / 1) - 30) / 260 * 0; g.fillStyle = '#fff'; g.fillRect(0, 0, 8, 1); gt.tex.needsUpdate = true;
    }
    return {
      update(dt, st) {
        clock += dt;
        const m = MAT[st.mat], T = st.temp, flow = st.feed * AREA, cap = qmax(T, m);
        ratio = flow > 0 ? flow / cap : 0;
        const key = `${st.mat}|${Math.round(T)}`; if (key !== lastKey) { lastKey = key; strip_(T, m); }
        const delivered = ratio > 1 ? 1 / ratio : 1;
        const stuck = T < m.lo - 35;
        const targetFront = lerp(3.3, 0.55, clamp(ratio, 0.04, 1));
        front = approach(front, targetFront, 6, dt);
        // gear and filament
        const rate = st.feed * delivered * (stuck ? 0.25 : 1);
        jit = ratio > 1 ? Math.sin(clock * 22) * 0.35 + 0.15 : 0;
        gAng -= (st.feed / 5.5) * dt * (ratio > 1 ? 0.7 : 1) * 1.5; const ga = gAng + jit * (ratio > 1 ? 1 : 0);
        gear.rotation.z = ga; idler.rotation.z = -ga * (0.62 / 0.62); motor.spin(ga);
        texY += rate * dt * 0.34; stripes.offset.y = texY;
        const top = 12.4, len = top - front; fil.position.y = front + len / 2; fil.scale.y = len; stripes.repeat.y = len / 1.8;
        melt.position.y = (front + 1.0) / 2; melt.scale.y = Math.max(0.001, 1.0 - front);
        const hot = clamp((T - 40) / 250, 0, 1);
        blockMat.emissive.setRGB(hot * 0.9, hot * 0.18, 0);
        meltMat.emissive.setHSL(0.04 + (1 - hot) * 0.0, 1, 0.3 + 0.1 * hot);
        meltMat.color.set(T < m.lo - 35 ? 0x9a8f86 : 0xff8a3d); meltTip.visible = true; melt.visible = melt.scale.y > 0.01;
        blades.rotation.x += dt * 14;
        // bead on the bed
        const w = 0.4 * clamp(delivered * (stuck ? 0.25 : 1), 0.05, 1.1) * (T > m.hi ? 1.2 : 1);
        bead.scale.set(8, 0.18, w); bead.position.set(4.2, 0.0, 0);
        beadMat.opacity = 1; beadMat.color.set(T > m.hi + 20 ? 0xb06a30 : 0xff8a3d);
        lblT.element.innerHTML = `<span style="color:#ffb547">${Math.round(T)} °C</span>`;
      },
      readout(st) {
        const m = MAT[st.mat], T = st.temp, flow = st.feed * AREA, cap = qmax(T, m), r = flow / cap;
        let say, tone = '';
        if (T < m.lo - 35) say = 'Far too cold. The plastic stays stiff, the gear grinds and almost nothing comes out.';
        else if (r > 1) say = 'The hotend cannot melt this much plastic this fast. The solid core reaches the nozzle, the gear skips and the line thins out. Heat more, or feed slower.';
        else if (T < m.lo) say = 'A little cool for ' + m.name + '. It melts, but there is no margin: the strand is stiff and may not stick well.';
        else if (T > m.hi + 20) say = 'Very hot. The plastic is runny and starts to break down, which can darken it and make it drip.';
        else if (T > m.hi) say = 'Hot for ' + m.name + '. It flows easily, but expect strings and drips.';
        else say = 'Good. The plastic melts before it reaches the tip, with room to spare. ' + m.note;
        return `<div class="big">${Math.round(T)} °C · ${m.name}</div><p class="r-say">${say}</p>
          <div class="row"><span>Plastic you ask for</span><b>${flow.toFixed(1)} mm³/s</b></div>
          <div class="row"><span>Hotend can melt (model)</span><b>about ${cap.toFixed(1)} mm³/s</b></div>
          <div class="row"><span>Delivered</span><b>${Math.round(clamp(cap / Math.max(flow, 0.01), 0, 1) * 100)}%</b></div>`;
      },
      dispose() {},
    };
  },
};
