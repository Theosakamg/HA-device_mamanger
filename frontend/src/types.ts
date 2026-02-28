/**
 * Device interface
 */
export interface Device {
  id?: number;
  name?: string | null;
  status?: "OK" | "NA" | "UNKNOWN" | "ERROR";
  state?: DeviceState | null; // persisted 'State'
  enabled?: boolean;
  mac?: string | null;
  protocol?: "tasmota" | "zigbee" | "wled" | "mqtt" | "other" | string;
  vendorModel?: string | null;
  firmware?: string | null;
  ip?: string | number | null; // can be short numeric (last octet) or full IP
  hostname?: string | null;
  dns?: string | null;
  roomFr?: string | null; // persisted 'Room FR'
  positionFr?: string | null; // persisted 'Position FR'
  roomSlug?: string | null; // persisted 'Room SLUG'
  positionSlug?: string | null; // persisted 'Position SLUG'
  level?: number | null; // floor: 0,1,... used to build l0/l1 prefixes
  function?: DeviceFunction | null; // persisted 'Function' - high-level function: Light, Energy, Door...
  model?: string | null; // persisted 'Model'
  haDeviceClass?: string | null;
  capabilities?: string[];
  mode?: string | null;
  target?: string | null;
  mqttTopic?: string | null;
  countTopic?: string | null;
  link?: string | null; // constructed web link (http://...)
  interlock?: string | number | null;
  ipLastSeen?: string | null;
  lastSeen?: string | null;
  rssi?: number | null;
  battery?: {
    level?: number | null;
    unit?: string | null;
    last_updated?: string | null;
  } | null;
  notes?: string | null;
  extra?: string | Record<string, unknown> | null; // persisted 'Extra'
  count?: number | null;
  created_at?: string;
  updated_at?: string;
}

export type DeviceFunction =
  | "button"
  | "door"
  | "doorbell"
  | "heater"
  | "light"
  | "motion"
  | "shutter"
  | "tv"
  | "window"
  | "thermal"
  | "ir"
  | "presence"
  | "energy"
  | "infra"
  | "water"
  | "gaz"
  | "sensor"
  | string;

export type DeviceState =
  | "Enable"
  | "Disable"
  | "NA"
  | "Enable-Hot"
  | "KO"
  | string;

const allowedStates: Record<string, DeviceState> = {
  enable: "Enable",
  "enable-hot": "Enable-Hot",
  "enable hot": "Enable-Hot",
  enablehot: "Enable-Hot",
  disable: "Disable",
  na: "NA",
  ko: "KO",
};

const allowedFunctions: Set<string> = new Set([
  "button",
  "door",
  "doorbell",
  "heater",
  "light",
  "motion",
  "shutter",
  "tv",
  "window",
  "thermal",
  "ir",
  "presence",
  "energy",
  "infra",
  "water",
  "gaz",
  "sensor",
]);

function normalizeFunction(fn?: string | null): string | null {
  if (!fn && fn !== "") return null;
  const s = String(fn).trim().toLowerCase();
  // If matches an allowed function, return its slug form, otherwise return sanitized slug
  if (allowedFunctions.has(s)) return s;
  return sanitizeSlug(s);
}

export { normalizeFunction, normalizeFirmware };

const allowedFirmwares: Set<string> = new Set([
  "embeded",
  "tasmota",
  "tuya",
  "zigbee",
  "na",
  "android",
  "android-cast",
  "wled",
]);

function normalizeFirmware(fw?: string | null): string | null {
  if (!fw && fw !== "") return null;
  const s = String(fw).trim().toLowerCase();
  if (allowedFirmwares.has(s)) return s;
  // try to sanitize common variants (Embedded vs Embeded)
  const alt = s.replace(/embedded/, "embeded");
  if (allowedFirmwares.has(alt)) return alt;
  return sanitizeSlug(s);
}

export interface ComputedDeviceFields {
  link?: string | null;
  mqttTopic?: string | null;
  hostname?: string | null;
  dns?: string | null;
  countTopic?: number | null;
  enabled?: boolean | null;
}

function sanitizeSlug(value?: string | null): string | null {
  if (value === null || value === undefined || value === "") return null;
  const s = String(value).toLowerCase().trim();
  return s
    .replace(/\s+/g, "-") // spaces to dashes
    .replace(/[^a-z0-9\-_.]/g, "");
}

function normalizeState(state?: string | null): {
  state?: DeviceState | null;
  enabled: boolean;
} {
  if (state === null || state === undefined)
    return { state: null, enabled: false };
  const raw = String(state).trim();
  const key = raw.toLowerCase().replace(/[_\s]+/g, "-");
  const mapped = allowedStates[key] ?? null;
  if (mapped) {
    return { state: mapped, enabled: mapped.startsWith("Enable") };
  }
  if (/^enable/i.test(raw)) return { state: "Enable", enabled: true };
  return { state: raw || null, enabled: false };
}

function buildHttpFromIp(ip?: string | number | null): string | null {
  if (!ip && ip !== 0) return null;
  const s = String(ip).trim();
  if (/^https?:\/\//i.test(s)) return s;
  // numeric like "77" -> assume 192.168.0.X
  if (/^[0-9]+$/.test(s) && Number(s) >= 0 && Number(s) <= 255) {
    return `http://192.168.0.${s}`;
  }
  // IPv4 dotted
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(s)) {
    return `http://${s}`;
  }
  return null;
}

/**
 * Compute derived fields that are not stored but constructed from base fields.
 * Rules inferred from samples:
 * - hostname: l{level}_{roomSlug}_{function}_{positionSlug}
 * - mqttTopic: home/l{level}/{roomSlug}/{function}/{positionSlug}
 * - dns: hostname + '.domo.in-res.net'
 * - link: built from `ip` (numeric last-octet -> 192.168.0.X ; dotted -> http://IP)
 * - countTopic: stringified `count` if present
 */
export function computeDerivedFields(
  device: Partial<Device>
): ComputedDeviceFields {
  const level =
    typeof device.level === "number"
      ? device.level
      : device.level
        ? Number(device.level)
        : 0;
  const levelPrefix = `l${isNaN(level) ? 0 : level}`;

  const room = sanitizeSlug(device.roomSlug ?? device.roomFr ?? undefined);
  const pos = sanitizeSlug(
    device.positionSlug ?? device.positionFr ?? undefined
  );
  const func = sanitizeSlug(device.function ?? undefined);

  let hostname: string | null = null;
  const hostnameParts: string[] = [];
  if (levelPrefix) hostnameParts.push(levelPrefix);
  if (room) hostnameParts.push(room);
  if (func) hostnameParts.push(func);
  if (pos) hostnameParts.push(pos);
  if (hostnameParts.length) hostname = hostnameParts.join("_");

  const mqttTopic =
    room && func && pos ? `home/${levelPrefix}/${room}/${func}/${pos}` : null;

  const dns = hostname ? `${hostname}.domo.in-res.net` : null;
  const link = buildHttpFromIp(device.ip ?? null);
  const countTopic = hostname ? hostname.length : null;
  const { enabled } = normalizeState(device.state ?? device.status ?? null);

  return { link, mqttTopic, hostname, dns, countTopic, enabled };
}
