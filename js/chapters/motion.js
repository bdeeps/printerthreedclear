// Chapter 4: three ways to move a nozzle to (x, y, z). Cartesian: one motor per axis. CoreXY: two fixed motors whose
// belts combine, so the head moves along X when they turn together and along Y when they turn in opposition.
// Delta: three towers each lift an arm, and the nozzle position follows from inverse kinematics (real numbers here).
// CoreXY belts are drawn simplified: the runs are right, but real printers route them over stacked pulleys.
import { THREE, M, box, COL, clamp, lerp, approach, strut, stepper, stripeTex } from '../printer.js';

const TEETH_MM = 40;   // belt travel per motor turn: 20-tooth GT2 pulley, 2 mm pitch
const ARM = 20, TOWER_R = 15, EFF_R = 3, HALF = 10;
const KINDS = {
  cartesian: { n: 'Cartesian', say: 'One motor per axis. The bed slides one way and the head slides the other. Simple and easy to understand, but the heavy bed has to speed up and stop.', moves: 'X motor, Y motor' },
  corexy: { n: 'CoreXY', say: 'The bed stays put and only light parts move. Both motors work for every move: together they push the head along X, in opposition along Y. It is quick, but the belts are fiddly.', moves: 'Motors A and B' },
  delta: { n: 'Delta', say: 'Three towers raise and lower arms that meet at the nozzle. Move all three carriages together and the nozzle goes up or down. Tall and fast, with a round bed.', moves: 'Three tower carriages' },
};
let stageRef = null;
const VIEWS = { cartesian: [[20, 20, 26], [0, 6, 0]], corexy: [[24, 30, 32], [0, 11, 0]], delta: [[42, 28, 46], [0, 15, 0]] };
const dirs = [Math.PI / 2 + 0.0, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];

function target(path, u) {   // u in [0,1): position in cm on the bed
  if (path === 'circle') return [Math.cos(u * 2 * Math.PI) * 6.5, Math.sin(u * 2 * Math.PI) * 6.5];
  const e = u * 4, k = Math.floor(e), f = e - k, S = 6, c = [[-S, -S], [S, -S], [S, S], [-S, S], [-S, -S]];
  return [lerp(c[k][0], c[k + 1][0], f), lerp(c[k][1], c[k + 1][1], f)];
}

export default {
  id: 'motion',
  short: 'Ways to move',
  title: 'Three ways to move a nozzle',
  subtitle: 'Cartesian, CoreXY and delta printers all reach the same point with different machinery.',
  view: { pos: [20, 20, 26], target: [0, 6, 0] },
  learn: `<p>The slicer's job is to say where the nozzle must go. A printer's <b>kinematics</b> is how its motors make that happen. There are three common designs.</p>
    <p>A <b>Cartesian</b> printer has one motor per axis, in straight lines. In a "bed-slinger" the bed carries the part forward and back. A <b>CoreXY</b> printer keeps the bed still, and two fixed motors drive two belts that combine: both turning the same way slide the head sideways, opposite ways slide it forwards. Light moving parts mean it can accelerate hard. A <b>delta</b> printer hangs the nozzle from three arms on three tall towers. To find where each carriage must be, the controller solves a bit of geometry for every point.</p>
    <p class="tip"><b>Try it:</b> switch the design and watch the numbers in the readout. The head draws the same square or circle every time, but the motors do very different things. In the delta, lift <b>Height</b> and all three carriages rise together.</p>
    <p class="note">The CoreXY belts are simplified in the drawing. Real machines run them on stacked pulleys, but every run stays parallel to a rail, as here.</p>`,
  terms: [
    { t: 'Kinematics', d: 'The rule that turns a wanted nozzle position into motor positions.' },
    { t: 'Bed-slinger', d: 'A Cartesian printer whose bed slides back and forth under the head.' },
    { t: 'CoreXY', d: 'A design with two fixed motors and two belts that combine to move the head in X and Y.' },
    { t: 'Delta', d: 'A design with three vertical towers and arms that meet at the nozzle.' },
    { t: 'GT2 belt', d: 'A toothed rubber belt with 2 mm between teeth, common on desktop printers.' },
  ],
  defaults: { kin: 'cartesian', path: 'square', speed: 0.8, z: 6, u: 0 },
  controls: [
    { key: 'kin', type: 'seg', label: 'Design', options: Object.entries(KINDS).map(([v, k]) => ({ v, label: k.n })) },
    { key: 'path', type: 'seg', label: 'Path', options: [{ v: 'square', label: 'Square' }, { v: 'circle', label: 'Circle' }] },
    { key: 'speed', type: 'range', label: 'Speed', min: 0, max: 2.5, step: 0.05, fmt: (v) => (v ? `${v.toFixed(1)}×` : 'Paused') },
    { key: 'z', type: 'range', label: 'Height', min: 0, max: 16, step: 0.1, fmt: (v) => `${(v * 10).toFixed(0)} mm` },
  ],
  onChange(s, key) { if (key === 'kin' && stageRef) stageRef.setView(...VIEWS[s.kin], 0.9); },
  quiz: [
    { q: 'On a CoreXY printer, what moves the head sideways (X)?', options: ['One motor alone', 'Both motors turning the same way', 'Both motors turning opposite ways', 'The bed'], answer: 1, why: 'The belts combine: equal turns move the head in X, opposite turns move it in Y.' },
    { q: 'What does a delta printer do to raise the nozzle?', options: ['Spin the towers', 'Lift all three carriages together', 'Lower the bed only', 'Heat the arms'], answer: 1, why: 'The arms hang from the carriages, so raising all three raises the nozzle.' },
    { q: 'Why is CoreXY good at going fast?', options: ['It has bigger motors', 'The heavy bed does not have to move in X and Y', 'It uses less plastic', 'It has no belts'], answer: 1, why: 'Only the light gantry and head move in the plane, so they can speed up and slow down quickly.' },
    { q: 'What do the motors need to know about each nozzle position?', options: ['Its colour', 'Its x, y and z, turned into motor positions by the machine’s geometry', 'Only its height', 'Nothing'], answer: 1, why: 'Kinematics converts the wanted position into positions for each motor.' },
  ],
  reel: [
    { ms: 5200, caption: 'CoreXY: two fixed motors. Turn together to go sideways, apart to go forwards.', set: { kin: 'corexy', path: 'circle', speed: 1.2, z: 6 }, view: { pos: [22, 28, 30], target: [0, 11, 0] }, spin: 0.2 },
    { ms: 5200, caption: 'Delta: three arms meet at the nozzle. The maths picks each carriage height.', set: { kin: 'delta', path: 'circle', speed: 1.2, z: 6 }, anim: { z: [3, 10] }, view: { pos: [40, 26, 44], target: [0, 15, 0] }, spin: 0.2 },
  ],
  build({ stage, s }) {
    stage.floor.visible = true; stageRef = stage;
    const root = stage.root, alu = M.metal(0x8a93a6, { roughness: 0.45 }), dark = M.plastic(0x1d2230), frame = M.plastic(0x2b3142);
    const heat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.7 });
    const nozzleMat = M.metal(0xd9a441);
    const mkNozzle = () => { const g = new THREE.Group(); const b = box(2.4, 2.4, 2.4, dark); b.position.y = 1.9; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.14, 1.4, 16), nozzleMat); c.position.y = 0.7; g.add(b, c); return g; };
    const trailN = 240, trailPos = new Float32Array(trailN * 3), trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3)); trailGeo.setDrawRange(0, 0);
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: COL.amber })); trail.frustumCulled = false; root.add(trail);
    let trailCount = 0, trailHead = 0;

    // ---------- cartesian
    const cart = new THREE.Group(); root.add(cart);
    const cbase = box(30, 1, 30, frame); cbase.position.y = -0.5; cart.add(cbase);
    const cbed = new THREE.Group(); cart.add(cbed);
    const cbp = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF, 0.6, 2 * HALF), heat); cbp.position.y = 0.3; cbp.receiveShadow = true; cbed.add(cbp);
    const cbc = box(22, 0.8, 22, M.plastic(0x353c50)); cbc.position.y = -0.2; cbed.add(cbc);
    for (const sx of [-1, 1]) { const up = box(2, 22, 2, alu); up.position.set(sx * 13, 11, -10); cart.add(up); }
    const cgan = new THREE.Group(); cart.add(cgan);
    const cbar = box(28, 1.6, 1.8, alu); cbar.position.set(0, 0, -10); cgan.add(cbar);
    const cxt = stripeTex(8, 8, '#1d2230', '#ffb547'); cxt.repeat.set(30, 1); cxt.center.set(0.5, 0.5); cxt.rotation = Math.PI / 2;
    const cxb = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 0.25), new THREE.MeshStandardMaterial({ map: cxt })); cxb.position.set(0, 1, -8.9); cgan.add(cxb);
    const cxm = stepper(3.4, 0x1d2230); cxm.rotation.y = Math.PI / 2; cxm.position.set(-15.6, 0, -10); cgan.add(cxm);
    const ccar = new THREE.Group(); cgan.add(ccar); const cn = mkNozzle(); cn.position.set(0, -4.2, -6); ccar.add(cn);
    const carm = box(2.4, 1.8, 6, dark); carm.position.set(0, -1.2, -7); ccar.add(carm); const cbody = box(3.2, 2.6, 1.6, dark); cbody.position.set(0, 0, -10); ccar.add(cbody);
    const cyt = stripeTex(8, 8, '#1d2230', '#8ef0ff'); cyt.repeat.set(1, 15);
    const cyb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 28), new THREE.MeshStandardMaterial({ map: cyt })); cyb.position.set(0, -1.3, 0); cart.add(cyb);
    const cym = stepper(3.4, 0x1d2230); cym.position.set(0, -1, 17); cart.add(cym);
    cart.userData.parts = { cxm, cym };
    stage.label('X motor', [-15.6, 3, -10], cgan, 'a'); stage.label('Y motor', [0, 2.5, 17], cart, 'a'); stage.label('Bed slides', [0, 1.4, 11.5], cbed, 'a'); stage.label('Head slides', [6, 3, -10], ccar, 'a');

    // ---------- corexy
    const cx = new THREE.Group(); root.add(cx);
    const xbase = box(30, 1, 30, frame); xbase.position.y = -0.5; cx.add(xbase);
    const xbedG = new THREE.Group(); cx.add(xbedG);
    const xbp = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF, 0.6, 2 * HALF), heat); xbp.position.y = 0.3; xbedG.add(xbp);
    const RX = 13, RB = -13;   // rails at x=±RX, motors at back z=RB
    const HY = 20;
    for (const sx of [-1, 1]) { const rail = box(1.2, 1.2, 28, alu); rail.position.set(sx * RX, HY, 0); cx.add(rail); const post = box(2, HY, 2, alu); post.position.set(sx * (RX + 0.5), HY / 2, RB - 1); cx.add(post); const post2 = box(2, HY, 2, alu); post2.position.set(sx * (RX + 0.5), HY / 2, 14.5); cx.add(post2); }
    const mA = stepper(3.6, 0x1d2230), mB = stepper(3.6, 0x1d2230);
    for (const [m, sx] of [[mA, -1], [mB, 1]]) { m.rotation.x = -Math.PI / 2; m.position.set(sx * RX, HY + 2.2, RB - 1); cx.add(m); }
    const xgan = new THREE.Group(); cx.add(xgan);
    const xbar = box(2 * RX, 1.4, 1.6, alu); xgan.add(xbar);
    const xcar = box(3.2, 2.2, 2.4, dark); xgan.add(xcar);
    const xn = mkNozzle(); xn.position.y = -2.4; xcar.add(xn);
    for (const sx of [-1, 1]) { const sl = box(2.4, 1.8, 2.4, M.plastic(0x4a5266)); sl.position.set(sx * RX, 0, 0); xgan.add(sl); }
    const belts = []; for (const [col, off] of [[COL.cyan, 0.0], [COL.violet, 0.5]]) { const set = []; for (let i = 0; i < 6; i++) { const st = strut(0.2, M.glow(col)); cx.add(st); set.push(st); } belts.push({ set, off, col }); }
    stage.label('Motor A', [-RX, HY + 4.5, RB - 1], cx, 'a'); stage.label('Motor B', [RX, HY + 4.5, RB - 1], cx, 'a'); stage.label('Bed stays still', [0, 1.4, 11.5], cx, 'a');

    // ---------- delta
    const dl = new THREE.Group(); root.add(dl);
    const dbase = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 1, 48), frame); dbase.position.y = -0.5; dl.add(dbase);
    const dbp = new THREE.Mesh(new THREE.CylinderGeometry(HALF, HALF, 0.6, 48), heat); dbp.position.y = 0.3; dbp.receiveShadow = true; dl.add(dbp);
    const TH = 36, towers = [], carr = [], armsA = [], armsB = [];
    dirs.forEach((a, i) => {
      const tx = Math.cos(a) * TOWER_R, tz = Math.sin(a) * TOWER_R;
      const t = box(1.6, TH, 1.6, alu); t.position.set(tx, TH / 2, tz); dl.add(t);
      const rail = box(0.5, TH - 2, 0.5, M.metal(0xd6dbe6)); rail.position.set(tx * 0.93, TH / 2, tz * 0.93); dl.add(rail);
      const c = box(2.2, 2.2, 2.2, M.plastic(COL.coral)); dl.add(c); carr.push(c);
      const mt = stepper(3.2, 0x1d2230); mt.rotation.x = Math.PI / 2; mt.position.set(tx, 1.6, tz); dl.add(mt); towers.push(mt);
      const ua = strut(0.16, M.metal(0xc9ced8)), ub = strut(0.16, M.metal(0xc9ced8)); dl.add(ua, ub); armsA.push(ua); armsB.push(ub);
      stage.label(`Tower ${'ABC'[i]}`, [tx, TH + 1.2, tz], dl, 'a');
    });
    const eff = new THREE.Group(); dl.add(eff);
    const eplate = new THREE.Mesh(new THREE.CylinderGeometry(EFF_R + 0.5, EFF_R + 0.5, 0.8, 6), dark); eplate.position.y = 1.2; eff.add(eplate);
    const en = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.14, 1.4, 16), nozzleMat); en.position.y = 0.3; eff.add(en);
    const groups = { cartesian: cart, corexy: cx, delta: dl };
    let u = s.u || 0, shown = '', pos = [0, 0, s.z], mv = { a: 0, b: 0, c: 0 }, curK = '';
    const bpos = new THREE.Vector3();

    function solve(st, dt) {
      const [px, pz] = target(st.path, u % 1), py = st.z;
      pos = [px, pz, py];
      const g = groups[st.kin];
      if (st.kin === 'cartesian') {
        cbed.position.z = -pz; cgan.position.y = py + 5.2; ccar.position.x = px; cart.userData.pos = [px, pz];
        cxt.offset.x = -px * 0.45; cyt.offset.y = -pz * 0.45;
        cxm.spin((px * 10 / TEETH_MM) * 2 * Math.PI); cym.spin((-pz * 10 / TEETH_MM) * 2 * Math.PI);
        mv = { a: px * 10, b: -pz * 10 };
        bpos.set(px, py, pz);
      } else if (st.kin === 'corexy') {
        xbedG.position.y = -(py - 4) * 0 + 0; xgan.position.set(0, HY, pz); xcar.position.x = px; xbedG.position.y = 0;
        // nozzle height: bed would lower in a real CoreXY; here the whole head assembly sits at height HY, so show the bed dropping
        xbedG.position.y = HY - 2.4 - py - 0.6; xn.position.y = -2.4;
        const A = (px + pz) * 10, B = (px - pz) * 10; mA.spin((A / TEETH_MM) * 2 * Math.PI); mB.spin((-B / TEETH_MM) * 2 * Math.PI);
        mv = { a: A, b: B };
        const yB = RB, g_ = pz, c = px;
        belts.forEach((bl, bi) => {
          const o = bl.off, y = HY + 0.9 + o * 0.0 + (bi ? 0.0 : 0.5), yb = yB + 0.5 + o, xl = -RX + 0.6 + o, xr = RX - 0.6 - o, gg = g_ + (bi ? 0.5 : -0.5);
          const pts = bi === 0 ? [[c, gg], [xl, gg], [xl, yb], [xr, yb], [xr, gg], [c, gg]] : [[c, gg], [xr, gg], [xr, yb], [xl, yb], [xl, gg], [c, gg]];
          for (let i = 0; i < 5; i++) bl.set[i].set(pts[i][0], y, pts[i][1], pts[i + 1][0], y, pts[i + 1][1]);
          bl.set[5].visible = false;
        });
        bpos.set(px, py, pz);
      } else {
        eff.position.set(px, py, pz);
        const hs = [];
        dirs.forEach((a, i) => {
          const tx = Math.cos(a) * TOWER_R, tz = Math.sin(a) * TOWER_R, ex = Math.cos(a) * EFF_R, ez = Math.sin(a) * EFF_R;
          const ax = tx - ex - px, az = tz - ez - pz, d2 = ax * ax + az * az, h = py + 1.2 + Math.sqrt(Math.max(0, ARM * ARM - d2));
          hs.push(h); carr[i].position.set(tx * 0.97, h, tz * 0.97);
          const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(0.7);
          armsA[i].set(tx * 0.97 + side.x, h, tz * 0.97 + side.z, px + ex + side.x, py + 1.2, pz + ez + side.z);
          armsB[i].set(tx * 0.97 - side.x, h, tz * 0.97 - side.z, px + ex - side.x, py + 1.2, pz + ez - side.z);
          towers[i].spin((h * 10 / TEETH_MM) * 2 * Math.PI);
        });
        mv = { a: hs[0] * 10, b: hs[1] * 10, c: hs[2] * 10 };
        bpos.set(px, py, pz);
      }
      return g;
    }
    return {
      update(dt, st) {
        if (st.speed) u += dt * st.speed * 0.1;
        if (st.kin !== curK) { curK = st.kin; Object.entries(groups).forEach(([k, g]) => { g.visible = k === st.kin; }); trailCount = 0; trailHead = 0; trailGeo.setDrawRange(0, 0); }
        belts.forEach((b) => b.set.forEach((x) => { x.visible = st.kin === 'corexy'; }));
        solve(st, dt);
        // trail follows the nozzle tip on the bed plane (nozzle tip height)
        const tipY = st.kin === 'cartesian' ? st.z : st.kin === 'corexy' ? st.z : st.z;
        trailPos.copyWithin(0, 3); const o = (trailN - 1) * 3; trailPos[o] = bpos.x; trailPos[o + 1] = tipY + 0.0; trailPos[o + 2] = bpos.z;
        trailCount = Math.min(trailN, trailCount + 1);
        trailGeo.setDrawRange(trailN - trailCount, trailCount); trailGeo.attributes.position.needsUpdate = true;
      },
      readout(st) {
        const k = KINDS[st.kin], f = (v) => `${v >= 0 ? '' : '−'}${Math.abs(v).toFixed(1)} mm`;
        const [x, y, z] = [pos[0] * 10, pos[1] * 10, pos[2] * 10];
        const rows = st.kin === 'cartesian' ? [['X motor (belt)', f(mv.a)], ['Y motor (belt)', f(mv.b)]]
          : st.kin === 'corexy' ? [['Motor A = X + Y', f(mv.a)], ['Motor B = X − Y', f(mv.b)]]
          : [['Carriage A height', f(mv.a)], ['Carriage B height', f(mv.b)], ['Carriage C height', f(mv.c)]];
        return `<div class="big">${k.n}</div><p class="r-say">${k.say}</p>
          <div class="row"><span>Nozzle at</span><b>${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)} mm</b></div>
          ${rows.map(([a, b]) => `<div class="row"><span>${a}</span><b>${b}</b></div>`).join('')}`;
      },
      dispose() {},
    };
  },
};
