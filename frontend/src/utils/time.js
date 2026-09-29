/**
 * Indian Standard Time (IST - Asia/Kolkata, UTC+5:30) Time Utilities
 * Ensures all telemetry timestamps, session logs, alert feeds, and SIEM records
 * strictly display in standard Indian timings across the PHANTOM interface.
 */

export function parseToDate(input) {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    if (input < 1e11) input *= 1000;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  let str = String(input).trim();
  if (!str) return null;

  // Strip trailing " UTC" indicator if present
  if (str.endsWith(' UTC')) {
    str = str.slice(0, -4).trim();
  }

  // Handle SQLite / ISO formats:
  // e.g. "2026-09-29 01:51:13" or "2026-09-29T01:51:13" -> Treat as UTC (+Z) if no tz specified
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str)) {
    let iso = str.replace(' ', 'T');
    if (!iso.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(iso)) {
      iso += 'Z';
    }
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats timestamp to Indian Standard Time (HH:mm:ss[.SSS] [IST])
 * @param {string|Date|number} input 
 * @param {Object} options - { withMs = false, withSuffix = true }
 * @returns {string} e.g. "07:21:13 IST" or "07:21:13"
 */
export function formatISTTime(input, options = {}) {
  const { withMs = false, withSuffix = true } = options;
  const d = parseToDate(input);
  if (!d) return typeof input === 'string' ? input : '--:--:--';

  const timeStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d);

  const ms = withMs ? `.${String(d.getMilliseconds()).padStart(3, '0')}` : '';
  const suffix = withSuffix ? ' IST' : '';
  return `${timeStr}${ms}${suffix}`;
}

/**
 * Formats timestamp to full Indian date and time
 * @param {string|Date|number} input 
 * @returns {string} e.g. "29 Sep 2026, 07:21:13 IST"
 */
export function formatISTFull(input) {
  const d = parseToDate(input);
  if (!d) return typeof input === 'string' ? input : '--';

  const dateStr = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);

  const timeStr = formatISTTime(d, { withMs: false, withSuffix: true });
  return `${dateStr}, ${timeStr}`;
}

/**
 * Formats timestamp to Indian date only
 * @param {string|Date|number} input 
 * @returns {string} e.g. "29 Sep 2026"
 */
export function formatISTDate(input) {
  const d = parseToDate(input);
  if (!d) return typeof input === 'string' ? input : '--';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
}
