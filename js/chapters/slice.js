// Chapter 1: model to layers. A printer cannot print a shape, only a stack of thin slices. This is a small real slicer
// running in the page: it cuts a solid into layers, finds the outline, adds perimeters, solid skin, sparse infill and
// supports, and checks every cell for overhang. (Cells are 0.5 mm here; a real bead is about 0.4-0.5 mm wide.)
import { THREE, M, box, slice, layerMesh, ghostModel, MODELS, TYPE_COL, TYPE_NAME, clamp } from '../printer.js';

const SHAPE_NOTE = { pawn: 'The ball needs support under its lower half: the plastic would hang in mid-air.', hook: 'The arm sticks out sideways, so its underside has nothing below it.', arch: 'The deck spans 16 mm of air between two pillars. That is a bridge, and printers can bridge short gaps.' };

export default {
  id: 'slice',
  short: 'Model to layers',
  title: 'From a shape to a stack of slices',
  subtitle: 'A printer cannot draw a shape. It can only draw one thin slice, then another on top.',
  view: { pos: [4.6, 4.2, 6.2], target: [0, 1.3, 0] },
  learn: `<p>Every 3D printer starts with a file that describes a <b>solid</b>, usually as thousands of triangles (an STL file). The printer cannot use that directly. A program called a <b>slicer</b> cuts the solid into flat layers, each as thick as the <b>layer height</b>, typically 0.1 to 0.3 mm for a plastic printer, and works out the path the nozzle must follow in each one.</p>
    <p>Each layer gets <b>perimeters</b> (the outer walls, which give the surface and most of the strength), solid <b>skin</b> where a layer is the top or bottom of the part, and sparse <b>infill</b> in between, because a solid part would waste plastic and time. Where a layer would hang in the air, the slicer adds <b>supports</b> that you snap away afterwards.</p>
    <p class="tip"><b>Try it:</b> drag <b>Layers shown</b> to watch the part grow. Make the layer height coarse and look at the steps on the ball. Turn supports off on the Pawn or the Hook and see the red cells that would sag.</p>
    <p class="note">This is a simplified slicer on a coarse grid, so the numbers are estimates. Real slicers trace smooth lines and plan the nozzle's speed and acceleration too.</p>`,
  terms: [
    { t: 'Slicer', d: 'Software that turns a 3D model into layers and then into movement instructions (G-code) for the printer.' },
    { t: 'Layer height', d: 'The thickness of one layer. Thinner layers hide the steps but need many more of them.' },
    { t: 'Perimeter', d: 'A loop of plastic that follows the outline of a layer. Several together make the wall.' },
    { t: 'Infill', d: 'A sparse pattern inside the walls that holds the part up. 10 to 30 percent is common.' },
    { t: 'Support', d: 'Throw-away plastic printed under an overhang so that the layer above has something to sit on.' },
  ],
  defaults: { model: 'pawn', lh: 0.2, walls: 2, infill: 0.2, supports: false, p: 0.62, playing: false, ghost: false },
  controls: [
    { key: 'model', type: 'seg', label: 'Model', options: Object.entries(MODELS).map(([v, m]) => ({ v, label: m.name })) },
    { key: 'p', type: 'range', label: 'Layers shown', min: 0, max: 1, step: 0.002, fmt: (v, s) => `${Math.round(v * (s._n || 1))} of ${s._n || '…'}` },
    { key: 'playing', type: 'toggle', label: 'Play' },
    { key: 'lh', type: 'range', label: 'Layer height', min: 0.1, max: 0.4, step: 0.02, fmt: (v) => `${v.toFixed(2)} mm` },
    { key: 'walls', type: 'range', label: 'Perimeters', min: 1, max: 4, step: 1, fmt: (v) => `${v}` },
    { key: 'infill', type: 'range', label: 'Infill', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'supports', type: 'toggle', label: 'Supports', hint: 'Off: overhangs that nothing holds up show in red.' },
    { key: 'ghost', type: 'toggle', label: 'Show the solid model' },
  ],
  quiz: [
    { q: 'What does a slicer produce?', options: ['A 3D model', 'Layers and the nozzle path for each one', 'A temperature curve', 'A new material'], answer: 1, why: 'It cuts the model into layers and plans the path the nozzle takes in each layer.' },
    { q: 'Why is the inside of a part usually sparse infill, not solid?', options: ['Plastic cannot be solid', 'It saves plastic and time and is still strong enough', 'Solid parts crack', 'Infill is lighter than air'], answer: 1, why: 'The walls carry most of the load. A sparse pattern inside holds them apart for much less plastic and time.' },
    { q: 'You halve the layer height from 0.2 mm to 0.1 mm. What happens?', options: ['Half as many layers', 'About twice as many layers, so a longer print and a smoother surface', 'The nozzle gets smaller', 'Nothing'], answer: 1, why: 'The same height needs twice as many slices, which takes longer but hides the steps.' },
    { q: 'What is a support for?', options: ['Making the part stronger forever', 'Holding up a layer that would otherwise print in mid-air', 'Heating the bed', 'Cooling the nozzle'], answer: 1, why: 'Plastic cannot be laid on nothing. A support gives an overhang something to sit on, and is removed afterwards.' },
  ],
  reel: [
    { ms: 5600, caption: 'A 3D printer cannot print a shape. It prints one thin slice at a time, and holds up the overhangs.', set: { model: 'pawn', lh: 0.3, walls: 2, infill: 0.2, supports: true, p: 0, playing: false, ghost: false }, view: { pos: [4.2, 3.4, 5.6], target: [0, 1.3, 0] }, anim: { p: [0, 1] }, spin: 0.4 },
  ],
  build({ stage, s }) {
    const root = stage.root, k = 0.1;
    const bed = box(8, 0.3, 8, M.matte(0x222733)); bed.position.y = -0.15; root.add(bed);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 3.9), M.ghost(0x8ef0ff, 0.2)); plane.rotation.x = -Math.PI / 2; root.add(plane);
    const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.9, 3.9)), new THREE.LineBasicMaterial({ color: 0x8ef0ff })); ring.rotation.x = -Math.PI / 2; plane.add(ring);
    let sl = null, lm = null, ghost = null, sig = '', gsig = '';
    const lblLayer = stage.label('current layer', [2.2, 0, 0], root, '');
    function rebuild() {
      if (lm) { root.remove(lm.mesh); lm.dispose(); }
      sl = slice(s.model, { lh: s.lh, walls: s.walls, infill: s.infill, supports: s.supports });
      lm = layerMesh(sl); root.add(lm.mesh); s._n = sl.nL;
    }
    function sync() {
        const key = `${s.model}|${s.lh.toFixed(2)}|${s.walls}|${s.infill.toFixed(2)}|${s.supports}`;
        if (key !== sig) { sig = key; rebuild(); }
        if (s.model + s.ghost !== gsig) { gsig = s.model + s.ghost; if (ghost) { root.remove(ghost); ghost.traverse((o) => o.geometry?.dispose()); } ghost = ghostModel(s.model); ghost.visible = s.ghost; root.add(ghost); }
        ghost.visible = s.ghost;
    }
    sync();
    return {
      update(dt) {
        sync();
        if (s.playing) { s.p = Math.min(1, s.p + dt / 16); if (s.p >= 1) s.playing = false; }
        const n = Math.round(s.p * sl.nL);
        lm.setLayers(n);
        plane.position.y = n * sl.lh * k + 0.002;
        lblLayer.position.set(2.1, n * sl.lh * k, 0);
        lblLayer.element.textContent = n ? `layer ${n} · ${(n * sl.lh).toFixed(1)} mm` : 'bed';
      },
      readout(st) {
        const a = sl.stats, c = a.cells, n = Math.round(st.p * sl.nL);
        const sag = c[5];
        const say = sag ? `<span style="color:#ff6b6b">${sag} cells would print in mid-air and sag.</span> ${SHAPE_NOTE[st.model]}` : st.supports && c[4] ? `Supports are on: ${c[4]} support cells hold the overhang up. ${SHAPE_NOTE[st.model]}` : 'Nothing here hangs in the air, so no supports are needed.';
        return `<div class="big">${n} of ${sl.nL} layers</div><p class="r-say">${say}</p>
          <div class="row"><span>Plastic path, whole part</span><b>about ${a.pathM.toFixed(1)} m</b></div>
          <div class="row"><span>Filament (1.75 mm)</span><b>about ${(a.filamentM).toFixed(2)} m · ${a.grams.toFixed(1)} g</b></div>
          <div class="row"><span>Print time at 50 mm/s</span><b>roughly ${a.minutes < 90 ? Math.round(a.minutes) + ' min' : (a.minutes / 60).toFixed(1) + ' h'}</b></div>
          <div class="row"><span style="color:#ff7a59">Perimeters</span><b>${c[1]}</b></div><div class="row"><span style="color:#ffb547">Skin</span><b>${c[2]}</b></div><div class="row"><span style="color:#8ef0ff">Infill</span><b>${c[3]}</b></div>`;
      },
      dispose() {},
    };
  },
};
