// Time zone and historical UTC offset for a place and local time, in the
// browser: tz-lookup maps coordinates to an IANA zone, and the browser's Intl
// time zone database supplies the offset (including past daylight-saving rules).
import tzlookup from "../vendor/tz-lookup.js";

export function zoneAt(lat, lon) {
  try { return tzlookup(lat, lon); } catch { return null; }
}

const formatters = new Map();

// UTC offset (hours) in force in `zone` at the instant utcMs.
function offsetAtUtc(zone, utcMs) {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric",
      month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
    formatters.set(zone, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (wall - Math.floor(utcMs / 1000) * 1000) / 3600e3;
}

const fmtG = (h) => (h >= 0 ? "+" : "") + String(+h.toFixed(6));

// Offset for local wall time `wall` (ms, see astro.wallMs) in `zone`, plus a
// note when that time was skipped or repeated by a clock change. Ambiguous
// times use the first occurrence; skipped times the offset before the change.
export function offsetFor(zone, wall) {
  const before = offsetAtUtc(zone, wall - 26 * 3600e3);
  const after = offsetAtUtc(zone, wall + 26 * 3600e3);
  const valid = [...new Set([before, after])]
    .filter((o) => offsetAtUtc(zone, wall - o * 3600e3) === o)
    .sort((a, b) => b - a); // larger offset = earlier instant
  const hhmm = new Date(wall).toISOString().slice(11, 16);
  if (valid.length === 2) {
    return { offset: valid[0], note: `${hhmm} occurred twice on this date (clocks went back). Using the first `
      + `occurrence, UTC${fmtG(valid[0])}; enter UTC${fmtG(valid[1])} for the second.` };
  }
  if (valid.length === 1) return { offset: valid[0], note: null };
  return { offset: before, note: `${hhmm} did not exist on this date (clocks went forward). `
    + `Using UTC${fmtG(before)}; check the recorded birth time.` };
}
