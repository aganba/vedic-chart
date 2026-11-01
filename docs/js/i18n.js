// English / Tamil display text. The calculations (astro.js, festivals.js, ...)
// always produce English names, so they stay identical to the Python version;
// the page translates them when it draws. t() handles interface phrases and
// tr() handles astrological terms and festival text.

const STORE_KEY = "vedic-chart-lang";
let lang = "en";

export const getLang = () => lang;
export function setLang(l) {
  lang = l === "ta" ? "ta" : "en";
  try { localStorage.setItem(STORE_KEY, lang); } catch {}
  if (typeof document !== "undefined") document.documentElement.lang = lang;
}
export function savedLang() {
  try { return localStorage.getItem(STORE_KEY) || "en"; } catch { return "en"; }
}

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : `{${k}}`));

// ---------- interface phrases (English template -> Tamil) ----------

const UI = {
  "Vedic Chart": "வேத ஜாதகம்",
  "Place": "இடம்",
  "Start typing a city or town": "ஊர் அல்லது நகரத்தின் பெயரை உள்ளிடவும்",
  "Search": "தேடு",
  "Date": "தேதி",
  "Time": "நேரம்",
  "(local)": "(உள்ளூர்)",
  "Latitude": "அட்சரேகை",
  "Longitude": "தீர்க்கரேகை",
  "(N +)": "(வ +)",
  "(E +)": "(கி +)",
  "UTC offset": "UTC வேறுபாடு",
  "auto, e.g. +05:30": "தானாக, எ.கா. +05:30",
  "Ayanamsa": "அயனாம்சம்",
  "Bhava method": "பாவ முறை",
  "Now": "இப்போது",
  "Current date, time and location": "தற்போதைய தேதி, நேரம், இடம்",
  "Calculate": "கணி",
  "Panchanga": "பஞ்சாங்கம்",
  "Special Days": "விசேஷ நாட்கள்",
  "Birth Chart": "ஜாதகம்",
  "Rasi chart (D1)": "ராசி கட்டம் (D1)",
  "Navamsa chart (D9)": "நவாம்ச கட்டம் (D9)",
  "Rasi": "ராசி",
  "Navamsa": "நவாம்சம்",
  "Planetary positions": "கிரக நிலைகள்",
  "Bhavas": "பாவங்கள்",
  "Vimshottari Dasha": "விம்சோத்தரி தசை",
  "Select a mahadasha to see its antardashas (bhuktis).": "ஒரு மகா தசையைத் தேர்ந்தெடுத்தால் அதன் புக்திகள் தெரியும்.",
  "Festivals": "பண்டிகைகள்",
  "Shubha Muhurtham": "சுப முகூர்த்தம்",
  "Days with a good tithi, nakshatra and weekday, outside Aadi, Purattasi and Margazhi and not a Kari naal, with time windows that avoid Rahu Kalam, Yamaganda, Gulika Kalam and Vishti karana and have no planet in the 8th house from the lagna. Personal factors such as tarabala and chandrabala aren't considered, and panchangams differ, so confirm with your family astrologer.":
    "நல்ல திதி, நட்சத்திரம், கிழமை உள்ள நாட்கள் (ஆடி, புரட்டாசி, மார்கழி மாதங்களும் கரி நாட்களும் தவிர). நேரங்கள் ராகு காலம், எமகண்டம், குளிகை, விஷ்டி கரணம் இல்லாதவை; லக்னத்திலிருந்து 8-ஆம் வீட்டில் கிரகம் இல்லாதவை. தாராபலம், சந்திரபலம் போன்ற தனிப்பட்ட அம்சங்கள் கணக்கில் கொள்ளப்படவில்லை; பஞ்சாங்கங்களிடையே வேறுபாடு இருக்கலாம், எனவே உங்கள் குடும்ப ஜோதிடரிடம் உறுதி செய்துகொள்ளவும்.",
  // panchanga
  "Day": "நாள்",
  "{date} (calendar date)": "{date} (ஆங்கிலத் தேதி)",
  "Vara (Vedic day)": "வாரம் (வேத நாள்)",
  "Vedic day runs sunrise to sunrise": "வேத நாள் சூரிய உதயம் முதல் அடுத்த சூரிய உதயம் வரை",
  "Vedic day runs sunrise to sunrise; this date's sunrise is {t}": "வேத நாள் சூரிய உதயம் முதல் அடுத்த சூரிய உதயம் வரை; இந்தத் தேதியின் சூரிய உதயம் {t}",
  "Tithi": "திதி",
  "{pct}% left · ends {t}": "{pct}% மீதம் · முடிவு {t}",
  "Nakshatra": "நட்சத்திரம்",
  "{nak} pada {pada}": "{nak} {pada}-ஆம் பாதம்",
  "{pct}% left · ends {t} · lord {lord}": "{pct}% மீதம் · முடிவு {t} · அதிபதி {lord}",
  "Nakshatra at sunrise": "சூரிய உதய நட்சத்திரம்",
  "at sunrise {t} · until {u} · lord {lord}": "சூரிய உதயம் {t} · {u} வரை · அதிபதி {lord}",
  "Yoga": "யோகம்",
  "Karana": "கரணம்",
  "ends {t}": "முடிவு {t}",
  "Lunar month / year": "சந்திர மாதம் / வருடம்",
  "Tamil date": "தமிழ்த் தேதி",
  "{year} year (Tamil calendar, from Chithirai)": "{year} வருடம் (சித்திரை முதல்)",
  "{year} samvatsara (amanta)": "{year} வருடம் (அமாந்த)",
  "Sunrise / Sunset": "சூரிய உதயம் / அஸ்தமனம்",
  "next sunrise {t}": "அடுத்த சூரிய உதயம் {t}",
  "Rahu Kalam": "ராகு காலம்",
  "Yamaganda": "எமகண்டம்",
  "Gulika Kalam": "குளிகை காலம்",
  "Hora": "ஓரை",
  "{from} – {to} · next {lord}": "{from} – {to} · அடுத்து {lord}",
  "Ayanamsa: {name} = {value}": "அயனாம்சம்: {name} = {value}",
  "Chart": "ஜாதகம்",
  // festivals and muhurtham
  "Coming up (next {n} days)": "வரவிருப்பவை (அடுத்த {n} நாட்கள்)",
  "Shubha Muhurtham (next {n} days)": "சுப முகூர்த்தம் (அடுத்த {n} நாட்கள்)",
  "Checking…": "சரிபார்க்கிறது…",
  "Calculating…": "கணக்கிடுகிறது…",
  "Couldn't calculate upcoming festivals.": "வரவிருக்கும் பண்டிகைகளைக் கணக்கிட முடியவில்லை.",
  "No festivals in the next {n} days.": "அடுத்த {n} நாட்களில் பண்டிகைகள் இல்லை.",
  "Couldn't calculate muhurtham days.": "முகூர்த்த நாட்களைக் கணக்கிட முடியவில்லை.",
  "No muhurtham days in the next {n} days.": "அடுத்த {n} நாட்களில் முகூர்த்த நாட்கள் இல்லை.",
  "No shubha muhurtham days found.": "சுப முகூர்த்த நாட்கள் எதுவும் இல்லை.",
  "Couldn't calculate the remaining festivals.": "மீதமுள்ள பண்டிகைகளைக் கணக்கிட முடியவில்லை.",
  "No festivals found.": "பண்டிகைகள் எதுவும் இல்லை.",
  "{lagna} lagna": "{lagna} லக்னம்",
  // tables
  "Body": "கிரகம்",
  "Longitude|table": "பாகை", // "|context" keys show the part before "|" in English
  "Pada": "பாதம்",
  "Nak. lord": "நட்சத்திர அதிபதி",
  "Karaka": "காரகன்",
  "Retrograde": "வக்ரம்",
  "R": "வ",
  "House": "பாவம்",
  "Start (sandhi)": "ஆரம்பம் (சந்தி)",
  "Middle (madhya)": "மத்தியம்",
  "End": "முடிவு",
  "Planets": "கிரகங்கள்",
  // dasha
  "· balance remaining: {lord} {span}": "· தசா இருப்பு: {lord} {span}",
  "Antardashas in {lord} mahadasha": "{lord} மகா தசையில் புக்திகள்",
  "now": "நடப்பு",
  "Began {date}, before the entered date": "{date} அன்று தொடங்கியது (உள்ளிட்ட தேதிக்கு முன்)",
  // place search and errors
  "Locating…": "இடம் கண்டறிகிறது…",
  "Current location": "தற்போதைய இடம்",
  "{city} (from device time zone)": "{city} (சாதன நேர மண்டலத்திலிருந்து)",
  "Couldn't determine this device's location. Search for a place.": "இந்தச் சாதனத்தின் இடத்தைக் கண்டறிய முடியவில்லை. ஓர் இடத்தைத் தேடவும்.",
  "No matches. Try “City, Country”.": "பொருத்தம் இல்லை. “நகரம், நாடு” என்று முயலவும்.",
  "UTC offset should look like +05:30 or -4": "UTC வேறுபாடு +05:30 அல்லது -4 போல இருக்க வேண்டும்",
  "No timezone found for these coordinates; enter the UTC offset manually": "இந்த அமைவிடத்துக்கு நேர மண்டலம் கிடைக்கவில்லை; UTC வேறுபாட்டை நீங்களே உள்ளிடவும்",
  "Enter a date and time.": "தேதியையும் நேரத்தையும் உள்ளிடவும்.",
  "Search for a place or enter latitude and longitude.": "ஓர் இடத்தைத் தேடவும் அல்லது அட்சரேகை, தீர்க்கரேகையை உள்ளிடவும்.",
  "Latitude must be within ±90 and longitude within ±180.": "அட்சரேகை ±90-க்குள்ளும் தீர்க்கரேகை ±180-க்குள்ளும் இருக்க வேண்டும்.",
  "UTC offset must be within ±14 hours.": "UTC வேறுபாடு ±14 மணி நேரத்துக்குள் இருக்க வேண்டும்.",
  "Date must be YYYY-MM-DD and time HH:MM[:SS]": "தேதி YYYY-MM-DD ஆகவும் நேரம் HH:MM[:SS] ஆகவும் இருக்க வேண்டும்",
  "yyyy-mm-dd": "ஆண்டு-மாதம்-நாள்",
  "Chart sections": "ஜாதகப் பகுதிகள்",
  "Rasi chart": "ராசி கட்டம்",
  "Navamsa chart": "நவாம்ச கட்டம்",
};

export function t(key, vars) {
  return fill(lang === "ta" && UI[key] != null ? UI[key] : key.split("|")[0], vars);
}

// Footer with links, per language.
export const FOOTER = {
  en: `Calculations run on your device using the <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> (AGPL-3.0).
    Place names from <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0) and
    <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.
    <a href="https://github.com/aganba/vedic-chart">Source code</a>.`,
  ta: `கணக்கீடுகள் அனைத்தும் <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> (AGPL-3.0) கொண்டு உங்கள் சாதனத்திலேயே செய்யப்படுகின்றன.
    இடப் பெயர்கள்: <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0),
    <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.
    <a href="https://github.com/aganba/vedic-chart">மூலக் குறியீடு</a>.`,
};

// ---------- dates ----------

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_EN = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const MONTHS_TA = ["ஜன.", "பிப்.", "மார்.", "ஏப்.", "மே", "ஜூன்", "ஜூலை", "ஆக.", "செப்.", "அக்.", "நவ.", "டிச."];
const MONTH_NAMES_TA = ["ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்", "ஜூலை", "ஆகஸ்ட்",
  "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_TA = ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"];

export const monthShort = (i) => (lang === "ta" ? MONTHS_TA : MONTHS_EN)[i];
export const monthLong = (i) => (lang === "ta" ? MONTH_NAMES_TA : MONTH_NAMES_EN)[i];
export const weekday = (i) => (lang === "ta" ? WEEKDAYS_TA : WEEKDAYS_EN)[i];
export const weekdayShort = (i) => (lang === "ta" ? WEEKDAYS_TA[i] : WEEKDAYS_EN[i].slice(0, 3));
// Duration like "3y 2m 5d".
export const spanUnits = () => (lang === "ta" ? ["ஆ", "மா", "நா"] : ["y", "m", "d"]);
// Compass letters for coordinates.
export const compass = (k) => (lang === "ta" ? { N: "வ", S: "தெ", E: "கி", W: "மே" }[k] : k);

// ---------- astrological terms ----------

const SIGNS = ["மேஷம்", "ரிஷபம்", "மிதுனம்", "கடகம்", "சிம்மம்", "கன்னி",
  "துலாம்", "விருச்சிகம்", "தனுசு", "மகரம்", "கும்பம்", "மீனம்"];
const zip = (keys, vals) => Object.fromEntries(keys.map((k, i) => [k, vals[i]]));

const NS = {
  sign: {
    ...zip(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
      "Sagittarius", "Capricorn", "Aquarius", "Pisces"], SIGNS),
    ...zip(["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika",
      "Dhanu", "Makara", "Kumbha", "Meena"], SIGNS),
  },
  signAbbr: zip(["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"],
    ["மேஷ", "ரிஷ", "மிது", "கட", "சிம்", "கன்", "துலா", "விரு", "தனு", "மக", "கும்", "மீன"]),
  planet: {
    Lagna: "லக்னம்", Sun: "சூரியன்", Moon: "சந்திரன்", Mars: "செவ்வாய்", Mercury: "புதன்",
    Jupiter: "குரு", Venus: "சுக்கிரன்", Saturn: "சனி", Rahu: "ராகு", Ketu: "கேது",
  },
  planetAbbr: { Asc: "லக்", Su: "சூரி", Mo: "சந்", Ma: "செவ்", Me: "புத", Ju: "குரு", Ve: "சுக்", Sa: "சனி", Ra: "ராகு", Ke: "கேது" },
  karaka: { AK: "ஆத்ம", AmK: "அமாத்ய", BK: "பிராத்ரு", MK: "மாத்ரு", PiK: "பித்ரு", PK: "புத்ர", GK: "ஞாதி", DK: "தார" },
  nakshatra: zip(["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu",
    "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
    "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"],
  ["அஸ்வினி", "பரணி", "கார்த்திகை", "ரோகிணி", "மிருகசீரிஷம்", "திருவாதிரை", "புனர்பூசம்",
    "பூசம்", "ஆயில்யம்", "மகம்", "பூரம்", "உத்திரம்", "அஸ்தம்", "சித்திரை", "சுவாதி",
    "விசாகம்", "அனுஷம்", "கேட்டை", "மூலம்", "பூராடம்", "உத்திராடம்", "திருவோணம்",
    "அவிட்டம்", "சதயம்", "பூரட்டாதி", "உத்திரட்டாதி", "ரேவதி"]),
  tithi: {
    ...zip(["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
      "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"],
    ["பிரதமை", "துவிதியை", "திருதியை", "சதுர்த்தி", "பஞ்சமி", "சஷ்டி", "சப்தமி",
      "அஷ்டமி", "நவமி", "தசமி", "ஏகாதசி", "துவாதசி", "திரயோதசி", "சதுர்த்தசி"]),
    Purnima: "பௌர்ணமி", Amavasya: "அமாவாசை",
  },
  paksha: { Shukla: "வளர்பிறை", Krishna: "தேய்பிறை", Valarpirai: "வளர்பிறை", Theipirai: "தேய்பிறை" },
  yoga: zip(["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
    "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla",
    "Brahma", "Indra", "Vaidhriti"],
  ["விஷ்கம்பம்", "பிரீதி", "ஆயுஷ்மான்", "சௌபாக்கியம்", "சோபனம்", "அதிகண்டம்",
    "சுகர்மம்", "திருதி", "சூலம்", "கண்டம்", "விருத்தி", "துருவம்", "வியாகாதம்", "ஹர்ஷணம்", "வஜ்ரம்",
    "சித்தி", "வியதீபாதம்", "வரீயான்", "பரிகம்", "சிவம்", "சித்தம்", "சாத்தியம்", "சுபம்", "சுக்லம்",
    "பிராம்மியம்", "ஐந்திரம்", "வைதிருதி"]),
  karana: zip(["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti",
    "Shakuni", "Chatushpada", "Naga", "Kimstughna"],
  ["பவம்", "பாலவம்", "கௌலவம்", "தைதுலம்", "கரசை", "வணிசை", "பத்திரை",
    "சகுனி", "சதுஷ்பாதம்", "நாகவம்", "கிம்ஸ்துக்னம்"]),
  masa: zip(["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada",
    "Ashvayuja", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"],
  ["சைத்ரம்", "வைசாகம்", "ஜ்யேஷ்டம்", "ஆஷாடம்", "ஷ்ராவணம்", "பாத்ரபதம்",
    "ஆஸ்வயுஜம்", "கார்த்திகம்", "மார்கசீர்ஷம்", "பௌஷம்", "மாகம்", "பால்குனம்"]),
  samvatsara: zip([
    "Prabhava", "Vibhava", "Shukla", "Pramoda", "Prajapati", "Angirasa", "Shrimukha",
    "Bhava", "Yuva", "Dhatu", "Ishvara", "Bahudhanya", "Pramathi", "Vikrama", "Vrisha",
    "Chitrabhanu", "Subhanu", "Tarana", "Parthiva", "Vyaya", "Sarvajit", "Sarvadhari",
    "Virodhi", "Vikriti", "Khara", "Nandana", "Vijaya", "Jaya", "Manmatha", "Durmukhi",
    "Hevilambi", "Vilambi", "Vikari", "Sharvari", "Plava", "Shubhakrit", "Shobhakrit",
    "Krodhi", "Vishvavasu", "Parabhava", "Plavanga", "Kilaka", "Saumya", "Sadharana",
    "Virodhikrit", "Paridhavi", "Pramadi", "Ananda", "Rakshasa", "Nala", "Pingala",
    "Kalayukti", "Siddharthi", "Raudri", "Durmati", "Dundubhi", "Rudhirodgari",
    "Raktakshi", "Krodhana", "Akshaya"], [
    "பிரபவ", "விபவ", "சுக்ல", "பிரமோதூத", "பிரஜோற்பத்தி", "ஆங்கீரச", "ஸ்ரீமுக",
    "பவ", "யுவ", "தாது", "ஈஸ்வர", "வெகுதானிய", "பிரமாதி", "விக்கிரம", "விஷு",
    "சித்திரபானு", "சுபானு", "தாரண", "பார்த்திப", "விய", "சர்வஜித்", "சர்வதாரி",
    "விரோதி", "விக்ருதி", "கர", "நந்தன", "விஜய", "ஜய", "மன்மத", "துன்முகி",
    "ஹேவிளம்பி", "விளம்பி", "விகாரி", "சார்வரி", "பிலவ", "சுபகிருது", "சோபகிருது",
    "குரோதி", "விசுவாவசு", "பராபவ", "பிலவங்க", "கீலக", "சௌமிய", "சாதாரண",
    "விரோதகிருது", "பரிதாபி", "பிரமாதீச", "ஆனந்த", "ராட்சச", "நள", "பிங்கள",
    "காளயுக்தி", "சித்தார்த்தி", "ரௌத்திரி", "துன்மதி", "துந்துபி", "ருத்ரோத்காரி",
    "ரக்தாட்சி", "குரோதன", "அட்சய"]),
  weekday: zip(WEEKDAYS_EN, WEEKDAYS_TA),
  tamilMonth: zip(["Chithirai", "Vaikasi", "Aani", "Aadi", "Avani", "Purattasi",
    "Aippasi", "Karthigai", "Margazhi", "Thai", "Maasi", "Panguni"],
  ["சித்திரை", "வைகாசி", "ஆனி", "ஆடி", "ஆவணி", "புரட்டாசி",
    "ஐப்பசி", "கார்த்திகை", "மார்கழி", "தை", "மாசி", "பங்குனி"]),
  vara: zip(["Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara"],
    ["ரவி வாரம்", "சோம வாரம்", "மங்கள வாரம்", "புத வாரம்", "குரு வாரம்", "சுக்கிர வாரம்", "சனி வாரம்"]),
  ayanamsa: {
    "True Chitrapaksha": "சித்திரபக்ஷம் (உண்மை)", "Lahiri": "லாஹிரி", "Raman": "ராமன்",
    "Krishnamurti (KP)": "கிருஷ்ணமூர்த்தி (கே.பி.)",
  },
  bhava: {
    "Equal, lagna at middle of 1st house": "சம பாவம், லக்னம் முதல் பாவத்தின் மத்தியில்",
    "Sripati": "ஸ்ரீபதி", "Placidus": "பிளாசிடஸ்",
  },
  region: {
    "Tamil Nadu": "தமிழ்நாடு", "Andhra Pradesh": "ஆந்திரப் பிரதேசம்", "Telangana": "தெலங்கானா",
    "Karnataka": "கர்நாடகா", "Maharashtra": "மகாராஷ்டிரா", "Kerala": "கேரளா",
    "North India": "வட இந்தியா", "South India": "தென்னிந்தியா",
  },
  festival: {
    "Aadi Perukku": "ஆடிப்பெருக்கு",
    "Akshaya Tritiya": "அட்சய திருதியை",
    "Arudra Darshan": "ஆருத்ரா தரிசனம்",
    "Bhai Dooj": "பாய் தூஜ் (யம துவிதியை)",
    "Bhogi": "போகி",
    "Buddha Purnima": "புத்த பூர்ணிமா",
    "Dhanteras": "தன திரயோதசி",
    "Diwali (Lakshmi Puja)": "தீபாவளி (லட்சுமி பூஜை)",
    "Durga Ashtami": "துர்காஷ்டமி",
    "Ganesh Chaturthi": "விநாயகர் சதுர்த்தி",
    "Gayatri Japam": "காயத்ரி ஜபம்",
    "Govardhan Puja / Bali Pratipada": "கோவர்த்தன பூஜை / பலி பிரதமை",
    "Guru Purnima": "குரு பூர்ணிமா",
    "Hanuman Jayanti": "அனுமன் ஜெயந்தி",
    "Holi": "ஹோலி",
    "Holika Dahan": "ஹோலிகா தகனம்",
    "Kaanum Pongal": "காணும் பொங்கல்",
    "Karadaiyan Nonbu": "காரடையான் நோன்பு",
    "Karthigai Deepam": "கார்த்திகை தீபம்",
    "Kartika Purnima": "கார்த்திகை பௌர்ணமி",
    "Krishna Janmashtami": "கிருஷ்ண ஜெயந்தி (கோகுலாஷ்டமி)",
    "Maasi Magam": "மாசி மகம்",
    "Maha Navami / Ayudha Puja": "மகா நவமி / ஆயுத பூஜை",
    "Maha Shivaratri": "மகா சிவராத்திரி",
    "Mahalaya Amavasya": "மகாளய அமாவாசை",
    "Makara Sankranti": "மகர சங்கராந்தி",
    "Mattu Pongal": "மாட்டுப் பொங்கல்",
    "Nag Panchami": "நாக பஞ்சமி",
    "Diwali (Naraka Chaturdashi)": "தீபாவளி (நரக சதுர்த்தசி)",
    "Navaratri begins (Ghatasthapana)": "நவராத்திரி ஆரம்பம் (கலச ஸ்தாபனம்)",
    "Onam (Thiruvonam)": "ஓணம் (திருவோணம்)",
    "Panguni Uttiram": "பங்குனி உத்திரம்",
    "Puthandu (Tamil New Year)": "சித்திரைப் புத்தாண்டு (தமிழ்ப் புத்தாண்டு)",
    "Raksha Bandhan": "ரக்ஷா பந்தன்",
    "Rama Navami": "ஸ்ரீ ராம நவமி",
    "Ratha Saptami": "ரத சப்தமி",
    "Rig Upakarma": "ரிக் உபாகர்மா",
    "Sama Upakarma": "சாம உபாகர்மா",
    "Soora Samharam (Skanda Sashti)": "சூரசம்ஹாரம் (கந்த சஷ்டி)",
    "Thai Pongal": "தைப் பொங்கல்",
    "Thai Poosam": "தைப்பூசம்",
    "Ugadi / Gudi Padwa (lunar New Year)": "யுகாதி / குடி பட்வா (சாந்திரமான புத்தாண்டு)",
    "Vaikasi Visakam": "வைகாசி விசாகம்",
    "Vaikuntha Ekadashi": "வைகுண்ட ஏகாதசி",
    "Varalakshmi Vratam": "வரலட்சுமி விரதம்",
    "Vasant Panchami": "வசந்த பஞ்சமி",
    "Vijayadashami / Dussehra": "விஜயதசமி / தசரா",
    "Vishu": "விஷு",
    "Yajur Upakarma (Avani Avittam)": "யஜுர் உபாகர்மா (ஆவணி அவிட்டம்)",
  },
  // puja-time labels and notes
  label: {
    "Madhyahna puja": "மத்தியான பூஜை",
    "Nishita puja": "நிசித பூஜை (நள்ளிரவு)",
    "Madhyahna Ganesha puja": "மத்தியான விநாயகர் பூஜை",
    "Aparahna (tarpanam)": "அபராஹ்ணம் (தர்ப்பணம்)",
    "Aparahna puja": "அபராஹ்ண பூஜை",
    "Pradosha (puja)": "பிரதோஷம் (பூஜை)",
    "Lakshmi puja (pradosha)": "லட்சுமி பூஜை (பிரதோஷம்)",
    "Aparahna": "அபராஹ்ணம்",
    "Nishita kaal puja": "நிசித கால பூஜை",
    "Soora Samharam (evening, from sunset)": "சூரசம்ஹாரம் (மாலை, சூரிய அஸ்தமனம் முதல்)",
    "Pradosha": "பிரதோஷம்",
    "After Bhadra ends": "பத்திரை முடிந்த பின்",
    "Rakhi (before Purnima ends)": "ராக்கி (பௌர்ணமி முடியும் முன்)",
    "Purnima": "பௌர்ணமி",
    "Amavasya": "அமாவாசை",
    "Lamps lit at sunset": "சூரிய அஸ்தமனத்தில் தீபம் ஏற்றுதல்",
    "Nonbu time (Sun enters Meena)": "நோன்பு நேரம் (சூரியன் மீனத்தில் பிரவேசம்)",
  },
  note: {
    "Deepavali in South India; abhyanga snanam before sunrise.": "தென்னிந்தியாவில் தீபாவளி; சூரிய உதயத்துக்கு முன் எண்ணெய்க் குளியல் (கங்கா ஸ்நானம்).",
    "Lit outside Bhadra (Vishti karana).": "பத்திரை (விஷ்டி கரணம்) இல்லாத நேரத்தில் ஏற்றப்படுகிறது.",
    "Rakhi is tied outside Bhadra (Vishti karana).": "பத்திரை (விஷ்டி கரணம்) இல்லாத நேரத்தில் ராக்கி கட்டப்படுகிறது.",
    "The nonbu kayiru (sacred thread) is tied at the moment Maasi ends and Panguni begins.":
      "மாசி முடிந்து பங்குனி தொடங்கும் நேரத்தில் நோன்புக் கயிறு கட்டப்படுகிறது.",
  },
};

const look = (ns, s) => NS[ns]?.[s];

// Translate an English term. `ns` picks the vocabulary when a word means
// different things (Magha the nakshatra vs. Magha the month).
export function tr(s, ns) {
  if (lang !== "ta" || s == null || s === "") return s;
  const direct = look(ns, s);
  if (direct != null) return direct;
  switch (ns) {
    case "masa": {
      const m = s.match(/^Adhika (.+)$/);
      return m ? `அதிக ${tr(m[1], "masa")}` : s;
    }
    case "tithi": { // "Shukla Dwitiya", "Dwitiya / Tritiya"
      if (s.includes(" / ")) return s.split(" / ").map((x) => tr(x, "tithi")).join(" / ");
      const m = s.match(/^(Shukla|Krishna) (.+)$/);
      return m ? `${tr(m[1], "paksha")} ${tr(m[2], "tithi")}` : s;
    }
    case "nakshatra":
      return s.includes(" / ") ? s.split(" / ").map((x) => tr(x, "nakshatra")).join(" / ") : s;
    case "region":
      return s.split(", ").map((x) => look("region", x) ?? x).join(", ");
    case "label": { // festival time labels, some built from parts
      let m = s.match(/^(.+) nakshatra$/);
      if (m) return `${tr(m[1], "nakshatra")} நட்சத்திரம்`;
      m = s.match(/^Sun enters (.+) \(sankranti\)$/);
      if (m) return `சூரியப் பிரவேசம்: ${tr(m[1], "sign")} (சங்கராந்தி)`;
      m = s.match(/^(.+) at sunrise$/);
      if (m) return `சூரிய உதயத்தில் ${tr(m[1], "tithi")}`;
      return tr(s, "tithi");
    }
    default:
      return s;
  }
}

// Daylight-saving notes from tz.js.
export function tzNote(s) {
  if (lang !== "ta" || !s) return s;
  let m = s.match(/^(\S+) occurred twice on this date \(clocks went back\)\. Using the first occurrence, (UTC\S+); enter (UTC\S+) for the second\.$/);
  if (m) return `இந்தத் தேதியில் ${m[1]} இரண்டு முறை வந்தது (கடிகாரம் பின்னோக்கி மாற்றப்பட்டது). முதல் முறை (${m[2]}) கணக்கிடப்படுகிறது; இரண்டாவதற்கு ${m[3]} என உள்ளிடவும்.`;
  m = s.match(/^(\S+) did not exist on this date \(clocks went forward\)\. Using (UTC\S+); check the recorded birth time\.$/);
  if (m) return `இந்தத் தேதியில் ${m[1]} என்ற நேரம் இல்லை (கடிகாரம் முன்னோக்கி மாற்றப்பட்டது). ${m[2]} கணக்கிடப்படுகிறது; பதிவான பிறந்த நேரத்தைச் சரிபார்க்கவும்.`;
  return s;
}

// Every festival name and note the calculations can produce must have a Tamil
// entry; tools/i18n_check.mjs uses this.
export const _vocab = NS;
