// Monthly observances and eclipses for the Special Days tab.
//
// Observances use the same "first day whose kaala lies in the tithi" rule as
// the festivals (dayFrame.observedOn, with the kshaya fallback):
//  - Amavasya: Amavasya at aparahna, the time for tarpanam.
//  - Pournami: Purnima at sunset, when the full moon rises.
//  - Sankatahara Chaturthi: Krishna Chaturthi at moonrise, when the fast is broken.
//  - Pradosham: Trayodashi (either paksha) at sunset. The puja time shown is
//    the pradosha kaalam of Tamil calendars, 1½ hours before sunset to sunset.
//  - Maasa pirappu: the first day of a Tamil solar month, as in tamilDate.
// Eclipses (grahanam) are listed only when some part of them can be seen from
// the place: a solar eclipse with the Sun above the horizon, a lunar eclipse
// with the Moon above the horizon while it is in the Earth's umbra. Penumbral
// lunar eclipses, which panchangams don't observe, are left out.
import * as swe from "./swe.js";
import { SE, ECL } from "./swe.js";
import { julFromWall, localFromJul, solve } from "./astro.js";
import { SIGN_NAMES, TAMIL_MONTHS, dayFrame, elong, sunLon, tithiAt } from "./festivals.js";

const PRADOSHA_BEFORE_SUNSET = 1.5 / 24; // days

// Observances on the civil day starting at local midnight `dateWall`; see
// festivals.dayFrame for `offset`. Returns [{ kind, month?, paksha?, weekday?, times }].
export function observancesFor(dateWall, lat, lon, offset, frame = dayFrame(dateWall, lat, lon, offset)) {
  const { day, kaala, solarMonth, monthStarts, fmt, window, observedOn, tithiSpan } = frame;
  const d = day(0);
  if (!d) return [];
  const weekday = new Date(dateWall).getUTCDay();
  const month = TAMIL_MONTHS[solarMonth(0, "tamil")];
  const observed = (tithi, k) => observedOn(0, { kaala: k }, (n, jd) => tithiAt(jd) === tithi, elong, 12, 12.19);
  // The tithi's span, found from a moment of day 0 that lies in it.
  const spanIn = (tithi, label) => {
    const w = kaala(0, "sunset");
    const at = [w?.[0], d.sr, (d.sr + d.nsr) / 2, d.nsr - 1e-4].find((jd) => jd && tithiAt(jd) === tithi);
    const [s, e] = tithiSpan(at);
    return { label, start: fmt(s), end: fmt(e) };
  };

  const out = [];
  if (observed(29, "aparahna")) out.push({ kind: "amavasya", month, times: [spanIn(29, "Amavasya")] });
  if (observed(14, "sunset")) out.push({ kind: "pournami", month, times: [spanIn(14, "Purnima")] });
  if (observed(18, "moonrise")) {
    const mr = kaala(0, "moonrise");
    out.push({ kind: "sankatahara", weekday, times: [{ label: "Moonrise", at: fmt(mr[0]) }, spanIn(18, "Krishna Chaturthi")] });
  }
  for (const tithi of [12, 27]) {
    if (!observed(tithi, "sunset")) continue;
    const paksha = tithi < 15 ? "Shukla" : "Krishna";
    out.push({ kind: "pradosham", paksha, weekday, times: [window("Pradosha kaalam", [d.ss - PRADOSHA_BEFORE_SUNSET, d.ss]),
      spanIn(tithi, `${paksha} Trayodashi`)] });
  }
  if (monthStarts(0, "tamil")) {
    const sign = solarMonth(0, "tamil");
    const off = ((sunLon(d.sr) - sign * 30 + 540) % 360) - 180; // degrees past the sign boundary
    const at = solve(sunLon, sign * 30, d.sr - off / 0.9856);
    out.push({ kind: "maasa", month, times: [{ label: `Sun enters ${SIGN_NAMES[sign]} (sankranti)`, at: fmt(at) }] });
  }
  return out;
}

const SOLAR_TYPE = [[ECL.TOTAL, "Total solar eclipse"], [ECL.ANNULAR, "Annular solar eclipse"],
  [ECL.ANNULAR_TOTAL, "Hybrid solar eclipse"], [ECL.PARTIAL, "Partial solar eclipse"]];

// Eclipses visible from the place from local midnight `startWall` for `days`
// days, in date order: [{ date, kind: "solar"|"lunar", type, magnitude,
// times, visible: { start, end, label } }]. `offset` as for dayFrame.
export function eclipsesBetween(startWall, days, lat, lon, offset) {
  const offsetAt = typeof offset === "function" ? offset : () => offset;
  const wallOffset = (ms) => offsetAt(ms - offsetAt(ms) * 3600e3);
  const jd0 = julFromWall(startWall, wallOffset(startWall));
  const endWall = startWall + days * 86400e3;
  const jd1 = julFromWall(endWall, wallOffset(endWall));
  const fmt = (jd) => localFromJul(jd, offsetAt((jd - 2440587.5) * 86400e3));
  const out = [];

  // Solar: the search finds only eclipses seen from the place; its contacts
  // are local, and it gives sunrise or sunset when one falls mid-eclipse.
  // Each search starts after the last maximum; a year has at most 5 eclipses of a kind.
  for (let jd = jd0 - 0.5, i = 0; i < 12; i++) {
    const { flags, tret, attr } = swe.solEclipseWhenLoc(jd, lon, lat);
    const [max, c1, , , c4, rise, set] = tret;
    if (!(max > jd) || c1 > jd1) break;
    jd = max + 1;
    if (!(flags & ECL.VISIBLE)) continue;
    const vs = rise > c1 ? rise : c1, ve = set > 0 && set < c4 ? set : c4;
    if (ve < jd0) continue;
    const type = SOLAR_TYPE.find(([f]) => flags & f)?.[1] || "Partial solar eclipse";
    const times = [{ label: "Begins (sparsha)", at: fmt(c1) }, { label: "Maximum (madhya)", at: fmt(max) },
      { label: "Ends (moksha)", at: fmt(c4) }];
    const label = vs > c1 ? (ve < c4 ? "Visible from sunrise to sunset" : "Visible from sunrise")
      : ve < c4 ? "Visible until sunset" : "Visible throughout";
    out.push({ kind: "solar", type, magnitude: attr[0], obscuration: attr[2], times,
      visible: { start: fmt(vs), end: fmt(ve), label } });
  }

  // Lunar: the times are the same everywhere; the eclipse counts here if the
  // Moon is up at some point while it is in the umbra.
  for (let jd = jd0 - 0.5, i = 0; i < 12; i++) {
    const { flags, tret } = swe.lunEclipseWhen(jd);
    const [max, , pb, pe, tb, te] = tret;
    if (!(max > jd) || tret[6] > jd1) break;
    jd = max + 1;
    if (!pb) continue; // penumbral only
    const v = moonUpDuring(pb, pe, lat, lon);
    if (!v || v[1] < jd0) continue;
    const type = flags & ECL.TOTAL ? "Total lunar eclipse" : "Partial lunar eclipse";
    const times = [{ label: "Begins (sparsha)", at: fmt(pb) },
      ...(tb ? [{ label: "Totality begins", at: fmt(tb) }] : []),
      { label: "Maximum (madhya)", at: fmt(max) },
      ...(te ? [{ label: "Totality ends", at: fmt(te) }] : []),
      { label: "Ends (moksha)", at: fmt(pe) }];
    const label = v[0] > pb ? (v[1] < pe ? "Visible from moonrise to moonset" : "Visible from moonrise")
      : v[1] < pe ? "Visible until moonset" : "Visible throughout";
    out.push({ kind: "lunar", type, times, visible: { start: fmt(v[0]), end: fmt(v[1]), label } });
  }

  for (const e of out) e.date = e.visible.start.slice(0, 10);
  return out.filter((e) => e.date >= localFromJul(jd0, wallOffset(startWall)).slice(0, 10)
    && e.date < localFromJul(jd1, wallOffset(endWall)).slice(0, 10))
    .sort((a, b) => (a.visible.start < b.visible.start ? -1 : 1));
}

// [start, end] of the part of [a, b] with the Moon above the horizon, or null.
function moonUpDuring(a, b, lat, lon) {
  const rise = swe.riseTrans(a, SE.MOON, SE.CALC_RISE, lon, lat);
  const set = swe.riseTrans(a, SE.MOON, SE.CALC_SET, lon, lat);
  if (rise == null && set == null) return null; // polar: the Moon neither rises nor sets that day
  const upAtStart = rise == null || (set != null && set < rise);
  if (upAtStart) return [a, Math.min(b, set ?? b)];
  if (rise >= b) return null;
  const set2 = swe.riseTrans(rise, SE.MOON, SE.CALC_SET, lon, lat);
  return [rise, Math.min(b, set2 ?? b)];
}
