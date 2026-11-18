// Chapter 3: the whole machine, printing live. A "bed-slinger" Cartesian printer: the hotend slides along X on a gantry,
// the gantry climbs two lead screws (Z), and the heated bed slides along Y. Two stepper motors and a belt each drive
// X and Y. The print is a coarse, scaled-up pawn, so the animation stays light.
import { THREE, M, box, COL, clamp, lerp, approach, slice, layerMesh, strut, stripeTex, stepper, ghostModel } from '../printer.js';

const SCALE = 3, LH = 0.4, BED_TOP = 4, STEPS_PER_MM = 80;

export default {
  id: 'machine',
  short: 'The machine',
  title: 'A robot that draws in the air',
  subtitle: 'Three axes, a heated bed and one hot nozzle, all following a list of coordinates.',
  view: { pos: [32, 30, 44], target: [0, 14, -2] },
  learn: `<p>A plastic printer is a small robot with three <b>axes</b>. <b>Stepper motors</b> turn in tiny exact steps (commonly 200 steps a turn, split finer by the driver), so the printer can count steps to know where it is. On this machine one motor and a toothed <b>belt</b> slide the hotend left and right (X), another slides the <b>bed</b> forwards and back (Y), and two <b>lead screws</b> raise the whole gantry by one layer at a time (Z).</p>
    <p>The <b>heated bed</b> matters more than it looks. A warm bed, around 55 to 60 °C for PLA and 70 to 90 °C for PETG, keeps the first layer stuck down and stops the part cooling too fast and curling. Meanwhile the extruder feeds filament from the <b>spool</b> in step with the movement, so the strand has the width the slicer planned.</p>
    <p class="tip"><b>Try it:</b> press <b>Play</b>, then speed up the time-lapse. Watch the bed slide while the hotend moves sideways, and the gantry creep upward after each layer. Drag <b>Print progress</b> to jump around.</p>
    <p class="note">This animation prints a chunky 3× scaled pawn with 0.4 mm layers so it stays smooth. A real print of this size would take hours.</p>`,
  terms: [
    { t: 'Stepper motor', d: 'A motor that turns in fixed small steps, so a controller can position it by counting pulses.' },
    { t: 'Gantry', d: 'The horizontal beam that carries the hotend and moves up the Z axis.' },
    { t: 'Lead screw', d: 'A long threaded rod that turns the rotation of a motor into slow, strong, precise vertical movement.' },
    { t: 'Heated bed', d: 'The build plate with a heater. It keeps the first layer stuck and the part from cooling too quickly.' },
    { t: 'G-code', d: 'The text file of moves (go here, extrude this much, set this temperature) that the printer reads line by line.' },
  ],
  defaults: { p: 0.18, playing: true, speed: 12, nozzle: 210, bedT: 60 },
  controls: [
    { key: 'p', type: 'range', label: 'Print progress', min: 0, max: 1, step: 0.001, fmt: (v) => `${(v * 100).toFixed(0)}%` },
    { key: 'playing', type: 'toggle', label: 'Play' },
    { key: 'speed', type: 'log', label: 'Time-lapse', min: 1, max: 80, fmt: (v) => `${v < 10 ? v.toFixed(1) : Math.round(v)}×`, hint: '1× is about real time for the head’s move rate; the print itself would take hours.' },
    { key: 'nozzle', type: 'range', label: 'Nozzle', min: 180, max: 260, step: 1, fmt: (v) => `${Math.round(v)} °C` },
    { key: 'bedT', type: 'range', label: 'Heated bed', min: 20, max: 110, step: 1, fmt: (v) => `${Math.round(v)} °C`, hint: 'About 55–60 °C for PLA, 70–90 °C for PETG.' },
  ],
  quiz: [
    { q: 'How does a stepper motor help a printer know where the head is?', options: ['It has a camera', 'It moves in fixed small steps that the controller can count', 'It measures temperature', 'It is always at the same place'], answer: 1, why: 'Each pulse turns the shaft by one small step. Counting steps gives position without a sensor on every axis.' },
    { q: 'What does the Z axis do on this printer?', options: ['Slides the hotend left and right', 'Raises the gantry one layer at a time', 'Feeds filament', 'Heats the bed'], answer: 1, why: 'Two lead screws raise the gantry by one layer height after each layer.' },
    { q: 'Why heat the bed?', options: ['To cook the filament', 'To keep the first layer stuck and slow cooling so the part does not curl', 'To dry the air', 'To move the Y axis'], answer: 1, why: 'A warm bed helps the first layer stick and keeps the lower layers from shrinking away from the plate.' },
    { q: 'What is G-code?', options: ['A type of plastic', 'The list of moves and settings the printer reads', 'A camera format', 'A motor part'], answer: 1, why: 'The slicer writes G-code: line after line of positions, extrusion amounts and temperatures.' },
  ],
  reel: [
    { ms: 5600, caption: 'Two motors slide the head and the bed. Two screws lift the gantry, one layer at a time.', set: { p: 0.25, playing: false, speed: 14, nozzle: 210, bedT: 60 }, anim: { p: [0.25, 0.7] }, view: { pos: [30, 26, 40], target: [0, 13, -2] }, spin: 0.3 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true;
    const root = stage.root;
    const alu = M.metal(0x8a93a6, { roughness: 0.45 }), dark = M.plastic(0x1d2230), frameM = M.plastic(0x2b3142);
    const sl = slice('pawn', { lh: LH, walls: 2, infill: 0.15, scale: SCALE, order: true });
    const lm = layerMesh(sl);
    // base and frame
    const base = box(44, 2, 40, frameM); base.position.set(0, -1, 0); root.add(base);
    for (const sx of [-1, 1]) {
      const up = box(3, 40, 3, alu); up.position.set(sx * 21, 20, -16); root.add(up);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 38, 16), M.metal(0xd6dbe6)); screw.position.set(sx * 17.2, 21, -16); screw.castShadow = true; root.add(screw);
      screw.material = new THREE.MeshStandardMaterial({ map: stripeTex(8, 16, '#7d8598', '#e6e9f0'), metalness: 0.6, roughness: 0.4 }); screw.material.map.repeat.set(1, 28); screw.userData.t = screw.material.map;
      const zm = stepper(4, 0x1d2230); zm.rotation.x = -Math.PI / 2; zm.position.set(sx * 17.2, 2.2, -16); root.add(zm); screw.userData.m = zm; screw.name = 'zs' + sx;
    }
    const screws = root.children.filter((o) => o.name?.startsWith('zs'));
    const topbar = box(44, 2, 3, alu); topbar.position.set(0, 41, -16); root.add(topbar);
    // spool
    const spoolG = new THREE.Group(); spoolG.position.set(0, 49, -19);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 3.4, 40), M.plastic(0xff7a59, { roughness: 0.6 })); sp.rotation.z = Math.PI / 2; spoolG.add(sp);
    for (const sx of [-1.8, 1.8]) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.3, 40), M.plastic(0x2a3040)); fl.rotation.z = Math.PI / 2; fl.position.x = sx; spoolG.add(fl); }
    const spk = box(3.4, 0.6, 5, M.plastic(0xffe0cf)); spk.position.set(0, 3, 0); spoolG.add(spk);
    root.add(spoolG);
    const holder = box(2, 10, 2, alu); holder.position.set(0, 44, -19); root.add(holder);
    // bed (moves in z)
    const bedG = new THREE.Group(); root.add(bedG);
    const bedCar = box(28, 1.4, 28, M.plastic(0x353c50)); bedCar.position.y = 2.4; bedG.add(bedCar);
    const heatMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, emissive: 0x000000, roughness: 0.7 });
    const bedPlate = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 24), heatMat); bedPlate.position.y = 3.35; bedPlate.receiveShadow = true; bedG.add(bedPlate);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 24), M.clear(0x9fd4ff, 0.35)); glass.position.y = 3.75; bedG.add(glass);
    for (const sx of [-10, 10]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 36, 12), M.metal(0xd6dbe6)); r.rotation.x = Math.PI / 2; r.position.set(sx, 1, 0); root.add(r); }
    const obj = new THREE.Group(); obj.position.y = BED_TOP; obj.add(lm.mesh); bedG.add(obj);
    const ghostObj = ghostModel('pawn', SCALE, 0.08); obj.add(ghostObj);
    // y belt and motor
    const yTex = stripeTex(8, 8, '#1d2230', '#8ef0ff'); yTex.repeat.set(1, 18);
    const ybelt = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 36), new THREE.MeshStandardMaterial({ map: yTex })); ybelt.position.set(0, 0.8, 0); ybelt.material.map.repeat.set(1, 18); ybelt.geometry = new THREE.BoxGeometry(1.2, 0.25, 36); root.add(ybelt);
    const ym = stepper(4, 0x1d2230); ym.rotation.x = -Math.PI / 2; ym.rotation.y = Math.PI / 2; ym.position.set(0, 0.5, 19.5); ym.rotation.set(0, 0, 0); ym.position.set(0, 2.2, 21); root.add(ym);
    const yidl = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.4, 20), alu); yidl.position.set(0, 0.9, -18); root.add(yidl);
    // gantry (moves in y with z)
    const gantry = new THREE.Group(); root.add(gantry);
    const bar = box(40, 2.4, 2.8, alu); bar.position.set(0, 0, -14); gantry.add(bar);
    const xTex = stripeTex(8, 8, '#1d2230', '#ffb547'); xTex.repeat.set(36, 1); xTex.center.set(0.5, 0.5); xTex.rotation = Math.PI / 2;
    const xbelt = new THREE.Mesh(new THREE.BoxGeometry(34, 0.3, 0.3), new THREE.MeshStandardMaterial({ map: xTex })); xbelt.position.set(0, 1.5, -12.4); gantry.add(xbelt);
    const xm = stepper(4, 0x1d2230); xm.rotation.y = Math.PI / 2; xm.position.set(-22.5, 0, -14); gantry.add(xm);
    const xid = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 20), alu); xid.position.set(19, 1.5, -12.4); gantry.add(xid);
    for (const sx of [-1, 1]) { const nut = box(3, 3, 3, M.plastic(0x4a5266)); nut.position.set(sx * 19.5, 0, -16); gantry.add(nut); }
    const car = new THREE.Group(); gantry.add(car);
    const carBody = box(6, 4.4, 3, dark); carBody.position.set(0, 0, -14); car.add(carBody);
    const headArm = box(4.4, 3, 12, M.plastic(0x353c50)); headArm.position.set(0, 0, -7); car.add(headArm);
    const hot = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.4, 20), M.metal(0xc3c8d2)); hot.position.set(0, -2.9, 0); car.add(hot);
    const hotMat = new THREE.MeshStandardMaterial({ color: 0xa8b0c0, metalness: 0.8, roughness: 0.4, emissive: 0x000000 });
    const hb = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.8), hotMat); hb.position.set(0, -5.3, 0); car.add(hb);
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.12, 1.2, 16), M.metal(0xd9a441)); nz.position.set(0, -6.5, 0); car.add(nz);
    const em = stepper(3.4, 0x1d2230); em.rotation.y = -Math.PI / 2; em.position.set(0, 1.0, -2); car.add(em);
    const fan = box(2.6, 2.6, 0.7, dark); fan.position.set(0, -3, 1.4); car.add(fan);
    // filament path: spool -> head, a polyline of struts
    const NSEG = 14, fil = []; for (let i = 0; i < NSEG; i++) { const f = strut(0.14, M.plastic(0xffb547)); root.add(f); fil.push(f); }
    // labels
    stage.label('Spool', [0, 59, -19], root, 'a'); stage.label('Z lead screws', [17.2, 42, -16], root, 'a'); stage.label('Z stepper', [17.2, -1.5, -16], root, 'a');
    const lblBed = stage.label('Heated bed', [0, 3, 14], bedG, 'a'); stage.label('Y stepper + belt', [0, 2, 24], root, 'a');
    stage.label('X stepper', [-22.5, 3.5, -14], gantry, 'a'); stage.label('X belt', [10, 4, -12.4], gantry, 'a'); const lblHot = stage.label('Hotend', [0, -9, 0], car, 'a');
    const head = { x: 0, z: 0, y: 0 };
    let spoolAng = 0, extruded = 0, last = null;

    function apply(dt, st) {
      const fi = st.p * (sl.count - 1);
      const pos = lm.at(fi);
      const tgtY = (pos.layer + 1) * LH * 0.1;
      head.x = approach(head.x, pos.x, 14, dt); head.z = approach(head.z, pos.z, 14, dt); head.y = approach(head.y, tgtY, 8, dt);
      lm.setCount(fi + 1);
      const nozzleY = BED_TOP + head.y;
      gantry.position.y = nozzleY + 6.6 + 0.0; gantry.position.z = 0;
      car.position.x = head.x;
      bedG.position.z = -head.z;
      // texture scrolls (belts and screws)
      xTex.offset.x = -head.x * 0.9; yTex.offset.y = -head.z * 0.9;
      screws.forEach((sc) => { sc.userData.t.offset.y = -head.y * 2.4; sc.userData.m.spin?.(head.y * 40); });
      xm.spin(head.x * 1.1); ym.spin(head.z * 1.1); em.spin(extruded * 0.9);
      // filament line
      const sx = 0, sy = 45, sz = -11, ex = head.x, ey = gantry.position.y + 1.2, ez = -2;
      for (let i = 0; i < NSEG; i++) {
        const pt = (u) => { const x = lerp(sx, ex, u), z = lerp(sz, ez, u), y = lerp(sy, ey, u) + Math.sin(Math.PI * u) * 3; return [x, y, z]; };
        const a = pt(i / NSEG), b = pt((i + 1) / NSEG); fil[i].set(...a, ...b);
      }
      // heat glow
      const hotk = clamp((st.nozzle - 40) / 230, 0, 1); hotMat.emissive.setRGB(hotk * 0.9, hotk * 0.2, 0);
      const bk = clamp((st.bedT - 22) / 90, 0, 1); heatMat.emissive.setRGB(bk * 0.9, bk * 0.28, 0);
      spoolG.rotation.x = spoolAng;
      lblBed.element.textContent = `Heated bed ${Math.round(st.bedT)} °C`; lblHot.element.textContent = `Hotend ${Math.round(st.nozzle)} °C`;
      return pos;
    }
    return {
      update(dt, st) {
        const rate = 40 * st.speed;
        if (st.playing) { const before = st.p; st.p = Math.min(1, st.p + (dt * rate) / sl.count); if (st.p >= 1) st.playing = false; extruded += (st.p - before) * sl.count * 0.05; spoolAng += (st.p - before) * sl.count * 0.0006; }
        last = apply(dt, st);
      },
      readout(st) {
        const pos = last || lm.at(0), layer = pos.layer + 1, xmm = pos.x * 10 + 0, ymm = pos.z * 10, zmm = layer * LH;
        return `<div class="big">Layer ${layer} of ${sl.nL}</div>
          <div class="row"><span>Height</span><b>${zmm.toFixed(1)} mm</b></div>
          <div class="row"><span>X motor</span><b>${Math.round((xmm + 54) * STEPS_PER_MM).toLocaleString()} steps</b></div>
          <div class="row"><span>Y motor</span><b>${Math.round((ymm + 54) * STEPS_PER_MM).toLocaleString()} steps</b></div>
          <div class="row"><span>Z (two screws)</span><b>${Math.round(zmm * 400).toLocaleString()} steps</b></div>
          <p class="r-say">Steps assume a typical 80 steps per mm on the belts and about 400 on the screws. Real values depend on the printer.</p>`;
      },
      dispose() { lm.dispose(); },
    };
  },
};
