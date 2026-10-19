// Interactive 3D model of the capstone cleaning robot (three.js).
// Geometry is approximated from the design report (800 x 585 x 345 mm envelope,
// 2 x 670 mm + 6 x 400 mm 30x30 profiles, ~60 mm sprockets, IG52 motors,
// RPLIDAR A3) and from photos of the built robot. Units are millimetres.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountRobot(root) {
  const canvasBox = root.querySelector('.r3d-canvas');
  const tip = root.querySelector('.r3d-tip');
  const W = () => canvasBox.clientWidth, H = () => canvasBox.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasBox.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W() / H(), 10, 10000);
  // widen the view on narrow canvases so the whole robot stays in frame
  const fitFov = () => { camera.aspect = W() / H(); camera.fov = 32 * Math.max(1, 1.9 / camera.aspect); camera.updateProjectionMatrix(); };
  fitFov();
  const HOME = new THREE.Vector3(820, 500, 780), TARGET = new THREE.Vector3(0, 130, 0);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.minDistance = 450; controls.maxDistance = 2600;
  controls.maxPolarAngle = Math.PI * 0.49;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.8;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96a3, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(600, 1200, 500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 700, bottom: -700, near: 100, far: 3000 });
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdbe8ff, 0.7);
  fill.position.set(-800, 400, -600);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(1400, 64), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- materials ----------
  const M = {
    alu: new THREE.MeshStandardMaterial({ color: 0xc7ccd3, metalness: 0.65, roughness: 0.38 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xb9bfc8, metalness: 0.7, roughness: 0.3 }),
    track: new THREE.MeshStandardMaterial({ color: 0x8d939b, metalness: 0.35, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.8 }),
    box: new THREE.MeshStandardMaterial({ color: 0xf1f1ec, roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.3, roughness: 0.45 }),
    lidarRing: new THREE.MeshStandardMaterial({ color: 0x2b6cb0, metalness: 0.4, roughness: 0.35 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a443, metalness: 0.8, roughness: 0.3 }),
    green: new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.5 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc8402f, roughness: 0.5 }),
    purple: new THREE.MeshStandardMaterial({ color: 0x8b72c9, roughness: 0.6, transparent: true }),
    clear: new THREE.MeshStandardMaterial({ color: 0xcfe9f5, roughness: 0.15, transparent: true, opacity: 0.55 }),
    edge: new THREE.LineBasicMaterial({ color: 0x5f6b78, transparent: true, opacity: 0.45 }),
  };

  // Each part group has a name/description for the hover label and an
  // offset used by the exploded view.
  const parts = [];
  // drawings: ids of the CAD outlines in #part-drawings, shown over the viewer when the part is clicked
  function part(name, desc, explode, drawings) {
    const g = new THREE.Group();
    g.userData = { name, desc, explode: explode || new THREE.Vector3(), drawings: drawings || [] };
    scene.add(g); parts.push(g);
    return g;
  }
  function add(g, geo, mat, x, y, z, edges) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), M.edge));
    return m;
  }

  // ---------- track path: belt around four wheels, both ends raised ----------
  const R = 32, TRACK_Z = 262, TRACK_W = 60;
  const centers = [[-360, 95], [-262, 38], [262, 38], [360, 95]]; // counter-clockwise in side view
  const pieces = [];
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [dy / l, -dx / l]; };
  for (let i = 0; i < centers.length; i++) {
    const a = centers[i], b = centers[(i + 1) % centers.length], c = centers[(i + 2) % centers.length];
    const n1 = nrm(a, b), n2 = nrm(b, c);
    pieces.push({ t: 'line', p0: [a[0] + n1[0] * R, a[1] + n1[1] * R], p1: [b[0] + n1[0] * R, b[1] + n1[1] * R] });
    let a0 = Math.atan2(n1[1], n1[0]), a1 = Math.atan2(n2[1], n2[0]);
    while (a1 < a0) a1 += Math.PI * 2;
    pieces.push({ t: 'arc', c: b, a0, a1 });
  }
  pieces.forEach(p => { p.len = p.t === 'line' ? Math.hypot(p.p1[0] - p.p0[0], p.p1[1] - p.p0[1]) : R * (p.a1 - p.a0); });
  const loopLen = pieces.reduce((s, p) => s + p.len, 0);
  function along(s) {
    s = ((s % loopLen) + loopLen) % loopLen;
    for (const p of pieces) {
      if (s <= p.len) {
        if (p.t === 'line') {
          const k = s / p.len;
          return { x: p.p0[0] + (p.p1[0] - p.p0[0]) * k, y: p.p0[1] + (p.p1[1] - p.p0[1]) * k, ang: Math.atan2(p.p1[1] - p.p0[1], p.p1[0] - p.p0[0]) };
        }
        const a = p.a0 + s / R;
        return { x: p.c[0] + Math.cos(a) * R, y: p.c[1] + Math.sin(a) * R, ang: a + Math.PI / 2 };
      }
      s -= p.len;
    }
    return { x: 0, y: 0, ang: 0 };
  }

  const LINK = 17, nLinks = Math.floor(loopLen / LINK);
  const linkGeo = new THREE.BoxGeometry(LINK - 2, 9, TRACK_W);
  const tracks = [];
  for (const side of [1, -1]) {
    const g = part(side > 0 ? 'Track (right)' : 'Track (left)', 'Chain track with sprockets and road wheels, for grip on wet, sludgy floors', new THREE.Vector3(0, 0, side * 150),
      ['sprocket', 'shaft', 'road_wheel', 'road_wheel_bracket', 'track_support']);
    const inst = new THREE.InstancedMesh(linkGeo, M.track, nLinks);
    inst.castShadow = true; inst.receiveShadow = true;
    g.add(inst);
    tracks.push({ inst, side });

    // sprockets: two toothed plates per wheel
    const gear = new THREE.Shape();
    const teeth = 20;
    for (let i = 0; i <= teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2, r = i % 2 ? 24 : 29;
      i ? gear.lineTo(Math.cos(a) * r, Math.sin(a) * r) : gear.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const gearGeo = new THREE.ExtrudeGeometry(gear, { depth: 8, bevelEnabled: false });
    for (const [cx, cy] of [centers[0], centers[3]]) {
      for (const dz of [-22, 14]) add(g, gearGeo, M.plate, cx, cy, side * TRACK_Z + dz, false);
      add(g, new THREE.CylinderGeometry(7, 7, 80, 16).rotateX(Math.PI / 2), M.alu, cx, cy, side * (TRACK_Z - 20), false);
    }
    // road wheels: spool shape (two flanges and a hub)
    const spool = (cx, cy, r) => {
      for (const dz of [-24, 16]) add(g, new THREE.CylinderGeometry(r, r, 8, 28).rotateX(Math.PI / 2), M.rubber, cx, cy, side * TRACK_Z + dz + 4, false);
      add(g, new THREE.CylinderGeometry(r * 0.55, r * 0.55, 34, 20).rotateX(Math.PI / 2), M.alu, cx, cy, side * TRACK_Z, false);
    };
    spool(centers[1][0], centers[1][1], 26); spool(centers[2][0], centers[2][1], 26);
    for (const x of [-130, 0, 130]) spool(x, 33, 22);
  }

  function placeLinks(offset) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    for (const { inst, side } of tracks) {
      for (let i = 0; i < nLinks; i++) {
        const a = along(i * (loopLen / nLinks) + offset);
        e.set(0, 0, a.ang); q.setFromEuler(e); p.set(a.x, a.y, side * TRACK_Z);
        inst.setMatrixAt(i, m.compose(p, q, s));
      }
      inst.instanceMatrix.needsUpdate = true;
    }
  }
  placeLinks(0);

  // ---------- frame: 2 x 670 side rails + 6 x 400 cross members ----------
  const frame = part('Aluminium frame', 'Off-the-shelf 30 × 30 mm profile: 2 × 670 mm side rails and 6 × 400 mm cross members', new THREE.Vector3());
  for (const side of [1, -1]) add(frame, new THREE.BoxGeometry(670, 30, 30), M.alu, 0, 115, side * 215, true);
  for (const x of [-320, -200, -80, 40, 160, 300]) add(frame, new THREE.BoxGeometry(30, 30, 400), M.alu, x, 115, 0, true);

  // ---------- sprocket mounts: triangular plates joining rail, sprocket and lower wheel ----------
  const mounts = part('Sprocket mounts', 'CNC-machined 6061 aluminium plates that hold the sprockets, motors and encoders', new THREE.Vector3(0, 0, 0),
    ['sprocket_mount_motor', 'sprocket_mount_encoder']);
  function plateShape(pts, r) {
    // rounded convex outline around three points
    const sh = new THREE.Shape(), n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n], c = pts[(i + 2) % n];
      const n1 = nrm(a, b), n2 = nrm(b, c);
      const s0 = [a[0] + n1[0] * r, a[1] + n1[1] * r], s1 = [b[0] + n1[0] * r, b[1] + n1[1] * r];
      i ? sh.lineTo(s0[0], s0[1]) : sh.moveTo(s0[0], s0[1]);
      sh.lineTo(s1[0], s1[1]);
      let a0 = Math.atan2(n1[1], n1[0]), a1 = Math.atan2(n2[1], n2[0]);
      while (a1 < a0) a1 += Math.PI * 2;
      sh.absarc(b[0], b[1], r, a0, a1, false);
    }
    return sh;
  }
  for (const side of [1, -1]) {
    for (const end of [-1, 1]) {
      const pts = end < 0 ? [[-360, 95], [-262, 38], [-300, 118]] : [[262, 38], [360, 95], [300, 118]];
      const geo = new THREE.ExtrudeGeometry(plateShape(pts, 20), { depth: 6, bevelEnabled: false });
      const m = add(mounts, geo, M.plate, 0, 0, side * 233 - 3, true);
      m.userData.explode = new THREE.Vector3(0, 0, side * 110);
    }
  }

  // ---------- drive motors (rear) and encoders (front) ----------
  const motors = part('Drive motors', '24 V geared DC motors (IG52, 100 kgf·cm rated torque), one per track', new THREE.Vector3(-110, 0, 0), ['motor_mount']);
  for (const side of [1, -1]) {
    add(motors, new THREE.CylinderGeometry(26, 26, 40, 32).rotateX(Math.PI / 2), M.alu, -360, 95, side * 205, false);
    add(motors, new THREE.CylinderGeometry(26, 26, 120, 32).rotateX(Math.PI / 2), M.black, -360, 95, side * 125, false);
  }
  const encoders = part('Encoders', 'Wheel encoders on the front sprocket shafts', new THREE.Vector3(90, 0, 0), ['encoder_mount']);
  for (const side of [1, -1]) add(encoders, new THREE.CylinderGeometry(16, 16, 36, 24).rotateX(Math.PI / 2), M.black, 360, 95, side * 196, false);

  // ---------- electronics box and LiDAR ----------
  const box = part('Waterproof control box', 'Holds the onboard computer, motor driver and power electronics', new THREE.Vector3(0, 115, 0));
  add(box, new THREE.BoxGeometry(300, 150, 230), M.box, -30, 205, 0, true);
  add(box, new THREE.BoxGeometry(310, 12, 240), M.box, -30, 286, 0, true);
  for (const z of [-80, 80]) add(box, new THREE.BoxGeometry(14, 22, 20), M.box, 125, 268, z, false);
  for (const z of [-40, -10]) add(box, new THREE.CylinderGeometry(7, 7, 16, 16).rotateZ(Math.PI / 2), M.black, -188, 180, z, false);

  const lidar = part('RPLIDAR A3', '2D laser scanner (up to 25 m range) used for SLAM and exploration', new THREE.Vector3(0, 200, 0), ['lidar_plate']);
  add(lidar, new THREE.CylinderGeometry(22, 22, 12, 24), M.black, 0, 298, 0, false);
  add(lidar, new THREE.CylinderGeometry(38, 38, 26, 40), M.black, 0, 317, 0, false);
  add(lidar, new THREE.CylinderGeometry(36, 38, 15, 40), M.lidarRing, 0, 337.5, 0, false);

  // ---------- water spray: solenoid valve, hoses, hose gun ----------
  const valve = part('Solenoid valve', 'Switched by the motor driver’s digital output: open only while the robot drives', new THREE.Vector3(-170, 0, 0), ['valve_mount']);
  add(valve, new THREE.BoxGeometry(46, 30, 34), M.brass, -392, 92, 0, false);
  add(valve, new THREE.CylinderGeometry(15, 15, 32, 24), M.black, -392, 123, 0, false);

  const tube = (pts, r, mat) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 80, r, 12, false), mat);
  const hoses = part('Water hoses', 'Supply hose to the valve, clear line from the valve to the hose gun', new THREE.Vector3());
  const supply = tube([[-415, 92, 0], [-470, 80, -20], [-560, 40, -90], [-720, 12, -160], [-900, 10, -190]], 9, M.purple);
  const line = tube([[-392, 108, 18], [-350, 150, 120], [-180, 150, 185], [120, 150, 170], [260, 140, 60], [318, 126, 0]], 6, M.clear);
  for (const m of [supply, line]) { m.castShadow = true; hoses.add(m); }

  const gun = part('Hose gun', 'Spray nozzle on an aluminium mount, aimed at the floor ahead of the robot', new THREE.Vector3(140, 40, 0), ['hose_mount']);
  add(gun, new THREE.BoxGeometry(8, 50, 44), M.plate, 319, 112, 0, true);
  const body = add(gun, new THREE.CylinderGeometry(13, 13, 80, 24).rotateZ(Math.PI / 2), M.green, 360, 122, 0, false);
  body.rotation.z = -0.25;
  add(gun, new THREE.CylinderGeometry(9, 11, 22, 20).rotateZ(Math.PI / 2), M.red, 409, 110, 0, false).rotation.z = -0.25;
  add(gun, new THREE.BoxGeometry(18, 40, 16), M.green, 342, 96, 0, false);

  parts.forEach(g => g.children.forEach(c => { c.userData.base = c.position.clone(); }));

  // ---------- interaction ----------
  let explode = 0, explodeTarget = 0, driving = !reduceMotion, trackOffset = 0, hovered = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const highlight = new THREE.Color(0x2f80ed);

  function setHover(g) {
    if (hovered === g) return;
    if (hovered) hovered.traverse(o => { if (o.isMesh && o.material.emissive) o.material = o.userData.origMat || o.material; });
    hovered = g;
    if (g) g.traverse(o => {
      if (o.isMesh && o.material.emissive) {
        o.userData.origMat = o.material;
        o.material = o.material.clone();
        o.material.emissive = highlight; o.material.emissiveIntensity = 0.28;
      }
    });
  }
  function onPointer(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(parts, true).find(h => h.object.isMesh || h.object.isInstancedMesh);
    let g = hit ? hit.object : null;
    while (g && !parts.includes(g)) g = g.parent;
    setHover(g);
    if (g) {
      tip.innerHTML = '<strong>' + g.userData.name + '</strong><span>' + g.userData.desc + '</span>' +
        (g.userData.drawings.length ? '<em>Click to see its drawing</em>' : '');
      tip.style.left = Math.min(ev.clientX - r.left + 14, r.width - 230) + 'px';
      tip.style.top = Math.max(ev.clientY - r.top - 10, 6) + 'px';
      tip.hidden = false;
      renderer.domElement.style.cursor = 'pointer';
    } else {
      tip.hidden = true;
      renderer.domElement.style.cursor = '';
    }
  }
  function btn(name) { return root.querySelector('[data-r3d="' + name + '"]'); }
  function press(b, on) { if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); }

  const panel = root.querySelector('.r3d-overlay');
  const drawings = document.getElementById('part-drawings');
  function closePanel() { if (panel) panel.hidden = true; }
  function openPanel(g) {
    if (!panel) return;
    panel.querySelector('.r3d-ov-title').textContent = g.userData.name;
    const list = panel.querySelector('.r3d-ov-list');
    list.textContent = '';
    for (const id of g.userData.drawings) {
      const src = drawings && drawings.content.querySelector('[data-id="' + id + '"]');
      if (!src) continue;
      const fig = document.createElement('figure');
      const box = document.createElement('div');
      box.className = 'part-fig';
      box.appendChild(src.querySelector('svg').cloneNode(true));
      const cap = document.createElement('figcaption');
      cap.innerHTML = '<strong>' + src.dataset.name + '</strong>' + src.dataset.size;
      fig.style.animationDelay = (list.children.length * 50) + 'ms';
      fig.append(box, cap); list.appendChild(fig);
    }
    if (!list.children.length) {
      const p = document.createElement('p'); p.className = 'r3d-ov-none';
      p.textContent = 'Off-the-shelf part, no custom drawing.'; list.appendChild(p);
    }
    panel.hidden = false;
  }
  panel?.querySelector('.r3d-close').addEventListener('click', closePanel);
  root.addEventListener('keydown', ev => { if (ev.key === 'Escape') closePanel(); });

  // a click is a press and release without dragging the view
  let down = null;
  renderer.domElement.addEventListener('pointerdown', ev => { down = [ev.clientX, ev.clientY]; });
  renderer.domElement.addEventListener('pointerup', ev => {
    if (!down || Math.hypot(ev.clientX - down[0], ev.clientY - down[1]) > 6) return;
    onPointer(ev);
    if (hovered) { openPanel(hovered); tip.hidden = true; controls.autoRotate = false; press(btn('rotate'), false); }
    else closePanel();
  });

  renderer.domElement.addEventListener('pointermove', onPointer);
  renderer.domElement.addEventListener('pointerdown', onPointer);
  renderer.domElement.addEventListener('pointerleave', () => { setHover(null); tip.hidden = true; });

  press(btn('rotate'), controls.autoRotate); press(btn('drive'), driving);
  btn('rotate')?.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; press(btn('rotate'), controls.autoRotate); });
  btn('explode')?.addEventListener('click', () => { explodeTarget = explodeTarget ? 0 : 1; press(btn('explode'), explodeTarget); });
  btn('drive')?.addEventListener('click', () => { driving = !driving; press(btn('drive'), driving); });
  btn('reset')?.addEventListener('click', () => { camera.position.copy(HOME); controls.target.copy(TARGET); });

  new ResizeObserver(() => {
    renderer.setSize(W(), H());
    fitFov();
  }).observe(canvasBox);

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(root);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    const prev = explode;
    explode += (explodeTarget - explode) * Math.min(1, dt * 5);
    controls.target.y += (explode - prev) * 70;
    for (const g of parts) {
      for (const c of g.children) {
        const off = (c.userData.explode || g.userData.explode).clone().multiplyScalar(explode);
        if (c.userData.base) c.position.copy(c.userData.base).add(off);
      }
    }
    M.purple.opacity = M.clear.opacity = 1 - explode * 0.9;
    M.clear.opacity = 0.55 * (1 - explode * 0.9);
    // forward drive (+x): the ground-contact run moves backward relative to the body
    if (driving) { trackOffset -= dt * 60; placeLinks(trackOffset); }
    controls.update();
    renderer.render(scene, camera);
  });
}
