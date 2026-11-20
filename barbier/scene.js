/* Barberie Valdombre — une seule scène WebGL (un seul canvas, un seul contexte) pour tout le site.
   Chaque « vue » (ouverture, rasoir, fauteuil, tondeuse, peigne + ciseaux) est dessinée dans le
   rectangle de son élément [data-view], uniquement s'il est à l'écran. Modèles construits en code. */
const H = document.documentElement;
const S = window.BARB || (window.BARB = { intro: { t: 99 }, razor: { p: .5 }, chair: { i: 0, n: 8 }, clipper: { p: 0 }, cross: { t: 0 } });
const ready = () => dispatchEvent(new Event('barb-scene'));

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

try {
  if (!hasWebGL()) throw new Error('webgl');
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const { RoundedBoxGeometry } = await import('three/addons/geometries/RoundedBoxGeometry.js');
  start(THREE, RoomEnvironment, RoundedBoxGeometry);
} catch (e) {
  H.classList.add('no-webgl');
  ready();
}

function start(THREE, RoomEnvironment, RoundedBoxGeometry) {
  const RM = H.classList.contains('rm');
  const MOBILE = matchMedia('(max-width: 980px)').matches;
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.75 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const M = THREE.MathUtils;
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const eOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
  const eIn = (t) => Math.pow(clamp01(t), 3);
  const eInOut = (t) => { t = clamp01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const eBack = (t) => { t = clamp01(t); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

  /* ───────── Textures procédurales (canvas) ───────── */
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const woodTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#5b2f17'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      const y = rnd() * h, a = .04 + rnd() * .12, amp = 2 + rnd() * 6, f = .004 + rnd() * .01;
      g.strokeStyle = rnd() > .5 ? `rgba(30,12,4,${a})` : `rgba(190,110,60,${a * .7})`;
      g.lineWidth = .6 + rnd() * 2.4; g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * f + i) * amp);
      g.stroke();
    }
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  const bladeTex = canvasTex(1024, 248, (g, w, h) => {
    // Lame : zone polie près du fil, ligne de meulage, gravure « VALDOMBRE ».
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(.3, '#e9ecef'); gr.addColorStop(.52, '#cfd3d8'); gr.addColorStop(.55, '#a9aeb4'); gr.addColorStop(.58, '#c6cad0'); gr.addColorStop(1, '#b9bec4');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.font = '600 34px Georgia, serif'; g.fillStyle = 'rgba(90,92,96,.75)';
    g.save(); g.translate(w * .4, h * .74); g.textAlign = 'center';
    const txt = 'V A L D O M B R E'; g.fillText(txt, 0, 0);
    g.font = '400 16px Georgia, serif'; g.fillText('P O R T - L U N A I R E', 0, 26); g.restore();
    g.strokeStyle = 'rgba(90,92,96,.5)'; g.lineWidth = 1.5; g.strokeRect(w * .2, h * .58, w * .4, h * .26);
  });
  const tortTex = canvasTex(1024, 384, (g, w, h) => {
    g.fillStyle = '#8a4b17'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const dark = rnd() > .3;
      gr.addColorStop(0, dark ? 'rgba(25,10,3,.9)' : 'rgba(230,160,70,.6)'); gr.addColorStop(1, 'rgba(25,10,3,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * 1.6, r, rnd() * 3, 0, Math.PI * 2); g.fill();
    }
    g.font = '600 30px Georgia, serif'; g.fillStyle = 'rgba(232,200,130,.9)'; g.textAlign = 'center';
    g.fillText('V A L D O M B R E', w / 2, h * .2);
  });
  const leatherBump = canvasTex(256, 256, (g, w, h) => {
    const d = g.createImageData(w, h);
    for (let i = 0; i < d.data.length; i += 4) { const v = 110 + rnd() * 60; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0);
  }, false);
  leatherBump.wrapS = leatherBump.wrapT = THREE.RepeatWrapping; leatherBump.repeat.set(3, 3);
  const blobTex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(.5, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  /* ───────── Matériaux ───────── */
  const mat = {
    steel: new THREE.MeshPhysicalMaterial({ color: 0xf2f4f7, metalness: 1, roughness: .2 }),
    steelSatin: new THREE.MeshPhysicalMaterial({ color: 0xc9cdd2, metalness: 1, roughness: .34 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: .07 }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0xd8ad68, metalness: 1, roughness: .26 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x111112, metalness: .2, roughness: .38, clearcoat: .8, clearcoatRoughness: .2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .9 }),
    wood: new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: .45, clearcoat: .7, clearcoatRoughness: .25 }),
    leather: new THREE.MeshPhysicalMaterial({ color: 0x5a1717, roughness: .5, bumpMap: leatherBump, bumpScale: .6, clearcoat: .35, clearcoatRoughness: .45, sheen: .4, sheenColor: new THREE.Color(0xa04a3a) }),
    button: new THREE.MeshPhysicalMaterial({ color: 0x3a0e0e, roughness: .35, clearcoat: .6 }),
    blade: new THREE.MeshPhysicalMaterial({ map: bladeTex, color: 0xffffff, metalness: 1, roughness: .14 }),
    tort: new THREE.MeshPhysicalMaterial({ map: tortTex, roughness: .25, clearcoat: 1, clearcoatRoughness: .08 }),
  };
  const woodScale = woodTex.clone(); woodScale.repeat.set(1 / 3.1, 1 / .62); woodScale.offset.set(.35 / 3.1, .47 / .62); woodScale.needsUpdate = true;
  mat.scale = new THREE.MeshPhysicalMaterial({ map: woodScale, roughness: .4, clearcoat: .8, clearcoatRoughness: .2 });
  // texture inversée : la gravure se lit à l'endroit sur la face visible
  bladeTex.repeat.set(-1 / 3.1, 1 / .75); bladeTex.offset.set(1 - .4 / 3.1, .1 / .75);
  tortTex.repeat.set(1 / 3.3, 1 / 1.25); tortTex.offset.set(1.65 / 3.3, .8 / 1.25);

  const shadowed = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
  const extrude = (shape, depth, bevel = .012, segs = 2, curveSegs = 24) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: curveSegs });
    g.translate(0, 0, -depth / 2); return g;
  };

  /* ───────── Ciseaux ───────── */
  function makeScissors() {
    const root = new THREE.Group(), halves = [];
    const blade = new THREE.Shape();
    blade.moveTo(-.42, -.01);
    blade.lineTo(2.35, 0);
    blade.quadraticCurveTo(1.6, .13, .75, .2);
    blade.quadraticCurveTo(.15, .26, -.18, .2);
    blade.quadraticCurveTo(-.42, .14, -.42, -.01);
    const bladeGeo = extrude(blade, .04, .012);
    const shank = new THREE.CatmullRomCurve3([new THREE.Vector3(-.3, .04, 0), new THREE.Vector3(-.75, -.05, 0), new THREE.Vector3(-1.15, -.3, 0), new THREE.Vector3(-1.38, -.42, 0)]);
    const shankGeo = new THREE.TubeGeometry(shank, 32, .062, 12);
    const ringGeo = new THREE.TorusGeometry(.3, .068, 18, 48);
    const spur = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.75, -.62, 0), new THREE.Vector3(-1.98, -.86, 0), new THREE.Vector3(-2.2, -.9, 0), new THREE.Vector3(-2.3, -.8, 0)]);
    const spurGeo = new THREE.TubeGeometry(spur, 24, .045, 10);
    for (let k = 0; k < 2; k++) {
      const h = new THREE.Group();
      const b = new THREE.Mesh(bladeGeo, mat.steel); h.add(b);
      const s = new THREE.Mesh(shankGeo, mat.steelSatin); h.add(s);
      const r = new THREE.Mesh(ringGeo, mat.steelSatin); r.position.set(-1.62, -.5, 0); r.scale.set(1.15, .95, 1); h.add(r);
      if (k === 1) h.add(new THREE.Mesh(spurGeo, mat.steelSatin));
      if (k === 1) h.scale.y = -1;
      h.position.z = k ? -.032 : .032;
      root.add(h); halves.push(h);
    }
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .16, 32), mat.brass); screw.rotation.x = Math.PI / 2; root.add(screw);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(.1, .018, 8, 32), mat.brass); cap.position.z = .08; root.add(cap);
    root.userData.open = (v) => { const a = v * .5; halves[0].rotation.z = a; halves[1].rotation.z = -a; };
    root.userData.open(0);
    return root;
  }

  /* ───────── Rasoir coupe-chou ───────── */
  function makeRazor() {
    const root = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(-.3, .02);
    s.lineTo(.42, 0);
    s.quadraticCurveTo(.5, -.06, .62, -.06);
    s.lineTo(2.35, -.06);
    s.quadraticCurveTo(2.62, -.02, 2.61, .26);
    s.quadraticCurveTo(2.6, .56, 2.32, .58);
    s.lineTo(.72, .6);
    s.quadraticCurveTo(.46, .6, .38, .32);
    s.lineTo(.2, .2);
    // crans de pouce sur le talon
    for (let x = .12; x > -.25; x -= .07) { s.lineTo(x, .2); s.lineTo(x - .035, .225); }
    s.lineTo(-.3, .2);
    s.quadraticCurveTo(-.38, .11, -.3, .02);
    const geo = extrude(s, .03, .012, 2, 32);
    geo.translate(0, -.11, 0);
    const blade = new THREE.Mesh(geo, [mat.blade, mat.steel]);
    // dos de lame plus épais
    const sp = new THREE.Shape(); sp.moveTo(.7, .53); sp.lineTo(2.3, .51); sp.quadraticCurveTo(2.5, .5, 2.52, .44); sp.lineTo(2.56, .5); sp.quadraticCurveTo(2.55, .58, 2.32, .58); sp.lineTo(.72, .6); sp.quadraticCurveTo(.6, .6, .55, .55); sp.closePath();
    const spg = extrude(sp, .06, .01); spg.translate(0, -.11, 0);
    const spine = new THREE.Mesh(spg, mat.steelSatin);
    const bladeG = new THREE.Group(); bladeG.add(blade, spine); bladeG.rotation.x = Math.PI;
    const pivot = new THREE.Group(); pivot.add(bladeG); root.add(pivot);
    // Manche : deux plaquettes en bois
    const hs = new THREE.Shape();
    hs.moveTo(-.28, -.16); hs.quadraticCurveTo(-.3, .1, -.06, .12);
    hs.quadraticCurveTo(1.4, .2, 2.7, .1); hs.quadraticCurveTo(2.9, -.16, 2.7, -.42);
    hs.quadraticCurveTo(1.4, -.52, -.06, -.44); hs.quadraticCurveTo(-.3, -.42, -.28, -.16);
    const hg = extrude(hs, .04, .025, 4, 40);
    for (const z of [.075, -.075]) { const m = new THREE.Mesh(hg, mat.scale); m.position.z = z; root.add(m); }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .26, 20), mat.brass); pin.rotation.x = Math.PI / 2; root.add(pin);
    for (const z of [.125, -.125]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .015, 24), mat.brass); w.rotation.x = Math.PI / 2; w.position.z = z; root.add(w); }
    const tail = pin.clone(); tail.position.set(2.62, -.16, 0); root.add(tail);
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(.22, .2, .1), mat.black); wedge.position.set(2.62, -.16, 0); root.add(wedge);
    root.userData.open = (a) => { pivot.rotation.z = -a * Math.PI * 1.04; };
    root.userData.open(0);
    return root;
  }

  /* ───────── Peigne ───────── */
  function makeComb() {
    const s = new THREE.Shape(), L = 1.6, top = .42, tip = -.78, endW = .1;
    s.moveTo(-L, tip); s.lineTo(-L, top - .1); s.quadraticCurveTo(-L, top, -L + .1, top);
    s.lineTo(L - .1, top); s.quadraticCurveTo(L, top, L, top - .1); s.lineTo(L, tip);
    s.quadraticCurveTo(L - endW / 2, tip - .04, L - endW, tip); s.lineTo(L - endW, 0);
    let x = L - endW;
    while (x > -L + endW + .1) {
      const fine = x > 0, pitch = fine ? .085 : .13, w = fine ? .045 : .07, gap = pitch - w;
      x -= gap; s.lineTo(x, 0);
      if (x - w < -L + endW + .02) break;
      s.lineTo(x - w * .2, tip + .03); s.quadraticCurveTo(x - w / 2, tip - .02, x - w * .8, tip + .03); s.lineTo(x - w, 0);
      x -= w;
    }
    s.lineTo(-L + endW, 0); s.lineTo(-L + endW, tip); s.quadraticCurveTo(-L + endW / 2, tip - .04, -L, tip);
    const g = new THREE.Group(); g.add(new THREE.Mesh(extrude(s, .07, .014, 2, 8), mat.tort));
    return g;
  }

  /* ───────── Tondeuse ───────── */
  function makeClipper() {
    const g = new THREE.Group();
    const prof = [[0, 0], [.2, .01], [.29, .08], [.32, .3], [.33, .9], [.36, 1.5], [.42, 2.0], [.46, 2.32], [.45, 2.48], [.38, 2.56], [0, 2.58]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), mat.black); body.scale.set(1.2, 1, .8); g.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(.43, .022, 12, 64), mat.brass); band.rotation.x = Math.PI / 2; band.position.y = 1.98; band.scale.set(1.2, .8, 1); g.add(band);
    for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(.33 + i * .004, .014, 8, 48), mat.brass); r.rotation.x = Math.PI / 2; r.position.y = .45 + i * .11; r.scale.set(1.2, .8, 1); g.add(r); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .06, 32), mat.brass); cap.position.y = .01; g.add(cap);
    const plate = new THREE.Mesh(new RoundedBoxGeometry(1.06, .16, .5, 3, .04), mat.chrome); plate.position.y = 2.62; g.add(plate);
    const teethG = new THREE.BoxGeometry(.028, .2, .09);
    const fixed = new THREE.InstancedMesh(teethG, mat.chrome, 24), moving = new THREE.InstancedMesh(teethG, mat.brass, 22);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 24; i++) { m4.makeTranslation(-.5 + i * (1 / 23), 2.78, .1); fixed.setMatrixAt(i, m4); }
    for (let i = 0; i < 22; i++) { m4.makeTranslation(-.46 + i * (.92 / 21), 2.74, -.02); moving.setMatrixAt(i, m4); }
    g.add(fixed); const mv = new THREE.Group(); mv.add(moving); g.add(mv);
    const sw = new THREE.Mesh(new RoundedBoxGeometry(.16, .34, .08, 3, .03), mat.chrome); sw.position.set(0, 1.45, .29); g.add(sw);
    const lever = new THREE.Mesh(new RoundedBoxGeometry(.08, .55, .07, 3, .03), mat.brass); lever.position.set(.55, 2.1, 0); lever.rotation.z = -.25; g.add(lever);
    const lp = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .09, 20), mat.chrome); lp.rotation.z = Math.PI / 2; lp.position.set(.5, 2.32, 0); g.add(lp);
    g.userData.buzz = (v) => { mv.position.x = v; };
    return g;
  }

  /* ───────── Fauteuil de barbier ───────── */
  function makeChair() {
    const g = new THREE.Group(), top = new THREE.Group();
    const baseProf = [[0, 0], [1.02, 0], [1.06, .035], [1.03, .09], [.9, .13], [.4, .19], [.22, .28], [0, .3]].map(([r, y]) => new THREE.Vector2(r, y));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(baseProf, 72), mat.chrome));
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, 1.0, 32), mat.chrome); col.position.y = .78; g.add(col);
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .25, .32, 32), mat.black); boot.position.y = .42; g.add(boot);
    const pedal = new THREE.Mesh(new RoundedBoxGeometry(.7, .05, .14, 2, .02), mat.chrome); pedal.position.set(.45, .36, .12); pedal.rotation.z = .12; g.add(pedal);
    const pad = new THREE.Mesh(new RoundedBoxGeometry(.24, .05, .2, 2, .02), mat.rubber); pad.position.set(.78, .41, .12); g.add(pad);
    g.add(top);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(1.5, .12, 1.4, 3, .04), mat.black); frame.position.y = 1.3; top.add(frame);
    const trim = new THREE.Mesh(new RoundedBoxGeometry(1.53, .04, 1.43, 3, .02), mat.chrome); trim.position.y = 1.36; top.add(trim);
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.42, .3, 1.32, 5, .13), mat.leather); seat.position.y = 1.52; top.add(seat);
    const back = new THREE.Group(); back.position.set(0, 1.62, -.6); back.rotation.x = -.2; top.add(back);
    const bp = new THREE.Mesh(new RoundedBoxGeometry(1.36, 1.6, .3, 5, .13), mat.leather); bp.position.y = .82; back.add(bp);
    const shell = new THREE.Mesh(new RoundedBoxGeometry(1.44, 1.66, .1, 3, .04), mat.black); shell.position.set(0, .82, -.18); back.add(shell);
    const btnG = new THREE.SphereGeometry(.035, 12, 8);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const b = new THREE.Mesh(btnG, mat.button); b.position.set((c - 1) * .38 + (r % 2 ? .19 : 0) * (c < 2 ? 1 : 0), .3 + r * .34, .145); b.scale.z = .5; if (!(r % 2 && c === 2)) back.add(b); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .5, 16), mat.chrome); rod.position.set(0, 1.78, -.1); back.add(rod);
    const head = new THREE.Mesh(new RoundedBoxGeometry(.8, .3, .24, 4, .1), mat.leather); head.position.set(0, 2.02, -.02); back.add(head);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new RoundedBoxGeometry(.24, .1, 1.3, 3, .045), mat.wood); arm.position.set(sx * .88, 2.0, .02); top.add(arm);
      const c1 = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * .74, 1.36, .5), new THREE.Vector3(sx * .86, 1.62, .58), new THREE.Vector3(sx * .88, 1.95, .5)]);
      const c2 = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * .74, 1.36, -.45), new THREE.Vector3(sx * .84, 1.7, -.42), new THREE.Vector3(sx * .88, 1.95, -.4)]);
      for (const c of [c1, c2]) top.add(new THREE.Mesh(new THREE.TubeGeometry(c, 20, .035, 10), mat.chrome));
      const side = new THREE.Mesh(new RoundedBoxGeometry(.06, .5, 1.0, 2, .025), mat.leather); side.position.set(sx * .74, 1.62, 0); top.add(side);
    }
    const fr = new THREE.Group(); fr.position.set(0, 1.3, .72); top.add(fr);
    const fc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -.35, .15), new THREE.Vector3(0, -.72, .42)]);
    for (const sx of [-.4, .4]) { const t = new THREE.Mesh(new THREE.TubeGeometry(fc, 16, .03, 10), mat.chrome); t.position.x = sx; fr.add(t); }
    const foot = new THREE.Mesh(new RoundedBoxGeometry(1.0, .05, .42, 2, .02), mat.chrome); foot.position.set(0, -.74, .5); foot.rotation.x = .22; fr.add(foot);
    for (let i = 0; i < 5; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(.9, .02, .03), mat.rubber); rib.position.set(0, -.71 + i * .016, .36 + i * .07); rib.rotation.x = .22; fr.add(rib); }
    g.userData.top = top;
    return shadowed(g);
  }

  /* ───────── Lumières studio ───────── */
  function studio(scene, { shadow = false, warm = 0xffe6c7, key = 3.2, rim = 2.2, fill = .5, size = 4 } = {}) {
    scene.environment = ENV; scene.environmentIntensity = .85;
    const k = new THREE.DirectionalLight(warm, key); k.position.set(-4, 7, 5); scene.add(k);
    if (shadow) {
      k.castShadow = true; k.shadow.mapSize.set(MOBILE ? 512 : 1024, MOBILE ? 512 : 1024); k.shadow.radius = 6; k.shadow.bias = -.0004; k.shadow.normalBias = .02;
      Object.assign(k.shadow.camera, { left: -size, right: size, top: size, bottom: -size, near: .5, far: 25 });
    }
    const r = new THREE.DirectionalLight(0xbcd2ff, rim); r.position.set(5, 3, -5); scene.add(r);
    scene.add(new THREE.HemisphereLight(0xfff1dc, 0x1a120a, fill));
    return k;
  }
  function ground(scene, y, opacity = .45, size = 14) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity }));
    p.rotation.x = -Math.PI / 2; p.position.y = y; p.receiveShadow = true; scene.add(p);
    return p;
  }
  function blob(scene, y, w, d) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; p.position.y = y; scene.add(p); return p;
  }
  const fitDist = (r, cam) => { const vf = M.degToRad(cam.fov) / 2, hf = Math.atan(Math.tan(vf) * cam.aspect); return r / Math.sin(Math.min(vf, hf)); };

  /* ───────── Vues ───────── */
  const views = [];
  const addView = (name, setup) => { const el = document.querySelector(`[data-view="${name}"]`); if (!el) return; const v = { el, ...setup() }; views.push(v); };

  // 1. Ouverture
  addView('intro', () => {
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, .1, 100); cam.position.set(0, 0, 10);
    studio(scene, { key: 4, rim: 3.5, fill: .25 });
    const spot = new THREE.PointLight(0xfff0d0, 30, 12); spot.position.set(0, 1.5, 4); scene.add(spot);
    const sc = makeScissors(); scene.add(sc);
    const rz = makeRazor(); rz.userData.open(1); scene.add(rz);
    return { scene, cam, update(t) {
      const T = S.intro.t;
      const halfH = Math.tan(M.degToRad(cam.fov / 2)) * cam.position.z, halfW = halfH * cam.aspect;
      const s = M.clamp(halfW / 3.3, .46, .8);
      // ciseaux : arrivent d'en haut à droite, s'ouvrent, coupent à 1,38 s, repartent
      sc.visible = T > .2 && T < 2.3;
      if (sc.visible) {
        sc.scale.setScalar(s);
        const a = eOut((T - .25) / .95), b = eIn((T - 1.55) / .65);
        const px = .1 * s, py = 1.05 * s;
        sc.position.set(M.lerp(halfW + 3 * s, px, a) + M.lerp(0, -halfW - 3 * s, b), M.lerp(halfH + 2.6 * s, py, a) + M.lerp(0, halfH + 1.5 * s, b), 0);
        sc.rotation.set(.22, .5 * (1 - a) + .12 + b * .6, -Math.PI / 2 + (1 - a) * .9 + b * 1.8);
        let o = 0;
        if (T < 1.18) o = eOut((T - .5) / .6); else if (T < 1.38) o = 1 - eIn((T - 1.18) / .2); else o = eOut((T - 1.6) / .3) * .6;
        sc.userData.open(o);
        if (T > 1.38 && T < 1.5) sc.position.x += Math.sin(T * 120) * .02;
      }
      // rasoir : un trait de gauche à droite devant le titre, le reflet suit
      rz.visible = T > 1.95 && T < 3.1;
      if (rz.visible) {
        const c = eInOut((T - 2.0) / 1.0);
        rz.scale.setScalar(s * .9);
        rz.position.set(M.lerp(-halfW - 3.4 * s, halfW + 3.4 * s, c), -.15 * s + Math.sin(c * Math.PI) * .12, 1.2);
        rz.rotation.set(.5, -.35 + c * .7, -.12);
      }
      void t;
    } };
  });

  // 2. Rituel : rasoir épinglé
  addView('razor', () => {
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
    studio(scene, { shadow: true, size: 3.5 });
    ground(scene, -1.45, .5);
    const rz = shadowed(makeRazor()); const inner = new THREE.Group(); inner.add(rz); scene.add(inner);
    let d0 = 10;
    return { scene, cam, update(t) {
      const p = S.razor.p, op = sstep(.06, .42, p);
      rz.userData.open(op);
      rz.position.x = -M.lerp(1.25, .1, op);
      const idle = RM ? 0 : Math.sin(t * .7) * .05;
      // la lame s'ouvre, puis le rasoir pivote pour montrer le fil et la gravure
      inner.rotation.set(.55 - p * .3 + idle * .4, -.4 + p * .95 + Math.sin(p * Math.PI * 2) * .25, M.lerp(.45, -.12, sstep(0, .6, p)));
      inner.position.y = .2 + idle;
      const zoom = 1 - .1 * sstep(.45, .62, p) * (1 - sstep(.8, .97, p));
      d0 = fitDist(M.lerp(2.0, 3.25, op), cam);
      cam.position.set(0, 1.2, d0 * zoom); cam.lookAt(0, -.05, 0);
    } };
  });

  // 3. Tarifs : fauteuil qui pivote vers la prestation
  addView('chair', () => {
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(28, 1, .1, 100);
    studio(scene, { shadow: true, size: 3, key: 3.4 });
    ground(scene, 0, .5);
    const ch = makeChair(); scene.add(ch);
    let ang = -2.6, vel = 0, hy = 0;
    return { scene, cam, update(t, dt) {
      const n = Math.max(2, S.chair.n), f = S.chair.i / (n - 1);
      const target = M.lerp(-.95, .95, f) + (MOBILE ? 0 : -.35);
      if (RM) { ang = target; } else { vel += (target - ang) * 60 * dt; vel *= Math.pow(.02, dt); ang += vel * dt; }
      ch.rotation.y = ang;
      ch.position.x = MOBILE ? .85 : 0;
      hy = RM ? (1 - f) * .14 : M.damp(hy, (1 - f) * .14, 5, dt);
      ch.userData.top.position.y = hy;
      const d = fitDist(2.0, cam);
      cam.position.set(0, 3.2, d * 1.05); cam.lookAt(0, 1.45, 0);
      void t;
    } };
  });

  // 4. Galerie : tondeuse
  addView('clipper', () => {
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100);
    studio(scene, { key: 3.4, rim: 3 });
    const cl = makeClipper(); cl.position.y = -1.3; const g = new THREE.Group(); g.add(cl); scene.add(g);
    const sh = blob(scene, -1.45, 2.8, 1.3);
    let last = 0, vib = 0;
    return { scene, cam, update(t, dt) {
      const p = S.clipper.p, v = Math.abs(p - last) / Math.max(dt, .001); last = p;
      vib = RM ? 0 : M.damp(vib, Math.min(v * .4, 1), 8, dt);
      g.rotation.set(.0, -.6 + p * Math.PI * 2, Math.PI / 2 - .35 + (RM ? 0 : Math.sin(t * .8) * .05));
      g.position.set(Math.sin(t * 90) * .012 * vib, (RM ? 0 : Math.sin(t * 1.1) * .06) + .25, 0);
      cl.userData.buzz(Math.sin(t * 160) * .02 * (vib + .05));
      sh.scale.setScalar(1 - g.position.y * .2);
      cam.position.set(0, .6, fitDist(1.75, cam)); cam.lookAt(0, .1, 0);
    } };
  });

  // 5. Validation : peigne et ciseaux se croisent
  addView('cross', () => {
    const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .1, 100); cam.position.set(0, 0, 11);
    studio(scene, { key: 3.6, rim: 3 });
    const comb = makeComb(), sc = makeScissors();
    const sci = new THREE.Group(); sc.position.x = -.05; sci.add(sc);
    scene.add(comb, sci);
    return { scene, cam, update(t) {
      const T = S.cross.t;
      comb.visible = sci.visible = T > 0;
      const f = eBack(T / .42), w = Math.min(1, cam.aspect);
      const k = w < .9 ? .8 : 1;
      comb.scale.setScalar(k); sci.scale.setScalar(k * .92);
      comb.position.set(M.lerp(-8, 0, f), M.lerp(-1, 0, f), -.25);
      comb.rotation.set(.25 * (1 - f), M.lerp(-1.2, 0, f), M.lerp(2.2, -Math.PI / 4, f));
      sci.position.set(M.lerp(8, .15, f), M.lerp(1, 0, f), .25);
      sci.rotation.set(-.2 * (1 - f), M.lerp(1.2, 0, f), M.lerp(-2.2, Math.PI / 4, f) + Math.PI / 2 - Math.PI / 2);
      let o = .35 * (1 - sstep(.3, .45, T));
      o += Math.max(0, Math.sin(clamp01((T - .5) / .14) * Math.PI)) * .7 + Math.max(0, Math.sin(clamp01((T - .68) / .14) * Math.PI)) * .7;
      sc.userData.open(o);
      const idle = RM || T < 1 ? 0 : Math.sin(t * .9) * .12;
      scene.rotation.y = idle; scene.position.y = (T >= 1 && !RM) ? Math.sin(t * 1.3) * .08 : 0;
      if (T > .4 && T < .5) scene.position.x = Math.sin(T * 200) * .04; else scene.position.x = 0;
      cam.position.z = fitDist(2.15, cam);
    } };
  });

  /* ───────── Boucle : on ne dessine que les vues visibles ───────── */
  let W = innerWidth, Hh = innerHeight, dirty = true, prev = performance.now(), firstFrame = true;
  const onResize = () => { W = innerWidth; Hh = innerHeight; renderer.setSize(W, Hh); dirty = true; };
  addEventListener('resize', onResize);
  let lastState = '';
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000); prev = now;
    const t = now / 1000;
    const vis = [];
    for (const v of views) {
      if (!v.el.isConnected) continue;
      if (S.intro.on && v.el.dataset.view !== 'intro') continue;
      const r = v.el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > Hh || r.right < 0 || r.left > W) continue;
      vis.push([v, r]);
    }
    // En mouvement réduit : on redessine seulement si quelque chose a changé.
    const state = vis.map(([v, r]) => v.el.dataset.view + (r.top | 0) + ',' + (r.left | 0)).join('|') + S.chair.i + S.cross.t + S.razor.p;
    const busy = !RM || state !== lastState || dirty;
    lastState = state;
    if (!vis.length) { if (dirty || prevCount) { renderer.setScissorTest(false); renderer.clear(); } prevCount = 0; dirty = false; return; }
    if (!busy && !firstFrame) return;
    prevCount = vis.length; dirty = false;
    renderer.setScissorTest(false); renderer.clear();
    renderer.setScissorTest(true);
    for (const [v, r] of vis) {
      const x = Math.round(r.left), y = Math.round(Hh - r.bottom), w = Math.round(r.width), h = Math.round(r.height);
      renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
      v.cam.aspect = w / h; v.cam.updateProjectionMatrix();
      v.update(t, dt);
      renderer.render(v.scene, v.cam);
    }
    if (firstFrame) { firstFrame = false; }
  }
  let prevCount = 0;
  // Préchauffage : un vrai rendu de chaque vue dans une petite cible hors écran (shaders compilés,
  // textures envoyées), pour qu'aucun à-coup ne tombe pendant l'ouverture.
  const t0 = performance.now();
  const rt = new THREE.WebGLRenderTarget(32, 32);
  renderer.setRenderTarget(rt);
  for (const v of views) {
    v.scene.traverse((o) => { o.visible = true; });
    v.cam.aspect = 1; v.cam.updateProjectionMatrix();
    renderer.render(v.scene, v.cam);
  }
  renderer.setRenderTarget(null); rt.dispose();
  window.__warm = Math.round(performance.now() - t0);
  requestAnimationFrame(frame);
  window.__scene = { renderer, views };
  ready();
}
