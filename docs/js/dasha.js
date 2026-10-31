// Vimshottari dasha: mahadashas and antardashas (bhuktis). Port of app/dasha.py.
//
// A dasha year is measured by the Sun's sidereal motion: t years after birth is
// the moment the Sun has moved t × 360° from its birth longitude. This matches
// JHora's dates exactly; a fixed 365.24-day year drifts by up to 4 days.
import { SE } from "./swe.js";
import { NAK_SPAN, localFromJul, planetLon, wrap180 } from "./astro.js";

const LORDS = ["ketu", "venus", "sun", "moon", "mars", "rahu", "jupiter", "saturn", "mercury"];
const NAMES = { ketu: "Ketu", venus: "Venus", sun: "Sun", moon: "Moon", mars: "Mars",
  rahu: "Rahu", jupiter: "Jupiter", saturn: "Saturn", mercury: "Mercury" };
const YEARS = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
const TOTAL_YEARS = 120;

// Julian day when the Sun has advanced `years` × 360° since birth.
function solarTime(jdBirth, sunBirth, years) {
  const target = (((sunBirth + years * 360) % 360) + 360) % 360;
  let jd = jdBirth + years * 365.2564;
  for (let i = 0; i < 30; i++) {
    const d = wrap180(planetLon(jd, SE.SUN)[0] - target);
    if (Math.abs(d) < 1e-8) break;
    jd -= d / 0.9856;
  }
  return jd;
}

// Mahadashas covering 120 years from the one running at birth, each with its
// nine antardashas. Dates are local (birth time zone) ISO strings.
export function vimshottari(jdBirth, moonLon, offsetHours) {
  const nak = Math.floor(moonLon / NAK_SPAN);
  const elapsed = (moonLon - nak * NAK_SPAN) / NAK_SPAN;
  const first = nak % 9;
  const sunBirth = planetLon(jdBirth, SE.SUN)[0];
  const when = (years) => localFromJul(solarTime(jdBirth, sunBirth, years), offsetHours);

  const periods = [];
  let t = -elapsed * YEARS[LORDS[first]]; // years from birth to the first mahadasha's start
  for (let i = 0; i < 9; i++) {
    const lord = LORDS[(first + i) % 9];
    const length = YEARS[lord];
    const sub = [];
    let s = t;
    for (let j = 0; j < 9; j++) {
      const subLord = LORDS[(first + i + j) % 9];
      const subLen = (length * YEARS[subLord]) / TOTAL_YEARS;
      sub.push({ lord: subLord, name: NAMES[subLord], start: when(s), end: when(s + subLen) });
      s += subLen;
    }
    periods.push({ lord, name: NAMES[lord], years: length, start: when(t), end: when(t + length), antardashas: sub });
    t += length;
  }
  return { balance_years: (1 - elapsed) * YEARS[LORDS[first]], mahadashas: periods };
}
