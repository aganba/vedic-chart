// Browser app: all calculations run locally (Swiss Ephemeris compiled to
// WebAssembly); the only network calls are optional OpenStreetMap place lookups.
import { initSwe } from "./js/swe.js";
import { computeChart, isoFromWall, wallMs } from "./js/astro.js";
import { FESTIVAL_NAMES, NAK_NAMES, TITHI_NAMES, dayFrame, festivalsFor, tamilDate } from "./js/festivals.js";
import { occurrences, threeMonths } from "./js/search.js";
import { eclipsesBetween, observancesFor } from "./js/specialdays.js";
import { EVENTS, muhurthaFor } from "./js/muhurtha.js";
import { tamilMuhurthaFor } from "./js/tamilmuhurtha.js";
import { zoneAt, offsetFor, offsetAtUtc } from "./js/tz.js";
import { loadPlaces, searchPlaces, geocodeOnline, reverseOnline } from "./js/places.js";
import { FOOTER, compass, getLang, monthLong, monthShort, savedLang, setLang, spanUnits, t, tr, tzNote,
  weekday, weekdayShort } from "./js/i18n.js";

const PLACES_URL = "data/places.tsv";
const sweReady = initSwe(async (f) => {
  const res = await fetch(`ephe/${f}`);
  if (!res.ok) throw new Error(`Couldn't load ephemeris data (${f})`);
  return new Uint8Array(await res.arrayBuffer());
});

const $ = (id) => document.getElementById(id);
const SVGNS = "http://www.w3.org/2000/svg";
const FIELDS = ["place", "date", "time", "lat", "lon", "offset"];
// The page always uses the Jagannatha Hora defaults. astro.js still supports the
// other AYANAMSAS and BHAVA_METHODS if a choice is ever offered again.
const AYANAMSA = "true_chitra";
const BHAVA = "equal_mid";

// South Indian chart: signs are fixed. [row, col] for Aries..Pisces.
const SOUTH_POS = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
  [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
];

let offsetManual = false;
let lastChart = null;

// ---------- helpers ----------

function el(tag, attrs = {}, text) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function shortDeg(b) {
  return `${b.dms.deg}°${String(b.dms.min).padStart(2, "0")}′`;
}

function fmtOffset(h) {
  const sign = h < 0 ? "-" : "+";
  const a = Math.abs(h);
  const hh = Math.floor(a);
  const mm = Math.round((a - hh) * 60);
  return `${sign}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function parseOffset(s) {
  s = s.trim();
  if (!s) return null;
  let m = s.match(/^([+-])?(\d{1,2}):(\d{2})$/);
  if (m) return (m[1] === "-" ? -1 : 1) * (Number(m[2]) + Number(m[3]) / 60);
  m = s.match(/^[+-]?\d{1,2}(\.\d+)?$/);
  if (m) return Number(s);
  throw new Error(t("UTC offset should look like +05:30 or -4"));
}

// "2000-01-02T14:39:06" -> "2:39 PM", plus " (2 Jan)" when the date differs from
// refDate. The seconds are computed but only hours and minutes are shown.
function fmtTime(iso, refDate) {
  if (!iso) return "—";
  const [d, tm] = iso.split("T");
  const [h, m] = tm.split(":").map(Number);
  const clock = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  if (d === refDate) return clock;
  const [, mo, day] = d.split("-");
  return `${clock} (${Number(day)} ${monthShort(Number(mo) - 1)})`;
}

// "YYYY-MM-DD" + "HH:MM[:SS]" -> local wall-clock ms (see astro.wallMs).
function wallFromInputs(date, time) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s] = time.split(":").map(Number);
  return wallMs(y, mo, d, h, mi || 0, s || 0);
}

function timezoneFor(lat, lon, date, time) {
  const zone = zoneAt(lat, lon);
  if (!zone) throw new Error(t("No timezone found for these coordinates; enter the UTC offset manually"));
  return { timezone: zone, ...offsetFor(zone, wallFromInputs(date, time)) };
}

let tzNoteText = "";
function showTzNote(msg) {
  tzNoteText = msg || "";
  $("tznote").textContent = tzNote(msg) || "";
  $("tznote").hidden = !msg;
}

function showError(msg) {
  $("error").textContent = msg || "";
  $("error").hidden = !msg;
}

// ---------- defaults from this device ----------

function setNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  setDate(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  setTime(`${p(d.getHours())}:${p(d.getMinutes())}`);
}

// The time pickers: hour 1-12, minute, AM/PM. #time holds the same time as
// 24-hour "HH:MM" for the calculations and shared links.
function initTimePicker() {
  const p = (n) => String(n).padStart(2, "0");
  $("hour").innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  $("minute").innerHTML = Array.from({ length: 60 }, (_, i) => `<option value="${i}">${p(i)}</option>`).join("");
  for (const id of ["hour", "minute", "ampm"]) {
    $(id).addEventListener("change", () => {
      const h = Number($("hour").value) % 12 + ($("ampm").value === "PM" ? 12 : 0);
      $("time").value = `${p(h)}:${p(Number($("minute").value))}`;
      refreshTimezone();
    });
  }
}

// The date pickers: month and day dropdowns and a year box that takes typing or
// a pick from the suggestions. #date holds "YYYY-MM-DD" only while the three
// make a real date within the bundled ephemeris (1800-2399); otherwise it is
// empty, the fields are flagged and Calculate is disabled.
const YEAR_MIN = 1800, YEAR_MAX = 2399;

function labelMonths() {
  const m = $("month"), v = m.value;
  m.innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${esc(monthShort(i))}</option>`).join("");
  m.value = v || "1";
}

function initDatePicker() {
  labelMonths();
  $("day").innerHTML = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
  const now = new Date().getFullYear();
  $("years").innerHTML = Array.from({ length: now + 51 - 1900 }, (_, i) => `<option value="${now + 50 - i}">`).join("");
  for (const id of ["month", "day"]) $(id).addEventListener("change", () => syncDate(true));
  // While typing, keep Calculate disabled but wait for four digits (or leaving
  // the box) before showing a message.
  $("year").addEventListener("input", () => {
    $("year").value = $("year").value.replace(/\D/g, "").slice(0, 4);
    syncDate($("year").value.length === 4);
  });
  $("year").addEventListener("change", () => syncDate(true));
}

// The problem with the entered date, or "" when it is valid.
function dateProblem() {
  const y = $("year").value.trim(), m = Number($("month").value), d = Number($("day").value);
  if (!/^\d{4}$/.test(y)) return { msg: t("Enter the year as four digits."), field: "year" };
  if (y < YEAR_MIN || y > YEAR_MAX) {
    return { msg: t("Year must be between {min} and {max}.", { min: YEAR_MIN, max: YEAR_MAX }), field: "year" };
  }
  const n = new Date(Date.UTC(Number(y), m, 0)).getUTCDate();
  if (d > n) return { msg: t("{month} {year} has only {n} days.", { month: monthLong(m - 1), year: y, n }), field: "day" };
  return null;
}

let dateOk = false;
function syncDate(showMsg) {
  const prob = dateProblem();
  const p = (n) => String(n).padStart(2, "0");
  dateOk = !prob;
  $("date").value = prob ? "" : `${$("year").value}-${p(Number($("month").value))}-${p(Number($("day").value))}`;
  for (const id of ["year", "day"]) {
    const bad = !!prob && prob.field === id && (showMsg || !$("dateerr").hidden);
    $(id).classList.toggle("invalid", bad);
    $(id).setAttribute("aria-invalid", bad);
  }
  if (!prob) $("dateerr").hidden = true;
  else if (showMsg || !$("dateerr").hidden) {
    $("dateerr").textContent = prob.msg;
    $("dateerr").hidden = false;
  }
  if (!$("go").classList.contains("busy")) $("go").disabled = !dateOk;
  if (dateOk) refreshTimezone();
}

// Sets the pickers and #date from "YYYY-MM-DD", flagging it if it isn't valid.
function setDate(v) {
  const m = String(v).trim().match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    $("year").value = m[1];
    $("month").value = String(Math.min(Math.max(Number(m[2]), 1), 12));
    $("day").value = String(Math.min(Math.max(Number(m[3]), 1), 31));
  } else $("year").value = "";
  syncDate(true);
}

// Sets the pickers and #time from "HH:MM" (seconds, if given, are dropped).
function setTime(v) {
  const m = String(v).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return;
  const h = Math.min(Number(m[1]), 23), mi = Math.min(Number(m[2]), 59);
  $("hour").value = String(h % 12 || 12);
  $("minute").value = String(mi);
  $("ampm").value = h < 12 ? "AM" : "PM";
  $("time").value = `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

// "2026-11-01 10:00 AM": the entered date and time, 12-hour clock.
function whenText(c) {
  const date = c.input.local_time.slice(0, 10);
  return `${date} ${fmtTime(c.input.local_time, date)}`;
}

function devicePosition() {
  // Browsers only allow geolocation on https or localhost.
  if (!window.isSecureContext || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (pos) => resolve(pos.coords), () => resolve(null), { timeout: 10000, maximumAge: 600000 }));
}

// Device location if permitted, otherwise the city named by the device's time zone.
async function useDevicePlace() {
  const coords = await devicePosition();
  if (coords) {
    const lat = Number(coords.latitude.toFixed(5)), lon = Number(coords.longitude.toFixed(5));
    let name = t("Current location");
    try { name = (await reverseOnline(lat, lon)) || name; } catch {}
    return { name, lat, lon };
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const city = tz.split("/").pop().replace(/_/g, " ");
  if (!city || tz.startsWith("Etc")) return null;
  try {
    await loadPlaces(PLACES_URL);
    const [r] = searchPlaces(city);
    return r ? { name: t("{city} (from device time zone)", { city }), lat: r.lat, lon: r.lon } : null;
  } catch { return null; }
}

async function resetToNow() {
  setNow();
  $("place").value = t("Locating…");
  const place = await useDevicePlace();
  if (!place) {
    $("place").value = "";
    return showError(t("Couldn't determine this device's location. Search for a place."));
  }
  $("place").value = place.name;
  $("lat").value = place.lat;
  $("lon").value = place.lon;
  offsetManual = false;
  await refreshTimezone();
  calculate();
}

// ---------- place & timezone ----------

let suggestSeq = 0;
let suggestTimer = null;

function pickPlace(r) {
  $("place").value = r.name;
  $("lat").value = r.lat;
  $("lon").value = r.lon;
  $("results").hidden = true;
  offsetManual = false;
  refreshTimezone();
}

function showResults(results, emptyMsg) {
  const list = $("results");
  list.innerHTML = "";
  if (!results.length) {
    if (!emptyMsg) { list.hidden = true; return; }
    list.innerHTML = `<li class="empty">${esc(emptyMsg)}</li>`;
  }
  for (const r of results) {
    const li = document.createElement("li");
    li.textContent = r.name;
    if (r.also) {
      const aka = document.createElement("span");
      aka.className = "muted";
      aka.textContent = ` (${r.also})`;
      li.appendChild(aka);
    }
    li.addEventListener("mousedown", (e) => { e.preventDefault(); pickPlace(r); });
    li._place = r;
    list.appendChild(li);
  }
  list.hidden = false;
}

// Autocomplete from the offline town list as the user types.
function suggestPlaces() {
  clearTimeout(suggestTimer);
  const q = $("place").value.trim();
  if (q.length < 2) { $("results").hidden = true; return; }
  suggestTimer = setTimeout(async () => {
    const seq = ++suggestSeq;
    try {
      await loadPlaces(PLACES_URL);
      const results = searchPlaces(q);
      if (seq === suggestSeq) showResults(results, "");
    } catch {}
  }, 120);
}

function moveActive(step) {
  const items = [...$("results").querySelectorAll("li:not(.empty)")];
  if ($("results").hidden || !items.length) return;
  const cur = items.findIndex((li) => li.classList.contains("active"));
  const next = (cur + step + items.length) % items.length;
  items.forEach((li, i) => li.classList.toggle("active", i === next));
  items[next].scrollIntoView({ block: "nearest" });
}

function onPlaceKey(e) {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    moveActive(e.key === "ArrowDown" ? 1 : -1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const active = $("results").hidden ? null : $("results").querySelector("li.active");
    if (active) pickPlace(active._place);
    else searchPlace();
  } else if (e.key === "Escape") {
    $("results").hidden = true;
  }
}

// Online lookup (OpenStreetMap) for villages and addresses not in the town list.
async function searchPlace() {
  const q = $("place").value.trim();
  if (q.length < 2) return;
  clearTimeout(suggestTimer);
  suggestSeq++;
  showError("");
  $("search").disabled = true;
  try {
    const results = await geocodeOnline(q);
    showResults(results.map((r) => ({ ...r, name: r.name.split(",").slice(0, 3).join(",") })),
      t("No matches. Try “City, Country”."));
  } catch (e) {
    showError(e.message);
  } finally {
    $("search").disabled = false;
  }
}

async function refreshTimezone() {
  if (offsetManual) return;
  const lat = $("lat").value, lon = $("lon").value, date = $("date").value;
  if (lat === "" || lon === "" || !date) return;
  try {
    const tz = timezoneFor(Number(lat), Number(lon), date, $("time").value || "12:00");
    $("offset").value = fmtOffset(tz.offset);
    $("tzname").textContent = `(${tz.timezone})`;
    showTzNote(tz.note);
  } catch (e) {
    $("tzname").textContent = "";
    showTzNote("");
  }
}

// ---------- charts ----------

function drawSouthChart(svg, boxes, lagnaSign, centerLines) {
  svg.innerHTML = "";
  const S = 100;
  svg.appendChild(el("rect", { x: 1, y: 1, width: 398, height: 398, class: "frame" }));
  for (let sign = 0; sign < 12; sign++) {
    const [r, c] = SOUTH_POS[sign];
    const x = c * S, y = r * S;
    svg.appendChild(el("rect", { x, y, width: S, height: S, class: "cell" }));
    svg.appendChild(el("text", { x: x + S - 5, y: y + S - 6, "text-anchor": "end", class: "signlbl" },
      tr(lastChart.constants.sign_abbr[sign], "signAbbr")));
    if (sign === lagnaSign) {
      svg.appendChild(el("line", { x1: x, y1: y + 14, x2: x + 14, y2: y, class: "lagna-mark" }));
    }
    const items = boxes[sign] || [];
    const crowded = items.length > 5;
    const fs = crowded ? 10 : 12, lh = crowded ? 12.5 : 15;
    items.forEach((it, i) => {
      const t = el("text", {
        x: x + 9, y: y + 22 + i * lh, class: `pl${it.cls ? " " + it.cls : ""}`, "font-size": fs,
      });
      t.appendChild(el("tspan", { class: "nm" }, it.label));
      t.appendChild(el("tspan", { class: "deg", dx: 4 }, it.deg));
      svg.appendChild(t);
    });
  }
  // merged centre
  centerLines.forEach((line, i) => {
    svg.appendChild(el("text", {
      x: 200, y: 185 + i * 18 - (centerLines.length - 2) * 9, "text-anchor": "middle",
      class: i === 0 ? "center1" : "center2",
    }, line));
  });
}

function chartItem(b) {
  return {
    label: tr(b.key === "lagna" ? "Asc" : b.abbr, "planetAbbr") + (b.retro ? `(${t("R")})` : ""),
    deg: shortDeg(b),
    cls: b.key === "lagna" ? "lagna" : b.retro ? "retro" : "",
  };
}

function renderCharts(c) {
  const when = `${whenText(c)} (UTC${fmtOffset(c.input.utc_offset)})`;

  const rasiBoxes = {};
  for (const b of c.bodies) (rasiBoxes[b.sign] ||= []).push(chartItem(b));
  drawSouthChart($("rasi"), rasiBoxes, c.lagna_sign, [t("Rasi"), when]);

  // Navamsa: degrees within D1 don't carry over, so show names only.
  const navBoxes = {};
  for (const b of c.bodies) (navBoxes[b.navamsa] ||= []).push({ ...chartItem(b), deg: "" });
  const lagnaNav = c.bodies.find((b) => b.key === "lagna").navamsa;
  drawSouthChart($("navamsa"), navBoxes, lagnaNav, [t("Navamsa"), when]);
}

// ---------- tables & panchanga ----------

function renderSummary(c) {
  const lat = c.input.lat, lon = c.input.lon;
  const coord = `${Math.abs(lat).toFixed(4)}°${compass(lat >= 0 ? "N" : "S")}, ${Math.abs(lon).toFixed(4)}°${compass(lon >= 0 ? "E" : "W")}`;
  $("summary").innerHTML = `
    <strong>${esc($("place").value || t("Chart"))}</strong>
    <span>${esc(whenText(c))} · UTC${fmtOffset(c.input.utc_offset)}${c.input.timezone ? " · " + esc(c.input.timezone) : ""}</span>
    <span>${coord}</span>
    <span>${esc(t("Ayanamsa: {name} = {value}", { name: tr(c.settings.ayanamsa_label, "ayanamsa"),
      value: `${c.settings.ayanamsa_deg}° ${c.settings.ayanamsa_dms.replace(/^\d+° /, "")}` }))}</span>`;
}

function renderPanchanga(c) {
  const p = c.panchanga;
  const ref = c.input.local_time.slice(0, 10);
  // Calendar (Gregorian) weekday of the entered date, beside the Vedic vara,
  // which runs sunrise to sunrise and so differs before sunrise.
  const [cy, cm, cd] = ref.split("-").map(Number);
  const civilDay = new Date(Date.UTC(cy, cm - 1, cd)).getUTCDay();
  const nak = (n) => t("{nak} pada {pada}", { nak: tr(n.name, "nakshatra"), pada: n.pada });
  const zone = c.input.timezone;
  const td = tamilDate(wallFromInputs(ref, "00:00"), c.input.lat, c.input.lon,
    zone ? (ms) => offsetAtUtc(zone, ms) : c.input.utc_offset);
  const items = [
    [t("Day"), weekday(civilDay), t("{date} (calendar date)", { date: `${cd} ${monthShort(cm - 1)} ${cy}` })],
    ...(td ? [[t("Tamil date"), `${tr(td.month, "tamilMonth")} ${td.day}`,
      t("{year} year (Tamil calendar, from Chithirai)", { year: tr(td.year, "samvatsara") })]] : []),
    [t("Vara (Vedic day)"), `${tr(p.vara.sanskrit, "vara")} · ${tr(p.vara.name, "weekday")}`,
      p.sunrise ? t("Vedic day runs sunrise to sunrise; this date's sunrise is {t}", { t: fmtTime(p.sunrise, ref) })
        : t("Vedic day runs sunrise to sunrise")],
    [t("Tithi"), `${tr(p.tithi.paksha, "paksha")} ${tr(p.tithi.name, "tithi")}`,
      t("{pct}% left · ends {t}", { pct: p.tithi.pct_left, t: fmtTime(p.tithi.end, ref) })],
    [t("Nakshatra"), nak(p.nakshatra), t("{pct}% left · ends {t} · lord {lord}",
      { pct: p.nakshatra.pct_left, t: fmtTime(p.nakshatra.end, ref), lord: tr(p.nakshatra.lord, "planet") })],
    [t("Yoga"), tr(p.yoga.name, "yoga"), t("ends {t}", { t: fmtTime(p.yoga.end, ref) })],
    [t("Karana"), tr(p.karana.name, "karana"), t("ends {t}", { t: fmtTime(p.karana.end, ref) })],
    ...(p.hora ? [[t("Hora"), tr(p.hora.lord, "planet"),
      t("{from} – {to} · next {lord}", { from: fmtTime(p.hora.start, ref),
        to: fmtTime(p.hora.end, ref), lord: tr(p.hora.next_lord, "planet") })]] : []),
    [t("Lunar month / year"), tr(p.masa, "masa"), t("{year} samvatsara (amanta)", { year: tr(p.samvatsara, "samvatsara") })],
    [t("Sunrise / Sunset"), `${fmtTime(p.sunrise, ref)} / ${fmtTime(p.sunset, ref)}`, t("next sunrise {t}", { t: fmtTime(p.next_sunrise, ref) })],
  ];
  if (p.rahu_kalam) {
    items.push([t("Rahu Kalam"), `${fmtTime(p.rahu_kalam.start, ref)} – ${fmtTime(p.rahu_kalam.end, ref)}`, ""]);
    items.push([t("Yamaganda"), `${fmtTime(p.yamaganda.start, ref)} – ${fmtTime(p.yamaganda.end, ref)}`, ""]);
    items.push([t("Gulika Kalam"), `${fmtTime(p.gulika_kalam.start, ref)} – ${fmtTime(p.gulika_kalam.end, ref)}`, ""]);
    items.push([`${t("Abhijit Muhurtha")}*`, `${fmtTime(p.abhijit.start, ref)} – ${fmtTime(p.abhijit.end, ref)}`, ""]);
  }
  $("panchanga").innerHTML = items.map(([k, v, s]) =>
    `<div><dt>${esc(k)}</dt><dd>${esc(v)}${s ? `<small>${esc(s)}</small>` : ""}</dd></div>`).join("");
  $("panchangaNote").textContent = p.abhijit ? t("* Abhijit Muhurtha: a good time for all activities, according to Dr. B. V. Raman.") : "";
}

// Festivals on the entered date (with timings) and in the next 7 days, as a
// banner at the top of the Panchanga tab, festivals for the year from the
// entered date in the Festivals tab, and the year's muhurtham times and the
// events they suit in the Auspicious Days tab. The year is computed in small chunks after
// the main render so the page stays responsive; the banner fills in once the
// first 7 days are done.
const UPCOMING_DAYS = 7;
const YEAR_DAYS = 366; // the entered date and the 365 days after it
const SPECIAL_DAYS = 61; // special days: the entered date and the 60 days after it
const MUHURTHA_DAYS = 183; // muhurthams: the entered date and the 182 days after it (about six months)
const CHUNK_DAYS = 8;
// Results so far for the current chart; kept so a language switch can redraw
// them without recalculating.
let fest = null;

// An Upakarma on a lunar eclipse day gets an asterisk, explained by eclipseFootnote.
const ECLIPSE_NOTE = "* A lunar eclipse falls on this day, and some panchangams move the Upakarma because of it. Check the date with your temple.";
function festivalNames(festivals) {
  return festivals.map((f) => esc(tr(f.name, "festival")) + (f.eclipse ? "*" : "")).join(" · ");
}
const eclipseFootnote = (festivals) =>
  (festivals.some((f) => f.eclipse) ? `<p class="hint eclipse-footnote">${esc(t(ECLIPSE_NOTE))}</p>` : "");

function festivalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = weekdayShort(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
  return { y, m, d, label: `${wd} ${d} ${monthShort(m - 1)}` };
}

function renderFestivals(c) {
  const ref = c.input.local_time.slice(0, 10);
  const midnight = Math.floor(wallFromInputs(ref, "00:00") / 86400e3) * 86400e3;
  fest = {
    c, ref, midnight, found: [], muhurthas: [], tamilMuhurthas: [], observances: [], eclipses: null, done: 0, failed: false,
    cut: isoFromWall(midnight + (UPCOMING_DAYS + 1) * 86400e3).slice(0, 10),
    muhurthaCut: isoFromWall(midnight + MUHURTHA_DAYS * 86400e3).slice(0, 10),
  };
  const state = fest;
  // With a detected timezone each day gets the offset in force then (DST);
  // a manually entered offset is used for every day.
  const zone = c.input.timezone;
  const offset = zone ? (ms) => offsetAtUtc(zone, ms) : c.input.utc_offset;
  state.offset = offset;
  try {
    state.eclipses = eclipsesBetween(midnight, SPECIAL_DAYS, c.input.lat, c.input.lon, offset);
  } catch {
    state.eclipses = [];
    state.eclipseFailed = true;
  }
  drawFestivals();

  const step = () => {
    if (state !== fest) return; // a newer chart replaced this one
    try {
      const end = Math.min(state.done + CHUNK_DAYS, YEAR_DAYS);
      for (; state.done < end; state.done++) {
        const w = midnight + state.done * 86400e3;
        const date = isoFromWall(w).slice(0, 10);
        const frame = dayFrame(w, c.input.lat, c.input.lon, offset);
        const festivals = festivalsFor(w, c.input.lat, c.input.lon, offset, frame);
        if (festivals.length) state.found.push({ date, festivals });
        if (state.done < SPECIAL_DAYS) {
          for (const o of observancesFor(w, c.input.lat, c.input.lon, offset, frame)) state.observances.push({ date, ...o });
        }
        if (state.done < MUHURTHA_DAYS) {
          const m = muhurthaFor(w, c.input.lat, c.input.lon, offset);
          if (m) state.muhurthas.push({ date, m });
          const tm = tamilMuhurthaFor(w, c.input.lat, c.input.lon, offset);
          if (tm) state.tamilMuhurthas.push({ date, m: tm });
        }
      }
    } catch {
      state.failed = true;
    }
    drawFestivals();
    if (!state.failed && state.done < YEAR_DAYS) setTimeout(step, 0);
  };
  setTimeout(step, 30);
}

// Special Days tab: one colour-coded card per kind of day, in this order, all on
// one page. The eclipse card is left out when no eclipse can be seen.
const SPECIAL_CARDS = [
  ["eclipse", "Eclipses (grahanam)", "Only eclipses that can be seen from this place are listed, with their local times; penumbral lunar eclipses, which panchangams don't observe, are left out. The eclipse can't be seen while the Sun or Moon is below the horizon."],
  ["amavasya", "Amavasya", "The day Amavasya prevails in the afternoon (aparahna), when tarpanam is offered."],
  ["pournami", "Pournami", "The day Purnima prevails at sunset, when the full moon rises."],
  ["maasa", "Maasa pirappu", "The first day of each Tamil month, with the moment the Sun enters the new sign."],
  ["sankatahara", "Sankatahara Chaturthi", "The day Krishna Chaturthi prevails at moonrise; the fast ends after sighting the moon."],
  ["pradosham", "Pradosham", "The day Trayodashi prevails at sunset. Pradosha kaalam is 1½ hours before sunset to sunset, as in Tamil calendars."],
];

function specialTitle(o) {
  const month = o.month && tr(o.month, "tamilMonth");
  switch (o.kind) {
    case "eclipse": return t(o.type);
    case "amavasya": return t("{month} Amavasya", { month });
    case "pournami": return t("{month} Pournami", { month });
    case "maasa": return t("{month} month begins", { month });
    case "sankatahara": return o.weekday === 2 ? t("Angaraka Sankatahara Chaturthi") : t("Sankatahara Chaturthi");
    case "pradosham": {
      const name = t("{paksha} Pradosham", { paksha: tr(o.paksha, "paksha") });
      const day = { 1: "Soma Pradosham", 6: "Shani Pradosham" }[o.weekday];
      return day ? `${name} · ${t(day)}` : name;
    }
  }
  return "";
}

function drawSpecialDays(timeText, status) {
  const { ref, observances, eclipses, eclipseFailed } = fest;
  const items = { eclipse: (eclipses || []).map((e) => ({ ...e, kind: "eclipse" })) };
  for (const o of observances) (items[o.kind] ||= []).push(o);
  const row = (o) => {
    const fd = festivalDate(o.date);
    const extra = [];
    if (o.kind === "eclipse") {
      if (o.obscuration) extra.push(esc(t("{pct}% of the Sun covered", { pct: Math.round(o.obscuration * 100) })));
      extra.push(`${esc(t(o.visible.label))}: <strong>${fmtTime(o.visible.start, o.date)} – ${fmtTime(o.visible.end, o.date)}</strong>`);
    }
    const times = [...o.times.map((tt) => timeText(tt, o.date)), ...extra];
    return `<li${o.date === ref ? ' class="today"' : ""}><span class="upcoming-date">${fd.label}</span><div>`
      + `<div class="sd-title">${esc(specialTitle(o))}</div>`
      + `<div class="upcoming-times">${times.map((x) => `<span class="sd-time">${x}</span>`).join("")}</div></div></li>`;
  };
  // A year heading only where the list runs into the next year.
  const list = (rows) => {
    let html = "", year = Number(ref.slice(0, 4));
    for (const o of rows) {
      const y = Number(o.date.slice(0, 4));
      if (y !== year) { html += `<li class="sd-year">${y}</li>`; year = y; }
      html += row(o);
    }
    return `<ul class="upcoming-list special-list">${html}</ul>`;
  };
  $("specialDays").innerHTML = SPECIAL_CARDS.map(([kind, title, hint]) => {
    const rows = items[kind] || [];
    let body;
    if (kind === "eclipse") {
      if (!eclipseFailed && !rows.length) return "";
      body = eclipseFailed ? `<p class="hint">${esc(t("Couldn't calculate eclipses."))}</p>` : list(rows);
    } else {
      body = (rows.length ? list(rows) : "") + (status ? `<p class="hint">${esc(status)}</p>` : "");
    }
    return `<section class="card special-card sd-${kind}" aria-labelledby="sdhead-${kind}">`
      + `<h3 class="sd-heading" id="sdhead-${kind}">${esc(t(title))}</h3>`
      + `<p class="hint sd-hint">${esc(t(hint))}</p>${body}</section>`;
  }).join("");
}

// Draws the Panchanga-tab banners and the Festivals, Special Days and Auspicious Days lists from `fest`.
function drawFestivals() {
  if (!fest) return;
  const { c, ref, found, muhurthas, done, failed, cut } = fest;
  const list = c.panchanga.festivals || [];
  const bannerReady = done > UPCOMING_DAYS;
  const hm = (iso, on = ref) => fmtTime(iso, on);
  const timeText = (tt, day = ref) =>
    `${esc(tr(tt.label, "label"))}: <strong>${tt.at ? hm(tt.at, day) : `${hm(tt.start, day)} – ${hm(tt.end, day)}`}</strong>`;
  const note = (msg) => `<div class="festival-note">${esc(msg)}</div>`;

  // The entered date's festivals under a "Today" (or "On <date>") tag, then the next 7 days.
  const offsetNow = typeof fest.offset === "function" ? fest.offset(Date.now()) : fest.offset;
  const isToday = isoFromWall(Date.now() + offsetNow * 3600e3).slice(0, 10) === ref;
  const dayTag = `<div class="upcoming-title">${esc(isToday ? t("Today") : t("On {date}", { date: festivalDate(ref).label }))}</div>`;
  const today = list.map((f, i) => `
    <div class="festival">${i ? "" : dayTag}
      <div class="festival-name">${festivalNames([f])}</div>
      ${f.times.map((tt) => `<div class="festival-time">${timeText(tt)}</div>`).join("")}
      ${f.note ? `<div class="festival-note">${esc(tr(f.note, "note"))}</div>` : ""}
      ${f.eclipse ? `<div class="festival-note">${esc(t(ECLIPSE_NOTE))}</div>` : ""}
    </div>`).join("");
  const upTitle = `<div class="upcoming-title">${esc(t("Coming up (next {n} days)", { n: UPCOMING_DAYS }))}</div>`;
  let upcoming;
  if (!bannerReady) upcoming = failed ? note(t("Couldn't calculate upcoming festivals.")) : note(t("Checking…"));
  else {
    const rows = found.filter((u) => u.date !== ref && u.date < cut).map((u) => {
      const items = u.festivals.map((f) => `<div class="upcoming-festival">${festivalNames([f])}${f.times.length
        ? `<div class="upcoming-times">${f.times.map((tt) => `<span class="upcoming-time">${timeText(tt, u.date)}</span>`).join("")}</div>` : ""}</div>`).join("");
      return `<li><span class="upcoming-date">${festivalDate(u.date).label}</span><div>${items}</div></li>`;
    });
    const shown = found.filter((u) => u.date !== ref && u.date < cut).flatMap((u) => u.festivals);
    upcoming = rows.length ? `<ul class="upcoming-list">${rows.join("")}</ul>${eclipseFootnote(shown)}`
      : note(t("No festivals in the next {n} days.", { n: UPCOMING_DAYS }));
  }
  $("festivals").innerHTML = today + `<div class="festival upcoming" id="upcoming">${upTitle}${upcoming}</div>`;
  $("festivals").hidden = false;

  // Festivals tab: the year, month by month.
  const status = failed ? t("Couldn't calculate the remaining festivals.")
    : done < YEAR_DAYS ? t("Calculating…") : "";
  const byMonth = (items, ulClass, row) => {
    let html = "", month = "";
    for (const u of items) {
      const fd = festivalDate(u.date);
      const key = `${fd.y}-${fd.m}`;
      if (key !== month) {
        html += `${month ? "</ul>" : ""}<h3 class="year-month">${monthLong(fd.m - 1)} ${fd.y}</h3><ul class="${ulClass}">`;
        month = key;
      }
      html += row(u);
    }
    return month ? html + "</ul>" : html;
  };
  $("festivalYear").innerHTML = byMonth(found, "upcoming-list", (u) =>
    `<li${u.date === ref ? ' class="today"' : ""}><span class="upcoming-date">${festivalDate(u.date).label}</span><div>${
      u.festivals.map((f) => `<div>${festivalNames([f])}</div>`).join("")}</div></li>`)
    + eclipseFootnote(found.flatMap((u) => u.festivals))
    + (status ? `<p class="hint">${esc(status)}</p>` : !found.length ? `<p class="hint">${esc(t("No festivals found."))}</p>` : "");
  drawSpecialDays(timeText, failed ? t("Couldn't calculate the remaining special days.")
    : done < SPECIAL_DAYS ? t("Calculating…") : "");
  // Auspicious Days: the first MUHURTHA_DAYS days only.
  const mStatus = failed ? t("Couldn't calculate muhurtham days.") : done < MUHURTHA_DAYS ? t("Calculating…") : "";
  // Vijayadashami counts for every event; it gets its own row if the rules don't pick it.
  const vijaya = new Set(found.filter((u) => u.date < fest.muhurthaCut && u.festivals.some((f) => f.name === VIJAYADASHAMI)).map((u) => u.date));
  const listed = new Set(muhurthas.map((u) => u.date));
  const rows = [...muhurthas, ...[...vijaya].filter((d) => !listed.has(d)).map((date) => ({ date, m: null }))]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  $("muhurthaYear").innerHTML = muhurthaTable(rows, ref, hm, vijaya)
    + (mStatus ? `<p class="hint">${esc(mStatus)}</p>` : !rows.length ? `<p class="hint">${esc(t("No auspicious days found."))}</p>` : "");
  const tamil = fest.tamilMuhurthas;
  $("tamilMuhurthaYear").innerHTML = tamilMuhurthaTable(tamil, ref, hm)
    + (mStatus ? `<p class="hint">${esc(mStatus)}</p>` : !tamil.length ? `<p class="hint">${esc(t("No auspicious days found."))}</p>` : "");
}

// The month heading row of the muhurtham tables, when `date` starts a new month.
function monthRow(date, state, cols) {
  const fd = festivalDate(date), key = `${fd.y}-${fd.m}`;
  if (key === state.month) return "";
  state.month = key;
  return `<tr class="month-row"><th colspan="${cols}" scope="colgroup">${monthLong(fd.m - 1)} ${fd.y}</th></tr>`;
}

// Tamil calendar sub-tab: a row per day with its panchangam and each time with its lagna.
function tamilMuhurthaTable(rows, ref, hm) {
  if (!rows.length) return "";
  let body = "";
  const months = { month: "" };
  for (const { date, m } of rows) {
    body += monthRow(date, months, 3);
    const today = date === ref;
    const day = [tr(m.paksha, "paksha"), tr(m.tithi, "tithi"), tr(m.nakshatra, "nakshatra"), tr(m.yogam, "dayYoga")].map(esc).join(" · ");
    const times = m.windows.map((w) => `<span class="mt-time">${hm(w.start, date)} – ${hm(w.end, date)}`
      + `<span class="mt-lagna">${esc(t("{lagna} lagna", { lagna: tr(w.lagna, "sign") }))}</span></span>`).join("");
    body += `<tr class="first${today ? " today" : ""}"><th scope="row" class="mt-date">${festivalDate(date).label}`
      + `${today ? `<small>${esc(t("today"))}</small>` : ""}</th><td class="mt-day">${day}</td><td class="mt-times">${times}</td></tr>`;
  }
  return `<div class="table-wrap"><table class="muhurtha-table"><thead><tr><th scope="col">${esc(t("Date"))}</th>`
    + `<th scope="col">${esc(t("Day"))}</th><th scope="col">${esc(t("Times"))}</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

// Auspicious Days sub-tabs: Dr. B. V. Raman's method and the Tamil calendar list.
const MUHURTHA_KEY = "vedic-chart-muhurtha-tab";
const MUHURTHA_TABS = ["raman", "tamil"];
function selectMuhurthaTab(kind, focus) {
  if (!MUHURTHA_TABS.includes(kind)) kind = MUHURTHA_TABS[0];
  try { localStorage.setItem(MUHURTHA_KEY, kind); } catch {}
  for (const k of MUHURTHA_TABS) {
    const b = $(`mttab-${k}`), on = k === kind;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
    $(`mtpanel-${k}`).hidden = !on;
  }
}

// Auspicious Days tab: one table for the year, a heading row per month, and per
// day a row for each set of events with the times that suit them.
const EVENT_CLASS = Object.fromEntries(EVENTS.map(([name], i) => [name, `ev${i}`]));
const VIJAYADASHAMI = "Vijayadashami / Dussehra";
// `rows`: [{ date, m }], m null for a Vijayadashami the rules don't pick; `vijaya`: its dates.
function muhurthaTable(rows, ref, hm, vijaya) {
  if (!rows.length) return "";
  let body = "";
  const months = { month: "" };
  for (const { date, m } of rows) {
    const fd = festivalDate(date);
    body += monthRow(date, months, 3);
    // Windows grouped by the events they suit, in the order the groups first appear.
    const groups = new Map();
    if (!m) groups.set("", { all: true, events: [], times: [`<span class="mt-time">${esc(t("All day"))}</span>`] });
    for (const w of m?.windows || []) {
      const k = w.events.join("|");
      if (!groups.has(k)) groups.set(k, { events: w.events, times: [] });
      groups.get(k).times.push(`<span class="mt-time">${hm(w.start, date)} – ${hm(w.end, date)}</span>`);
    }
    const today = date === ref ? " today" : "";
    const notes = (vijaya.has(date) ? `<small class="mt-festival">${esc(tr(VIJAYADASHAMI, "festival"))}</small>` : "")
      + (today ? `<small>${esc(t("today"))}</small>` : "");
    [...groups.values()].forEach((g, i) => {
      const tags = g.all ? `<span class="event-tag ev-all">${esc(t("All events"))}</span>`
        : g.events.map((e) => `<span class="event-tag ${EVENT_CLASS[e]}">${esc(t(e))}</span>`).join("");
      body += `<tr class="${i ? "more" : "first"}${today}">`
        + (i ? "" : `<th scope="rowgroup" rowspan="${groups.size}" class="mt-date">${fd.label}${notes}</th>`)
        + `<td><div class="mt-events">${tags}</div></td><td class="mt-times">${g.times.join("")}</td></tr>`;
    });
  }
  return `<div class="table-wrap"><table class="muhurtha-table"><thead><tr><th scope="col">${esc(t("Date"))}</th>`
    + `<th scope="col">${esc(t("Good for"))}</th><th scope="col">${esc(t("Times"))}</th></tr></thead><tbody>${body}</tbody></table></div>`;
}


function renderPositions(c) {
  const signs = c.constants.signs, abbr = c.constants.sign_abbr;
  const rows = c.bodies.map((b) => `
    <tr class="${b.key === "lagna" ? "lagna" : ""}">
      <td>${esc(tr(b.name, "planet"))}${b.retro ? `<span class="retro-tag" title="${esc(t("Retrograde"))}">${esc(t("R"))}</span>` : ""}</td>
      <td>${esc(tr(signs[b.sign], "sign"))}</td>
      <td class="num">${esc(b.dms.text)}</td>
      <td>${esc(tr(b.nakshatra.name, "nakshatra"))}</td>
      <td>${b.nakshatra.pada}</td>
      <td>${esc(tr(b.nakshatra.lord, "planet"))}</td>
      <td>${esc(tr(abbr[b.navamsa], "signAbbr"))}</td>
      <td>${esc(tr(b.karaka || "", "karaka"))}</td>
    </tr>`).join("");
  $("positions").innerHTML = `
    <thead><tr>${["Body", "Rasi", "Longitude|table", "Nakshatra", "Pada", "Nak. lord", "Navamsa", "Karaka"]
      .map((h) => `<th>${esc(t(h))}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderBhavaTable(c) {
  const abbr = c.constants.sign_abbr;
  const occupants = {};
  for (const b of c.bodies) if (b.key !== "lagna") (occupants[b.house] ||= []).push(tr(b.abbr, "planetAbbr"));
  const cell = (sign, d) => `<td class="num">${esc(tr(abbr[sign], "signAbbr"))} ${esc(d.text)}</td>`;
  const rows = c.bhavas.map((h) => `
    <tr><td>${h.house}</td>${cell(h.start_sign, h.start_dms)}${cell(h.mid_sign, h.mid_dms)}${cell(h.end_sign, h.end_dms)}
    <td>${esc((occupants[h.house] || []).join(", "))}</td></tr>`).join("");
  $("bhavaTable").innerHTML = `
    <thead><tr>${["House", "Start (sandhi)", "Middle (madhya)", "End", "Planets"]
      .map((h) => `<th>${esc(t(h))}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>`;
  $("bhavaLabel").textContent = `· ${tr(c.settings.bhava_label, "bhava")}`;
}

// ---------- search tab ----------

// Festival: its dates in a Gregorian year. Tithi or nakshatra: every
// occurrence in a Gregorian month and the months either side of it. Always for
// the place of the last calculation; results update as the choices change.
const SEARCH_KINDS = ["festival", "tithi", "nakshatra"];
const SEARCH_PARAMS = ["search", "festival", "tithi", "nakshatra", "month", "year"];
const SEARCH_YEARS = 20; // years either side of the current one
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Tithi names only; the results give both pakshas.
const TITHI_CHOICES = [...TITHI_NAMES.map((name, i) => ({ name, indexes: [i, i + 15] })),
  { name: "Purnima", indexes: [14] }, { name: "Amavasya", indexes: [29] }];
const thisYear = new Date().getFullYear();
const query = { kind: "festival", festival: "", tithi: "", nakshatra: "", month: new Date().getMonth() + 1, year: thisYear };
let searchView = null; // what drawSearch shows
let searchStale = true; // the choices or place changed while the tab was hidden
// Festival scans of a whole year, by place and year, so another festival in
// the same year shows at once.
const festivalYears = new Map();

function searchPlaceOf(c) {
  const zone = c.input.timezone;
  return { lat: c.input.lat, lon: c.input.lon, name: c.input.place || "",
    offset: zone ? (ms) => offsetAtUtc(zone, ms) : c.input.utc_offset,
    key: `${c.input.lat},${c.input.lon},${zone || c.input.utc_offset}` };
}

function options(list, chosen, placeholder) {
  return (placeholder != null ? `<option value="">${esc(placeholder)}</option>` : "")
    + list.map(([v, label]) => `<option value="${esc(v)}"${String(v) === String(chosen) ? " selected" : ""}>${esc(label)}</option>`).join("");
}

// Fills the drop-downs in the current language, keeping the choices.
function fillSearchOptions() {
  const byName = (a, b) => a[1].localeCompare(b[1], getLang());
  $("qFestival").innerHTML = options(FESTIVAL_NAMES.map((n) => [slug(n), tr(n, "festival")]).sort(byName),
    query.festival, t("Choose a festival"));
  $("qTithi").innerHTML = options(TITHI_CHOICES.map((c) => [slug(c.name), tr(c.name, "tithi")]), query.tithi, t("Choose a tithi"));
  $("qNakshatra").innerHTML = options(NAK_NAMES.map((n) => [slug(n), tr(n, "nakshatra")]), query.nakshatra, t("Choose a nakshatra"));
  $("qMonth").innerHTML = options(Array.from({ length: 12 }, (_, i) => [i + 1, monthLong(i)]), query.month);
  $("qYear").innerHTML = options(Array.from({ length: 2 * SEARCH_YEARS + 1 }, (_, i) => thisYear - SEARCH_YEARS + i)
    .map((y) => [y, String(y)]), query.year);
}

function syncSearchForm() {
  for (const b of $("qKinds").querySelectorAll("[data-kind]")) {
    const on = b.dataset.kind === query.kind;
    b.setAttribute("aria-checked", String(on));
    b.tabIndex = on ? 0 : -1;
  }
  $("qFestivalField").hidden = query.kind !== "festival";
  $("qTithiField").hidden = query.kind !== "tithi";
  $("qNakshatraField").hidden = query.kind !== "nakshatra";
  $("qMonthField").hidden = query.kind === "festival";
}

function initSearch(qs) {
  if (SEARCH_KINDS.includes(qs.get("search"))) query.kind = qs.get("search");
  const valid = {
    festival: FESTIVAL_NAMES.map(slug), tithi: TITHI_CHOICES.map((c) => slug(c.name)), nakshatra: NAK_NAMES.map(slug),
  };
  for (const k of ["festival", "tithi", "nakshatra"]) if (valid[k].includes(qs.get(k))) query[k] = qs.get(k);
  const month = Number(qs.get("month")), year = Number(qs.get("year"));
  if (month >= 1 && month <= 12) query.month = month;
  if (Math.abs(year - thisYear) <= SEARCH_YEARS) query.year = year;
  fillSearchOptions();
  syncSearchForm();

  const setKind = (kind, focus) => {
    query.kind = kind;
    syncSearchForm();
    if (focus) $("qKinds").querySelector(`[data-kind="${kind}"]`).focus();
    searchChanged();
  };
  $("qKinds").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kind]");
    if (b && b.dataset.kind !== query.kind) setKind(b.dataset.kind);
  });
  $("qKinds").addEventListener("keydown", (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step || !e.target.closest("[data-kind]")) return;
    e.preventDefault();
    const n = SEARCH_KINDS.length;
    setKind(SEARCH_KINDS[(SEARCH_KINDS.indexOf(query.kind) + step + n) % n], true);
  });
  const fields = { qFestival: "festival", qTithi: "tithi", qNakshatra: "nakshatra", qMonth: "month", qYear: "year" };
  for (const [id, k] of Object.entries(fields)) {
    $(id).addEventListener("change", () => {
      query[k] = k === "month" || k === "year" ? Number($(id).value) : $(id).value;
      searchChanged();
    });
  }
  // A result date opens that day in the Panchanga tab (a plain link otherwise,
  // so it can be opened in a new tab or copied).
  $("qResults").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-day]");
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setDate(a.dataset.day);
    selectTab("panchanga");
    calculate();
    document.querySelector(".tabs").scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function searchChanged() {
  syncSearchUrl();
  runSearch();
}

// While the Search tab is open the URL holds the search and the place, so it
// can be bookmarked or shared; the parameters are dropped on leaving the tab.
function syncSearchUrl() {
  const qs = new URLSearchParams(location.search);
  for (const k of SEARCH_PARAMS) qs.delete(k);
  if (!$("panel-search").hidden) {
    qs.set("tab", "search");
    qs.set("search", query.kind);
    if (query[query.kind]) qs.set(query.kind, query[query.kind]);
    if (query.kind !== "festival") qs.set("month", query.month);
    qs.set("year", query.year);
    if (lastChart) {
      qs.set("place", lastChart.input.place || "");
      qs.set("lat", lastChart.input.lat);
      qs.set("lon", lastChart.input.lon);
      if (offsetManual) qs.set("offset", fmtOffset(lastChart.input.utc_offset));
      else qs.delete("offset");
    }
  } else if (qs.get("tab") === "search") {
    qs.delete("tab");
    if (!qs.has("date")) for (const k of ["place", "lat", "lon", "offset"]) qs.delete(k);
  }
  const s = qs.toString();
  history.replaceState(null, "", location.pathname + (s ? `?${s}` : "") + location.hash);
}

// The year's festivals at a place, scanned a few days at a time.
function festivalYear(p, year) {
  const key = `${p.key}|${year}`;
  if (festivalYears.has(key)) return festivalYears.get(key);
  for (const k of festivalYears.keys()) if (!k.startsWith(`${p.key}|`)) festivalYears.delete(k); // another place
  const start = wallMs(year, 1, 1), days = Math.round((wallMs(year + 1, 1, 1) - start) / 86400e3);
  const job = { found: [], done: 0, days, failed: false };
  festivalYears.set(key, job);
  const step = () => {
    try {
      const end = Math.min(job.done + CHUNK_DAYS, days);
      for (; job.done < end; job.done++) {
        const w = start + job.done * 86400e3;
        const festivals = festivalsFor(w, p.lat, p.lon, p.offset);
        if (festivals.length) job.found.push({ date: isoFromWall(w).slice(0, 10), w, festivals });
      }
    } catch {
      job.failed = true;
    }
    if (searchView?.job === job) drawSearch();
    if (!job.failed && job.done < days) setTimeout(step, 0);
  };
  setTimeout(step, 0);
  return job;
}

function runSearch() {
  const c = lastChart;
  if (!c || $("panel-search").hidden) { searchStale = true; return; }
  searchStale = false;
  const q = { ...query }, p = searchPlaceOf(c);
  searchView = { q, p };
  if (!q[q.kind]) return drawSearch();
  if (q.kind === "festival") {
    searchView.name = FESTIVAL_NAMES.find((n) => slug(n) === q.festival);
    searchView.job = festivalYear(p, q.year);
    return drawSearch();
  }
  try {
    const [from, to] = threeMonths(q.year, q.month);
    const indexes = q.kind === "tithi" ? TITHI_CHOICES.find((x) => slug(x.name) === q.tithi).indexes
      : [NAK_NAMES.findIndex((n) => slug(n) === q.nakshatra)];
    searchView.rows = indexes.flatMap((i) => occurrences(q.kind, i, from, to, p.lat, p.lon, p.offset))
      .sort((a, b) => (a.start < b.start ? -1 : 1));
  } catch {
    searchView.failed = true;
  }
  drawSearch();
}

// Link to the Panchanga tab for a day at the searched place.
function dayHref(iso) {
  const qs = new URLSearchParams();
  const c = lastChart.input;
  qs.set("place", c.place || "");
  qs.set("date", iso);
  qs.set("time", $("time").value || "12:00");
  qs.set("lat", c.lat);
  qs.set("lon", c.lon);
  if (offsetManual) qs.set("offset", fmtOffset(c.utc_offset));
  qs.set("tab", "panchanga");
  if (getLang() === "ta") qs.set("lang", "ta");
  return `?${qs}`;
}

// Rows under a heading per month; the searched month's heading is marked.
function byMonthList(items, row, chosen) {
  let html = "", month = "";
  for (const u of items) {
    const fd = festivalDate(u.date), key = `${fd.y}-${fd.m}`;
    if (key !== month) {
      html += `${month ? "</ul>" : ""}<h3 class="year-month${key === chosen ? " q-chosen" : ""}">${monthLong(fd.m - 1)} ${fd.y}</h3><ul class="q-list">`;
      month = key;
    }
    html += row(u);
  }
  return month ? html + "</ul>" : html;
}

function drawSearch() {
  const v = searchView;
  if (!v) return;
  const { q, p } = v;
  const hint = (msg) => `<p class="hint q-status">${esc(msg)}</p>`;
  const dayLink = (iso, main) =>
    `<a href="${esc(dayHref(iso))}" data-day="${iso}" class="q-day${main ? " q-main" : ""}">${festivalDate(iso).label}</a>`;
  const tamil = (td) => (td ? `<span class="q-tamil">${esc(t("Tamil date"))}: ${esc(tr(td.month, "tamilMonth"))} ${td.day}</span>` : "");
  let body = "";
  $("qPlace").textContent = t("Dates for {place}. To search another place, change it above and press Calculate.",
    { place: p.name || `${p.lat}, ${p.lon}` });

  if (!q[q.kind]) body = hint(t("Choose one from the list above."));
  else if (q.kind === "festival") {
    const { job, name } = v;
    const rows = job.found.flatMap((day) => day.festivals.filter((f) => f.name === name).map((f) => ({ date: day.date, day, f })));
    const list = byMonthList(rows, (u) => {
      u.tamil = u.day.tamil ??= tamilDate(u.day.w, p.lat, p.lon, p.offset);
      const times = u.f.times.map((tt) => `<span class="sd-time">${esc(tr(tt.label, "label"))}: <strong>${
        tt.at ? fmtTime(tt.at, u.date) : `${fmtTime(tt.start, u.date)} – ${fmtTime(tt.end, u.date)}`}</strong></span>`).join("");
      const notes = (u.f.note ? `<div class="festival-note">${esc(tr(u.f.note, "note"))}</div>` : "")
        + (u.f.eclipse ? `<div class="festival-note">${esc(t(ECLIPSE_NOTE))}</div>` : "");
      return `<li class="q-row"><div class="q-when">${dayLink(u.date, true)}${tamil(u.tamil)}</div>`
        + `<div class="upcoming-times">${times}</div>${notes}</li>`;
    });
    const status = job.failed ? t("Couldn't calculate the dates.") : job.done < job.days ? t("Calculating…")
      : !rows.length ? t("{name} doesn't fall in {year} at this place.", { name: tr(name, "festival"), year: q.year }) : "";
    body = `<h3 class="q-title">${esc(tr(name, "festival"))} · ${q.year}</h3>`
      + (rows.length ? `<p class="hint">${esc(t("Select a date to open it in the Panchanga tab."))}</p>` : "")
      + list + (status ? hint(status) : "");
  } else if (v.failed) body = hint(t("Couldn't calculate the dates."));
  else {
    const name = (o) => (q.kind === "nakshatra" ? tr(NAK_NAMES[o.index], "nakshatra")
      : o.index === 14 ? tr("Purnima", "tithi") : o.index === 29 ? tr("Amavasya", "tithi")
        : `${tr(o.index < 15 ? "Shukla" : "Krishna", "paksha")} ${tr(TITHI_NAMES[o.index % 15], "tithi")}`);
    const at = (iso, o) => `${dayLink(iso.slice(0, 10), o.mainDays.includes(iso.slice(0, 10)))} ${fmtTime(iso, iso.slice(0, 10))}`;
    const span = (o) => (o.start.slice(0, 10) === o.end.slice(0, 10)
      ? `${dayLink(o.start.slice(0, 10), o.mainDays.length > 0)} ${fmtTime(o.start, o.date)} – ${fmtTime(o.end, o.date)}`
      : `${at(o.start, o)} – ${at(o.end, o)}`);
    body = `<p class="hint">${esc(t("Bold dates are the days it holds at sunrise. Select a date to open it in the Panchanga tab."))}</p>`
      + byMonthList(v.rows, (o) => `<li class="q-row"><div class="q-name">${esc(name(o))}</div>`
        + `<div class="q-span">${span(o)}</div><div class="q-meta">${tamil(o.tamil)}${
          o.mainDays.length ? "" : `<span class="q-kshaya">${esc(t("Holds at no sunrise (kshaya)"))}</span>`}</div></li>`,
      `${q.year}-${q.month}`);
  }
  $("qResults").innerHTML = body;
}

// ---------- tabs ----------

const TAB_KEY = "vedic-chart-tab";
const TABS = ["panchanga", "festivals", "special", "muhurtham", "chart", "search"];

function selectTab(name) {
  if (name === "dasha") name = "chart"; // the dasha now sits on the Birth Chart tab
  if (!TABS.includes(name)) name = "panchanga";
  for (const t of TABS) {
    $(`tab-${t}`).setAttribute("aria-selected", String(t === name));
    $(`panel-${t}`).hidden = t !== name;
  }
  try { localStorage.setItem(TAB_KEY, name); } catch {}
  if (name === "chart") drawDashaLinks();
  if (name === "search" && searchStale) runSearch();
  syncSearchUrl();
}

// ---------- vimshottari dasha ----------

let dashaData = null;
let selectedMd = 0;

function fmtDate(iso) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${monthShort(Number(m) - 1)} ${y}`;
}

function fmtSpan(startIso, endIso) {
  const days = (new Date(endIso) - new Date(startIso)) / 86400000;
  const y = Math.floor(days / 365.2425);
  const rest = days - y * 365.2425;
  const m = Math.floor(rest / 30.436875);
  const d = Math.round(rest - m * 30.436875);
  const [uy, um, ud] = spanUnits();
  return [y && `${y}${uy}`, m && `${m}${um}`, d && `${d}${ud}`].filter(Boolean).join(" ") || `0${ud}`;
}

const isCurrent = (p, today) => p.start.slice(0, 10) <= today && today < p.end.slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);

function periodRow(tag, cls, p, label, now) {
  const row = document.createElement(tag);
  row.className = cls;
  row.innerHTML = `
    <span class="row-head"><span class="lord">${esc(label)}</span>
      <span class="dur">${esc(fmtSpan(p.start, p.end))}</span>
      ${now ? `<span class="now-tag">${esc(t("now"))}</span>` : ""}</span>
    <span class="row-dates"${p.actualStart ? ` title="${esc(t("Began {date}, before the entered date", { date: fmtDate(p.actualStart) }))}"` : ""}>${fmtDate(p.start)} – ${fmtDate(p.end)}</span>`;
  return row;
}

// Only periods from the entered date onwards; the one running then starts at that date.
function clipDashas(mahadashas, from) {
  const clip = (p) => (p.start < from ? { ...p, start: from, actualStart: p.start } : p);
  return mahadashas.filter((md) => md.end > from).map((md) => ({
    ...clip(md), antardashas: md.antardashas.filter((ad) => ad.end > from).map(clip),
  }));
}

function renderDasha(c, keepMd = null) {
  dashaData = { ...c.vimshottari, mahadashas: clipDashas(c.vimshottari.mahadashas, c.input.local_time) };
  const mds = dashaData.mahadashas, today = todayIso();
  $("dashaBalance").textContent = mds.length
    ? t("· balance remaining: {lord} {span}", { lord: tr(mds[0].name, "planet"), span: fmtSpan(mds[0].start, mds[0].end) }) : "";

  const list = $("mdList");
  list.innerHTML = "";
  mds.forEach((md, i) => {
    const li = document.createElement("li");
    const btn = periodRow("button", "md-row", md, tr(md.name, "planet"), isCurrent(md, today));
    btn.type = "button";
    btn.addEventListener("click", () => selectMahadasha(i));
    li.appendChild(btn);
    list.appendChild(li);
  });
  const cur = mds.findIndex((md) => isCurrent(md, today));
  selectMahadasha(keepMd ?? (cur >= 0 ? cur : 0));
}

function selectMahadasha(i) {
  selectedMd = i;
  const md = dashaData.mahadashas[i], today = todayIso();
  $("mdList").querySelectorAll(".md-row").forEach((el, j) => {
    el.classList.toggle("selected", j === i);
    el.setAttribute("aria-pressed", String(j === i));
  });
  $("adTitle").textContent = t("Antardashas in {lord} mahadasha", { lord: tr(md.name, "planet") });
  const list = $("adList");
  list.innerHTML = "";
  for (const ad of md.antardashas) {
    const now = isCurrent(ad, today);
    const li = periodRow("li", `ad-row${now ? " current" : ""}`, ad, `${tr(md.name, "planet")} – ${tr(ad.name, "planet")}`, now);
    list.appendChild(li);
  }
  drawDashaLinks();
}

// Curves fanning out from the selected mahadasha to each of its antardashas.
function drawDashaLinks() {
  const svg = $("dashaLinks");
  if (!dashaData || $("panel-chart").hidden) return;
  const box = svg.getBoundingClientRect();
  const from = $("mdList").querySelectorAll(".md-row")[selectedMd]?.getBoundingClientRect();
  if (!from || !box.width) return;
  const w = box.width, y0 = from.top + from.height / 2 - box.top;
  svg.setAttribute("viewBox", `0 0 ${w} ${box.height}`);
  svg.innerHTML = "";
  for (const row of $("adList").querySelectorAll(".ad-row")) {
    const r = row.getBoundingClientRect();
    const y = r.top + r.height / 2 - box.top;
    svg.appendChild(el("path", {
      d: `M0 ${y0} C ${w * 0.55} ${y0}, ${w * 0.45} ${y}, ${w} ${y}`,
      class: row.classList.contains("current") ? "current" : "",
    }));
    svg.appendChild(el("circle", { cx: w, cy: y, r: 3 }));
  }
  svg.appendChild(el("circle", { cx: 0, cy: y0, r: 4.5 }));
}

// ---------- main ----------

async function calculate(e) {
  e?.preventDefault();
  showError("");
  let offset;
  try { offset = parseOffset($("offset").value); } catch (err) { return showError(err.message); }
  const params = {
    date: $("date").value, time: $("time").value, lat: $("lat").value, lon: $("lon").value,
  };
  if (dateProblem()) return syncDate(true); // flagged beside the date fields
  if (!params.date || !params.time) return showError(t("Enter a date and time."));
  if (params.lat === "" || params.lon === "") return showError(t("Search for a place or enter latitude and longitude."));
  const lat = Number(params.lat), lon = Number(params.lon);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return showError(t("Latitude must be within ±90 and longitude within ±180."));
  if (offset != null && !(Math.abs(offset) <= 14)) return showError(t("UTC offset must be within ±14 hours."));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date) || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(params.time)) {
    return showError(t("Date must be YYYY-MM-DD and time HH:MM[:SS]"));
  }

  $("go").disabled = true;
  $("go").classList.add("busy");
  try {
    await sweReady;
    const auto = offset == null;
    let tzInfo = { timezone: null, note: null };
    if (auto) {
      tzInfo = timezoneFor(lat, lon, params.date, params.time);
      offset = tzInfo.offset;
    }
    const c = computeChart(wallFromInputs(params.date, params.time), offset, lat, lon, AYANAMSA, BHAVA);
    c.input.timezone = tzInfo.timezone;
    c.input.tz_note = tzInfo.note;
    c.input.place = $("place").value;
    lastChart = c;
    if (auto) {
      $("offset").value = fmtOffset(c.input.utc_offset);
      $("tzname").textContent = c.input.timezone ? `(${c.input.timezone})` : "";
      showTzNote(c.input.tz_note);
    }
    renderSummary(c);
    renderPanchanga(c);
    renderFestivals(c);
    renderCharts(c);
    renderPositions(c);
    renderBhavaTable(c);
    renderDasha(c);
    $("output").hidden = false;
    drawDashaLinks();
    runSearch();
    syncSearchUrl();
  } catch (err) {
    showError(err.message);
  } finally {
    $("go").classList.remove("busy");
    $("go").disabled = !dateOk;
  }
}

// ---------- language ----------

// Static text in index.html carries its English key in data-i18n attributes.
function applyStaticText() {
  for (const n of document.querySelectorAll("[data-i18n]")) n.textContent = t(n.dataset.i18n);
  for (const n of document.querySelectorAll("[data-i18n-ph]")) n.placeholder = t(n.dataset.i18nPh);
  for (const n of document.querySelectorAll("[data-i18n-title]")) n.title = t(n.dataset.i18nTitle);
  for (const n of document.querySelectorAll("[data-i18n-aria]")) n.setAttribute("aria-label", t(n.dataset.i18nAria));
  $("footer").innerHTML = FOOTER[getLang()];
  if ($("month").options.length) {
    labelMonths();
    if (!$("dateerr").hidden) syncDate(true); // re-word the message
  }
  // Search-result title, description and canonical URL for the current language.
  document.title = t("Vedic Calendar – Free Panchangam, Tamil Calendar, Muhurtham & Birth Chart");
  document.querySelector('meta[name="description"]').content = t("Free Vedic calendar app: daily Panchangam with tithi, nakshatra, Rahu Kalam and hora, Tamil calendar dates, Hindu festival dates and puja times, auspicious days and times for travel, vehicles, learning and new projects, and South Indian birth charts with Vimshottari dasha.");
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) {
    canon = document.createElement("link");
    canon.rel = "canonical";
    document.head.append(canon);
  }
  canon.href = "https://aganba.github.io/vedic-chart/" + (getLang() === "ta" ? "?lang=ta" : "");
  const toTamil = getLang() !== "ta";
  $("lang").textContent = toTamil ? "தமிழ்" : "English";
  $("lang").lang = toTamil ? "ta" : "en";
  $("lang").setAttribute("aria-label", toTamil ? "தமிழில் காட்டு" : "Show in English");
}

function switchLanguage(l) {
  setLang(l);
  applyStaticText();
  showTzNote(tzNoteText);
  const c = lastChart;
  if (!c || $("output").hidden) return;
  renderSummary(c);
  renderPanchanga(c);
  drawFestivals();
  renderCharts(c);
  renderPositions(c);
  renderBhavaTable(c);
  renderDasha(c, selectedMd);
  drawDashaLinks();
  fillSearchOptions();
  drawSearch();
}

async function init() {
  const qsLang = new URLSearchParams(location.search).get("lang");
  setLang(qsLang || savedLang());
  applyStaticText();
  $("lang").addEventListener("click", () => switchLanguage(getLang() === "ta" ? "en" : "ta"));
  initTimePicker();
  initDatePicker();
  setTime("12:00"); // until the current time or a URL's time fills it in
  // URL parameters (?date=..&time=..&lat=..&lon=..) override the device defaults.
  // A Search tab bookmark carries the place (lat, lon) but no date: today is used.
  const qs = new URLSearchParams(location.search);
  const fromUrl = qs.has("date") || (qs.has("lat") && qs.has("lon"));
  if (fromUrl) {
    if (!qs.has("date")) setNow();
    for (const f of FIELDS) if (qs.has(f)) f === "time" ? setTime(qs.get(f)) : f === "date" ? setDate(qs.get(f)) : ($(f).value = qs.get(f));
    offsetManual = qs.has("offset");
  }

  $("form").addEventListener("submit", calculate);
  $("search").addEventListener("click", searchPlace);
  $("place").addEventListener("input", suggestPlaces);
  $("place").addEventListener("keydown", onPlaceKey);
  $("offset").addEventListener("input", () => {
    offsetManual = $("offset").value.trim() !== "";
    $("tzname").textContent = "";
    showTzNote("");
  });
  for (const id of ["lat", "lon"]) $(id).addEventListener("change", refreshTimezone);
  document.addEventListener("click", (e) => { if (!e.target.closest(".place")) $("results").hidden = true; });

  $("now").addEventListener("click", resetToNow);
  for (const t of TABS) $(`tab-${t}`).addEventListener("click", () => selectTab(t));
  $("muhurthaTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mt]");
    if (b) selectMuhurthaTab(b.dataset.mt);
  });
  $("muhurthaTabs").addEventListener("keydown", (e) => {
    const b = e.target.closest("[data-mt]");
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!b || !step) return;
    e.preventDefault();
    const n = MUHURTHA_TABS.length;
    selectMuhurthaTab(MUHURTHA_TABS[(MUHURTHA_TABS.indexOf(b.dataset.mt) + step + n) % n], true);
  });
  initSearch(qs);
  let savedMuhurtha;
  try { savedMuhurtha = localStorage.getItem(MUHURTHA_KEY); } catch {}
  selectMuhurthaTab(savedMuhurtha);
  window.addEventListener("resize", drawDashaLinks);
  let savedTab = "panchanga";
  try { savedTab = localStorage.getItem(TAB_KEY) || savedTab; } catch {}
  selectTab(new URLSearchParams(location.search).get("tab") || savedTab);

  if ("serviceWorker" in navigator && window.isSecureContext) {
    // When a new version's service worker takes over, reload once so the page
    // shows the new files straight away (not on first install).
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => reg.update()).catch(() => {});
  }

  if (fromUrl) calculate();
  else await resetToNow();
}

init().catch((e) => showError(e.message));
