import {
  BUILDINGS_DATA,
  PLATFORMS_DATA,
  ROADS_DATA,
  BOUNDARY_POLYGON,
  PROJECT_METADATA,
  SITE_AXIS_ANGLE,
} from './pzuData';

/**
 * Generates a complete, self-contained, monolithic index.html file
 * using Three.js & OrbitControls via CDN (unpkg.com) that runs immediately
 * on double-click in any browser without a bundler or external local files.
 */
export function generateStandaloneIndexHtml(): string {
  const serializedBuildings = JSON.stringify(BUILDINGS_DATA, null, 2);
  const serializedPlatforms = JSON.stringify(PLATFORMS_DATA, null, 2);
  const serializedRoads = JSON.stringify(ROADS_DATA, null, 2);
  const serializedBoundary = JSON.stringify(BOUNDARY_POLYGON, null, 2);
  const serializedMeta = JSON.stringify(PROJECT_METADATA, null, 2);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>3D-Макет ПЗУ — ${PROJECT_METADATA.code} (Автономная версия)</title>
  <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.170.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.170.0/examples/jsm/"
      }
    }
  </script>
  <style>
    :root {
      --bg-dark: #0d1219;
      --panel-bg: rgba(15, 23, 34, 0.94);
      --border: rgba(148, 163, 184, 0.22);
      --accent: #38bdf8;
      --amber: #f59e0b;
      --text: #f1f5f9;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%; height: 100%; overflow: hidden;
      background: var(--bg-dark);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    }
    #canvas-container {
      position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 1;
    }
    .top-badge {
      position: fixed; top: 16px; left: 16px; z-index: 10;
      background: var(--panel-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 16px;
      max-width: 520px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.45);
    }
    .top-badge h1 {
      font-size: 14px; font-weight: 700; letter-spacing: 0.01em; color: #fff;
      margin-bottom: 4px;
    }
    .top-badge p {
      font-size: 12px; color: var(--muted); line-height: 1.4;
    }
    .legend-row {
      display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px;
      font-size: 11px; color: #cbd5e1;
    }
    .legend-item {
      display: inline-flex; align-items: center; gap: 6px;
    }
    .swatch {
      width: 12px; height: 4px; border-radius: 2px; display: inline-block;
    }
    .bottom-dock {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      z-index: 10;
      background: var(--panel-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 14px;
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      max-width: min(940px, 95vw);
      box-shadow: 0 16px 40px rgba(0,0,0,0.55);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bottom-dock.collapsed {
      transform: translate(-50%, calc(100% + 12px));
    }
    .dock-toggle {
      position: absolute; top: -30px; left: 50%; transform: translateX(-50%);
      background: var(--panel-bg);
      border: 1px solid var(--border);
      border-bottom: none;
      color: var(--muted);
      font-size: 11px; font-weight: 600;
      padding: 5px 14px; border-radius: 8px 8px 0 0;
      cursor: pointer;
    }
    .dock-toggle:hover { color: #fff; }
    .btn {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 13px;
      border-radius: 8px;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .btn:hover { background: rgba(51, 65, 85, 0.95); border-color: var(--accent); }
    .btn.active {
      background: #0284c7; border-color: #38bdf8; color: #fff;
    }
    .divider {
      width: 1px; height: 24px; background: var(--border);
    }
    #tooltip-card {
      position: fixed; top: 16px; right: 16px; z-index: 20;
      width: 340px;
      background: var(--panel-bg);
      border: 1px solid rgba(56, 189, 248, 0.45);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.6);
      display: none;
    }
    #tooltip-card.visible { display: block; }
    .tt-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 8px; margin-bottom: 8px;
    }
    .tt-code {
      font-family: monospace; font-size: 12px; font-weight: 700;
      color: var(--amber);
    }
    .tt-close {
      background: transparent; border: none; color: var(--muted);
      font-size: 16px; cursor: pointer; line-height: 1;
    }
    .tt-title { font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .tt-meta {
      font-family: monospace; font-size: 11px; color: #38bdf8;
      margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
    }
    .tt-desc { font-size: 12px; color: #cbd5e1; line-height: 1.45; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>

  <div class="top-badge">
    <h1>${PROJECT_METADATA.code} · Разбивочный план площадки (3D ГИС)</h1>
    <p>${PROJECT_METADATA.stage1} · ${PROJECT_METADATA.stage2}</p>
    <p style="margin-top:2px;">Кадастровый №: <b>${PROJECT_METADATA.cadastralMain}</b> · Уклон террасы: <b>585.0 – 596.2 м</b></p>
    <div class="legend-row">
      <span class="legend-item"><span class="swatch" style="background:#ef4444"></span>Запретная зона (охранная)</span>
      <span class="legend-item"><span class="swatch" style="background:#d97706"></span>Дороги (тип I)</span>
      <span class="legend-item"><span class="swatch" style="background:#94a3b8"></span>Площадки ПАГ-14 (тип III)</span>
      <span class="legend-item"><span class="swatch" style="background:#38bdf8"></span>Канавы (тип III, 1:20)</span>
    </div>
  </div>

  <div id="tooltip-card">
    <div class="tt-header">
      <span class="tt-code" id="tt-code">Поз. 2.16.1</span>
      <button class="tt-close" id="tt-close" title="Закрыть">✕</button>
    </div>
    <div class="tt-title" id="tt-title">Наименование</div>
    <div class="tt-meta" id="tt-dims">Габариты</div>
    <div class="tt-desc" id="tt-purpose">Назначение</div>
  </div>

  <div class="bottom-dock" id="bottom-dock">
    <button class="dock-toggle" id="dock-toggle">▾ Скрыть управление</button>
    <button class="btn active" id="btn-iso">Изометрия 3D</button>
    <button class="btn" id="btn-top">Вид сверху (2D план)</button>
    <button class="btn" id="btn-tour">Презентационный тур</button>
    <div class="divider"></div>
    <button class="btn" id="btn-clay">Стиль: Архитектурный макет</button>
    <button class="btn" id="btn-contours">Изолинии: Вкл</button>
  </div>

  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

    const BUILDINGS = ${serializedBuildings};
    const PLATFORMS = ${serializedPlatforms};
    const ROADS = ${serializedRoads};
    const BOUNDARY = ${serializedBoundary};
    const META = ${serializedMeta};
    const SITE_ANGLE = ${SITE_AXIS_ANGLE};

    function getElevationAt(x, z) {
      const swProj = (-x * 0.78 + z * 0.62) / 215;
      const base = 591.2 + swProj * 5.2;
      const wave = Math.sin(x * 0.018 + z * 0.012) * 0.38 + Math.cos(x * 0.011 - z * 0.02) * 0.24;
      return Math.max(584.5, Math.min(596.8, base + wave));
    }

    const EXAGGERATION = 1.65;
    function getSceneY(x, z) {
      return (getElevationAt(x, z) - 585.0) * EXAGGERATION;
    }

    const container = document.getElementById('canvas-container');
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d131c);
    scene.fog = new THREE.FogExp2(0x0d131c, 0.0014);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 1600);
    camera.position.set(-180, 175, 220);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 25;
    controls.maxDistance = 650;
    controls.target.set(10, 8, 10);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.2);
    sunLight.position.set(160, 240, 140);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    const d = 220;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 650;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Procedural Topographic Texture
    function createTopoTexture(isClay) {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = isClay ? '#e2dfd7' : '#141e2b';
      ctx.fillRect(0, 0, 1024, 1024);

      ctx.strokeStyle = isClay ? 'rgba(100, 116, 139, 0.22)' : 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      const step = 32;
      for (let i = 0; i <= 1024; i += step) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    }

    // Ground Mesh with Elevation
    const groundGeo = new THREE.PlaneGeometry(520, 520, 120, 120);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      posAttr.setY(i, getSceneY(vx, vz));
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      map: createTopoTexture(false),
      roughness: 0.88,
      metalness: 0.08,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // 3D Contour Isolines (585 .. 596 m)
    const contoursGroup = new THREE.Group();
    scene.add(contoursGroup);
    for (let elev = 585; elev <= 596; elev++) {
      const pts = [];
      for (let s = -220; s <= 220; s += 6) {
        const swTarget = (elev - 591.2) / 5.2;
        const x = -swTarget * 165 + s * 0.62;
        const z = swTarget * 130 + s * 0.78;
        if (Math.abs(x) <= 230 && Math.abs(z) <= 230) {
          pts.push(new THREE.Vector3(x, getSceneY(x, z) + 0.18, z));
        }
      }
      if (pts.length > 1) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const isMajor = elev % 5 === 0 || elev === 585 || elev === 596;
        const lineMat = new THREE.LineBasicMaterial({
          color: isMajor ? 0x38bdf8 : 0x475569,
          transparent: true,
          opacity: isMajor ? 0.75 : 0.4,
        });
        contoursGroup.add(new THREE.Line(lineGeo, lineMat));
      }
    }

    // Platforms (Type III — PAG-14 Concrete Pads)
    PLATFORMS.forEach((p) => {
      const geo = new THREE.PlaneGeometry(p.width, p.length, 12, 16);
      geo.rotateX(-Math.PI / 2);
      const posA = geo.attributes.position;
      const cosR = Math.cos(p.rotationY);
      const sinR = Math.sin(p.rotationY);
      for (let i = 0; i < posA.count; i++) {
        const lx = posA.getX(i);
        const lz = posA.getZ(i);
        const wx = p.x + lx * cosR + lz * sinR;
        const wz = p.z - lx * sinR + lz * cosR;
        posA.setY(i, getSceneY(wx, wz) + 0.26);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3b4654,
        roughness: 0.8,
        metalness: 0.15,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = p.rotationY;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    function createTerrainRibbon(curve2d, steps, halfWidth, yOffset) {
      const sampled = curve2d.getPoints(steps);
      const positions = new Float32Array((steps + 1) * 2 * 3);
      const indices = [];
      for (let i = 0; i <= steps; i++) {
        const curr = sampled[i];
        const prev = sampled[Math.max(0, i - 1)];
        const next = sampled[Math.min(steps, i + 1)];
        let tx = next.x - prev.x;
        let tz = next.z - prev.z;
        const len = Math.hypot(tx, tz) || 1;
        tx /= len; tz /= len;
        const nx = -tz, nz = tx;
        const lx = curr.x + nx * halfWidth, lz = curr.z + nz * halfWidth;
        const rx = curr.x - nx * halfWidth, rz = curr.z - nz * halfWidth;
        const vIdx = i * 6;
        positions[vIdx] = lx; positions[vIdx + 1] = getSceneY(lx, lz) + yOffset; positions[vIdx + 2] = lz;
        positions[vIdx + 3] = rx; positions[vIdx + 4] = getSceneY(rx, rz) + yOffset; positions[vIdx + 5] = rz;
        if (i < steps) {
          const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
          indices.push(a, b, c, b, d, c);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    }

    // Roads (Type I) & Drainage Ditches (Type III)
    ROADS.forEach((r) => {
      const flatPts = r.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
      const curve = new THREE.CatmullRomCurve3(flatPts, !!r.closed, 'catmullrom', 0.22);
      const segments = Math.max(80, flatPts.length * 24);
      const ribbonGeo = createTerrainRibbon(curve, segments, r.width * 0.5, r.type === 'road_type_1' ? 0.42 : 0.36);
      const mat = new THREE.MeshStandardMaterial({
        color: r.type === 'road_type_1' ? 0xd97706 : 0x0ea5e9,
        roughness: r.type === 'road_type_1' ? 0.75 : 0.4,
        metalness: 0.1,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(ribbonGeo, mat);
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // Forbidden Zone Perimeter & Fence Posts
    const boundaryPts = BOUNDARY.map((v) => new THREE.Vector3(v.x, getSceneY(v.x, v.z) + 0.9, v.z));
    boundaryPts.push(boundaryPts[0].clone());
    const fenceLineGeo = new THREE.BufferGeometry().setFromPoints(boundaryPts);
    const fenceLineMat = new THREE.LineDashedMaterial({
      color: 0xef4444,
      dashSize: 3.5,
      gapSize: 1.5,
    });
    const fenceLine = new THREE.Line(fenceLineGeo, fenceLineMat);
    fenceLine.computeLineDistances();
    scene.add(fenceLine);

    const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.2, 6);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.6 });
    const triGeo = new THREE.ConeGeometry(0.65, 1.1, 3);
    const triMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, roughness: 0.3 });

    for (let i = 0; i < BOUNDARY.length; i++) {
      const a = BOUNDARY[i];
      const b = BOUNDARY[(i + 1) % BOUNDARY.length];
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const count = Math.max(2, Math.floor(dist / 12));
      for (let k = 0; k < count; k++) {
        const t = k / count;
        const px = a.x + (b.x - a.x) * t;
        const pz = a.z + (b.z - a.z) * t;
        const py = getSceneY(px, pz);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, py + 1.1, pz);
        scene.add(post);

        if (k % 2 === 0) {
          const tri = new THREE.Mesh(triGeo, triMat);
          tri.position.set(px, py + 2.4, pz);
          tri.rotation.z = Math.PI;
          scene.add(tri);
        }
      }
    }

    // Composite 3D Buildings with EdgesGeometry & Labels
    const clickableMeshes = [];

    function createLabelSprite(text, isHighlight) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = isHighlight ? 'rgba(245, 158, 11, 0.95)' : 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = isHighlight ? '#fef08a' : '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 244, 52, 10);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = isHighlight ? '#0f172a' : '#f8fafc';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(14, 3.5, 1);
      return sprite;
    }

    BUILDINGS.forEach((b) => {
      const group = new THREE.Group();
      const baseY = getSceneY(b.x, b.z) + 0.5;
      group.position.set(b.x, baseY, b.z);
      group.rotation.y = b.rotationY;

      const bodyMat = new THREE.MeshStandardMaterial({
        color: b.colorHex,
        roughness: 0.45,
        metalness: 0.45,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.65,
        metalness: 0.3,
      });

      const bodyGeo = new THREE.BoxGeometry(b.width, b.height, b.length);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = b.height * 0.5;
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.userData = { building: b, group };
      group.add(bodyMesh);
      clickableMeshes.push(bodyMesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bodyGeo),
        new THREE.LineBasicMaterial({ color: b.accentHex })
      );
      bodyMesh.add(edges);

      if (b.roofType === 'gabled') {
        const roofShape = new THREE.Shape();
        const hw = b.width * 0.54;
        const rh = Math.min(2.4, b.width * 0.25);
        roofShape.moveTo(-hw, 0);
        roofShape.lineTo(0, rh);
        roofShape.lineTo(hw, 0);
        roofShape.closePath();
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: b.length + 0.6, bevelEnabled: false });
        roofGeo.translate(0, b.height, -(b.length + 0.6) * 0.5);
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.castShadow = true;
        group.add(roofMesh);
        const rEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(roofGeo),
          new THREE.LineBasicMaterial({ color: b.accentHex, transparent: true, opacity: 0.7 })
        );
        roofMesh.add(rEdges);
      }

      if (b.hasBerm) {
        const bermGeo = new THREE.BoxGeometry(b.width + 8, 3.2, b.length + 8);
        const bermMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.05 });
        const berm = new THREE.Mesh(bermGeo, bermMat);
        berm.position.y = 1.6;
        group.add(berm);
      }

      const sprite = createLabelSprite(b.blueprintTag || b.code, b.category === 'warehouse_long');
      sprite.position.set(0, b.height + 5.2, 0);
      group.add(sprite);

      scene.add(group);
    });

    // Raycasting & Tooltip
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('tooltip-card');
    let selectedMesh = null;

    window.addEventListener('pointerdown', (e) => {
      if (e.target !== renderer.domElement) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (selectedMesh) {
        selectedMesh.material.emissive.setHex(0x000000);
      }
      if (hits.length > 0) {
        selectedMesh = hits[0].object;
        selectedMesh.material.emissive.setHex(0x1e3a8a);
        const b = selectedMesh.userData.building;
        document.getElementById('tt-code').textContent = 'Поз. ' + b.code + (b.blueprintTag ? ' · ' + b.blueprintTag : '');
        document.getElementById('tt-title').textContent = b.name;
        document.getElementById('tt-dims').textContent = b.dimensionsText + ' · Отм. ' + b.elevation.toFixed(2) + ' м';
        document.getElementById('tt-purpose').textContent = b.purpose;
        tooltip.classList.add('visible');
      }
    });

    document.getElementById('tt-close').addEventListener('click', () => {
      tooltip.classList.remove('visible');
      if (selectedMesh) selectedMesh.material.emissive.setHex(0x000000);
    });

    // Camera Modes & UI
    let cameraMode = 'iso';
    let targetCamPos = new THREE.Vector3(-180, 175, 220);
    let targetLookAt = new THREE.Vector3(10, 8, 10);
    let transitioning = false;

    const btnIso = document.getElementById('btn-iso');
    const btnTop = document.getElementById('btn-top');
    const btnTour = document.getElementById('btn-tour');

    function setActiveBtn(btn) {
      [btnIso, btnTop, btnTour].forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }

    btnIso.addEventListener('click', () => {
      cameraMode = 'iso';
      controls.autoRotate = false;
      targetCamPos.set(-180, 175, 220);
      targetLookAt.set(10, 8, 10);
      transitioning = true;
      setActiveBtn(btnIso);
    });

    btnTop.addEventListener('click', () => {
      cameraMode = 'top';
      controls.autoRotate = false;
      targetCamPos.set(0, 390, 0.1);
      targetLookAt.set(0, 6, 0);
      transitioning = true;
      setActiveBtn(btnTop);
    });

    btnTour.addEventListener('click', () => {
      cameraMode = 'tour';
      transitioning = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.6;
      setActiveBtn(btnTour);
    });

    controls.addEventListener('start', () => {
      transitioning = false;
      if (cameraMode === 'tour') {
        cameraMode = 'iso';
        controls.autoRotate = false;
        setActiveBtn(btnIso);
      }
    });

    let isClay = false;
    document.getElementById('btn-clay').addEventListener('click', (e) => {
      isClay = !isClay;
      scene.background.setHex(isClay ? 0xe5e5e0 : 0x0d131c);
      scene.fog.color.setHex(isClay ? 0xe5e5e0 : 0x0d131c);
      groundMat.map = createTopoTexture(isClay);
      groundMat.needsUpdate = true;
      e.target.textContent = isClay ? 'Стиль: Инженерный ГИС' : 'Стиль: Архитектурный макет';
    });

    document.getElementById('btn-contours').addEventListener('click', (e) => {
      contoursGroup.visible = !contoursGroup.visible;
      e.target.textContent = contoursGroup.visible ? 'Изолинии: Вкл' : 'Изолинии: Выкл';
    });

    const dock = document.getElementById('bottom-dock');
    document.getElementById('dock-toggle').addEventListener('click', (e) => {
      dock.classList.toggle('collapsed');
      e.target.textContent = dock.classList.contains('collapsed') ? '▴ Показать управление' : '▾ Скрыть управление';
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (transitioning) {
        const k = 1 - Math.exp(-5 * dt);
        camera.position.lerp(targetCamPos, k);
        controls.target.lerp(targetLookAt, k);
        if (camera.position.distanceTo(targetCamPos) < 0.8) transitioning = false;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;
}
