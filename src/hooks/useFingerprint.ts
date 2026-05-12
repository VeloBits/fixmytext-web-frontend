/**
 * Browser fingerprinting for server-side trial tracking.
 *
 * Combines canvas, screen, timezone, hardware, and WebGL signals into a
 * SHA-256 hash via the WebCrypto API. Falls back to a localStorage-cached
 * random ID if fingerprinting or WebCrypto is unavailable.
 */

const STORAGE_KEY = 'fmx_visitor_id';
let _visitorId = null;
let _initPromise = null;

function getCachedId() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setCachedId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Collect browser-specific signals and produce a SHA-256 fingerprint.
 */
async function generateFingerprint() {
  const components = [];

  // Screen
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware signals
  components.push(String(navigator.hardwareConcurrency || ''));
  components.push(String(navigator.deviceMemory || ''));
  components.push(String(navigator.maxTouchPoints || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('FixMyText', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('FixMyText', 4, 17);
    components.push(canvas.toDataURL());
  } catch {
    components.push('no-canvas');
  }

  // WebGL renderer
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch {
    components.push('no-webgl');
  }

  // Hash via SHA-256 (WebCrypto)
  const raw = components.join('|||');
  try {
    const buf = new TextEncoder().encode(raw);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: simple 32-bit hash for environments without WebCrypto
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36) + raw.length.toString(36);
  }
}

/**
 * Initialize the visitor ID asynchronously (called once at app startup).
 * Returns the ID synchronously after first call.
 */
export async function initVisitorId() {
  const cached = getCachedId();
  if (cached) {
    _visitorId = cached;
    return _visitorId;
  }

  _visitorId = await generateFingerprint();
  setCachedId(_visitorId);
  return _visitorId;
}

/**
 * Get the visitor ID synchronously. Returns cached value or triggers
 * async init on first call.
 */
export function getVisitorId() {
  if (_visitorId) return _visitorId;

  const cached = getCachedId();
  if (cached) {
    _visitorId = cached;
    return _visitorId;
  }

  // Trigger async init if not yet started
  if (!_initPromise) {
    _initPromise = initVisitorId();
  }

  // Return a temporary fallback while async init completes
  return 'pending-' + Date.now().toString(36);
}

/**
 * Reset internal state — test-only helper for module isolation.
 * @internal
 */
export function _resetForTest() {
  _visitorId = null;
  _initPromise = null;
}
