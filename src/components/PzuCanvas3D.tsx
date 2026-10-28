import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BUILDINGS_DATA,
  PLATFORMS_DATA,
  ROADS_DATA,
  BOUNDARY_POLYGON,
  BuildingSpec,
  getElevationAt,
} from '../utils/pzuData';

export type CameraViewMode = 'iso' | 'top' | 'tour';
export type VisualStyleMode = 'tech_dark' | 'arch_clay';

interface PzuCanvas3DProps {
  cameraMode: CameraViewMode;
  visualStyle: VisualStyleMode;
  showContours: boolean;
  showDitches: boolean;
  showForbiddenZone: boolean;
  verticalExaggeration: number;
  selectedBuilding: BuildingSpec | null;
  onSelectBuilding: (b: BuildingSpec | null) => void;
  onCameraModeChange: (mode: CameraViewMode) => void;
}

export const PzuCanvas3D: React.FC<PzuCanvas3DProps> = ({
  cameraMode,
  visualStyle,
  showContours,
  showDitches,
  showForbiddenZone,
  verticalExaggeration,
  selectedBuilding,
  onSelectBuilding,
  onCameraModeChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store latest callbacks and state in refs so WebGL scene never tears down on UI updates
  const onSelectRef = useRef(onSelectBuilding);
  onSelectRef.current = onSelectBuilding;
  const onCameraModeChangeRef = useRef(onCameraModeChange);
  onCameraModeChangeRef.current = onCameraModeChange;

  const sceneRefs = useRef<{
    requestRender: () => void;
    setCameraPreset: (mode: CameraViewMode) => void;
    setVisualStyle: (style: VisualStyleMode) => void;
    setLayers: (contours: boolean, ditches: boolean, forbidden: boolean) => void;
    setExaggeration: (exag: number) => void;
    highlightBuilding: (id: string | null, focusCamera?: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection per threejs skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('data-testid', 'pzu-webgl-canvas');
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const darkBg = 0x0d131c;
    const clayBg = 0xe6e4dc;
    scene.background = new THREE.Color(darkBg);
    scene.fog = new THREE.FogExp2(darkBg, 0.0012);

    // Studio environment reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1800);
    camera.position.set(-175, 168, 215);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Never fall below ground
    controls.minPolarAngle = 0.02;
    controls.minDistance = 28;
    controls.maxDistance = 680;
    controls.target.set(8, 8, 12);
    controls.update();

    // 3-Point Architectural Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.3);
    sunLight.position.set(165, 245, 135);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.set(2048, 2048);
      const d = 225;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 650;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-180, 110, -160);
    scene.add(rimLight);

    // Helper for elevation -> scene Y
    let currentExag = verticalExaggeration;
    const calcY = (x: number, z: number) => (getElevationAt(x, z) - 585.0) * currentExag;

    // Procedural Topographic & Geodetic Texture
    const createTopoTexture = (isClay: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = isClay ? '#dedad0' : '#111a27';
      ctx.fillRect(0, 0, 1024, 1024);

      // Fine engineering grid
      ctx.strokeStyle = isClay ? 'rgba(71, 85, 105, 0.16)' : 'rgba(56, 189, 248, 0.09)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 1024; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 1024);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(1024, i);
        ctx.stroke();
      }

      // Geodetic 100m survey crosshairs (matching 677200..677500 on PDF)
      ctx.strokeStyle = isClay ? 'rgba(15, 23, 42, 0.35)' : 'rgba(148, 163, 184, 0.32)';
      ctx.lineWidth = 2;
      for (let x = 128; x < 1024; x += 256) {
        for (let y = 128; y < 1024; y += 256) {
          ctx.beginPath();
          ctx.moveTo(x - 10, y);
          ctx.lineTo(x + 10, y);
          ctx.moveTo(x, y - 10);
          ctx.lineTo(x, y + 10);
          ctx.stroke();
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 3);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const darkTopoTex = createTopoTexture(false);
    const clayTopoTex = createTopoTexture(true);

    // 1. Ground Terrain Mesh (with natural NE->SW slope from 585m to 596m)
    const groundGeo = new THREE.PlaneGeometry(540, 540, 110, 110);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: darkTopoTex,
      roughness: 0.88,
      metalness: 0.06,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = !isSoftwareGl;
    scene.add(groundMesh);

    // Subtle terraced earth platform under the main site
    const createSpriteBadge = (
      text: string,
      bgHex: string,
      borderHex: string,
      textHex: string,
      scaleX = 13,
      scaleY = 3.4
    ) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 68;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bgHex;
      ctx.strokeStyle = borderHex;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(6, 6, 244, 56, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textHex;
      ctx.font = '600 22px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 35);

      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(scaleX, scaleY, 1);
      return sprite;
    };

    // Dynamic groups that rebuild or reposition when verticalExaggeration changes
    const contoursGroup = new THREE.Group();
    const roadsGroup = new THREE.Group();
    const ditchesGroup = new THREE.Group();
    const platformsGroup = new THREE.Group();
    const forbiddenGroup = new THREE.Group();
    const buildingsGroup = new THREE.Group();

    scene.add(contoursGroup);
    scene.add(platformsGroup);
    scene.add(roadsGroup);
    scene.add(ditchesGroup);
    scene.add(forbiddenGroup);
    scene.add(buildingsGroup);

    const clickableMeshes: THREE.Mesh[] = [];
    const buildingGroupsMap = new Map<string, { group: THREE.Group; hullMesh: THREE.Mesh; baseColor: number }>();

    const rebuildSceneGeometry = () => {
      // Update terrain vertices
      const pos = groundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        pos.setY(i, calcY(vx, vz));
      }
      pos.needsUpdate = true;
      groundGeo.computeVertexNormals();

      // Clear groups
      [contoursGroup, platformsGroup, roadsGroup, ditchesGroup, forbiddenGroup, buildingsGroup].forEach((grp) => {
        while (grp.children.length > 0) {
          grp.remove(grp.children[0]);
        }
      });
      clickableMeshes.length = 0;
      buildingGroupsMap.clear();

      // A. Contour Isolines (585 .. 596 m)
      for (let elev = 585; elev <= 596; elev++) {
        const pts: THREE.Vector3[] = [];
        for (let s = -230; s <= 230; s += 6) {
          const swTarget = (elev - 591.2) / 5.2;
          const x = -swTarget * 165 + s * 0.62;
          const z = swTarget * 130 + s * 0.78;
          if (Math.abs(x) <= 245 && Math.abs(z) <= 245) {
            pts.push(new THREE.Vector3(x, calcY(x, z) + 0.16, z));
          }
        }
        if (pts.length > 1) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
          const isMajor = elev % 2 === 0 || elev === 585 || elev === 595;
          const lineMat = new THREE.LineBasicMaterial({
            color: isMajor ? 0x38bdf8 : 0x64748b,
            transparent: true,
            opacity: isMajor ? 0.68 : 0.35,
          });
          contoursGroup.add(new THREE.Line(lineGeo, lineMat));

          // Add elevation marker tag along key isolines (585, 587, 589, 591, 593, 595, 596)
          if (elev % 2 === 1 || elev === 586 || elev === 596) {
            const midPt = pts[Math.floor(pts.length * 0.22)];
            if (midPt) {
              const badge = createSpriteBadge(
                `${elev} м`,
                'rgba(15, 23, 42, 0.82)',
                'rgba(56, 189, 248, 0.5)',
                '#7dd3fc',
                7.5,
                2.0
              );
              badge.position.set(midPt.x, midPt.y + 1.4, midPt.z);
              contoursGroup.add(badge);
            }
          }
        }
      }

      // B. Type III Concrete Platforms (Площадки ПАГ-14) — Terrain-conforming slabs with terrace foundation
      const platMat = new THREE.MeshStandardMaterial({
        color: 0x3b4654,
        roughness: 0.82,
        metalness: 0.12,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const platEdgeMat = new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.55,
      });

      PLATFORMS_DATA.forEach((p) => {
        const segW = 12;
        const segL = 16;
        const geo = new THREE.PlaneGeometry(p.width, p.length, segW, segL);
        geo.rotateX(-Math.PI / 2);
        const posA = geo.attributes.position;
        const cosR = Math.cos(p.rotationY);
        const sinR = Math.sin(p.rotationY);

        for (let i = 0; i < posA.count; i++) {
          const lx = posA.getX(i);
          const lz = posA.getZ(i);
          const wx = p.x + lx * cosR + lz * sinR;
          const wz = p.z - lx * sinR + lz * cosR;
          posA.setY(i, calcY(wx, wz) + 0.26);
        }
        posA.needsUpdate = true;
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, platMat);
        mesh.position.set(p.x, 0, p.z);
        mesh.rotation.y = p.rotationY;
        mesh.receiveShadow = !isSoftwareGl;

        // Perimeter border line sitting on top of the platform
        const hw = p.width * 0.5;
        const hl = p.length * 0.5;
        const borderLocal: Array<[number, number]> = [
          [-hw, -hl],
          [hw, -hl],
          [hw, hl],
          [-hw, hl],
          [-hw, -hl],
        ];
        const borderPts = borderLocal.map(([lx, lz]) => {
          const wx = p.x + lx * cosR + lz * sinR;
          const wz = p.z - lx * sinR + lz * cosR;
          return new THREE.Vector3(lx, calcY(wx, wz) + 0.32, lz);
        });
        const borderLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(borderPts),
          platEdgeMat
        );
        mesh.add(borderLine);
        platformsGroup.add(mesh);
      });

      // C. Roads (Type I) & Gravel Drainage Ditches (Type III) — Terrain-conforming ribbon strips
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.72,
        metalness: 0.1,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const roadShoulderMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.88,
        metalness: 0.05,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const roadCenterLineMat = new THREE.LineDashedMaterial({
        color: 0xfef08a,
        dashSize: 2.5,
        gapSize: 2.0,
        transparent: true,
        opacity: 0.85,
      });
      const ditchMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });

      const createTerrainRibbon = (
        curve2d: THREE.CatmullRomCurve3,
        steps: number,
        halfWidth: number,
        yOffset: number
      ) => {
        const sampled = curve2d.getPoints(steps);
        const positions = new Float32Array((steps + 1) * 2 * 3);
        const indices: number[] = [];

        for (let i = 0; i <= steps; i++) {
          const curr = sampled[i];
          const prev = sampled[Math.max(0, i - 1)];
          const next = sampled[Math.min(steps, i + 1)];
          let tx = next.x - prev.x;
          let tz = next.z - prev.z;
          const len = Math.hypot(tx, tz) || 1;
          tx /= len;
          tz /= len;
          const nx = -tz;
          const nz = tx;

          const lx = curr.x + nx * halfWidth;
          const lz = curr.z + nz * halfWidth;
          const rx = curr.x - nx * halfWidth;
          const rz = curr.z - nz * halfWidth;

          const vIdx = i * 6;
          positions[vIdx] = lx;
          positions[vIdx + 1] = calcY(lx, lz) + yOffset;
          positions[vIdx + 2] = lz;

          positions[vIdx + 3] = rx;
          positions[vIdx + 4] = calcY(rx, rz) + yOffset;
          positions[vIdx + 5] = rz;

          if (i < steps) {
            const a = i * 2;
            const b = i * 2 + 1;
            const c = (i + 1) * 2;
            const d = (i + 1) * 2 + 1;
            indices.push(a, b, c, b, d, c);
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return { geo, sampled };
      };

      ROADS_DATA.forEach((r) => {
        const flatPts = r.points.map(([x, z]) => new THREE.Vector3(x, 0, z));
        const curve = new THREE.CatmullRomCurve3(flatPts, Boolean(r.closed), 'catmullrom', 0.22);
        const segs = Math.max(80, flatPts.length * 24);

        if (r.type === 'road_type_1') {
          // Gravel embankment shoulder (ПГС + геотекстиль)
          const { geo: shoulderGeo } = createTerrainRibbon(curve, segs, r.width * 0.64, 0.34);
          const shoulderMesh = new THREE.Mesh(shoulderGeo, roadShoulderMat);
          roadsGroup.add(shoulderMesh);

          // Main carriage surface (Тип I)
          const { geo: roadGeo, sampled } = createTerrainRibbon(curve, segs, r.width * 0.48, 0.42);
          const roadMesh = new THREE.Mesh(roadGeo, roadMat);
          roadMesh.receiveShadow = !isSoftwareGl;
          roadsGroup.add(roadMesh);

          // Dashed road centerline
          const centerPts = sampled.map((pt) => new THREE.Vector3(pt.x, calcY(pt.x, pt.z) + 0.52, pt.z));
          const centerGeo = new THREE.BufferGeometry().setFromPoints(centerPts);
          const centerLine = new THREE.Line(centerGeo, roadCenterLineMat);
          centerLine.computeLineDistances();
          roadsGroup.add(centerLine);
        } else {
          // Gravel drainage ditch (Сечение щебеночной канавы, тип III 1:20)
          const { geo: ditchGeo } = createTerrainRibbon(curve, segs, r.width * 0.55, 0.38);
          const ditchMesh = new THREE.Mesh(ditchGeo, ditchMat);
          ditchesGroup.add(ditchMesh);
        }
      });

      // Culvert pipes at road/ditch intersections (Водопропускные трубы, выпуск >= 2 м)
      const culvertGeo = new THREE.CylinderGeometry(0.45, 0.45, 11.5, 12);
      culvertGeo.rotateZ(Math.PI / 2);
      const culvertMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.7 });
      const culvertCoords: Array<[number, number, number]> = [
        [-60, -116, 0.4],
        [-34, -68, -0.5],
        [4, -150, 0.2],
        [44, 118, -0.4],
      ];
      culvertCoords.forEach(([cx, cz, rot]) => {
        const pipe = new THREE.Mesh(culvertGeo, culvertMat);
        pipe.position.set(cx, calcY(cx, cz) + 0.45, cz);
        pipe.rotation.y = rot;
        ditchesGroup.add(pipe);
      });

      // D. Forbidden Zone (Запретная охранная зона) — Red-Blue perimeter line, posts & warning triangles
      const boundPts: THREE.Vector3[] = [];
      for (let i = 0; i < BOUNDARY_POLYGON.length; i++) {
        const a = BOUNDARY_POLYGON[i];
        const b = BOUNDARY_POLYGON[(i + 1) % BOUNDARY_POLYGON.length];
        const subSteps = 12;
        for (let s = 0; s < subSteps; s++) {
          const t = s / subSteps;
          const bx = a.x + (b.x - a.x) * t;
          const bz = a.z + (b.z - a.z) * t;
          boundPts.push(new THREE.Vector3(bx, calcY(bx, bz) + 1.15, bz));
        }
      }
      boundPts.push(boundPts[0].clone());

      const redLineGeo = new THREE.BufferGeometry().setFromPoints(boundPts);
      const redLineMat = new THREE.LineDashedMaterial({
        color: 0xef4444,
        dashSize: 4.0,
        gapSize: 2.0,
      });
      const redLine = new THREE.Line(redLineGeo, redLineMat);
      redLine.computeLineDistances();
      forbiddenGroup.add(redLine);

      const bluePts = boundPts.map((p) => new THREE.Vector3(p.x, p.y - 0.35, p.z));
      const blueLineGeo = new THREE.BufferGeometry().setFromPoints(bluePts);
      const blueLineMat = new THREE.LineBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.75,
      });
      forbiddenGroup.add(new THREE.Line(blueLineGeo, blueLineMat));

      // Collect fence post positions along perimeter for InstancedMesh
      const postPositions: THREE.Vector3[] = [];
      const triPositions: Array<{ pos: THREE.Vector3; angle: number }> = [];

      for (let i = 0; i < BOUNDARY_POLYGON.length; i++) {
        const a = BOUNDARY_POLYGON[i];
        const b = BOUNDARY_POLYGON[(i + 1) % BOUNDARY_POLYGON.length];
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        const angle = Math.atan2(b.x - a.x, b.z - a.z);
        const steps = Math.max(2, Math.floor(dist / 12));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const px = a.x + (b.x - a.x) * t;
          const pz = a.z + (b.z - a.z) * t;
          const py = calcY(px, pz);
          postPositions.push(new THREE.Vector3(px, py + 1.1, pz));
          if (s % 2 === 1) {
            triPositions.push({ pos: new THREE.Vector3(px, py + 2.35, pz), angle });
          }
        }

        // Segment length label from blueprint (e.g., 140.75 м, 149.25 м, 158.20 м)
        if (a.segmentLabel) {
          const mx = (a.x + b.x) * 0.5;
          const mz = (a.z + b.z) * 0.5;
          const segBadge = createSpriteBadge(
            a.segmentLabel,
            'rgba(127, 29, 29, 0.86)',
            'rgba(248, 113, 113, 0.7)',
            '#fecaca',
            9.5,
            2.3
          );
          segBadge.position.set(mx, calcY(mx, mz) + 3.8, mz);
          forbiddenGroup.add(segBadge);
        }
      }

      const postGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.2, 6);
      const postMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.65 });
      const postInstanced = new THREE.InstancedMesh(postGeo, postMat, postPositions.length);
      const dummy = new THREE.Object3D();
      postPositions.forEach((p, idx) => {
        dummy.position.copy(p);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        postInstanced.setMatrixAt(idx, dummy.matrix);
      });
      postInstanced.instanceMatrix.needsUpdate = true;
      postInstanced.computeBoundingSphere();
      forbiddenGroup.add(postInstanced);

      const triGeo = new THREE.ConeGeometry(0.62, 1.1, 3);
      const triMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0x7f1d1d,
        roughness: 0.35,
        metalness: 0.2,
      });
      const triInstanced = new THREE.InstancedMesh(triGeo, triMat, triPositions.length);
      triPositions.forEach((item, idx) => {
        dummy.position.copy(item.pos);
        dummy.rotation.set(Math.PI, item.angle, 0);
        dummy.updateMatrix();
        triInstanced.setMatrixAt(idx, dummy.matrix);
      });
      triInstanced.instanceMatrix.needsUpdate = true;
      triInstanced.computeBoundingSphere();
      forbiddenGroup.add(triInstanced);

      // E. Composite 3–12 Part Procedural Buildings (BUILDINGS_DATA)
      BUILDINGS_DATA.forEach((b) => {
        const group = new THREE.Group();
        const baseY = calcY(b.x, b.z) + 0.35;
        group.position.set(b.x, baseY, b.z);
        group.rotation.y = b.rotationY;

        // Part 1: Deep Concrete Foundation Plinth (anchored into sloped ground so it never floats)
        const plinthGeo = new THREE.BoxGeometry(b.width + 1.2, 2.6, b.length + 1.2);
        const plinthMat = new THREE.MeshStandardMaterial({
          color: 0x64748b,
          roughness: 0.85,
          metalness: 0.1,
        });
        const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
        plinthMesh.position.y = -0.85;
        plinthMesh.receiveShadow = !isSoftwareGl;
        group.add(plinthMesh);

        // Part 2: Primary Architectural Hull
        const hullMat = new THREE.MeshStandardMaterial({
          color: b.colorHex,
          roughness: 0.42,
          metalness: 0.48,
        });
        const hullGeo = new THREE.BoxGeometry(b.width, b.height, b.length);
        const hullMesh = new THREE.Mesh(hullGeo, hullMat);
        hullMesh.position.y = 0.45 + b.height * 0.5;
        hullMesh.castShadow = !isSoftwareGl;
        hullMesh.receiveShadow = !isSoftwareGl;
        hullMesh.userData = { building: b };
        group.add(hullMesh);
        clickableMeshes.push(hullMesh);

        // Glowing Architectural EdgesGeometry
        const hullEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(hullGeo),
          new THREE.LineBasicMaterial({ color: b.accentHex })
        );
        hullMesh.add(hullEdges);

        // Part 3+: Specialized Secondary & Accent Parts per Roof/Building Type
        if (b.roofType === 'gabled') {
          const roofShape = new THREE.Shape();
          const hw = b.width * 0.54;
          const rh = Math.min(2.3, b.width * 0.26);
          roofShape.moveTo(-hw, 0);
          roofShape.lineTo(0, rh);
          roofShape.lineTo(hw, 0);
          roofShape.closePath();

          const roofDepth = b.length + 0.8;
          const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
            depth: roofDepth,
            bevelEnabled: false,
          });
          roofGeo.translate(0, 0.45 + b.height, -roofDepth * 0.5);
          const roofMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.68,
            metalness: 0.25,
          });
          const roofMesh = new THREE.Mesh(roofGeo, roofMat);
          roofMesh.castShadow = !isSoftwareGl;
          roofMesh.userData = { building: b };
          group.add(roofMesh);
          clickableMeshes.push(roofMesh);

          const roofEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(roofGeo),
            new THREE.LineBasicMaterial({ color: b.accentHex, transparent: true, opacity: 0.65 })
          );
          roofMesh.add(roofEdges);

          // Rooftop Ventilation Monitors / Skylights along ridge
          const skylightCount = Math.max(2, Math.floor(b.length / 14));
          const skyGeo = new THREE.BoxGeometry(b.width * 0.28, 0.65, 2.6);
          const skyMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0c4a6e,
            roughness: 0.2,
            metalness: 0.8,
          });
          for (let s = 0; s < skylightCount; s++) {
            const sz = -b.length * 0.35 + (s / Math.max(1, skylightCount - 1)) * (b.length * 0.7);
            const sky = new THREE.Mesh(skyGeo, skyMat);
            sky.position.set(0, 0.45 + b.height + rh * 0.85, sz);
            group.add(sky);
          }

          // Loading Dock Canopies at both ends of long warehouses
          const canopyGeo = new THREE.BoxGeometry(b.width * 0.7, 0.25, 2.4);
          const canopyMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.75 });
          [-1, 1].forEach((dir) => {
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.set(0, 0.45 + b.height * 0.58, dir * (b.length * 0.5 + 1.1));
            group.add(canopy);
          });
        } else if (b.roofType === 'tank') {
          // Two Cylindrical Water Reserve Tanks (2.9 Резервуары запаса воды ×2)
          hullMesh.visible = false;
          const tankRadius = b.width * 0.38;
          const tankGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, b.height, 24);
          const tankMat = new THREE.MeshStandardMaterial({
            color: 0x64748b,
            roughness: 0.28,
            metalness: 0.72,
          });
          [-b.length * 0.24, b.length * 0.24].forEach((tz) => {
            const tank = new THREE.Mesh(tankGeo, tankMat);
            tank.position.set(0, 0.45 + b.height * 0.5, tz);
            tank.castShadow = !isSoftwareGl;
            tank.userData = { building: b };
            group.add(tank);
            clickableMeshes.push(tank);

            const tEdges = new THREE.LineSegments(
              new THREE.EdgesGeometry(tankGeo, 25),
              new THREE.LineBasicMaterial({ color: b.accentHex })
            );
            tank.add(tEdges);
          });
          const bridgeGeo = new THREE.BoxGeometry(1.4, 0.35, b.length * 0.65);
          const bridge = new THREE.Mesh(
            bridgeGeo,
            new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.6 })
          );
          bridge.position.set(0, 0.45 + b.height + 0.25, 0);
          group.add(bridge);
        } else if (b.roofType === 'open_pad') {
          hullMesh.scale.y = 0.18;
          hullMesh.position.y = 0.45 + b.height * 0.09;
          const stackGeo = new THREE.BoxGeometry(3.2, 2.2, 3.2);
          const stackMat = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            roughness: 0.55,
            metalness: 0.25,
          });
          const rows = Math.max(2, Math.floor(b.length / 10));
          for (let r = 0; r < rows; r++) {
            const sz = -b.length * 0.35 + (r / Math.max(1, rows - 1)) * (b.length * 0.7);
            [-b.width * 0.22, b.width * 0.22].forEach((sx) => {
              const stack = new THREE.Mesh(stackGeo, stackMat);
              stack.position.set(sx, 0.9 + 1.1, sz);
              stack.castShadow = !isSoftwareGl;
              stack.userData = { building: b };
              group.add(stack);
              clickableMeshes.push(stack);
            });
          }
        }

        // Protective Earth Berm (Обваловка складов ВМ 2.15.1–2.15.3 и полигона 2.3)
        if (b.hasBerm) {
          const bermMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.92,
            metalness: 0.05,
          });
          const bermEdgeMat = new THREE.LineBasicMaterial({
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.6,
          });
          const bw = b.width + 10;
          const bl = b.length + 10;
          const bh = 3.6;
          const sideWallGeo = new THREE.BoxGeometry(2.8, bh, bl);
          [-bw * 0.5, bw * 0.5].forEach((wx) => {
            const wall = new THREE.Mesh(sideWallGeo, bermMat);
            wall.position.set(wx, bh * 0.5, 0);
            wall.add(new THREE.LineSegments(new THREE.EdgesGeometry(sideWallGeo), bermEdgeMat));
            group.add(wall);
          });
          const backWallGeo = new THREE.BoxGeometry(bw + 2.8, bh, 2.8);
          const backWall = new THREE.Mesh(backWallGeo, bermMat);
          backWall.position.set(0, bh * 0.5, -bl * 0.5);
          backWall.add(new THREE.LineSegments(new THREE.EdgesGeometry(backWallGeo), bermEdgeMat));
          group.add(backWall);

          const mastGeo = new THREE.CylinderGeometry(0.12, 0.2, b.height + 5.5, 6);
          const mastMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
          [
            [-bw * 0.5, -bl * 0.5],
            [bw * 0.5, -bl * 0.5],
          ].forEach(([mx, mz]) => {
            const mast = new THREE.Mesh(mastGeo, mastMat);
            mast.position.set(mx, (b.height + 5.5) * 0.5, mz);
            group.add(mast);
          });
        }

        if (b.code === '2.13') {
          const boomGeo = new THREE.BoxGeometry(6.5, 0.22, 0.22);
          const boomMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
          const boom = new THREE.Mesh(boomGeo, boomMat);
          boom.position.set(b.width * 0.5 + 3.2, 1.3, 0);
          group.add(boom);
        }

        // Floating 3D Identification Badge
        const isLongWarehouse = b.category === 'warehouse_long';
        const badgeText = b.blueprintTag || b.code;
        const badge = createSpriteBadge(
          badgeText,
          isLongWarehouse ? 'rgba(245, 158, 11, 0.94)' : 'rgba(15, 23, 42, 0.92)',
          isLongWarehouse ? '#fef08a' : '#38bdf8',
          isLongWarehouse ? '#0f172a' : '#f8fafc',
          isLongWarehouse ? 15.5 : 12.5,
          isLongWarehouse ? 3.8 : 3.1
        );
        badge.position.set(0, b.height + 4.8, 0);
        group.add(badge);

        buildingsGroup.add(group);
        buildingGroupsMap.set(b.id, { group, hullMesh, baseColor: b.colorHex });
      });
    };

    rebuildSceneGeometry();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 3D Selection Bounding Box Frame (aligned to selected building so it never clips into sloped ground)
    const selectionFrameGroup = new THREE.Group();
    selectionFrameGroup.visible = false;
    const selBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const selBoxEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(selBoxGeo),
      new THREE.LineBasicMaterial({ color: 0xfacc15 })
    );
    selectionFrameGroup.add(selBoxEdges);
    scene.add(selectionFrameGroup);

    // Camera transition state & Render-on-Demand / Software-GL pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isDisposed = false;

    let activeCameraMode: CameraViewMode = cameraMode;
    let isTransitioning = false;
    const targetCamPos = new THREE.Vector3(-175, 168, 215);
    const targetLookAt = new THREE.Vector3(8, 8, 12);
    let tourAngle = Math.atan2(camera.position.z - 12, camera.position.x - 8);
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (gl.flush) gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (isDisposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (isDisposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (isDisposed) return;
        renderDirty = false;
        const dt = Math.min(clock.getDelta(), 0.1);

        if (activeCameraMode === 'tour') {
          tourAngle += dt * 0.28;
          const radius = 255;
          camera.position.set(8 + Math.cos(tourAngle) * radius, 145, 12 + Math.sin(tourAngle) * radius);
          controls.target.set(8, 8, 12);
          renderDirty = true;
        } else if (isTransitioning) {
          const alpha = isSoftwareGl ? 0.85 : 1 - Math.exp(-6.5 * dt);
          camera.position.lerp(targetCamPos, alpha);
          controls.target.lerp(targetLookAt, alpha);
          if (
            camera.position.distanceTo(targetCamPos) < 1.5 &&
            controls.target.distanceTo(targetLookAt) < 1.5
          ) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            isTransitioning = false;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty && !isDisposed) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    controls.addEventListener('change', () => {
      requestRender();
    });

    controls.addEventListener('start', () => {
      isTransitioning = false;
      if (activeCameraMode === 'tour') {
        activeCameraMode = 'iso';
        onCameraModeChangeRef.current('iso');
      }
    });

    // Raycasting on pointer click
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // Ignore drag
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes, false);
      if (intersects.length > 0) {
        const b = intersects[0].object.userData.building as BuildingSpec | undefined;
        if (b) {
          onSelectRef.current(b);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    // Expose imperative methods to React props effect
    sceneRefs.current = {
      requestRender,
      setCameraPreset: (mode: CameraViewMode) => {
        activeCameraMode = mode;
        clock.getDelta();
        if (mode === 'top') {
          targetCamPos.set(8, 395, 12.01);
          targetLookAt.set(8, 6, 12);
          if (isSoftwareGl) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            isTransitioning = false;
          } else {
            isTransitioning = true;
          }
        } else if (mode === 'iso') {
          targetCamPos.set(-175, 168, 215);
          targetLookAt.set(8, 8, 12);
          if (isSoftwareGl) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            isTransitioning = false;
          } else {
            isTransitioning = true;
          }
        } else if (mode === 'tour') {
          isTransitioning = false;
          tourAngle = Math.atan2(camera.position.z - 12, camera.position.x - 8);
        }
        requestRender();
      },
      setVisualStyle: (style: VisualStyleMode) => {
        const isClay = style === 'arch_clay';
        const col = isClay ? clayBg : darkBg;
        scene.background = new THREE.Color(col);
        scene.fog = new THREE.FogExp2(col, 0.0012);
        groundMat.map = isClay ? clayTopoTex : darkTopoTex;
        groundMat.needsUpdate = true;
        hemiLight.groundColor.setHex(isClay ? 0x94a3b8 : 0x1e293b);
        hemiLight.intensity = isClay ? 1.15 : 0.9;
        requestRender();
      },
      setLayers: (contours: boolean, ditches: boolean, forbidden: boolean) => {
        contoursGroup.visible = contours;
        ditchesGroup.visible = ditches;
        forbiddenGroup.visible = forbidden;
        requestRender();
      },
      setExaggeration: (exag: number) => {
        if (Math.abs(currentExag - exag) > 0.01) {
          currentExag = exag;
          rebuildSceneGeometry();
          requestRender();
        }
      },
      highlightBuilding: (id: string | null, focusCamera = false) => {
        buildingGroupsMap.forEach((entry, key) => {
          const mat = entry.hullMesh.material as THREE.MeshStandardMaterial;
          if (key === id) {
            mat.emissive.setHex(0x0284c7);
            mat.emissiveIntensity = 0.55;
            const b = entry.hullMesh.userData.building as BuildingSpec;
            selectionFrameGroup.position.set(b.x, calcY(b.x, b.z) + 0.35 + (b.height + 2.5) * 0.5, b.z);
            selectionFrameGroup.rotation.y = b.rotationY;
            selectionFrameGroup.scale.set(b.width + 2.8, b.height + 2.5, b.length + 2.8);
            selectionFrameGroup.visible = true;

            if (focusCamera && activeCameraMode !== 'top') {
              targetLookAt.set(b.x, calcY(b.x, b.z) + b.height * 0.5, b.z);
              targetCamPos.set(b.x - 75, calcY(b.x, b.z) + 62, b.z + 85);
              isTransitioning = true;
            }
          } else {
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
          }
        });
        if (!id) {
          selectionFrameGroup.visible = false;
        }
        requestRender();
      },
    };

    // Initial render
    requestRender();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Synchronize React prop changes to Three.js scene without re-mounting WebGL
  useEffect(() => {
    sceneRefs.current?.setCameraPreset(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    sceneRefs.current?.setVisualStyle(visualStyle);
  }, [visualStyle]);

  useEffect(() => {
    sceneRefs.current?.setLayers(showContours, showDitches, showForbiddenZone);
  }, [showContours, showDitches, showForbiddenZone]);

  useEffect(() => {
    sceneRefs.current?.setExaggeration(verticalExaggeration);
  }, [verticalExaggeration]);

  useEffect(() => {
    sceneRefs.current?.highlightBuilding(selectedBuilding?.id ?? null, false);
  }, [selectedBuilding]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden z-0"
      aria-label="Интерактивный 3D-макет генерального плана ПЗУ"
    />
  );
};
