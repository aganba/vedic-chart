// Browser app: all calculations run locally (Swiss Ephemeris compiled to
// WebAssembly); the only network calls are optional OpenStreetMap place lookups.
import { initSwe } from "./js/swe.js";
import { computeChart, isoFromWall, wallMs } from "./js/astro.js";
import { dayFrame, festivalsFor, tamilDate } from "./js/festivals.js";
import { eclipsesBetween, observancesFor } from "./js/specialdays.js";
import { muhurthaFor } from "./js/muhurtha.js";
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

// The date picker displays dates in the browser's locale; describe that order,
// e.g. "mm/dd/yyyy" (US) or "dd/mm/yyyy" (India, UK).
function dateFormatHint() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(2001, 10, 22));
    const names = { day: "dd", month: "mm", year: "yyyy" };
    if (getLang() === "ta") Object.assign(names, { day: "நாள்", month: "மாதம்", year: "ஆண்டு" });
    return parts.map((p) => names[p.type] || p.value).join("");
  } catch {
    return t("yyyy-mm-dd");
  }
}

function setNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  $("date").value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
    ...(p.sunrise_nakshatra ? [[t("Nakshatra at sunrise"), nak(p.sunrise_nakshatra),
      t("at sunrise {t} · until {u} · lord {lord}", { t: fmtTime(p.sunrise_nakshatra.at, ref),
        u: fmtTime(p.sunrise_nakshatra.end, ref), lord: tr(p.sunrise_nakshatra.lord, "planet") })]] : []),
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
  }
  $("panchanga").innerHTML = items.map(([k, v, s]) =>
    `<div><dt>${esc(k)}</dt><dd>${esc(v)}${s ? `<small>${esc(s)}</small>` : ""}</dd></div>`).join("");
}

// Festivals on the entered date (with timings) and in the next 7 days, as a
// banner at the top of the Panchanga tab with the muhurtham days below it, and festivals for the year from the
// entered date in the Festivals tab, and the year's shubha muhurtham days and
// their time windows in the Shubha Muhurtham tab. The year is computed in small chunks after
// the main render so the page stays responsive; the banner fills in once the
// first 7 days are done.
const UPCOMING_DAYS = 7;
const YEAR_DAYS = 366; // the entered date and the 365 days after it
const CHUNK_DAYS = 8;
// Results so far for the current chart; kept so a language switch can redraw
// them without recalculating.
let fest = null;

function festivalNames(festivals) {
  return festivals.map((f) => esc(tr(f.name, "festival"))).join(" · ");
}

function festivalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = weekdayShort(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
  return { y, m, d, label: `${wd} ${d} ${monthShort(m - 1)}` };
}

function renderFestivals(c) {
  const ref = c.input.local_time.slice(0, 10);
  const midnight = Math.floor(wallFromInputs(ref, "00:00") / 86400e3) * 86400e3;
  fest = {
    c, ref, midnight, found: [], muhurthas: [], observances: [], eclipses: null, done: 0, failed: false,
    cut: isoFromWall(midnight + (UPCOMING_DAYS + 1) * 86400e3).slice(0, 10),
  };
  const state = fest;
  // With a detected timezone each day gets the offset in force then (DST);
  // a manually entered offset is used for every day.
  const zone = c.input.timezone;
  const offset = zone ? (ms) => offsetAtUtc(zone, ms) : c.input.utc_offset;
  try {
    state.eclipses = eclipsesBetween(midnight, YEAR_DAYS, c.input.lat, c.input.lon, offset);
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
        for (const o of observancesFor(w, c.input.lat, c.input.lon, offset, frame)) state.observances.push({ date, ...o });
        const m = muhurthaFor(w, c.input.lat, c.input.lon, offset);
        if (m) state.muhurthas.push({ date, m });
      }
    } catch {
      state.failed = true;
    }
    drawFestivals();
    if (!state.failed && state.done < YEAR_DAYS) setTimeout(step, 0);
  };
  setTimeout(step, 30);
}

// Special Days tab: one colour-coded card per kind of day, in this order.
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
  // A year heading wherever the year changes, since the list runs into the next year.
  const list = (rows) => {
    let html = "", year = 0;
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
      body = eclipseFailed ? `<p class="hint">${esc(t("Couldn't calculate eclipses."))}</p>`
        : rows.length ? list(rows) : `<p class="hint">${esc(t("No eclipses can be seen from this place in these 366 days."))}</p>`;
    } else {
      body = (rows.length ? list(rows) : "") + (status ? `<p class="hint">${esc(status)}</p>` : "");
    }
    return `<div class="card special-card sd-${kind}"><h2>${esc(t(title))}</h2><p class="hint">${esc(t(hint))}</p>${body}</div>`;
  }).join("");
}

// Draws the Panchanga-tab banners and the Festivals, Special Days and Shubha Muhurtham lists from `fest`.
function drawFestivals() {
  if (!fest) return;
  const { c, ref, found, muhurthas, done, failed, cut } = fest;
  const list = c.panchanga.festivals || [];
  const bannerReady = done > UPCOMING_DAYS;
  const hm = (iso, on = ref) => fmtTime(iso, on);
  const timeText = (tt, day = ref) =>
    `${esc(tr(tt.label, "label"))}: <strong>${tt.at ? hm(tt.at, day) : `${hm(tt.start, day)} – ${hm(tt.end, day)}`}</strong>`;
  const note = (msg) => `<div class="festival-note">${esc(msg)}</div>`;

  // Today's festivals, then the next 7 days.
  const today = list.map((f) => `
    <div class="festival">
      <div class="festival-name">${esc(tr(f.name, "festival"))}</div>
      ${f.times.map((tt) => `<div class="festival-time">${timeText(tt)}</div>`).join("")}
      ${f.note ? `<div class="festival-note">${esc(tr(f.note, "note"))}</div>` : ""}
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
    upcoming = rows.length ? `<ul class="upcoming-list">${rows.join("")}</ul>`
      : note(t("No festivals in the next {n} days.", { n: UPCOMING_DAYS }));
  }
  $("festivals").innerHTML = today + `<div class="festival upcoming" id="upcoming">${upTitle}${upcoming}</div>`;
  $("festivals").hidden = false;

  const muhurthaRow = ({ date, m }) => {
    // One window per line; start, dash, end and lagna each line up in a column.
    const wins = m.windows.map((w) => `<span class="win"><strong>${hm(w.start, date)}</strong><strong>–</strong>`
      + `<strong>${hm(w.end, date)}</strong><span>${esc(t("{lagna} lagna", { lagna: tr(w.lagna, "sign") }))}</span></span>`).join("");
    return `<li${date === ref ? ' class="today"' : ""}><span class="upcoming-date">${festivalDate(date).label}</span><div>
        <div>${esc(tr(m.paksha, "paksha"))} · ${esc(tr(m.tithi, "tithi"))} · ${esc(tr(m.nakshatra, "nakshatra"))} · ${esc(tr(m.yogam, "dayYoga"))}</div>
        <div class="upcoming-times">${wins}</div></div></li>`;
  };

  // General muhurtham days, and the extra days for starting education.
  const general = muhurthas.filter((u) => u.m.kind === "general");
  const education = muhurthas.filter((u) => u.m.kind === "education");

  // Muhurtham days from the entered date through the next UPCOMING_DAYS days.
  const mTitle = `<div class="upcoming-title">${esc(t("Shubha Muhurtham (next {n} days)", { n: UPCOMING_DAYS }))}</div>`;
  let mBody;
  if (!bannerReady) mBody = failed ? note(t("Couldn't calculate muhurtham days.")) : note(t("Checking…"));
  else {
    const rows = general.filter((u) => u.date < cut).map(muhurthaRow);
    mBody = rows.length ? `<ul class="upcoming-list muhurtha-list">${rows.join("")}</ul>`
      : note(t("No muhurtham days in the next {n} days.", { n: UPCOMING_DAYS }));
  }
  $("muhurthaBanner").innerHTML = mTitle + mBody;
  $("muhurthaBanner").hidden = false;

  // Festivals and Shubha Muhurtham tabs: the year, month by month.
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
    + (status ? `<p class="hint">${esc(status)}</p>` : !found.length ? `<p class="hint">${esc(t("No festivals found."))}</p>` : "");
  // The year's list, then a note with the extra days for starting education.
  const extra = education.length ? `<div class="muhurtha-extra"><h3 class="muhurtha-extra-title">${esc(t("More days for starting education"))}</h3>`
    + `<p class="hint">${esc(t("Vidyarambham and other starts of learning can also be held on these days, which miss the general rules, mostly by falling in Aadi, Purattasi or Margazhi or on Ardra."))}</p>`
    + `<details class="muhurtha-rules"><summary>${esc(t("Rules used"))}</summary><p>${esc(t("They follow B. V. Raman's rules for education: nakshatra Ashwini, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra, Swati, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha or Revati; the general tithis except Chaturthi and Chaturdashi; any month; and a lagna that isn't a fixed sign. The other day and time rules apply, except the empty 7th house and moudhyam."))}</p></details>`
    + byMonth(education, "upcoming-list muhurtha-list", muhurthaRow) + "</div>" : "";
  drawSpecialDays(timeText, status);
  $("muhurthaYear").innerHTML = byMonth(general, "upcoming-list muhurtha-list", muhurthaRow)
    + (status ? `<p class="hint">${esc(status)}</p>` : !general.length ? `<p class="hint">${esc(t("No shubha muhurtham days found."))}</p>` : "")
    + extra;
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

// ---------- tabs ----------

const TAB_KEY = "vedic-chart-tab";
const TABS = ["panchanga", "festivals", "special", "muhurtham", "chart"];

function selectTab(name) {
  if (name === "dasha") name = "chart"; // the dasha now sits on the Birth Chart tab
  if (!TABS.includes(name)) name = "panchanga";
  for (const t of TABS) {
    $(`tab-${t}`).setAttribute("aria-selected", String(t === name));
    $(`panel-${t}`).hidden = t !== name;
  }
  try { localStorage.setItem(TAB_KEY, name); } catch {}
  if (name === "chart") drawDashaLinks();
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
  if (!params.date || !params.time) return showError(t("Enter a date and time."));
  if (params.lat === "" || params.lon === "") return showError(t("Search for a place or enter latitude and longitude."));
  const lat = Number(params.lat), lon = Number(params.lon);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return showError(t("Latitude must be within ±90 and longitude within ±180."));
  if (offset != null && !(Math.abs(offset) <= 14)) return showError(t("UTC offset must be within ±14 hours."));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date) || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(params.time)) {
    return showError(t("Date must be YYYY-MM-DD and time HH:MM[:SS]"));
  }

  $("go").disabled = true;
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
  } catch (err) {
    showError(err.message);
  } finally {
    $("go").disabled = false;
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
  $("datefmt").textContent = `(${dateFormatHint()})`;
  // Search-result title, description and canonical URL for the current language.
  document.title = t("Vedic Calendar – Free Panchangam, Tamil Calendar, Muhurtham & Birth Chart");
  document.querySelector('meta[name="description"]').content = t("Free Vedic calendar app: daily Panchangam with tithi, nakshatra, Rahu Kalam and hora, Tamil calendar dates, Hindu festival dates and puja times, Shubha Muhurtham days with lagna, and South Indian birth charts with Vimshottari dasha.");
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
}

async function init() {
  const qsLang = new URLSearchParams(location.search).get("lang");
  setLang(qsLang || savedLang());
  applyStaticText();
  $("lang").addEventListener("click", () => switchLanguage(getLang() === "ta" ? "en" : "ta"));
  initTimePicker();
  setTime("12:00"); // until the current time or a URL's time fills it in
  // URL parameters (?date=..&time=..&lat=..&lon=..) override the device defaults.
  const qs = new URLSearchParams(location.search);
  const fromUrl = qs.has("date");
  if (fromUrl) {
    for (const f of FIELDS) if (qs.has(f)) f === "time" ? setTime(qs.get(f)) : ($(f).value = qs.get(f));
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
  for (const id of ["lat", "lon", "date"]) $(id).addEventListener("change", refreshTimezone);
  document.addEventListener("click", (e) => { if (!e.target.closest(".place")) $("results").hidden = true; });

  $("now").addEventListener("click", resetToNow);
  for (const t of TABS) $(`tab-${t}`).addEventListener("click", () => selectTab(t));
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
