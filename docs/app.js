// Browser app: all calculations run locally (Swiss Ephemeris compiled to
// WebAssembly); the only network calls are optional OpenStreetMap place lookups.
import { initSwe } from "./js/swe.js";
import { AYANAMSAS, BHAVA_METHODS, computeChart, isoFromWall, wallMs } from "./js/astro.js";
import { festivalsFor } from "./js/festivals.js";
import { muhurthaFor } from "./js/muhurtha.js";
import { zoneAt, offsetFor, offsetAtUtc } from "./js/tz.js";
import { loadPlaces, searchPlaces, geocodeOnline, reverseOnline } from "./js/places.js";

const PLACES_URL = "data/places.tsv";
const sweReady = initSwe(async (f) => {
  const res = await fetch(`ephe/${f}`);
  if (!res.ok) throw new Error(`Couldn't load ephemeris data (${f})`);
  return new Uint8Array(await res.arrayBuffer());
});

const $ = (id) => document.getElementById(id);
const SVGNS = "http://www.w3.org/2000/svg";
const STORE_KEY = "vedic-chart-input";
const FIELDS = ["place", "date", "time", "lat", "lon", "offset", "ayanamsa", "bhava"];

// South Indian chart: signs are fixed. [row, col] for Aries..Pisces.
const SOUTH_POS = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
  [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  throw new Error("UTC offset should look like +05:30 or -4");
}

// "2000-01-02T02:39:06" -> "02:39:06 (2 Jan)" when the date differs from refDate.
function fmtTime(iso, refDate) {
  if (!iso) return "—";
  const [d, t] = iso.split("T");
  if (d === refDate) return t;
  const [, mo, day] = d.split("-");
  return `${t} (${Number(day)} ${MONTHS[Number(mo) - 1]})`;
}

// "YYYY-MM-DD" + "HH:MM[:SS]" -> local wall-clock ms (see astro.wallMs).
function wallFromInputs(date, time) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi, s] = time.split(":").map(Number);
  return wallMs(y, mo, d, h, mi || 0, s || 0);
}

function timezoneFor(lat, lon, date, time) {
  const zone = zoneAt(lat, lon);
  if (!zone) throw new Error("No timezone found for these coordinates; enter the UTC offset manually");
  return { timezone: zone, ...offsetFor(zone, wallFromInputs(date, time)) };
}

function showTzNote(msg) {
  $("tznote").textContent = msg || "";
  $("tznote").hidden = !msg;
}

function showError(msg) {
  $("error").textContent = msg || "";
  $("error").hidden = !msg;
}

// Only preferences persist; each visit starts at the current moment and place.
function savePrefs() {
  const data = { ayanamsa: $("ayanamsa").value, bhava: $("bhava").value };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
}

function loadPrefs() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || "null") || {};
    if (data.ayanamsa) $("ayanamsa").value = data.ayanamsa;
    if (data.bhava) $("bhava").value = data.bhava;
  } catch {}
}

// ---------- defaults from this device ----------

// The date picker displays dates in the browser's locale; describe that order,
// e.g. "mm/dd/yyyy" (US) or "dd/mm/yyyy" (India, UK).
function dateFormatHint() {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(2001, 10, 22));
    const names = { day: "dd", month: "mm", year: "yyyy" };
    return parts.map((p) => names[p.type] || p.value).join("");
  } catch {
    return "yyyy-mm-dd";
  }
}

function setNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  $("date").value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  $("time").value = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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
    let name = "Current location";
    try { name = (await reverseOnline(lat, lon)) || name; } catch {}
    return { name, lat, lon };
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const city = tz.split("/").pop().replace(/_/g, " ");
  if (!city || tz.startsWith("Etc")) return null;
  try {
    await loadPlaces(PLACES_URL);
    const [r] = searchPlaces(city);
    return r ? { name: `${city} (from device time zone)`, lat: r.lat, lon: r.lon } : null;
  } catch { return null; }
}

async function resetToNow() {
  setNow();
  $("place").value = "Locating…";
  const place = await useDevicePlace();
  if (!place) {
    $("place").value = "";
    return showError("Couldn't determine this device's location. Search for a place.");
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
      "No matches. Try “City, Country”.");
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
      lastChart.constants.sign_abbr[sign]));
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
    label: b.key === "lagna" ? "Asc" : b.abbr + (b.retro ? "(R)" : ""),
    deg: shortDeg(b),
    cls: b.key === "lagna" ? "lagna" : b.retro ? "retro" : "",
  };
}

function renderCharts(c) {
  const when = `${c.input.local_time.replace("T", " ")} (UTC${fmtOffset(c.input.utc_offset)})`;

  const rasiBoxes = {};
  for (const b of c.bodies) (rasiBoxes[b.sign] ||= []).push(chartItem(b));
  drawSouthChart($("rasi"), rasiBoxes, c.lagna_sign, ["Rasi", when]);

  // Navamsa: degrees within D1 don't carry over, so show names only.
  const navBoxes = {};
  for (const b of c.bodies) (navBoxes[b.navamsa] ||= []).push({ ...chartItem(b), deg: "" });
  const lagnaNav = c.bodies.find((b) => b.key === "lagna").navamsa;
  drawSouthChart($("navamsa"), navBoxes, lagnaNav, ["Navamsa", when]);
}

// ---------- tables & panchanga ----------

function renderSummary(c) {
  const lat = c.input.lat, lon = c.input.lon;
  const coord = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? "E" : "W"}`;
  $("summary").innerHTML = `
    <strong>${esc($("place").value || "Chart")}</strong>
    <span>${esc(c.input.local_time.replace("T", " "))} · UTC${fmtOffset(c.input.utc_offset)}${c.input.timezone ? " · " + esc(c.input.timezone) : ""}</span>
    <span>${coord}</span>
    <span>Ayanamsa: ${esc(c.settings.ayanamsa_label)} = ${c.settings.ayanamsa_deg}° ${esc(c.settings.ayanamsa_dms.replace(/^\d+° /, ""))}</span>`;
}

function renderPanchanga(c) {
  const p = c.panchanga;
  const ref = c.input.local_time.slice(0, 10);
  // Calendar (Gregorian) weekday of the entered date, beside the Vedic vara,
  // which runs sunrise to sunrise and so differs before sunrise.
  const [cy, cm, cd] = ref.split("-").map(Number);
  const civilDay = new Date(Date.UTC(cy, cm - 1, cd)).getUTCDay();
  const items = [
    ["Day", WEEKDAYS[civilDay], `${cd} ${MONTHS[cm - 1]} ${cy} (calendar date)`],
    ["Vara (Vedic day)", `${p.vara.sanskrit} · ${p.vara.name}`,
      p.sunrise ? `Vedic day runs sunrise to sunrise; this date's sunrise is ${fmtTime(p.sunrise, ref)}` : "Vedic day runs sunrise to sunrise"],
    ["Tithi", `${p.tithi.paksha} ${p.tithi.name}`, `${p.tithi.pct_left}% left · ends ${fmtTime(p.tithi.end, ref)}`],
    ["Nakshatra", `${p.nakshatra.name} pada ${p.nakshatra.pada}`, `${p.nakshatra.pct_left}% left · ends ${fmtTime(p.nakshatra.end, ref)} · lord ${p.nakshatra.lord}`],
    ...(p.sunrise_nakshatra ? [["Nakshatra at sunrise", `${p.sunrise_nakshatra.name} pada ${p.sunrise_nakshatra.pada}`,
      `at sunrise ${fmtTime(p.sunrise_nakshatra.at, ref)} · until ${fmtTime(p.sunrise_nakshatra.end, ref)} · lord ${p.sunrise_nakshatra.lord}`]] : []),
    ["Yoga", p.yoga.name, `ends ${fmtTime(p.yoga.end, ref)}`],
    ["Karana", p.karana.name, `ends ${fmtTime(p.karana.end, ref)}`],
    ["Lunar month / year", `${p.masa}`, `${p.samvatsara} samvatsara (amanta)`],
    ["Sunrise / Sunset", `${fmtTime(p.sunrise, ref)} / ${fmtTime(p.sunset, ref)}`, `next sunrise ${fmtTime(p.next_sunrise, ref)}`],
  ];
  if (p.rahu_kalam) {
    items.push(["Rahu Kalam", `${fmtTime(p.rahu_kalam.start, ref)} – ${fmtTime(p.rahu_kalam.end, ref)}`, ""]);
    items.push(["Yamaganda", `${fmtTime(p.yamaganda.start, ref)} – ${fmtTime(p.yamaganda.end, ref)}`, ""]);
    items.push(["Gulika Kalam", `${fmtTime(p.gulika_kalam.start, ref)} – ${fmtTime(p.gulika_kalam.end, ref)}`, ""]);
  }
  $("panchanga").innerHTML = items.map(([k, v, s]) =>
    `<div><dt>${esc(k)}</dt><dd>${esc(v)}${s ? `<small>${esc(s)}</small>` : ""}</dd></div>`).join("");
}

// Festivals on the entered date (with timings) and in the next 7 days, as a
// banner at the top of the Panchanga tab with the muhurtham days below it, and festivals for the year from the
// entered date in the Special Days tab, along with the year's shubha muhurtham
// days and their time windows. The year is computed in small chunks after
// the main render so the page stays responsive; the banner fills in once the
// first 7 days are done.
const UPCOMING_DAYS = 7;
const YEAR_DAYS = 366; // the entered date and the 365 days after it
const CHUNK_DAYS = 8;
let festivalSeq = 0;

function festivalNames(festivals) {
  return festivals.map((f) => esc(f.name) + (f.region ? ` <span class="festival-region">${esc(f.region)}</span>` : "")).join(" · ");
}

function festivalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()].slice(0, 3);
  return { y, m, d, label: `${wd} ${d} ${MONTHS[m - 1]}` };
}

function renderFestivals(c) {
  const list = c.panchanga.festivals || [];
  const ref = c.input.local_time.slice(0, 10);
  // HH:MM, with the date added when it isn't on `on`.
  const hm = (iso, on = ref) => {
    const [d, t] = iso.split("T");
    if (d === on) return t.slice(0, 5);
    const [, mo, day] = d.split("-");
    return `${t.slice(0, 5)} (${Number(day)} ${MONTHS[Number(mo) - 1]})`;
  };
  const timeText = (t, day = ref) =>
    `${esc(t.label)}: <strong>${t.at ? hm(t.at, day) : `${hm(t.start, day)} – ${hm(t.end, day)}`}</strong>`;
  const today = list.map((f) => `
    <div class="festival">
      <div class="festival-name">${esc(f.name)}${f.region ? ` <span class="festival-region">${esc(f.region)}</span>` : ""}</div>
      ${f.times.map((t) => `<div class="festival-time">${timeText(t)}</div>`).join("")}
      ${f.note ? `<div class="festival-note">${esc(f.note)}</div>` : ""}
    </div>`).join("");
  $("festivals").innerHTML = today + `<div class="festival upcoming" id="upcoming">
      <div class="upcoming-title">Coming up (next ${UPCOMING_DAYS} days)</div>
      <div class="festival-note">Checking…</div></div>`;
  $("festivals").hidden = false;
  $("muhurthaBanner").innerHTML = `<div class="upcoming-title">Shubha Muhurtham (next ${UPCOMING_DAYS} days)</div>
      <div class="festival-note">Checking…</div>`;
  $("muhurthaBanner").hidden = false;
  const place = $("place").value.trim();
  $("festivalPlace").textContent = place ? `· ${place}` : "";
  $("festivalYear").innerHTML = `<p class="hint" id="festivalStatus">Calculating…</p>`;
  $("muhurthaYear").innerHTML = `<p class="hint">Calculating…</p>`;

  const seq = ++festivalSeq;
  const midnight = Math.floor(wallFromInputs(ref, "00:00") / 86400e3) * 86400e3;
  const found = []; // [{ date, festivals }] for days 0..done-1
  const muhurthas = []; // [{ date, m }] for days 0..done-1
  let done = 0, bannerDone = false;
  // With a detected timezone each day gets the offset in force then (DST);
  // a manually entered offset is used for every day.
  const zone = c.input.timezone;
  const offset = zone ? (ms) => offsetAtUtc(zone, ms) : c.input.utc_offset;

  const cut = isoFromWall(midnight + (UPCOMING_DAYS + 1) * 86400e3).slice(0, 10);
  const showUpcoming = (failed) => {
    const box = $("upcoming");
    const rows = found.filter((u) => u.date !== ref && u.date < cut).map((u) => {
      const items = u.festivals.map((f) => `<div class="upcoming-festival">${festivalNames([f])}${f.times.length
        ? `<div class="upcoming-times">${f.times.map((t) => timeText(t, u.date)).join(" · ")}</div>` : ""}</div>`).join("");
      return `<li><span class="upcoming-date">${festivalDate(u.date).label}</span><div>${items}</div></li>`;
    });
    if (failed) box.querySelector(".festival-note").textContent = "Couldn't calculate upcoming festivals.";
    else if (!rows.length) box.querySelector(".festival-note").textContent = `No festivals in the next ${UPCOMING_DAYS} days.`;
    else box.innerHTML = `<div class="upcoming-title">Coming up (next ${UPCOMING_DAYS} days)</div><ul class="upcoming-list">${rows.join("")}</ul>`;
  };

  const showYear = (status) => {
    let html = "", month = "";
    for (const u of found) {
      const fd = festivalDate(u.date);
      const key = `${fd.y}-${fd.m}`;
      if (key !== month) {
        html += `${month ? "</ul>" : ""}<h3 class="year-month">${MONTH_NAMES[fd.m - 1]} ${fd.y}</h3><ul class="upcoming-list">`;
        month = key;
      }
      html += `<li${u.date === ref ? ' class="today"' : ""}><span class="upcoming-date">${fd.label}</span> ${festivalNames(u.festivals)}</li>`;
    }
    if (month) html += "</ul>";
    if (status) html += `<p class="hint">${esc(status)}</p>`;
    $("festivalYear").innerHTML = html;
    showMuhurthas(status);
  };

  const muhurthaRow = ({ date, m }) => {
    const wins = m.windows.map((w) => `<span class="win"><strong>${hm(w.start, date)} – ${hm(w.end, date)}</strong> ${esc(w.lagna)} lagna</span>`).join("");
    return `<li${date === ref ? ' class="today"' : ""}><span class="upcoming-date">${festivalDate(date).label}</span><div>
        <div>${esc(m.paksha)} · ${esc(m.tithi)} · ${esc(m.nakshatra)}</div>
        <div class="upcoming-times">${wins}</div></div></li>`;
  };

  // Muhurtham days from the entered date through the next UPCOMING_DAYS days.
  const showMuhurthaBanner = (failed) => {
    const box = $("muhurthaBanner");
    const title = `<div class="upcoming-title">Shubha Muhurtham (next ${UPCOMING_DAYS} days)</div>`;
    const rows = muhurthas.filter((u) => u.date < cut).map(muhurthaRow);
    if (failed) box.innerHTML = title + `<div class="festival-note">Couldn't calculate muhurtham days.</div>`;
    else if (!rows.length) box.innerHTML = title + `<div class="festival-note">No muhurtham days in the next ${UPCOMING_DAYS} days.</div>`;
    else box.innerHTML = title + `<ul class="upcoming-list muhurtha-list">${rows.join("")}</ul>`;
  };

  const showMuhurthas = (status) => {
    let html = "", month = "";
    for (const u of muhurthas) {
      const fd = festivalDate(u.date);
      const key = `${fd.y}-${fd.m}`;
      if (key !== month) {
        html += `${month ? "</ul>" : ""}<h3 class="year-month">${MONTH_NAMES[fd.m - 1]} ${fd.y}</h3><ul class="upcoming-list muhurtha-list">`;
        month = key;
      }
      html += muhurthaRow(u);
    }
    if (month) html += "</ul>";
    if (status) html += `<p class="hint">${esc(status)}</p>`;
    else if (!muhurthas.length) html += `<p class="hint">No shubha muhurtham days found.</p>`;
    $("muhurthaYear").innerHTML = html;
  };

  const step = () => {
    if (seq !== festivalSeq) return; // a newer chart replaced this one
    try {
      const end = Math.min(done + CHUNK_DAYS, YEAR_DAYS);
      for (; done < end; done++) {
        const w = midnight + done * 86400e3;
        const festivals = festivalsFor(w, c.input.lat, c.input.lon, offset);
        if (festivals.length) found.push({ date: isoFromWall(w).slice(0, 10), festivals });
        const m = muhurthaFor(w, c.input.lat, c.input.lon, offset);
        if (m) muhurthas.push({ date: isoFromWall(w).slice(0, 10), m });
      }
    } catch {
      if (!bannerDone) { showUpcoming(true); showMuhurthaBanner(true); }
      showYear("Couldn't calculate the remaining festivals.");
      return;
    }
    if (!bannerDone && done > UPCOMING_DAYS) { bannerDone = true; showUpcoming(false); showMuhurthaBanner(false); }
    if (done < YEAR_DAYS) {
      showYear("Calculating…");
      setTimeout(step, 0);
    } else {
      showYear(found.length ? "" : "No festivals found.");
    }
  };
  setTimeout(step, 30);
}

function renderPositions(c) {
  const signs = c.constants.signs, abbr = c.constants.sign_abbr;
  const rows = c.bodies.map((b) => `
    <tr class="${b.key === "lagna" ? "lagna" : ""}">
      <td>${esc(b.name)}${b.retro ? '<span class="retro-tag" title="Retrograde">R</span>' : ""}</td>
      <td>${esc(signs[b.sign])}</td>
      <td class="num">${esc(b.dms.text)}</td>
      <td>${esc(b.nakshatra.name)}</td>
      <td>${b.nakshatra.pada}</td>
      <td>${esc(b.nakshatra.lord)}</td>
      <td>${esc(abbr[b.navamsa])}</td>
      <td>${esc(b.karaka || "")}</td>
    </tr>`).join("");
  $("positions").innerHTML = `
    <thead><tr><th>Body</th><th>Rasi</th><th>Longitude</th><th>Nakshatra</th><th>Pada</th>
    <th>Nak. lord</th><th>Navamsa</th><th>Karaka</th></tr></thead>
    <tbody>${rows}</tbody>`;
}

function renderBhavaTable(c) {
  const abbr = c.constants.sign_abbr;
  const occupants = {};
  for (const b of c.bodies) if (b.key !== "lagna") (occupants[b.house] ||= []).push(b.abbr);
  const cell = (sign, d) => `<td class="num">${abbr[sign]} ${esc(d.text)}</td>`;
  const rows = c.bhavas.map((h) => `
    <tr><td>${h.house}</td>${cell(h.start_sign, h.start_dms)}${cell(h.mid_sign, h.mid_dms)}${cell(h.end_sign, h.end_dms)}
    <td>${esc((occupants[h.house] || []).join(", "))}</td></tr>`).join("");
  $("bhavaTable").innerHTML = `
    <thead><tr><th>House</th><th>Start (sandhi)</th><th>Middle (madhya)</th><th>End</th><th>Planets</th></tr></thead>
    <tbody>${rows}</tbody>`;
  $("bhavaLabel").textContent = `· ${c.settings.bhava_label}`;
}

// ---------- tabs ----------

const TAB_KEY = "vedic-chart-tab";
const TABS = ["panchanga", "festivals", "chart"];

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
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function fmtSpan(startIso, endIso) {
  const days = (new Date(endIso) - new Date(startIso)) / 86400000;
  const y = Math.floor(days / 365.2425);
  const rest = days - y * 365.2425;
  const m = Math.floor(rest / 30.436875);
  const d = Math.round(rest - m * 30.436875);
  return [y && `${y}y`, m && `${m}m`, d && `${d}d`].filter(Boolean).join(" ") || "0d";
}

const isCurrent = (p, today) => p.start.slice(0, 10) <= today && today < p.end.slice(0, 10);
const todayIso = () => new Date().toISOString().slice(0, 10);

function periodRow(tag, cls, p, label, now) {
  const row = document.createElement(tag);
  row.className = cls;
  row.innerHTML = `
    <span class="row-head"><span class="lord">${esc(label)}</span>
      <span class="dur">${esc(fmtSpan(p.start, p.end))}</span>
      ${now ? '<span class="now-tag">now</span>' : ""}</span>
    <span class="row-dates"${p.actualStart ? ` title="Began ${fmtDate(p.actualStart)}, before the entered date"` : ""}>${fmtDate(p.start)} – ${fmtDate(p.end)}</span>`;
  return row;
}

// Only periods from the entered date onwards; the one running then starts at that date.
function clipDashas(mahadashas, from) {
  const clip = (p) => (p.start < from ? { ...p, start: from, actualStart: p.start } : p);
  return mahadashas.filter((md) => md.end > from).map((md) => ({
    ...clip(md), antardashas: md.antardashas.filter((ad) => ad.end > from).map(clip),
  }));
}

function renderDasha(c) {
  dashaData = { ...c.vimshottari, mahadashas: clipDashas(c.vimshottari.mahadashas, c.input.local_time) };
  const mds = dashaData.mahadashas, today = todayIso();
  $("dashaBalance").textContent = mds.length ? `· balance remaining: ${mds[0].name} ${fmtSpan(mds[0].start, mds[0].end)}` : "";

  const list = $("mdList");
  list.innerHTML = "";
  mds.forEach((md, i) => {
    const li = document.createElement("li");
    const btn = periodRow("button", "md-row", md, md.name, isCurrent(md, today));
    btn.type = "button";
    btn.addEventListener("click", () => selectMahadasha(i));
    li.appendChild(btn);
    list.appendChild(li);
  });
  const cur = mds.findIndex((md) => isCurrent(md, today));
  selectMahadasha(cur >= 0 ? cur : 0);
}

function selectMahadasha(i) {
  selectedMd = i;
  const md = dashaData.mahadashas[i], today = todayIso();
  $("mdList").querySelectorAll(".md-row").forEach((el, j) => {
    el.classList.toggle("selected", j === i);
    el.setAttribute("aria-pressed", String(j === i));
  });
  $("adTitle").textContent = `Antardashas in ${md.name} mahadasha`;
  const list = $("adList");
  list.innerHTML = "";
  for (const ad of md.antardashas) {
    const now = isCurrent(ad, today);
    const li = periodRow("li", `ad-row${now ? " current" : ""}`, ad, `${md.name} – ${ad.name}`, now);
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
    ayanamsa: $("ayanamsa").value, bhava: $("bhava").value,
  };
  if (!params.date || !params.time) return showError("Enter a date and time.");
  if (params.lat === "" || params.lon === "") return showError("Search for a place or enter latitude and longitude.");
  const lat = Number(params.lat), lon = Number(params.lon);
  if (!(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180)) return showError("Latitude must be within ±90 and longitude within ±180.");
  if (offset != null && !(Math.abs(offset) <= 14)) return showError("UTC offset must be within ±14 hours.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date) || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(params.time)) {
    return showError("Date must be YYYY-MM-DD and time HH:MM[:SS]");
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
    const c = computeChart(wallFromInputs(params.date, params.time), offset, lat, lon, params.ayanamsa, params.bhava);
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
    savePrefs();
  } catch (err) {
    showError(err.message);
  } finally {
    $("go").disabled = false;
  }
}

async function init() {
  $("datefmt").textContent = `(${dateFormatHint()})`;
  const opts = {
    ayanamsas: Object.fromEntries(Object.entries(AYANAMSAS).map(([k, v]) => [k, v[0]])),
    bhava_methods: BHAVA_METHODS,
  };
  for (const [id, map] of [["ayanamsa", opts.ayanamsas], ["bhava", opts.bhava_methods]]) {
    $(id).innerHTML = Object.entries(map).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
  }
  loadPrefs();
  // URL parameters (?date=..&time=..&lat=..&lon=..) override the device defaults.
  const qs = new URLSearchParams(location.search);
  const fromUrl = qs.has("date");
  if (fromUrl) {
    for (const f of FIELDS) if (qs.has(f)) $(f).value = qs.get(f);
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
  for (const id of ["lat", "lon", "date", "time"]) $(id).addEventListener("change", refreshTimezone);
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
