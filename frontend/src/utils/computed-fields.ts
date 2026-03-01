/**
 * Computed field calculations for DmDevice.
 *
 * These fields are derived from the device's base data and its hierarchical
 * context (room, level, home). They are NOT stored in the database.
 */
import type { DmDevice, ComputedDeviceFields } from '../types/device';

// Re-export DmDevice alias so callers migrating from old types can use it.
export type { DmDevice, ComputedDeviceFields };

const DNS_SUFFIX = 'domo.in-res.net';
const DEFAULT_IP_PREFIX = '192.168.0';

/**
 * Sanitize a string into a URL-safe slug.
 *
 * @param value - The string to slugify.
 * @returns A lowercase slug or empty string.
 */
export function sanitizeSlug(value?: string | null): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '');
}

/**
 * Build an HTTP URL from an IP address or numeric last octet.
 *
 * @param ip - The IP string (full dotted or numeric last octet).
 * @returns The HTTP URL or null.
 */
export function buildHttpFromIp(ip?: string | null): string | null {
  if (!ip) return null;
  const s = String(ip).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\d+$/.test(s) && Number(s) >= 0 && Number(s) <= 255) {
    return `http://${DEFAULT_IP_PREFIX}.${s}`;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    return `http://${s}`;
  }
  return null;
}

/**
 * Compute all derived fields for a device.
 *
 * @param device - The device (must include transient joined fields like
 *   roomSlug, levelSlug, functionName for meaningful results).
 * @returns The computed fields object.
 */
export function computeDerivedFields(device: Partial<DmDevice>): ComputedDeviceFields {
  const levelSlug = sanitizeSlug(device.levelSlug) || 'l0';
  const roomSlug = sanitizeSlug(device.roomSlug);
  const functionName = sanitizeSlug(device.functionName);
  const posSlug = sanitizeSlug(device.positionSlug);

  // Hostname: l{level}_{roomSlug}_{function}_{positionSlug}
  const hostParts: string[] = [];
  if (levelSlug) hostParts.push(levelSlug);
  if (roomSlug) hostParts.push(roomSlug);
  if (functionName) hostParts.push(functionName);
  if (posSlug) hostParts.push(posSlug);
  const hostname = hostParts.length > 0 ? hostParts.join('_') : null;

  // MQTT topic: home/{levelSlug}/{roomSlug}/{function}/{positionSlug}
  const mqttTopic =
    roomSlug && functionName && posSlug
      ? `home/${levelSlug}/${roomSlug}/${functionName}/${posSlug}`
      : null;

  // FQDN: {hostname}.domo.in-res.net
  const fqdn = hostname ? `${hostname}.${DNS_SUFFIX}` : null;

  // Link: HTTP URL from IP
  const link = buildHttpFromIp(device.ip);

  // Count topic: hostname length
  const countTopic = hostname ? hostname.length : null;

  return { link, mqttTopic, hostname, fqdn, countTopic };
}
