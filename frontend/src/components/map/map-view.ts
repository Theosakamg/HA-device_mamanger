/**
 * Map View – Interactive 3D visualization of the full device model.
 *
 * Renders the DB model relationships as an orbiting 3D graph:
 *   Hierarchy  : Home → Level → Room → Device
 *   References : Device → Firmware / Model / Function
 *
 * Node visual language:
 *   🏠 Home      → large golden icosahedron
 *   🏗️ Level     → medium teal octahedron
 *   🚪 Room      → small indigo dodecahedron
 *   📱 Device    → neutral sphere (slate)
 *   ⬡ Firmware  → coloured hex prism (cyan family)
 *   ◻ Model     → coloured cube (orange family)
 *   △ Function  → coloured cone (violet family)
 *
 * Hierarchy edges are white curves; reference edges use distinct colours.
 */
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { sharedStyles } from "../../styles/shared-styles";
import { i18n, localized } from "../../i18n";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HierarchyClient } from "../../api/hierarchy-client";
import { DeviceClient } from "../../api/device-client";
import { DeviceFirmwareClient } from "../../api/device-firmware-client";
import { DeviceModelClient } from "../../api/device-model-client";
import { DeviceFunctionClient } from "../../api/device-function-client";
import type { HierarchyTree, DmDevice } from "../../types/device";
import type { DmDeviceFirmware } from "../../types/device-firmware";
import type { DmDeviceModel } from "../../types/device-model";
import type { DmDeviceFunction } from "../../types/device-function";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

/** Colour palette per node type */
const COLORS = {
  home: 0xfbbf24, // amber / gold
  level: 0x14b8a6, // teal
  room: 0x6366f1, // indigo
  device: 0x64748b, // slate-500
  firmware: 0x22d3ee, // cyan (default firmware)
  model: 0xfb923c, // orange (default model)
  function: 0xa78bfa, // violet (default function)
  edge: 0x94a3b8, // slate-400
} as const;

/** Firmware → colour mapping for firmware reference nodes */
const FIRMWARE_COLORS: Record<string, number> = {
  tasmota: 0x22d3ee, // cyan
  zigbee: 0xa78bfa, // violet
  tuya: 0xfb923c, // orange
  embeded: 0x34d399, // emerald
  wled: 0xf472b6, // pink
  android: 0x60a5fa, // blue
  "android-cast": 0x818cf8, // indigo-400
  na: 0x94a3b8, // slate
};

/** Function → colour mapping for function reference nodes */
const FUNCTION_COLORS: Record<string, number> = {
  button: 0xfbbf24, // amber
  door: 0x8b5cf6, // violet
  doorbell: 0xf59e0b, // yellow
  heater: 0xef4444, // red
  light: 0xfcd34d, // yellow-300
  motion: 0x10b981, // emerald
  shutter: 0x6366f1, // indigo
  tv: 0x3b82f6, // blue
  window: 0x06b6d4, // cyan
  thermal: 0xf97316, // orange
  ir: 0xec4899, // pink
  presence: 0x14b8a6, // teal
  energy: 0x84cc16, // lime
  infra: 0xa855f7, // purple
  water: 0x0ea5e9, // sky
  gaz: 0xd946ef, // fuchsia
  sensor: 0x64748b, // slate
};

/** Rotating palette for model reference nodes */
const MODEL_PALETTE = [
  0xfb923c, 0x38bdf8, 0xa3e635, 0xfbbf24, 0xf472b6,
  0x34d399, 0xc084fc, 0x22d3ee, 0xf87171, 0x818cf8,
  0x4ade80, 0xfacc15, 0x2dd4bf, 0xe879f9, 0x67e8f9,
];

/** Edge colour by reference type */
const REF_EDGE_COLORS: Record<string, number> = {
  firmware: 0x22d3ee, // cyan
  model: 0xfb923c, // orange
  function: 0xa78bfa, // violet
};

/** Size look-up per type */
const NODE_RADIUS: Record<string, number> = {
  home: 2.0,
  level: 1.4,
  room: 1.0,
  device: 0.5,
  firmware: 0.85,
  model: 0.85,
  function: 0.85,
};

/** Vertical spacing between hierarchy tiers */
const TIER_Y: Record<string, number> = {
  home: 12,
  level: 4,
  room: -4,
  device: -12,
  firmware: -22,
  model: -22,
  function: -22,
};

/** Cluster centre positions for reference node groups */
const REF_CLUSTER: Record<string, { x: number; z: number }> = {
  firmware: { x: -28, z: 0 },
  model: { x: 0, z: -28 },
  function: { x: 28, z: 0 },
};

/* ------------------------------------------------------------------ */
/*  Helper types                                                      */
/* ------------------------------------------------------------------ */

interface GraphNode {
  id: string;
  label: string;
  type: "home" | "level" | "room" | "device" | "firmware" | "model" | "function";
  color: number;
  radius: number;
  mesh?: THREE.Mesh;
  labelSprite?: THREE.Sprite;
  position: THREE.Vector3;
  /** Extra info for tooltip */
  meta: string;
  /** Parent home id (for filtering) */
  homeId?: string;
}

interface GraphEdge {
  source: string;
  target: string;
  /** Edge category for styling */
  edgeType?: "hierarchy" | "firmware" | "model" | "function" | "target";
  line?: THREE.Line;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

@localized
@customElement("dm-map-view")
export class DmMapView extends LitElement {
  static styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .map-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        flex-wrap: wrap;
        gap: 12px;
      }
      .map-header h2 {
        margin: 0;
        font-size: 20px;
      }
      .legend {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 13px;
        color: var(--dm-text-secondary, #64748b);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
      }
      .canvas-wrap {
        position: relative;
        width: 100%;
        height: 70vh;
        min-height: 420px;
        border-radius: 12px;
        overflow: hidden;
        background: linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      }
      /* Fullscreen: fill the entire screen */
      .canvas-wrap:fullscreen,
      .canvas-wrap:-webkit-full-screen {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
      }
      .fullscreen-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 15;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(100, 116, 139, 0.3);
        color: #334155;
        font-size: 18px;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        transition: background 0.15s;
      }
      .fullscreen-btn:hover {
        background: rgba(255, 255, 255, 0.9);
      }
      .reset-btn {
        position: absolute;
        top: 56px;
        right: 12px;
        z-index: 15;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(100, 116, 139, 0.3);
        color: #334155;
        font-size: 15px;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
        transition: background 0.15s;
      }
      .reset-btn:hover {
        background: rgba(255, 255, 255, 0.9);
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
      .tooltip {
        position: absolute;
        pointer-events: none;
        background: rgba(255, 255, 255, 0.92);
        color: #1e293b;
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1.4;
        max-width: 260px;
        opacity: 0;
        transition: opacity 0.15s;
        z-index: 10;
        border: 1px solid rgba(100, 116, 139, 0.2);
        backdrop-filter: blur(8px);
      }
      .tooltip.visible {
        opacity: 1;
      }
      .stats-bar {
        margin-top: 12px;
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
        font-size: 13px;
        color: var(--dm-text-secondary, #64748b);
      }
      .stats-bar strong {
        color: var(--dm-text, #1e293b);
      }
      .loading-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #1e293b;
        font-size: 16px;
        background: rgba(229, 231, 235, 0.85);
        z-index: 20;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .loading-overlay span {
        animation: pulse 1.5s ease-in-out infinite;
      }
      .filter-bar {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 12px;
        font-size: 13px;
      }
      .filter-bar label {
        color: var(--dm-text-secondary, #64748b);
        font-weight: 600;
        margin-right: 2px;
      }
      .filter-bar select {
        padding: 5px 10px;
        border-radius: 6px;
        border: 1px solid rgba(100, 116, 139, 0.3);
        background: rgba(255, 255, 255, 0.85);
        color: #1e293b;
        font-size: 13px;
        cursor: pointer;
        backdrop-filter: blur(4px);
        min-width: 120px;
      }
      .filter-bar select:focus {
        outline: 2px solid #6366f1;
        outline-offset: 1px;
      }
      .filter-group {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .viewcube-wrap {
        position: absolute;
        top: 12px;
        right: 56px;
        width: 100px;
        height: 100px;
        z-index: 15;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
        background: rgba(255,255,255,0.25);
        backdrop-filter: blur(6px);
      }
      .viewcube-wrap canvas {
        width: 100px !important;
        height: 100px !important;
      }
    `,
  ];

  /* ---- reactive state ---- */
  @state() private _loading = true;
  @state() private _isFullscreen = false;
  @state() private _stats = { homes: 0, levels: 0, rooms: 0, devices: 0, firmwares: 0, models: 0, functions: 0 };

  /* ---- filter state ---- */
  @state() private _filterHome = "__all__";
  @state() private _filterFirmware = "__all__";
  @state() private _filterModel = "__all__";
  @state() private _filterFunction = "__all__";
  /** Available options for each filter dropdown */
  @state() private _homeOptions: { id: string; name: string }[] = [];
  @state() private _firmwareOptions: { id: string; name: string }[] = [];
  @state() private _modelOptions: { id: string; name: string }[] = [];
  @state() private _functionOptions: { id: string; name: string }[] = [];

  /* ---- Three.js internals ---- */
  private _scene!: THREE.Scene;
  private _camera!: THREE.PerspectiveCamera;
  private _renderer!: THREE.WebGLRenderer;
  private _controls!: OrbitControls;
  private _animId = 0;
  private _nodes: GraphNode[] = [];
  private _edges: GraphEdge[] = [];
  private _raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();
  private _hoveredNode: GraphNode | null = null;
  private _focusedNode: GraphNode | null = null;
  private _particleSystem?: THREE.Points;
  private _clock = new THREE.Clock();
  private _initialized = false;
  private _disposed = false;

  /** Ring mesh shown around the focused node */
  private _focusRing?: THREE.Mesh;

  /* ---- ViewCube internals ---- */
  private _vcScene!: THREE.Scene;
  private _vcCamera!: THREE.PerspectiveCamera;
  private _vcRenderer!: THREE.WebGLRenderer;
  private _vcCube!: THREE.Mesh;

  /* ---- fly-to animation state ---- */
  private _flyAnimating = false;
  private _flyFrom = new THREE.Vector3();
  private _flyTo = new THREE.Vector3();
  private _flyTargetLookAt = new THREE.Vector3();
  private _flyFromLookAt = new THREE.Vector3();
  private _flyProgress = 0;
  private _flyDuration = 1.2; // seconds
  private _flyStartTime = 0;

  /** Raw data kept for rebuilding the graph after filter changes */
  private _rawTree!: HierarchyTree;
  private _rawDevices: DmDevice[] = [];
  private _rawFirmwares: DmDeviceFirmware[] = [];
  private _rawModels: DmDeviceModel[] = [];
  private _rawFunctions: DmDeviceFunction[] = [];

  /* ---- click vs drag detection ---- */
  private _mouseDownPos = { x: 0, y: 0 };
  /** Pixel threshold: beyond this, it's a drag, not a click */
  private static readonly DRAG_THRESHOLD = 5;

  /* ---- API clients ---- */
  private _hierarchyClient = new HierarchyClient();
  private _deviceClient = new DeviceClient();
  private _firmwareClient = new DeviceFirmwareClient();
  private _modelClient = new DeviceModelClient();
  private _functionClient = new DeviceFunctionClient();

  /* ---- lifecycle ---- */
  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    // Small delay to ensure the shadow DOM canvas is ready
    requestAnimationFrame(() => this._init());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._disposed = true;
    cancelAnimationFrame(this._animId);
    this._animId = 0;

    // Remove event listeners
    window.removeEventListener("resize", this._onResize);
    const canvas = this._renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener("mousemove", this._onMouseMove);
      canvas.removeEventListener("mousedown", this._onMouseDown);
      canvas.removeEventListener("mouseup", this._onMouseUp);
    }

    // Dispose all scene objects
    this._clearScene();

    // Dispose focus ring
    this._removeFocusRing();

    // Dispose particle system
    if (this._particleSystem) {
      this._particleSystem.geometry.dispose();
      (this._particleSystem.material as THREE.Material).dispose();
      this._particleSystem = undefined;
    }

    // Dispose controls
    this._controls?.dispose();

    // Dispose main renderer
    this._renderer?.dispose();
    this._renderer?.forceContextLoss();

    // Dispose ViewCube renderer
    this._vcRenderer?.dispose();
    this._vcRenderer?.forceContextLoss();

    // Clear references
    this._nodes = [];
    this._edges = [];
    this._hoveredNode = null;
    this._focusedNode = null;
    this._focusRelatedCache = null;
    this._flyAnimating = false;
    this._initialized = false;
  }

  /** Dispose all node/edge Three.js objects from the scene */
  private _clearScene() {
    // Dispose node meshes, materials, label sprites + textures
    for (const node of this._nodes) {
      if (node.mesh) {
        node.mesh.geometry.dispose();
        (node.mesh.material as THREE.Material).dispose();
        this._scene?.remove(node.mesh);
        node.mesh = undefined;
      }
      if (node.labelSprite) {
        const spriteMat = node.labelSprite.material as THREE.SpriteMaterial;
        spriteMat.map?.dispose();
        spriteMat.dispose();
        this._scene?.remove(node.labelSprite);
        node.labelSprite = undefined;
      }
    }
    // Dispose edge lines
    for (const edge of this._edges) {
      if (edge.line) {
        edge.line.geometry.dispose();
        (edge.line.material as THREE.Material).dispose();
        this._scene?.remove(edge.line);
        edge.line = undefined;
      }
    }
    // Remove halo rings (they are scene children not tracked)
    if (this._scene) {
      const toRemove: THREE.Object3D[] = [];
      this._scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !obj.userData.nodeId && obj !== this._focusRing) {
          toRemove.push(obj);
        }
      });
      for (const obj of toRemove) {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
        this._scene.remove(obj);
      }
    }
  }

  /* ---- init ---- */
  private async _init() {
    if (this._initialized) return;
    this._disposed = false;

    const wrap = this.shadowRoot!.querySelector<HTMLDivElement>(".canvas-wrap");
    if (!wrap) return;
    const canvas = wrap.querySelector<HTMLCanvasElement>("canvas")!;

    // Renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setSize(wrap.clientWidth, wrap.clientHeight);

    // Scene
    this._scene = new THREE.Scene();
    this._scene.fog = new THREE.FogExp2(0xd1d5db, 0.0008);

    // Camera
    this._camera = new THREE.PerspectiveCamera(
      55,
      wrap.clientWidth / wrap.clientHeight,
      0.1,
      500
    );
    this._camera.position.set(0, 24, 55);

    // Controls
    this._controls = new OrbitControls(this._camera, canvas);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.08;
    this._controls.minDistance = 8;
    this._controls.maxDistance = 180;
    this._controls.autoRotate = true;
    this._controls.autoRotateSpeed = 0.4;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this._scene.add(ambient);
    const point1 = new THREE.PointLight(0xfbbf24, 1.2, 120);
    point1.position.set(20, 30, 20);
    this._scene.add(point1);
    const point2 = new THREE.PointLight(0x6366f1, 0.8, 120);
    point2.position.set(-20, -10, -20);
    this._scene.add(point2);

    // Star-field background particles
    this._addStarField();

    // Events
    window.addEventListener("resize", this._onResize);
    canvas.addEventListener("mousemove", this._onMouseMove);
    canvas.addEventListener("mousedown", this._onMouseDown);
    canvas.addEventListener("mouseup", this._onMouseUp);

    // Listen for fullscreen changes (exit via Escape key)
    wrap.addEventListener("fullscreenchange", this._onFullscreenChange);

    // Initialise the ViewCube
    this._initViewCube(wrap);

    this._initialized = true;

    // Load data & build graph
    await this._loadData();

    // Bail if disposed while loading
    if (this._disposed) return;

    // Start render loop
    this._animate();
  }

  /* ---- star-field ---- */
  private _addStarField() {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.15,
      transparent: true,
      opacity: 0.25,
    });
    this._particleSystem = new THREE.Points(geo, mat);
    this._scene.add(this._particleSystem);
  }

  /* ---- data loading ---- */
  private async _loadData() {
    try {
      const [tree, devices, firmwares, models, functions] = await Promise.all([
        this._hierarchyClient.getTree(),
        this._deviceClient.getAll(),
        this._firmwareClient.getAll(),
        this._modelClient.getAll(),
        this._functionClient.getAll(),
      ]);

      // Store raw data for filter rebuilds
      this._rawTree = tree;
      this._rawDevices = devices;
      this._rawFirmwares = firmwares;
      this._rawModels = models;
      this._rawFunctions = functions;

      // Populate filter options
      this._homeOptions = tree.homes.map((h) => ({ id: String(h.id), name: h.name }));
      this._firmwareOptions = firmwares.map((fw) => ({ id: String(fw.id), name: fw.name }));
      this._modelOptions = models.map((m) => ({ id: String(m.id), name: m.name }));
      this._functionOptions = functions.map((fn) => ({ id: String(fn.id), name: fn.name }));

      this._buildGraph(tree, devices, firmwares, models, functions);
      this._loading = false;
    } catch (err) {
      console.error("Map: failed to load data", err);
      this._loading = false;
    }
  }

  /* ---- graph building ---- */
  private _buildGraph(
    tree: HierarchyTree,
    devices: DmDevice[],
    firmwares: DmDeviceFirmware[],
    models: DmDeviceModel[],
    functions: DmDeviceFunction[],
  ) {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    /* =========================================================
     *  1) Hierarchy nodes: Home → Level → Room → Device
     * ========================================================= */

    let homeIdx = 0;
    const homeCount = tree.homes.length;

    /** Spread homes in a circle */
    const homeAngleStep = (Math.PI * 2) / Math.max(homeCount, 1);

    for (const home of tree.homes) {
      const hAngle = homeAngleStep * homeIdx;
      const hRadius = 14;
      const hx = Math.cos(hAngle) * hRadius;
      const hz = Math.sin(hAngle) * hRadius;

      const homeId = `home-${home.id}`;
      nodes.push({
        id: homeId,
        label: home.name,
        type: "home",
        color: COLORS.home,
        radius: NODE_RADIUS.home,
        position: new THREE.Vector3(hx, TIER_Y.home, hz),
        meta: `${home.deviceCount} devices`,
        homeId: homeId,
      });

      let levelIdx = 0;
      const levelCount = home.children.length;
      for (const level of home.children) {
        const lAngle = hAngle + ((levelIdx - (levelCount - 1) / 2) * 0.55);
        const lRadius = 8;
        const lx = hx + Math.cos(lAngle) * lRadius;
        const lz = hz + Math.sin(lAngle) * lRadius;

        const levelId = `level-${level.id}`;
        nodes.push({
          id: levelId,
          label: level.name,
          type: "level",
          color: COLORS.level,
          radius: NODE_RADIUS.level,
          position: new THREE.Vector3(lx, TIER_Y.level, lz),
          meta: `${level.deviceCount} devices`,
          homeId: homeId,
        });
        edges.push({ source: homeId, target: levelId, edgeType: "hierarchy" });

        let roomIdx = 0;
        const roomCount = level.children.length;
        for (const room of level.children) {
          const rAngle = lAngle + ((roomIdx - (roomCount - 1) / 2) * 0.45);
          const rRadius = 6;
          const rx = lx + Math.cos(rAngle) * rRadius;
          const rz = lz + Math.sin(rAngle) * rRadius;

          const roomId = `room-${room.id}`;
          nodes.push({
            id: roomId,
            label: room.name,
            type: "room",
            color: COLORS.room,
            radius: NODE_RADIUS.room,
            position: new THREE.Vector3(rx, TIER_Y.room, rz),
            meta: `${room.deviceCount} devices`,
            homeId: homeId,
          });
          edges.push({ source: levelId, target: roomId, edgeType: "hierarchy" });

          // Attach devices to rooms
          const roomDevices = devices.filter((d) => d.roomId === room.id);
          let devIdx = 0;
          const devCount = roomDevices.length;
          for (const dev of roomDevices) {
            const dAngle = rAngle + ((devIdx - (devCount - 1) / 2) * 0.35);
            const dRadius = 4;
            const dx = rx + Math.cos(dAngle) * dRadius;
            const dz = rz + Math.sin(dAngle) * dRadius;

            const deviceId = `device-${dev.id}`;
            nodes.push({
              id: deviceId,
              label: dev.positionName || dev.mac,
              type: "device",
              color: COLORS.device,
              radius: NODE_RADIUS.device,
              position: new THREE.Vector3(dx, TIER_Y.device, dz),
              meta: `${dev.mac}\n${dev.firmwareName ?? ""} / ${dev.modelName ?? ""} / ${dev.functionName ?? ""}`,
              homeId: homeId,
            });
            edges.push({ source: roomId, target: deviceId, edgeType: "hierarchy" });

            // Self-referencing target edge
            if (dev.targetId) {
              edges.push({
                source: deviceId,
                target: `device-${dev.targetId}`,
                edgeType: "target",
              });
            }
            devIdx++;
          }
          roomIdx++;
        }
        levelIdx++;
      }
      homeIdx++;
    }

    /* =========================================================
     *  2) Reference nodes: Firmware, Model, Function
     * ========================================================= */

    // Helper: arrange items in a small circle around a cluster centre
    const placeCluster = (
      items: { id: string; label: string; type: "firmware" | "model" | "function"; color: number; meta: string }[],
    ) => {
      const clusterType = items[0]?.type;
      if (!clusterType) return;
      const centre = REF_CLUSTER[clusterType];
      const count = items.length;
      const clusterRadius = Math.max(3, count * 0.8);
      const angleStep = (Math.PI * 2) / Math.max(count, 1);

      items.forEach((item, idx) => {
        const angle = angleStep * idx;
        const x = centre.x + Math.cos(angle) * clusterRadius;
        const z = centre.z + Math.sin(angle) * clusterRadius;
        nodes.push({
          id: item.id,
          label: item.label,
          type: item.type,
          color: item.color,
          radius: NODE_RADIUS[item.type],
          position: new THREE.Vector3(x, TIER_Y[item.type], z),
          meta: item.meta,
        });
      });
    };

    // --- Firmware reference nodes ---
    const fwItems = firmwares.map((fw) => {
      const name = fw.name.toLowerCase();
      const color = FIRMWARE_COLORS[name] ?? COLORS.firmware;
      const devCount = devices.filter((d) => d.firmwareId === fw.id).length;
      return {
        id: `firmware-${fw.id}`,
        label: fw.name,
        type: "firmware" as const,
        color,
        meta: `Firmware\n${devCount} device(s)`,
      };
    });
    placeCluster(fwItems);

    // --- Model reference nodes ---
    const modelItems = models.map((m, idx) => {
      const color = MODEL_PALETTE[idx % MODEL_PALETTE.length];
      const devCount = devices.filter((d) => d.modelId === m.id).length;
      return {
        id: `model-${m.id}`,
        label: m.name,
        type: "model" as const,
        color,
        meta: `Model\n${devCount} device(s)`,
      };
    });
    placeCluster(modelItems);

    // --- Function reference nodes ---
    const fnItems = functions.map((fn) => {
      const name = fn.name.toLowerCase();
      const color = FUNCTION_COLORS[name] ?? COLORS.function;
      const devCount = devices.filter((d) => d.functionId === fn.id).length;
      return {
        id: `function-${fn.id}`,
        label: fn.name,
        type: "function" as const,
        color,
        meta: `Function\n${devCount} device(s)`,
      };
    });
    placeCluster(fnItems);

    /* =========================================================
     *  3) Reference edges: Device → Firmware / Model / Function
     * ========================================================= */
    for (const dev of devices) {
      const deviceId = `device-${dev.id}`;
      // Only add edges if device node exists (i.e. it had a room)
      if (!nodes.find((n) => n.id === deviceId)) continue;

      if (dev.firmwareId) {
        edges.push({
          source: deviceId,
          target: `firmware-${dev.firmwareId}`,
          edgeType: "firmware",
        });
      }
      if (dev.modelId) {
        edges.push({
          source: deviceId,
          target: `model-${dev.modelId}`,
          edgeType: "model",
        });
      }
      if (dev.functionId) {
        edges.push({
          source: deviceId,
          target: `function-${dev.functionId}`,
          edgeType: "function",
        });
      }
    }

    // Update stats
    this._stats = {
      homes: tree.homes.length,
      levels: tree.homes.reduce((s, h) => s + h.children.length, 0),
      rooms: tree.homes.reduce(
        (s, h) => s + h.children.reduce((ss, l) => ss + l.children.length, 0),
        0
      ),
      devices: devices.length,
      firmwares: firmwares.length,
      models: models.length,
      functions: functions.length,
    };

    this._nodes = nodes;
    this._edges = edges;

    this._renderGraph();
  }

  /* ---- Three.js graph rendering ---- */
  private _renderGraph() {
    // Node meshes
    const nodeMap = new Map<string, GraphNode>();
    for (const node of this._nodes) {
      nodeMap.set(node.id, node);

      let geometry: THREE.BufferGeometry;
      switch (node.type) {
        case "home":
          geometry = new THREE.IcosahedronGeometry(node.radius, 1);
          break;
        case "level":
          geometry = new THREE.OctahedronGeometry(node.radius, 0);
          break;
        case "room":
          geometry = new THREE.DodecahedronGeometry(node.radius, 0);
          break;
        case "firmware":
          // Hexagonal prism
          geometry = new THREE.CylinderGeometry(node.radius, node.radius, node.radius * 0.8, 6);
          break;
        case "model":
          // Cube
          geometry = new THREE.BoxGeometry(node.radius * 1.4, node.radius * 1.4, node.radius * 1.4);
          break;
        case "function":
          // Cone
          geometry = new THREE.ConeGeometry(node.radius, node.radius * 1.6, 8);
          break;
        default:
          geometry = new THREE.SphereGeometry(node.radius, 16, 16);
      }

      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        roughness: 0.25,
        metalness: 0.5,
        emissive: new THREE.Color(node.color),
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.userData = { nodeId: node.id };
      node.mesh = mesh;
      this._scene.add(mesh);

      // Glow ring / halo for homes, levels, and reference nodes
      if (["home", "level", "firmware", "model", "function"].includes(node.type)) {
        const ringGeo = new THREE.RingGeometry(
          node.radius * 1.2,
          node.radius * 1.6,
          32
        );
        const ringMat = new THREE.MeshBasicMaterial({
          color: node.color,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(node.position);
        ring.rotation.x = Math.PI / 2;
        this._scene.add(ring);
      }

      // Text label sprite
      const sprite = this._makeLabel(node.label, node.color);
      sprite.position.copy(node.position);
      sprite.position.y += node.radius + 1.2;
      node.labelSprite = sprite;
      this._scene.add(sprite);
    }

    // Edge lines
    for (const edge of this._edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const isRefEdge = edge.edgeType === "firmware" || edge.edgeType === "model" || edge.edgeType === "function";

      const points = this._curvedEdge(src.position, tgt.position);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      // Reference edges get their category colour; hierarchy edges use default
      const edgeColor = isRefEdge
        ? REF_EDGE_COLORS[edge.edgeType!] ?? COLORS.edge
        : 0x64748b;
      const edgeOpacity = isRefEdge ? 0.22 : 0.35;

      const material = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: edgeOpacity,
      });
      const line = new THREE.Line(geometry, material);
      edge.line = line;
      this._scene.add(line);
    }
  }

  /** Build a gently curved path between two points */
  private _curvedEdge(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 2; // gentle curve upward
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    return curve.getPoints(20);
  }

  /** Create a text sprite */
  private _makeLabel(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const fontSize = 96;
    canvas.width = 1024;
    canvas.height = 192;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Glow / shadow
    const hexColor = `#${color.toString(16).padStart(6, "0")}`;
    ctx.shadowColor = hexColor;
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#1e293b";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = this._renderer.capabilities.getMaxAnisotropy();
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6, 1.2, 1);
    return sprite;
  }

  /* ---- focus helpers ---- */

  /** Smooth ease-in-out curve */
  private static _easeInOut(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /** Focus on a node: fly camera to frame it */
  private _focusOn(node: GraphNode) {
    this._controls.autoRotate = false;

    // Compute bounding sphere of focused + related nodes to frame them
    const related = this._getRelatedNodeIds(node.id);
    const relevantNodes = this._nodes.filter(
      (n) => n.id === node.id || related.has(n.id),
    );
    const center = new THREE.Vector3();
    for (const n of relevantNodes) {
      center.add(n.position);
    }
    center.divideScalar(relevantNodes.length || 1);

    // Compute radius of the bounding sphere
    let maxDist = 0;
    for (const n of relevantNodes) {
      const d = n.position.distanceTo(center);
      if (d > maxDist) maxDist = d;
    }
    // Camera distance: tight framing around the cluster
    const fov = this._camera.fov * (Math.PI / 180);
    const fitDist = Math.max(maxDist + 2, 4) / Math.tan(fov / 2);
    const clampedDist = Math.min(Math.max(fitDist, 8), 120);

    // Camera target position: offset from centre
    const dir = this._camera.position.clone().sub(this._controls.target).normalize();
    const targetPos = center.clone().add(dir.multiplyScalar(clampedDist));

    // Start fly animation
    this._flyFrom.copy(this._camera.position);
    this._flyTo.copy(targetPos);
    this._flyFromLookAt.copy(this._controls.target);
    this._flyTargetLookAt.copy(center);
    this._flyProgress = 0;
    this._flyStartTime = this._clock.getElapsedTime();
    this._flyAnimating = true;
  }

  /** Show the pulsing focus ring around a node */
  private _showFocusRing(node: GraphNode) {
    this._removeFocusRing();
    const r = node.radius * 2.2;
    const geo = new THREE.RingGeometry(r * 0.85, r, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this._focusRing = new THREE.Mesh(geo, mat);
    this._focusRing.position.copy(node.mesh!.position);
    this._focusRing.rotation.x = Math.PI / 2;
    this._scene.add(this._focusRing);
  }

  /** Remove the focus ring from the scene */
  private _removeFocusRing() {
    if (this._focusRing) {
      this._scene.remove(this._focusRing);
      this._focusRing.geometry.dispose();
      (this._focusRing.material as THREE.Material).dispose();
      this._focusRing = undefined;
    }
  }

  /** Reset the emissive intensity of a previously focused node */
  private _clearFocusHighlight() {
    if (this._focusedNode?.mesh) {
      (
        this._focusedNode.mesh.material as THREE.MeshStandardMaterial
      ).emissiveIntensity = 0.25;
    }
  }

  /**
   * Walk edges to collect all ancestor and descendant node IDs
   * reachable from the given node (full parent/child chain).
   */
  private _getRelatedNodeIds(nodeId: string): Set<string> {
    const related = new Set<string>();
    // Build adjacency: parent→children and child→parents
    const childrenOf = new Map<string, string[]>();
    const parentsOf = new Map<string, string[]>();
    for (const e of this._edges) {
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, []);
      childrenOf.get(e.source)!.push(e.target);
      if (!parentsOf.has(e.target)) parentsOf.set(e.target, []);
      parentsOf.get(e.target)!.push(e.source);
    }
    // BFS descendants
    const queue: string[] = [nodeId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const child of childrenOf.get(cur) ?? []) {
        if (!related.has(child)) {
          related.add(child);
          queue.push(child);
        }
      }
    }
    // BFS ancestors
    const queue2: string[] = [nodeId];
    while (queue2.length) {
      const cur = queue2.shift()!;
      for (const parent of parentsOf.get(cur) ?? []) {
        if (!related.has(parent)) {
          related.add(parent);
          queue2.push(parent);
        }
      }
    }
    return related;
  }

  /**
   * Dim unrelated nodes/edges – aggressive translucency.
   * - Focused node: emissive 1.0, full opacity
   * - Related (parent/child chain): emissive 0.6, high opacity
   * - Unrelated: near-invisible (opacity 5%)
   */
  private _applyFocusDimming(focusedId: string) {
    const related = this._getRelatedNodeIds(focusedId);

    for (const node of this._nodes) {
      if (!node.mesh) continue;
      const mat = node.mesh.material as THREE.MeshStandardMaterial;
      if (node.id === focusedId) {
        // Focused: full bright
        mat.emissiveIntensity = 1.0;
        mat.opacity = 1;
        mat.depthWrite = true;
        if (node.labelSprite) node.labelSprite.material.opacity = 1;
      } else if (related.has(node.id)) {
        // Related: clearly visible
        mat.emissiveIntensity = 0.6;
        mat.opacity = 1;
        mat.depthWrite = true;
        if (node.labelSprite) node.labelSprite.material.opacity = 0.9;
      } else {
        // Unrelated: near-invisible
        mat.emissiveIntensity = 0;
        mat.opacity = 0.04;
        mat.depthWrite = false;
        if (node.labelSprite) node.labelSprite.material.opacity = 0.02;
      }
    }

    // Dim / highlight edges
    for (const edge of this._edges) {
      if (!edge.line) continue;
      const lineMat = edge.line.material as THREE.LineBasicMaterial;
      const srcRelated =
        edge.source === focusedId || related.has(edge.source);
      const tgtRelated =
        edge.target === focusedId || related.has(edge.target);
      const isRefEdge = edge.edgeType === "firmware" || edge.edgeType === "model" || edge.edgeType === "function";
      if (srcRelated && tgtRelated) {
        // Active chain – bright, use reference colour or white
        lineMat.opacity = 0.7;
        lineMat.color.set(
          isRefEdge ? (REF_EDGE_COLORS[edge.edgeType!] ?? 0xf1f5f9) : 0xf1f5f9
        );
      } else {
        // Unrelated edge – almost invisible
        lineMat.opacity = 0.02;
        lineMat.color.set(COLORS.edge);
      }
    }
  }

  /** Restore all nodes and edges to default brightness */
  private _clearFocusDimming() {
    for (const node of this._nodes) {
      if (!node.mesh) continue;
      const mat = node.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.25;
      mat.opacity = 1;
      mat.depthWrite = true;
      if (node.labelSprite) node.labelSprite.material.opacity = 1;
    }
    for (const edge of this._edges) {
      if (!edge.line) continue;
      const lineMat = edge.line.material as THREE.LineBasicMaterial;
      const isRefEdge = edge.edgeType === "firmware" || edge.edgeType === "model" || edge.edgeType === "function";
      lineMat.opacity = isRefEdge ? 0.22 : 0.35;
      lineMat.color.set(
        isRefEdge ? (REF_EDGE_COLORS[edge.edgeType!] ?? 0x64748b) : 0x64748b
      );
    }
  }

  /** Cache for related node IDs of the current focus */
  private _focusRelatedCache: Set<string> | null = null;

  /** Check if a node is in the related chain of the focused node */
  private _isRelatedToFocused(nodeId: string): boolean {
    if (!this._focusedNode) return false;
    if (!this._focusRelatedCache) {
      this._focusRelatedCache = this._getRelatedNodeIds(this._focusedNode.id);
    }
    return this._focusRelatedCache.has(nodeId);
  }

  /**
   * Return the correct base emissive for a node given the current
   * focus state (so hover-reset respects dimming).
   */
  private _getBaseEmissive(node: GraphNode): number {
    if (!this._focusedNode) return 0.25; // no focus active
    if (node === this._focusedNode) return 1.0;
    if (this._isRelatedToFocused(node.id)) return 0.6;
    return 0; // unrelated / invisible
  }

  /** Release focus: restore auto-rotate */
  private _releaseFocus() {
    this._clearFocusHighlight();
    this._clearFocusDimming();
    this._removeFocusRing();
    this._focusedNode = null;
    this._focusRelatedCache = null;

    // Restore auto-rotate
    this._controls.autoRotate = true;
  }

  /* ================================================================ */
  /*  ViewCube – orientation gizmo (top-right)                        */
  /* ================================================================ */

  /** Create a texture for one face of the ViewCube */
  private _makeVCFaceTexture(label: string): THREE.CanvasTexture {
    const size = 256;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d")!;
    // Background
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(0, 0, size, size);
    // Border
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    // Label
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 72px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, size / 2, size / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /** Initialise the ViewCube mini scene + renderer */
  private _initViewCube(wrap: HTMLDivElement) {
    const vcWrap = wrap.querySelector<HTMLDivElement>(".viewcube-wrap");
    if (!vcWrap) return;

    // ViewCube renderer
    this._vcRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this._vcRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._vcRenderer.setSize(100, 100);
    this._vcRenderer.domElement.style.width = "100px";
    this._vcRenderer.domElement.style.height = "100px";
    vcWrap.appendChild(this._vcRenderer.domElement);

    // Scene
    this._vcScene = new THREE.Scene();

    // Camera
    this._vcCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this._vcCamera.position.set(0, 0, 4);

    // Lights
    this._vcScene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const vcPoint = new THREE.DirectionalLight(0xffffff, 0.6);
    vcPoint.position.set(2, 3, 4);
    this._vcScene.add(vcPoint);

    // Cube with labelled faces: order = +X, -X, +Y, -Y, +Z, -Z
    const faceLabels = ["Right", "Left", "Top", "Bottom", "Front", "Back"];
    const materials = faceLabels.map(
      (label) => new THREE.MeshStandardMaterial({ map: this._makeVCFaceTexture(label), roughness: 0.6, metalness: 0.1 }),
    );
    const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    this._vcCube = new THREE.Mesh(geo, materials);
    this._vcScene.add(this._vcCube);

    // Click handler for face selection
    const vcRaycaster = new THREE.Raycaster();
    const vcMouse = new THREE.Vector2();
    vcWrap.addEventListener("click", (e: MouseEvent) => {
      const rect = vcWrap.getBoundingClientRect();
      vcMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      vcMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      vcRaycaster.setFromCamera(vcMouse, this._vcCamera);
      const hits = vcRaycaster.intersectObject(this._vcCube);
      if (hits.length > 0) {
        const faceIdx = hits[0].face!.materialIndex;
        this._flyToViewCubeFace(faceIdx);
      }
    });
  }

  /** Fly main camera to match a ViewCube face orientation */
  private _flyToViewCubeFace(faceIdx: number) {
    const dist = this._camera.position.distanceTo(this._controls.target);
    const target = this._controls.target.clone();
    const dir = new THREE.Vector3();

    // materialIndex: 0=+X Right, 1=-X Left, 2=+Y Top, 3=-Y Bottom, 4=+Z Front, 5=-Z Back
    switch (faceIdx) {
      case 0: dir.set(1, 0, 0); break;  // Right
      case 1: dir.set(-1, 0, 0); break; // Left
      case 2: dir.set(0, 1, 0); break;  // Top
      case 3: dir.set(0, -1, 0); break; // Bottom
      case 4: dir.set(0, 0, 1); break;  // Front
      case 5: dir.set(0, 0, -1); break; // Back
    }
    const newPos = target.clone().add(dir.multiplyScalar(dist));

    // Animate fly
    this._controls.autoRotate = false;
    this._flyFrom.copy(this._camera.position);
    this._flyTo.copy(newPos);
    this._flyFromLookAt.copy(this._controls.target);
    this._flyTargetLookAt.copy(target);
    this._flyProgress = 0;
    this._flyStartTime = this._clock.getElapsedTime();
    this._flyAnimating = true;
  }

  /* ================================================================ */
  /*  Filter system                                                   */
  /* ================================================================ */

  /** Called when any filter dropdown changes */
  private _onFilterChange(filter: "home" | "firmware" | "model" | "function", value: string) {
    switch (filter) {
      case "home": this._filterHome = value; break;
      case "firmware": this._filterFirmware = value; break;
      case "model": this._filterModel = value; break;
      case "function": this._filterFunction = value; break;
    }
    this._applyFilters();
  }

  /** Rebuild the graph with current filters applied */
  private _applyFilters() {
    if (!this._rawTree) return;

    // Release any current focus
    if (this._focusedNode) this._releaseFocus();

    // Clear current scene objects
    this._clearScene();

    // Filter tree by home
    let filteredTree = this._rawTree;
    if (this._filterHome !== "__all__") {
      const homeIdNum = Number(this._filterHome);
      filteredTree = {
        ...this._rawTree,
        homes: this._rawTree.homes.filter((h) => h.id === homeIdNum),
      };
    }

    // Filter devices by firmware / model / function
    let filteredDevices = [...this._rawDevices];
    if (this._filterFirmware !== "__all__") {
      const fwId = Number(this._filterFirmware);
      filteredDevices = filteredDevices.filter((d) => d.firmwareId === fwId);
    }
    if (this._filterModel !== "__all__") {
      const mId = Number(this._filterModel);
      filteredDevices = filteredDevices.filter((d) => d.modelId === mId);
    }
    if (this._filterFunction !== "__all__") {
      const fnId = Number(this._filterFunction);
      filteredDevices = filteredDevices.filter((d) => d.functionId === fnId);
    }

    // Rebuild
    this._nodes = [];
    this._edges = [];
    this._buildGraph(filteredTree, filteredDevices, this._rawFirmwares, this._rawModels, this._rawFunctions);
  }

  /* ---- animation loop ---- */
  private _animate = () => {
    this._animId = requestAnimationFrame(this._animate);
    const t = this._clock.getElapsedTime();
    this._clock.getDelta(); // keep clock ticking

    // Fly-to animation
    if (this._flyAnimating) {
      const elapsed = t - this._flyStartTime;
      this._flyProgress = Math.min(elapsed / this._flyDuration, 1);
      const ease = DmMapView._easeInOut(this._flyProgress);

      // Interpolate camera position
      this._camera.position.lerpVectors(this._flyFrom, this._flyTo, ease);
      // Interpolate look-at target
      const currentTarget = new THREE.Vector3().lerpVectors(
        this._flyFromLookAt,
        this._flyTargetLookAt,
        ease,
      );
      this._controls.target.copy(currentTarget);

      if (this._flyProgress >= 1) {
        this._flyAnimating = false;
      }
    }

    // Gentle bobbing of nodes
    for (const node of this._nodes) {
      if (!node.mesh) continue;
      const offset = node.position.x * 0.1 + node.position.z * 0.1;
      node.mesh.position.y =
        node.position.y + Math.sin(t * 0.8 + offset) * 0.3;
      node.mesh.rotation.y = t * 0.15 + offset;
      if (node.labelSprite) {
        node.labelSprite.position.y =
          node.mesh.position.y + node.radius + 1.2;
      }
    }

    // Pulse the focus ring
    if (this._focusRing && this._focusedNode?.mesh) {
      this._focusRing.position.copy(this._focusedNode.mesh.position);
      const pulse = 0.25 + Math.sin(t * 3) * 0.1;
      (this._focusRing.material as THREE.MeshBasicMaterial).opacity = pulse;
      this._focusRing.rotation.z = t * 0.5;
    }

    // Slow star-field rotation
    if (this._particleSystem) {
      this._particleSystem.rotation.y = t * 0.02;
    }

    // Raycasting for hover
    this._raycaster.setFromCamera(this._mouse, this._camera);
    const meshes = this._nodes
      .map((n) => n.mesh)
      .filter(Boolean) as THREE.Mesh[];
    const intersects = this._raycaster.intersectObjects(meshes);
    const tooltip =
      this.shadowRoot!.querySelector<HTMLDivElement>(".tooltip");

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const nodeId = hit.userData.nodeId as string;
      const node = this._nodes.find((n) => n.id === nodeId) ?? null;

      if (node && node !== this._hoveredNode) {
        // Reset previous hover (respect dimming levels if focus active)
        if (
          this._hoveredNode?.mesh &&
          this._hoveredNode !== this._focusedNode
        ) {
          (
            this._hoveredNode.mesh.material as THREE.MeshStandardMaterial
          ).emissiveIntensity = this._getBaseEmissive(this._hoveredNode);
        }
        this._hoveredNode = node;
        // Highlight hovered (only if not a dimmed-out node)
        if (!this._focusedNode || node === this._focusedNode || this._isRelatedToFocused(node.id)) {
          (hit.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.65;
        }
      }
      if (tooltip && node) {
        tooltip.classList.add("visible");
        tooltip.innerHTML = `<strong>${node.label}</strong><br/><em style="opacity:0.7">${node.type}</em><br/>${node.meta.replace(/\n/g, "<br/>")}`;
      }
    } else {
      if (
        this._hoveredNode?.mesh &&
        this._hoveredNode !== this._focusedNode
      ) {
        (
          this._hoveredNode.mesh.material as THREE.MeshStandardMaterial
        ).emissiveIntensity = this._getBaseEmissive(this._hoveredNode);
      }
      this._hoveredNode = null;
      if (tooltip) tooltip.classList.remove("visible");
    }

    this._controls.update();

    this._renderer.render(this._scene, this._camera);

    // Sync ViewCube orientation with main camera
    if (this._vcCube && this._vcRenderer) {
      // Copy main camera's rotation to the ViewCube
      const camDir = new THREE.Vector3();
      this._camera.getWorldDirection(camDir);
      this._vcCamera.position.copy(camDir.negate().multiplyScalar(4));
      this._vcCamera.lookAt(0, 0, 0);
      this._vcRenderer.render(this._vcScene, this._vcCamera);
    }
  };

  /* ---- events ---- */
  private _onResize = () => {
    const wrap = this.shadowRoot?.querySelector<HTMLDivElement>(".canvas-wrap");
    if (!wrap) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
  };

  private _onMouseDown = (e: MouseEvent) => {
    this._mouseDownPos = { x: e.clientX, y: e.clientY };
  };

  private _onMouseUp = (e: MouseEvent) => {
    const dx = e.clientX - this._mouseDownPos.x;
    const dy = e.clientY - this._mouseDownPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const wasDrag = dist > DmMapView.DRAG_THRESHOLD;

    if (wasDrag) {
      // Was a drag, not a click → do nothing
      return;
    }

    // It was a real click → handle focus logic
    this._handleNodeClick();
  };

  private _handleNodeClick() {
    // Raycast to find clicked node
    this._raycaster.setFromCamera(this._mouse, this._camera);
    const meshes = this._nodes
      .map((n) => n.mesh)
      .filter(Boolean) as THREE.Mesh[];
    const intersects = this._raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      const nodeId = hit.userData.nodeId as string;
      const node = this._nodes.find((n) => n.id === nodeId) ?? null;
      if (!node) return;

      // Toggle: click same node → release
      if (this._focusedNode === node) {
        this._releaseFocus();
        return;
      }

      // Focus on new node
      this._clearFocusHighlight();
      this._clearFocusDimming();
      this._focusedNode = node;
      this._focusRelatedCache = null; // invalidate cache
      this._applyFocusDimming(node.id);
      this._showFocusRing(node);
      this._focusOn(node);
    } else {
      // Clicked empty space → release focus
      if (this._focusedNode) {
        this._releaseFocus();
      }
    }
  }

  private _onMouseMove = (e: MouseEvent) => {
    const wrap = this.shadowRoot?.querySelector<HTMLDivElement>(".canvas-wrap");
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Move tooltip with cursor
    const tooltip = this.shadowRoot?.querySelector<HTMLDivElement>(".tooltip");
    if (tooltip) {
      tooltip.style.left = `${e.clientX - rect.left + 16}px`;
      tooltip.style.top = `${e.clientY - rect.top + 16}px`;
    }
  };

  /* ---- fullscreen ---- */
  private _toggleFullscreen = () => {
    const wrap = this.shadowRoot?.querySelector<HTMLDivElement>(".canvas-wrap");
    if (!wrap) return;
    if (!document.fullscreenElement) {
      wrap.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  /** Fly camera back to the default overview position */
  private _resetCamera = () => {
    if (this._focusedNode) this._releaseFocus();

    this._flyFrom.copy(this._camera.position);
    this._flyTo.set(0, 24, 55);
    this._flyFromLookAt.copy(this._controls.target);
    this._flyTargetLookAt.set(0, 0, 0);
    this._flyProgress = 0;
    this._flyStartTime = this._clock.getElapsedTime();
    this._flyAnimating = true;
    this._controls.autoRotate = true;
  };

  private _onFullscreenChange = () => {
    this._isFullscreen = !!document.fullscreenElement;
    // Resize renderer to match new dimensions
    requestAnimationFrame(() => this._onResize());
  };

  /* ---- render ---- */
  render() {
    return html`
      <div class="map-header">
        <h2>🗺️ ${i18n.t("nav_map")}</h2>
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot" style="background:#fbbf24"></span>
            ${i18n.t("home")}
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:#14b8a6"></span>
            ${i18n.t("level")}
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:#6366f1"></span>
            ${i18n.t("room")}
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:#64748b"></span>
            ${i18n.t("device")}
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:#22d3ee; border-radius: 3px;"></span>
            Firmware
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:#fb923c; border-radius: 2px;"></span>
            Model
          </span>
          <span class="legend-item">
            <span class="legend-dot" style="background:#a78bfa; clip-path: polygon(50% 0%, 0% 100%, 100% 100%);"></span>
            Function
          </span>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>${i18n.t("home")}:</label>
          <select @change=${(e: Event) => this._onFilterChange("home", (e.target as HTMLSelectElement).value)}>
            <option value="__all__">${i18n.t("filter_all")}</option>
            ${this._homeOptions.map(
              (h) => html`<option value=${h.id} ?selected=${this._filterHome === h.id}>${h.name}</option>`,
            )}
          </select>
        </div>
        <div class="filter-group">
          <label>Firmware:</label>
          <select @change=${(e: Event) => this._onFilterChange("firmware", (e.target as HTMLSelectElement).value)}>
            <option value="__all__">${i18n.t("filter_all")}</option>
            ${this._firmwareOptions.map(
              (fw) => html`<option value=${fw.id} ?selected=${this._filterFirmware === fw.id}>${fw.name}</option>`,
            )}
          </select>
        </div>
        <div class="filter-group">
          <label>Model:</label>
          <select @change=${(e: Event) => this._onFilterChange("model", (e.target as HTMLSelectElement).value)}>
            <option value="__all__">${i18n.t("filter_all")}</option>
            ${this._modelOptions.map(
              (m) => html`<option value=${m.id} ?selected=${this._filterModel === m.id}>${m.name}</option>`,
            )}
          </select>
        </div>
        <div class="filter-group">
          <label>Function:</label>
          <select @change=${(e: Event) => this._onFilterChange("function", (e.target as HTMLSelectElement).value)}>
            <option value="__all__">${i18n.t("filter_all")}</option>
            ${this._functionOptions.map(
              (fn) => html`<option value=${fn.id} ?selected=${this._filterFunction === fn.id}>${fn.name}</option>`,
            )}
          </select>
        </div>
      </div>

      <div class="canvas-wrap">
        <div class="viewcube-wrap"></div>
        <button
          class="fullscreen-btn"
          title="Toggle fullscreen"
          @click=${this._toggleFullscreen}
        >${this._isFullscreen ? "⊠" : "⛶"}</button>
        <button
          class="reset-btn"
          title="Recadrer tout"
          @click=${this._resetCamera}
        >⟳</button>
        ${this._loading
          ? html`<div class="loading-overlay">
              <span>${i18n.t("map_loading")}</span>
            </div>`
          : ""}
        <canvas></canvas>
        <div class="tooltip"></div>
      </div>

      <div class="stats-bar">
        <span
          ><strong>${this._stats.homes}</strong> ${i18n.t("homes")}</span
        >
        <span
          ><strong>${this._stats.levels}</strong> ${i18n.t("levels")}</span
        >
        <span
          ><strong>${this._stats.rooms}</strong> ${i18n.t("rooms")}</span
        >
        <span
          ><strong>${this._stats.devices}</strong> ${i18n.t("devices")}</span
        >
        <span
          ><strong>${this._stats.firmwares}</strong> Firmwares</span
        >
        <span
          ><strong>${this._stats.models}</strong> Models</span
        >
        <span
          ><strong>${this._stats.functions}</strong> Functions</span
        >
      </div>
    `;
  }
}
