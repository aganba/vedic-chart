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
  "Vedic Calendar": "வேத நாட்காட்டி",
  "Vedic Calendar – Free Panchangam, Tamil Calendar, Muhurtham & Birth Chart": "வேத நாட்காட்டி – இலவச பஞ்சாங்கம், தமிழ்த் தேதி, முகூர்த்தம், ஜாதகம்",
  "Free Vedic calendar app: daily Panchangam with tithi, nakshatra, Rahu Kalam and hora, Tamil calendar dates, Hindu festival dates and puja times, Shubha Muhurtham days with lagna, and South Indian birth charts with Vimshottari dasha.": "இலவச வேத நாட்காட்டி செயலி: திதி, நட்சத்திரம், ராகு காலம், ஓரையுடன் தினசரி பஞ்சாங்கம், தமிழ்த் தேதி, பண்டிகை நாட்கள், பூஜை நேரங்கள், லக்னத்துடன் சுப முகூர்த்த நாட்கள், விம்சோத்தரி தசையுடன் தென்னிந்திய ஜாதகம்.",
  "Place": "இடம்",
  "Start typing a city or town": "ஊர் அல்லது நகரத்தின் பெயரை உள்ளிடவும்",
  "Search": "தேடு",
  "Date": "தேதி",
  "Time": "நேரம்",
  "Hour": "மணி",
  "Minute": "நிமிடம்",
  "AM or PM": "முற்பகல் அல்லது பிற்பகல்",
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
  // Special Days tab
  "Special Days": "விசேஷ நாட்கள்",
  "Eclipses and monthly observances from the entered date through the next 365 days, calculated for the place you entered, in local time.": "உள்ளிட்ட தேதி முதல் அடுத்த 365 நாட்களுக்கான கிரகணங்களும் மாதாந்திர விரத நாட்களும், நீங்கள் உள்ளிட்ட இடத்துக்கு உள்ளூர் நேரத்தில் கணக்கிடப்பட்டவை.",
  "Eclipses (grahanam)": "கிரகணங்கள்",
  "Eclipses": "கிரகணங்கள்",
  "Only eclipses that can be seen from this place are listed, with their local times; penumbral lunar eclipses, which panchangams don't observe, are left out. The eclipse can't be seen while the Sun or Moon is below the horizon.": "இந்த இடத்தில் தெரியும் கிரகணங்கள் மட்டும் உள்ளூர் நேரத்துடன் தரப்பட்டுள்ளன; பஞ்சாங்கங்கள் கடைப்பிடிக்காத புறநிழல் (பெனும்பிரல்) சந்திர கிரகணங்கள் சேர்க்கப்படவில்லை. சூரியனோ சந்திரனோ அடிவானத்துக்குக் கீழே இருக்கும்போது கிரகணம் தெரியாது.",
  "Amavasya": "அமாவாசை",
  "The day Amavasya prevails in the afternoon (aparahna), when tarpanam is offered.": "தர்ப்பணம் செய்யும் அபராஹ்ண (பிற்பகல்) நேரத்தில் அமாவாசை இருக்கும் நாள்.",
  "Pournami": "பௌர்ணமி",
  "The day Purnima prevails at sunset, when the full moon rises.": "முழு நிலவு உதிக்கும் சூரிய அஸ்தமன நேரத்தில் பௌர்ணமி இருக்கும் நாள்.",
  "Maasa pirappu": "மாதப் பிறப்பு",
  "The first day of each Tamil month, with the moment the Sun enters the new sign.": "ஒவ்வொரு தமிழ் மாதத்தின் முதல் நாள், சூரியன் புதிய ராசியில் பிரவேசிக்கும் நேரத்துடன்.",
  "Sankatahara Chaturthi": "சங்கடஹர சதுர்த்தி",
  "Angaraka Sankatahara Chaturthi": "அங்காரக சங்கடஹர சதுர்த்தி",
  "The day Krishna Chaturthi prevails at moonrise; the fast ends after sighting the moon.": "சந்திர உதயத்தில் தேய்பிறை சதுர்த்தி இருக்கும் நாள்; சந்திர தரிசனத்துக்குப் பின் விரதம் நிறைவு.",
  "Pradosham": "பிரதோஷம்",
  "The day Trayodashi prevails at sunset. Pradosha kaalam is 1½ hours before sunset to sunset, as in Tamil calendars.": "சூரிய அஸ்தமனத்தில் திரயோதசி இருக்கும் நாள். தமிழ் நாட்காட்டிகளைப் போல, பிரதோஷ காலம் சூரிய அஸ்தமனத்துக்கு ஒன்றரை மணி நேரம் முன்பிருந்து அஸ்தமனம் வரை.",
  "{month} Amavasya": "{month} அமாவாசை",
  "{month} Pournami": "{month} பௌர்ணமி",
  "{month} month begins": "{month} மாதப் பிறப்பு",
  "{paksha} Pradosham": "{paksha} பிரதோஷம்",
  "Soma Pradosham": "சோம பிரதோஷம்",
  "Shani Pradosham": "சனி மகா பிரதோஷம்",
  "Total solar eclipse": "முழு சூரிய கிரகணம்",
  "Annular solar eclipse": "வளைய சூரிய கிரகணம்",
  "Hybrid solar eclipse": "கலப்பு சூரிய கிரகணம்",
  "Partial solar eclipse": "பகுதி சூரிய கிரகணம்",
  "Total lunar eclipse": "முழு சந்திர கிரகணம்",
  "Partial lunar eclipse": "பகுதி சந்திர கிரகணம்",
  "{pct}% of the Sun covered": "சூரியனின் {pct}% மறைக்கப்படும்",
  "Visible throughout": "முழுவதும் தெரியும்",
  "Visible from sunrise": "சூரிய உதயம் முதல் தெரியும்",
  "Visible until sunset": "சூரிய அஸ்தமனம் வரை தெரியும்",
  "Visible from sunrise to sunset": "சூரிய உதயம் முதல் அஸ்தமனம் வரை தெரியும்",
  "Visible from moonrise": "சந்திர உதயம் முதல் தெரியும்",
  "Visible until moonset": "சந்திர அஸ்தமனம் வரை தெரியும்",
  "Visible from moonrise to moonset": "சந்திர உதயம் முதல் அஸ்தமனம் வரை தெரியும்",
  "Couldn't calculate eclipses.": "கிரகணங்களைக் கணக்கிட முடியவில்லை.",
  "No eclipses can be seen from this place in these 366 days.": "இந்த 366 நாட்களில் இந்த இடத்தில் கிரகணம் எதுவும் தெரியாது.",
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
  "More days for starting education": "கல்வி தொடங்க கூடுதல் நாட்கள்",
  "Days and times in the style of Tamil calendars, for marriage and other auspicious beginnings, calculated for the place you entered. Panchangams differ, and personal factors such as tarabala, chandrabala and chandrashtamam aren't considered, so confirm with your family astrologer.": "திருமணம் மற்றும் பிற சுப காரியங்களுக்கான தமிழ் நாட்காட்டி முறையிலான நாட்களும் நேரங்களும், நீங்கள் உள்ளிட்ட இடத்துக்குக் கணக்கிடப்பட்டவை. பஞ்சாங்கங்களிடையே வேறுபாடு இருக்கலாம்; தாராபலம், சந்திரபலம், சந்திராஷ்டமம் போன்ற தனிப்பட்ட அம்சங்கள் கணக்கில் கொள்ளப்படவில்லை, எனவே உங்கள் குடும்ப ஜோதிடரிடம் உறுதி செய்துகொள்ளவும்.",
  "Weekday: not Tuesday or Saturday.": "கிழமை: செவ்வாய், சனி அல்ல.",
  "Tithi: not Pratipada, Ashtami, Navami, Purnima, Amavasya or Theipirai Chaturdashi.": "திதி: பிரதமை, அஷ்டமி, நவமி, பௌர்ணமி, அமாவாசை, தேய்பிறை சதுர்த்தசி அல்ல.",
  "Nakshatra: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra, Swati, Anuradha, Mula, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Uttara Bhadrapada or Revati.": "நட்சத்திரம்: அஸ்வினி, ரோகிணி, மிருகசீரிஷம், புனர்பூசம், பூசம், உத்திரம், அஸ்தம், சித்திரை, சுவாதி, அனுஷம், மூலம், உத்திராடம், திருவோணம், அவிட்டம், சதயம், உத்திரட்டாதி அல்லது ரேவதி.",
  "Tamil month: not Aadi, Purattasi or Margazhi, and not the first day of a month.": "தமிழ் மாதம்: ஆடி, புரட்டாசி, மார்கழி அல்ல; மாதப் பிறப்பு நாளும் அல்ல.",
  "Not a Kari naal.": "கரி நாள் அல்ல.",
  "Yogam (from the weekday and the nakshatra at sunrise): Amirtha or Siddha, not Marana or Prabalarishta.": "யோகம் (கிழமை, சூரிய உதய நட்சத்திரத்திலிருந்து): அமிர்த அல்லது சித்த யோகம்; மரண, பிரபலாரிஷ்ட யோகம் அல்ல.",
  "Not an eclipse day, and neither Jupiter nor Venus combust (moudhyam).": "கிரகண நாள் அல்ல; குருவோ சுக்கிரனோ மௌட்யத்தில் (அஸ்தங்கம்) இல்லை.",
  "Between an hour before sunrise (not before 5 am) and sunset.": "சூரிய உதயத்துக்கு ஒரு மணி நேரம் முன்பிலிருந்து (காலை 5 மணிக்கு முன் அல்ல) சூரிய அஸ்தமனம் வரை.",
  "Outside Rahu Kalam, Yamaganda, Gulika Kalam and Vishti karana.": "ராகு காலம், எமகண்டம், குளிகை, விஷ்டி கரணம் தவிர்த்து.",
  "No planet in the 7th or 8th house from the lagna.": "லக்னத்திலிருந்து 7, 8-ஆம் வீடுகளில் கிரகம் இல்லை.",
  "No Sun, Mars, Saturn, Rahu or Ketu in the lagna, unless Jupiter, Venus or Mercury is in the lagna too, a planet in the lagna is exalted, or the Sun or Moon is in the 11th house.": "லக்னத்தில் சூரியன், செவ்வாய், சனி, ராகு, கேது இல்லை; ஆனால் லக்னத்தில் குரு, சுக்கிரன் அல்லது புதனும் இருந்தாலோ, லக்னத்தில் உள்ள ஒரு கிரகம் உச்சம் பெற்றிருந்தாலோ, சூரியனோ சந்திரனோ 11-ஆம் வீட்டில் இருந்தாலோ இது பொருந்தாது.",
  "The lagna isn't in the first or last degree of its sign.": "லக்னம் ராசியின் முதல் அல்லது கடைசி பாகையில் இல்லை.",
  "At least 20 minutes long.": "குறைந்தது 20 நிமிடம்.",
  "Panchanga yoga: not Vyatipata or Vaidhriti, not the first half of Parigha, and not the first 3 ghatis (72 minutes) of Vishkambha or Vajra, 5 of Shula, 6 of Ganda or Atiganda, or 9 of Vyaghata.": "பஞ்சாங்க யோகம்: வியதீபாதம், வைதிருதி அல்ல; பரிகத்தின் முதல் பாதி அல்ல; விஷ்கம்பம், வஜ்ரம் ஆகியவற்றின் முதல் 3 நாழிகை (72 நிமிடம்), சூலத்தின் முதல் 5, கண்டம், அதிகண்டம் ஆகியவற்றின் முதல் 6, வியாகாதத்தின் முதல் 9 நாழிகை அல்ல.",
  "Rules used": "பயன்படுத்திய விதிகள்",
  "* A lunar eclipse falls on this day, and some panchangams move the Upakarma because of it. Check the date with your temple.": "* இந்த நாளில் சந்திர கிரகணம் நிகழ்கிறது; அதனால் சில பஞ்சாங்கங்கள் உபாகர்மாவை வேறு நாளுக்கு மாற்றுகின்றன. தேதியை உங்கள் கோவிலில் உறுதி செய்துகொள்ளவும்.",
  "The day": "நாள்",
  "The time": "நேரம்",
  "Sources": "ஆதாரங்கள்",
  "Weekday, tithi, nakshatra, month, Kari naal and time of day follow Tamil calendar practice; Rahu Kalam, Yamaganda, Gulika Kalam, Vishti karana, the 8th house, eclipses, moudhyam and lagna sandhi follow general panchangam practice. The panchanga yoga rule follows classical muhurtha texts such as Muhurta Chintamani; many Tamil calendars don't apply it, so a few of their days aren't listed here.": "கிழமை, திதி, நட்சத்திரம், மாதம், கரி நாள், நேரம் ஆகியவை தமிழ் நாட்காட்டி வழக்கப்படி; ராகு காலம், எமகண்டம், குளிகை, விஷ்டி கரணம், 8-ஆம் வீடு, கிரகணம், மௌட்யம், லக்ன சந்தி ஆகியவை பொதுவான பஞ்சாங்க வழக்கப்படி. பஞ்சாங்க யோக விதி முகூர்த்த சிந்தாமணி போன்ற பழைய முகூர்த்த நூல்களைப் பின்பற்றுகிறது; பல தமிழ் நாட்காட்டிகள் இதைப் பயன்படுத்துவதில்லை, அதனால் அவற்றின் சில நாட்கள் இங்கே இடம்பெறவில்லை.",
  "The empty 7th house, the lagna rule and its exceptions, and the rules for the extra education days: B. V. Raman, Muhurtha or Electional Astrology, chapters 5, 9 and 11": "7-ஆம் வீடு காலியாக இருப்பது, லக்ன விதியும் அதன் விலக்குகளும், கல்வி தொடங்கக் கூடுதல் நாட்களுக்கான விதிகள்: பி. வி. ராமன், Muhurtha or Electional Astrology, அத்தியாயங்கள் 5, 9, 11",
  "chapter 5 summary": "அத்தியாயம் 5 சுருக்கம்",
  "chapter 9 summary": "அத்தியாயம் 9 சுருக்கம்",
  "chapter 11 summary": "அத்தியாயம் 11 சுருக்கம்",
  "Amirtha, Siddha, Marana and Prabalarishta yogam by weekday and nakshatra:": "கிழமை, நட்சத்திர அடிப்படையில் அமிர்த, சித்த, மரண, பிரபலாரிஷ்ட யோகங்கள்:",
  "Ungal Vazhkkai Vazhikatti": "உங்கள் வாழ்க்கை வழிகாட்டி",
  "Vidyarambham and other starts of learning can also be held on these days, which miss the general rules, mostly by falling in Aadi, Purattasi or Margazhi or on Ardra.": "வித்யாரம்பம் போன்ற கல்வித் தொடக்கங்களை இந்த நாட்களிலும் செய்யலாம்; இவை பொது விதிகளுக்குப் பொருந்தாதவை (பெரும்பாலும் ஆடி, புரட்டாசி, மார்கழி மாதங்களில் அல்லது திருவாதிரையில் வருவதால்).",
  "They follow B. V. Raman's rules for education: nakshatra Ashwini, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra, Swati, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha or Revati; the general tithis except Chaturthi and Chaturdashi; any month; and a lagna that isn't a fixed sign. The other day and time rules apply, except the empty 7th house, the lagna rule and moudhyam.": "இவை பி. வி. ராமனின் கல்வி விதிகளைப் பின்பற்றுகின்றன: நட்சத்திரம் அஸ்வினி, ரோகிணி, மிருகசீரிஷம், திருவாதிரை, புனர்பூசம், பூசம், உத்திரம், அஸ்தம், சித்திரை, சுவாதி, உத்திராடம், திருவோணம், அவிட்டம், சதயம் அல்லது ரேவதி; சதுர்த்தி, சதுர்த்தசி தவிர பொதுத் திதிகள்; எந்த மாதமும்; ஸ்திர ராசி அல்லாத லக்னம். 7-ஆம் வீடு, லக்ன விதி, மௌட்யம் தவிர பிற நாள், நேர விதிகள் பொருந்தும்.",
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
  en: `<p class="about">Free Vedic calendar app: daily Panchangam with tithi, nakshatra, Rahu Kalam and hora, Tamil calendar dates, Hindu festival dates and puja times, Shubha Muhurtham days with lagna, and South Indian birth charts with Vimshottari dasha. Made for places where printed panchangams aren't available: everything is calculated for your own location, in local time.</p>
    <p class="about"><strong>Your data stays with you.</strong> No sign-up and no cookies, and your birth date and time never leave your device. The site counts anonymous page views only. Places not in the built-in list are looked up on OpenStreetMap.</p>
    Calculations run on your device using the <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> (AGPL-3.0).
    Place names from <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0) and
    <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.
    <a href="https://github.com/aganba/vedic-chart">Source code</a>.`,
  ta: `<p class="about">இலவச வேத நாட்காட்டி செயலி: திதி, நட்சத்திரம், ராகு காலம், ஓரையுடன் தினசரி பஞ்சாங்கம், தமிழ்த் தேதி, பண்டிகை நாட்கள், பூஜை நேரங்கள், லக்னத்துடன் சுப முகூர்த்த நாட்கள், விம்சோத்தரி தசையுடன் தென்னிந்திய ஜாதகம். அச்சிட்ட பஞ்சாங்கம் கிடைக்காத இடங்களுக்காக உருவாக்கப்பட்டது: அனைத்தும் உங்கள் இருப்பிடத்துக்கும் உள்ளூர் நேரத்துக்கும் ஏற்பக் கணக்கிடப்படுகின்றன.</p>
    <p class="about"><strong>உங்கள் தகவல் உங்களிடமே.</strong> பதிவு தேவையில்லை, குக்கீகள் இல்லை; உங்கள் பிறந்த தேதியும் நேரமும் உங்கள் சாதனத்தை விட்டு வெளியே செல்வதில்லை. பக்கப் பார்வைகள் மட்டும் அடையாளமின்றி எண்ணப்படுகின்றன. உள்ளமைந்த பட்டியலில் இல்லாத இடங்கள் OpenStreetMap-இல் தேடப்படுகின்றன.</p>
    கணக்கீடுகள் அனைத்தும் <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> (AGPL-3.0) கொண்டு உங்கள் சாதனத்திலேயே செய்யப்படுகின்றன.
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
  // muhurtham: the day's Tamil yogam
  dayYoga: { "Amirtha yogam": "அமிர்த யோகம்", "Siddha yogam": "சித்த யோகம்" },
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
    // Special Days tab
    "Moonrise": "சந்திர உதயம்",
    "Pradosha kaalam": "பிரதோஷ காலம்",
    "Begins (sparsha)": "ஆரம்பம் (ஸ்பர்சம்)",
    "Maximum (madhya)": "மத்திமம்",
    "Ends (moksha)": "முடிவு (மோட்சம்)",
    "Totality begins": "முழு கிரகணம் ஆரம்பம்",
    "Totality ends": "முழு கிரகணம் முடிவு",
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
