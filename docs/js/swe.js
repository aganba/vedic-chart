// Thin wrapper over the Swiss Ephemeris WebAssembly build (docs/swe/), exposing
// the same calls the Python reference implementation uses via pyswisseph.
import createModule from "../swe/swisseph.mjs";

export const SE = {
  SUN: 0, MOON: 1, MERCURY: 2, VENUS: 3, MARS: 4, JUPITER: 5, SATURN: 6, MEAN_NODE: 10,
  FLG_SWIEPH: 2, FLG_HELCTR: 8, FLG_TRUEPOS: 16, FLG_NONUT: 64, FLG_SPEED: 256,
  FLG_EQUATORIAL: 2048, FLG_SIDEREAL: 65536,
  SIDM_LAHIRI: 1, SIDM_RAMAN: 3, SIDM_KRISHNAMURTI: 5, SIDM_TRUE_CITRA: 27,
  CALC_RISE: 1, CALC_SET: 2,
};

export const EPHE_FILES = ["sepl_18.se1", "semo_18.se1", "sefstars.txt"];

let M = null;
let buf = 0; // scratch memory: 32 doubles + 256-byte error string

// loadFile(name) -> Promise<Uint8Array> supplies ephemeris files (fetch in the
// browser, fs in Node tests).
export async function initSwe(loadFile, moduleOptions = {}) {
  if (M) return;
  const mod = await createModule(moduleOptions);
  mod.FS.mkdir("/ephe");
  await Promise.all(EPHE_FILES.map(async (f) => mod.FS.writeFile(`/ephe/${f}`, await loadFile(f))));
  const path = mod._malloc(16);
  mod.stringToUTF8("/ephe", path, 16);
  mod._swe_set_ephe_path(path);
  mod._free(path);
  buf = mod._malloc(32 * 8 + 256);
  M = mod;
}

const f64 = (i) => M.HEAPF64[(buf >> 3) + i];
const ERR = () => buf + 32 * 8;

export function setSidMode(mode) {
  M._swe_set_sid_mode(mode, 0, 0);
}

export function julday(y, m, d, hour) {
  return M._swe_julday(y, m, d, hour, 1);
}

export function revjul(jd) {
  // ints at buf[0..2] (as int32), double hour at buf+16
  M._swe_revjul(jd, 1, buf, buf + 4, buf + 8, buf + 16);
  const i = buf >> 2;
  return [M.HEAP32[i], M.HEAP32[i + 1], M.HEAP32[i + 2], f64(2)];
}

// [lon, lat, dist, lonSpeed, latSpeed, distSpeed]
export function calcUt(jd, planet, flags) {
  const rc = M._swe_calc_ut(jd, planet, flags, buf, ERR());
  if (rc < 0) throw new Error("swe_calc_ut failed");
  return [f64(0), f64(1), f64(2), f64(3), f64(4), f64(5)];
}

// Returns { cusps: [house1..house12], ascmc: [asc, mc, armc, vertex, ...] }
export function housesEx(jd, lat, lon, hsys, flags = 0) {
  const cusps = buf, ascmc = buf + 13 * 8;
  const rc = M._swe_houses_ex(jd, flags, lat, lon, hsys.charCodeAt(0), cusps, ascmc);
  if (rc < 0) throw new Error("swe_houses_ex failed");
  const c = [], a = [];
  for (let i = 1; i <= 12; i++) c.push(f64(i));
  for (let i = 0; i < 10; i++) a.push(f64(13 + i));
  return { cusps: c, ascmc: a };
}

export function getAyanamsaUt(jd) {
  return M._swe_get_ayanamsa_ut(jd);
}

export function getAyanamsaExUt(jd, flags) {
  const rc = M._swe_get_ayanamsa_ex_ut(jd, flags, buf, ERR());
  if (rc < 0) throw new Error("swe_get_ayanamsa_ex_ut failed");
  return f64(0);
}

// Julian day of the next rise/set after jd, or null (circumpolar).
export function riseTrans(jd, planet, event, lon, lat) {
  const geopos = buf, tret = buf + 3 * 8;
  M.HEAPF64[geopos >> 3] = lon;
  M.HEAPF64[(geopos >> 3) + 1] = lat;
  M.HEAPF64[(geopos >> 3) + 2] = 0;
  const rc = M._swe_rise_trans(jd, planet, 0, SE.FLG_SWIEPH, event, geopos, 0, 0, tret, ERR());
  return rc === 0 ? f64(3) : null;
}
