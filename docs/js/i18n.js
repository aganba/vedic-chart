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
  "Vedic Calendar": "வேத பஞ்சாங்கம்",
  "Vedic Calendar – Free Panchangam, Tamil Calendar, Muhurtham & Birth Chart": "வேத நாட்காட்டி – இலவச பஞ்சாங்கம், தமிழ்த் தேதி, முகூர்த்தம், ஜாதகம்",
  "Free Vedic calendar app: daily Panchangam with tithi, nakshatra, Rahu Kalam and hora, Tamil calendar dates, Hindu festival dates and puja times, auspicious days and times for travel, vehicles, learning and new projects, and South Indian birth charts with Vimshottari dasha.": "இலவச வேத நாட்காட்டி செயலி: திதி, நட்சத்திரம், ராகு காலம், ஓரையுடன் தினசரி பஞ்சாங்கம், தமிழ்த் தேதி, பண்டிகை நாட்கள், பூஜை நேரங்கள், பயணம், வாகனம், கல்வி, புதிய முயற்சிகளுக்கான சுப முகூர்த்த நேரங்கள், விம்சோத்தரி தசையுடன் தென்னிந்திய ஜாதகம்.",
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
  "Auspicious Days": "சுப முகூர்த்தம்",
  // Special Days tab
  "Special Days": "விசேஷ நாட்கள்",
  "Eclipses and monthly observances from the entered date through the next 60 days, calculated for the place you entered, in local time.": "உள்ளிட்ட தேதி முதல் அடுத்த 60 நாட்களுக்கான கிரகணங்களும் மாதாந்திர விரத நாட்களும், நீங்கள் உள்ளிட்ட இடத்துக்கு உள்ளூர் நேரத்தில் கணக்கிடப்பட்டவை.",
  "Eclipses (grahanam)": "கிரகணங்கள்",
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
  // Search tab
  "Find a festival's dates in a year, or every tithi or nakshatra in a month and the months either side of it, calculated for the place you entered, in local time.": "ஓர் ஆண்டில் ஒரு பண்டிகை வரும் நாட்களையும், ஒரு மாதத்திலும் அதற்கு முந்தைய, அடுத்த மாதங்களிலும் ஒரு திதி அல்லது நட்சத்திரம் வரும் நேரங்களையும், நீங்கள் உள்ளிட்ட இடத்துக்கு உள்ளூர் நேரத்தில் கண்டறியலாம்.",
  "Search for": "எதைத் தேட",
  "Festival": "பண்டிகை",
  "Choose a festival": "பண்டிகையைத் தேர்ந்தெடுக்கவும்",
  "Choose a tithi": "திதியைத் தேர்ந்தெடுக்கவும்",
  "Choose a nakshatra": "நட்சத்திரத்தைத் தேர்ந்தெடுக்கவும்",
  "Choose one from the list above.": "மேலே உள்ள பட்டியலில் ஒன்றைத் தேர்ந்தெடுக்கவும்.",
  "Dates for {place}. To search another place, change it above and press Calculate.": "{place} இடத்துக்கான தேதிகள். வேறு இடத்துக்குத் தேட, மேலே இடத்தை மாற்றி ‘கணி’ அழுத்தவும்.",
  "Bold dates are the days it holds at sunrise. Select a date to open it in the Panchanga tab.": "தடித்த எழுத்தில் உள்ள தேதிகளில் சூரிய உதயத்தின்போது அது நிலவுகிறது. ஒரு தேதியைத் தேர்ந்தெடுத்தால் அந்த நாள் பஞ்சாங்கத் தாவலில் திறக்கும்.",
  "Select a date to open it in the Panchanga tab.": "ஒரு தேதியைத் தேர்ந்தெடுத்தால் அந்த நாள் பஞ்சாங்கத் தாவலில் திறக்கும்.",
  "Holds at no sunrise (kshaya)": "எந்தச் சூரிய உதயத்திலும் இல்லை (க்ஷயம்)",
  "{name} doesn't fall in {year} at this place.": "இந்த இடத்தில் {year} ஆம் ஆண்டில் {name} வரவில்லை.",
  "Couldn't calculate the dates.": "தேதிகளைக் கணக்கிட முடியவில்லை.",
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
  "* Abhijit Muhurtha: a good time for all activities, according to Dr. B. V. Raman.": "* அபிஜித் முகூர்த்தம்: டாக்டர் பி. வி. ராமன் அவர்களின் கூற்றுப்படி, எல்லா செயல்களுக்கும் நல்ல நேரம்.",
  "Abhijit Muhurtha, shown in the Panchanga tab every day, is a good time for all activities, according to Dr. B. V. Raman.": "பஞ்சாங்கப் பகுதியில் தினமும் காட்டப்படும் அபிஜித் முகூர்த்தம், டாக்டர் பி. வி. ராமன் அவர்களின் கூற்றுப்படி, எல்லா செயல்களுக்கும் நல்ல நேரம்.",
  "Hora": "ஓரை",
  "{from} – {to} · next {lord}": "{from} – {to} · அடுத்து {lord}",
  "Ayanamsa: {name} = {value}": "அயனாம்சம்: {name} = {value}",
  "Chart": "ஜாதகம்",
  // festivals and muhurtham
  "Coming up (next {n} days)": "வரவிருப்பவை (அடுத்த {n} நாட்கள்)",
  "Checking…": "சரிபார்க்கிறது…",
  "Calculating…": "கணக்கிடுகிறது…",
  "Couldn't calculate upcoming festivals.": "வரவிருக்கும் பண்டிகைகளைக் கணக்கிட முடியவில்லை.",
  "No festivals in the next {n} days.": "அடுத்த {n} நாட்களில் பண்டிகைகள் இல்லை.",
  "No auspicious days found.": "சுப முகூர்த்த நாட்கள் எதுவும் இல்லை.",
  "Couldn't calculate the remaining festivals.": "மீதமுள்ள பண்டிகைகளைக் கணக்கிட முடியவில்லை.",
  "Couldn't calculate the remaining special days.": "மீதமுள்ள சிறப்பு நாட்களைக் கணக்கிட முடியவில்லை.",
  "No festivals found.": "பண்டிகைகள் எதுவும் இல்லை.",
  "Events, by the Moon's nakshatra": "சந்திரன் நிற்கும் நட்சத்திரப்படி காரியங்கள்",
  "Vehicles and travel: movable nakshatras (Punarvasu, Swati, Shravana, Dhanishta, Shatabhisha).": "வாகனம், பயணம்: சர நட்சத்திரங்கள் (புனர்பூசம், சுவாதி, திருவோணம், அவிட்டம், சதயம்).",
  "Day-to-day matters: mixed nakshatras (Krittika, Vishakha).": "அன்றாடக் காரியங்கள்: மிஸ்ர நட்சத்திரங்கள் (கார்த்திகை, விசாகம்).",
  "Learning music and arts, and auspicious events: soft nakshatras (Mrigashira, Chitra, Anuradha, Revati).": "இசை, கலை கற்றல், சுப காரியங்கள்: மிருது நட்சத்திரங்கள் (மிருகசீரிஷம், சித்திரை, அனுஷம், ரேவதி).",
  "Sports, new projects and travel: light nakshatras (Ashwini, Pushya, Hasta, Abhijit).": "விளையாட்டு, புதிய முயற்சிகள், பயணம்: லகு (க்ஷிப்ர) நட்சத்திரங்கள் (அஸ்வினி, பூசம், அஸ்தம், அபிஜித்).",
  "Sharp (Ardra, Ashlesha, Jyeshtha, Mula) and dreadful (Bharani, Magha, Purva Phalguni, Purva Ashadha, Purva Bhadrapada) nakshatras are avoided.": "தீக்ஷ்ண நட்சத்திரங்கள் (திருவாதிரை, ஆயில்யம், கேட்டை, மூலம்), உக்ர நட்சத்திரங்கள் (பரணி, மகம், பூரம், பூராடம், பூரட்டாதி) தவிர்க்கப்படுகின்றன.",
  "Every time": "எல்லா நேரங்களுக்கும்",
  "Tithi: not Navami or Chaturdashi.": "திதி: நவமி, சதுர்த்தசி அல்ல.",
  "Panchanga yoga: not Atiganda, Shula, Ganda, Vyaghata, Vyatipata, Parigha or Vaidhriti.": "பஞ்சாங்க யோகம்: அதிகண்டம், சூலம், கண்டம், வியாகாதம், வியதீபாதம், பரிகம், வைதிருதி அல்ல.",
  "Karana: not Vishti, Shakuni or Chatushpada.": "கரணம்: பத்திரை (விஷ்டி), சகுனி, சதுஷ்பாதம் அல்ல.",
  "Lagna Thyajya: the lagna isn't in the first 3° of Mesha, Vrishabha, Kanya or Dhanu, the last 3° of Karka, Vrischika, Makara or Meena, or 13°30′–16°30′ of Mithuna, Simha, Tula or Kumbha.": "லக்ன தியாஜ்யம்: லக்னம் மேஷம், ரிஷபம், கன்னி, தனுசு ஆகியவற்றின் முதல் 3°, கடகம், விருச்சிகம், மகரம், மீனம் ஆகியவற்றின் கடைசி 3°, மிதுனம், சிம்மம், துலாம், கும்பம் ஆகியவற்றின் 13°30′–16°30′ ஆகிய பகுதிகளில் இல்லை.",
  "Panchaka: the numbers of the tithi (1–30), weekday (Sunday = 1), nakshatra (Ashwini = 1) and lagna (Mesha = 1) add up to a remainder of 0, 3, 5 or 7 when divided by 9. The weekday runs from sunrise to sunrise.": "பஞ்சகம்: திதி (1–30), கிழமை (ஞாயிறு = 1), நட்சத்திரம் (அஸ்வினி = 1), லக்னம் (மேஷம் = 1) ஆகியவற்றின் எண்களைக் கூட்டி 9-ஆல் வகுத்தால் மீதி 0, 3, 5 அல்லது 7. கிழமை சூரிய உதயம் முதல் அடுத்த சூரிய உதயம் வரை.",
  "Surya Sankramana: not within 16 ghatis (6 hours 24 minutes) of the Sun entering a sign.": "சூரிய சங்கிரமணம்: சூரியன் ராசி மாறும் நேரத்துக்கு முன்னும் பின்னும் 16 நாழிகைக்குள் (6 மணி 24 நிமிடம்) அல்ல.",
  "Not in Rahu Kalam, Yamaganda or Gulika Kalam, and not on an eclipse day.": "ராகு காலம், எமகண்டம், குளிகை அல்ல; கிரகண நாளும் அல்ல.",
  "The nakshatra types, tithi, yoga, karana, Lagna Thyajya, Panchaka and Surya Sankramana rules:": "நட்சத்திர வகைகள், திதி, யோகம், கரணம், லக்ன தியாஜ்யம், பஞ்சகம், சூரிய சங்கிரமண விதிகள்:",
  "Bangalore Niranjan Babu, Selecting Auspicious Muhurthas (Raman and Rajeswari Research Foundation, 2024)": "பெங்களூர் நிரஞ்சன் பாபு, Selecting Auspicious Muhurthas (ராமன் ராஜேஸ்வரி ஆராய்ச்சி அறக்கட்டளை, 2024)",
  "Good for": "ஏற்றவை",
  "Times": "நேரங்கள்",
  "today": "இன்று",
  "Vehicles": "வாகனம்",
  "Travel": "பயணம்",
  "Day-to-day matters": "அன்றாடக் காரியங்கள்",
  "Learning music and arts": "இசை, கலை கற்றல்",
  "Auspicious events": "சுப காரியங்கள்",
  "Sports": "விளையாட்டு",
  "New projects": "புதிய முயற்சிகள்",
  "Times that suit buying a vehicle, travel, day-to-day matters, learning music and arts, auspicious events, sports and new projects, calculated for the place you entered. Panchangams and astrologers differ on the rules, and personal factors such as tarabala and chandrabala aren't considered, so consult your family astrologer before fixing a date.": "வாகனம் வாங்க, பயணம், அன்றாட முக்கியக் காரியங்கள், இசை, கலை கற்றல், சுப காரியங்கள், விளையாட்டு, புதிய முயற்சிகள் ஆகியவற்றுக்கு ஏற்ற நேரங்கள், நீங்கள் உள்ளிட்ட இடத்துக்குக் கணக்கிடப்பட்டவை. பஞ்சாங்கங்களும் ஜோதிடர்களும் விதிகளில் வேறுபடுவார்கள்; தாராபலம், சந்திரபலம் போன்ற தனிப்பட்ட அம்சங்களும் கணக்கில் கொள்ளப்படவில்லை, எனவே நாள் குறிக்கும் முன் உங்கள் குடும்ப ஜோதிடரை அணுகவும்.",
  "At least 20 minutes long.": "குறைந்தது 20 நிமிடம்.",
  "Rules from": "விதிகளின் ஆதாரம்:",
  "Bangalore Niranjan Babu's master class Selecting Auspicious Muhurthas": "பெங்களூர் நிரஞ்சன் பாபுவின் Selecting Auspicious Muhurthas முதன்மை வகுப்பு",
  "(112th Raman Jayanti Master Class, Raman and Rajeswari Research Foundation, 1 September 2024, on YouTube), which follows Dr. B. V. Raman's book Muhurtha.": "(112-ஆவது ராமன் ஜெயந்தி முதன்மை வகுப்பு, ராமன் ராஜேஸ்வரி ஆராய்ச்சி அறக்கட்டளை, 1 செப்டம்பர் 2024, YouTube); இது டாக்டர் பி. வி. ராமனின் Muhurtha நூலைப் பின்பற்றுகிறது.",
  "Abhijit Muhurtha": "அபிஜித் முகூர்த்தம்",
  "Between an hour before sunrise and two hours after sunset. This is a practical limit for these events, not one of Niranjan Babu's rules.": "சூரிய உதயத்துக்கு ஒரு மணி நேரம் முன்பிலிருந்து சூரிய அஸ்தமனத்துக்கு இரண்டு மணி நேரம் பின்பு வரை. இது இந்தக் காரியங்களுக்கான நடைமுறை வரம்பு; நிரஞ்சன் பாபுவின் விதி அல்ல.",
  "Rahu Kalam, Yamaganda, Gulika Kalam and eclipses follow general panchangam practice; Niranjan Babu's master class doesn't mention them.": "ராகு காலம், எமகண்டம், குளிகை, கிரகணம் ஆகியவை பொதுவான பஞ்சாங்க வழக்கப்படி; நிரஞ்சன் பாபுவின் முதன்மை வகுப்பில் இவை குறிப்பிடப்படவில்லை.",
  "Vijayadashami is traditionally auspicious for every beginning, so it is always listed, for all events and all day, even when the rules above don't pick it.": "விஜயதசமி எல்லாத் தொடக்கங்களுக்கும் மரபாக நல்ல நாள்; எனவே மேலே உள்ள விதிகள் அதைத் தேர்ந்தெடுக்காவிட்டாலும், எல்லாக் காரியங்களுக்கும் நாள் முழுவதும் பட்டியலில் இடம்பெறும்.",
  "All events": "எல்லாக் காரியங்களும்",
  "All day": "நாள் முழுவதும்",
  "Rules used": "பயன்படுத்திய விதிகள்",
  "* A lunar eclipse falls on this day, and some panchangams move the Upakarma because of it. Check the date with your temple.": "* இந்த நாளில் சந்திர கிரகணம் நிகழ்கிறது; அதனால் சில பஞ்சாங்கங்கள் உபாகர்மாவை வேறு நாளுக்கு மாற்றுகின்றன. தேதியை உங்கள் கோவிலில் உறுதி செய்துகொள்ளவும்.",
  "Sources": "ஆதாரங்கள்",
  // Auspicious Days: Tamil calendar sub-tab
  "Weekday: Sunday, Monday, Wednesday, Thursday or Friday; never Tuesday or Saturday.": "கிழமை: ஞாயிறு, திங்கள், புதன், வியாழன் அல்லது வெள்ளி; செவ்வாய், சனி ஒருபோதும் இல்லை.",
  "Tamil month: not Aadi, Purattasi or Margazhi, and not the first day of any month.": "தமிழ் மாதம்: ஆடி, புரட்டாசி, மார்கழி அல்ல; எந்த மாதத்தின் முதல் நாளும் அல்ல.",
  "Not a Kari naal: Chithirai 6, 15; Vaikasi 7, 16, 17; Aani 1, 6; Aadi 2, 10, 20; Avani 2, 9, 28; Purattasi 16, 29; Aippasi 6, 20; Karthigai 1, 10, 17; Margazhi 6, 9, 11; Thai 1, 2, 3, 11, 17; Maasi 15, 16, 17; Panguni 6, 15, 19.": "கரி நாள் அல்ல: சித்திரை 6, 15; வைகாசி 7, 16, 17; ஆனி 1, 6; ஆடி 2, 10, 20; ஆவணி 2, 9, 28; புரட்டாசி 16, 29; ஐப்பசி 6, 20; கார்த்திகை 1, 10, 17; மார்கழி 6, 9, 11; தை 1, 2, 3, 11, 17; மாசி 15, 16, 17; பங்குனி 6, 15, 19.",
  "Yogam of the day (from the weekday and the nakshatra at sunrise): Amirtha or Siddha, not Marana or Prabalarishta.": "அன்றைய யோகம் (கிழமை, சூரிய உதய நட்சத்திரத்திலிருந்து): அமிர்த அல்லது சித்த யோகம்; மரண, பிரபலாரிஷ்ட யோகம் அல்ல.",
  "Not an eclipse day (a solar or lunar eclipse anywhere that day).": "கிரகண நாள் அல்ல (அன்று உலகில் எங்கும் சூரிய அல்லது சந்திர கிரகணம் இல்லை).",
  "Tithi: Dwitiya, Tritiya, Chaturthi, Panchami, Shashthi, Saptami, Dashami, Ekadashi, Dwadashi or Trayodashi of either paksha, or Valarpirai Chaturdashi. Never Pratipada, Ashtami, Navami, Purnima, Amavasya or Theipirai Chaturdashi.": "திதி: இரு பக்ஷங்களிலும் துவிதியை, திருதியை, சதுர்த்தி, பஞ்சமி, சஷ்டி, சப்தமி, தசமி, ஏகாதசி, துவாதசி, திரயோதசி, அல்லது வளர்பிறை சதுர்த்தசி. பிரதமை, அஷ்டமி, நவமி, பௌர்ணமி, அமாவாசை, தேய்பிறை சதுர்த்தசி ஒருபோதும் இல்லை.",
  "Between an hour before sunrise (not before 5 am) and two hours after sunset.": "சூரிய உதயத்துக்கு ஒரு மணி நேரம் முன்பிலிருந்து (காலை 5 மணிக்கு முன் அல்ல) சூரிய அஸ்தமனத்துக்கு இரண்டு மணி நேரம் பின்பு வரை.",
  "Outside Rahu Kalam, Yamaganda and Gulika Kalam, and not in Vishti (Bhadra) karana.": "ராகு காலம், எமகண்டம், குளிகை தவிர்த்து; விஷ்டி (பத்திரை) கரணமும் அல்ல.",
  "No planet, the Moon, Rahu and Ketu included, in the 8th house from the lagna.": "லக்னத்திலிருந்து 8-ஆம் வீட்டில் சந்திரன், ராகு, கேது உட்பட எந்தக் கிரகமும் இல்லை.",
  "Panchanga yoga (Vyatipata, Vaidhriti and the like), moudhyam (Jupiter or Venus combust), and Dr. B. V. Raman's marriage rules (an empty 7th house, no malefic in the lagna).": "பஞ்சாங்க யோகம் (வியதீபாதம், வைதிருதி போன்றவை), மௌட்யம் (குரு அல்லது சுக்கிரன் அஸ்தங்கம்), டாக்டர் பி. வி. ராமனின் திருமண விதிகள் (7-ஆம் வீடு காலி, லக்னத்தில் பாவ கிரகம் இல்லை).",
  "Personal factors: tarabala, chandrabala and chandrashtamam.": "தனிப்பட்ட அம்சங்கள்: தாராபலம், சந்திரபலம், சந்திராஷ்டமம்.",
  "Every day": "ஒவ்வொரு நாளும்",
  "Not applied": "பயன்படுத்தாதவை",
  "Days from the entered date through the next six months (183 days), calculated for the place you entered, in local time.": "உள்ளிட்ட தேதி முதல் அடுத்த ஆறு மாதங்கள் (183 நாட்கள்) வரையிலான நாட்கள், நீங்கள் உள்ளிட்ட இடத்துக்கு உள்ளூர் நேரத்தில் கணக்கிடப்பட்டவை.",
  "Couldn't calculate muhurtham days.": "முகூர்த்த நாட்களைக் கணக்கிட முடியவில்லை.",
  "Days and times in the style of Tamil calendars, for marriage and other auspicious beginnings, calculated for the place you entered. Panchangams differ, and personal factors such as tarabala, chandrabala and chandrashtamam aren't considered, so confirm with your family astrologer.": "திருமணம் மற்றும் பிற சுப காரியங்களுக்கான தமிழ் நாட்காட்டி முறையிலான நாட்களும் நேரங்களும், நீங்கள் உள்ளிட்ட இடத்துக்குக் கணக்கிடப்பட்டவை. பஞ்சாங்கங்களிடையே வேறுபாடு இருக்கலாம்; தாராபலம், சந்திரபலம், சந்திராஷ்டமம் போன்ற தனிப்பட்ட அம்சங்கள் கணக்கில் கொள்ளப்படவில்லை, எனவே உங்கள் குடும்ப ஜோதிடரிடம் உறுதி செய்துகொள்ளவும்.",
  "Nakshatra: Ashwini, Rohini, Mrigashira, Punarvasu, Pushya, Uttara Phalguni, Hasta, Chitra, Swati, Anuradha, Mula, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Uttara Bhadrapada or Revati.": "நட்சத்திரம்: அஸ்வினி, ரோகிணி, மிருகசீரிஷம், புனர்பூசம், பூசம், உத்திரம், அஸ்தம், சித்திரை, சுவாதி, அனுஷம், மூலம், உத்திராடம், திருவோணம், அவிட்டம், சதயம், உத்திரட்டாதி அல்லது ரேவதி.",
  "The lagna isn't in the first or last degree of its sign.": "லக்னம் ராசியின் முதல் அல்லது கடைசி பாகையில் இல்லை.",
  "{lagna} lagna": "{lagna} லக்னம்",
  "Amirtha, Siddha, Marana and Prabalarishta yogam by weekday and nakshatra:": "கிழமை, நட்சத்திர அடிப்படையில் அமிர்த, சித்த, மரண, பிரபலாரிஷ்ட யோகங்கள்:",
  "Ungal Vazhkkai Vazhikatti": "உங்கள் வாழ்க்கை வழிகாட்டி",
  "Dr. B. V. Raman's method": "டாக்டர் பி. வி. ராமன் முறை",
  "Tamil calendar": "தமிழ் முறை",
  "Weekday, tithi, nakshatra, month, Kari naal, yogam and time of day follow Tamil calendar practice; Rahu Kalam, Yamaganda, Gulika Kalam, Vishti karana, the 8th house, eclipses and lagna sandhi follow general panchangam practice.": "கிழமை, திதி, நட்சத்திரம், மாதம், கரி நாள், யோகம், நேரம் ஆகியவை தமிழ் நாட்காட்டி வழக்கப்படி; ராகு காலம், எமகண்டம், குளிகை, விஷ்டி கரணம், 8-ஆம் வீடு, கிரகணம், லக்ன சந்தி ஆகியவை பொதுவான பஞ்சாங்க வழக்கப்படி.",
  "Day": "நாள்",
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
  "Month": "மாதம்",
  "Year": "ஆண்டு",
  "yyyy": "ஆண்டு",
  "Enter the year as four digits.": "ஆண்டை நான்கு இலக்கங்களில் உள்ளிடவும்.",
  "Year must be between {min} and {max}.": "ஆண்டு {min} முதல் {max} வரை இருக்க வேண்டும்.",
  "{month} {year} has only {n} days.": "{year} {month} மாதத்தில் {n} நாட்களே உள்ளன.",
  "Chart sections": "ஜாதகப் பகுதிகள்",
  "Rasi chart": "ராசி கட்டம்",
  "Navamsa chart": "நவாம்ச கட்டம்",
};

export function t(key, vars) {
  return fill(lang === "ta" && UI[key] != null ? UI[key] : key.split("|")[0], vars);
}

// References, in English in both languages (also in index.html for the first paint).
const REFERENCES = `    <details class="references">
      <summary>References</summary>
      <h4>Calculations</h4>
      <ul>
        <li><a href="https://www.astro.com/swisseph/" target="_blank" rel="noopener">Swiss Ephemeris</a>: planet positions, sunrise and sunset, eclipses.</li>
        <li><a href="https://www.vedicastrologer.org/jh/" target="_blank" rel="noopener">Jagannatha Hora</a>: the birth chart settings (True Chitra ayanamsa, true planet positions, mean node) are chosen to reproduce its output.</li>
      </ul>
      <h4>Panchangam and festivals</h4>
      <ul>
        <li><a href="https://en.wikipedia.org/wiki/Hindu_calendar" target="_blank" rel="noopener">Hindu calendar (Wikipedia)</a>: background on tithi, paksha, nakshatra, lunar and solar months, and skipped (kshaya) and repeated days.</li>
        <li><a href="https://www.drikpanchang.com/" target="_blank" rel="noopener">Drik Panchang</a>: festival, Upakarma, Ekadashi and Tamil calendar dates are checked against it, for places in India and abroad, and so are the tithi times and sunrise days in the Search tab.</li>
        <li><a href="https://www.temple.org/images/phocagallery/2026%20Calendar.pdf" target="_blank" rel="noopener">Shiva Murugan Temple, Concord, California, 2026 calendar</a>: festival and Special Days dates are compared with it for the San Francisco Bay Area.</li>
        <li><a href="https://www.prokerala.com/festivals/" target="_blank" rel="noopener">Prokerala</a>: festival dates and nakshatra times are compared with it, such as Aadi Pooram, and so are the Search tab's tithi and nakshatra times, including tithis that hold at no sunrise (kshaya).</li>
      </ul>
      <h4>Auspicious Days</h4>
      <ul>
        <li>Bangalore Niranjan Babu, <a href="https://www.youtube.com/watch?v=OMcodmmokcU" target="_blank" rel="noopener"><cite>Selecting Auspicious Muhurthas</cite></a> (Raman &amp; Rajeswari Research Foundation master class, 2024), following B. V. Raman's <cite>Muhurtha</cite>: the rules of the Dr. B. V. Raman's method sub-tab.</li>
        <li><a href="https://www.drikpanchang.com/muhurat/panchaka-rahita-muhurat.html" target="_blank" rel="noopener">Drik Panchang, Panchaka Rahita Muhurat</a>: the Panchaka times are checked against it.</li>
        <li><a href="https://www.harikesanallur.com/subha-muhurtha-days/" target="_blank" rel="noopener">Harikesanallur Venkatraman</a>: the Tamil calendar muhurtham list the Tamil calendar sub-tab is checked against (it uses the vakya panchangam).</li>
        <li><a href="https://ungalvazhkkai.seithisaral.in/how-to-predict-amitha-yoga-chitha-yoga-and-marana-yoga/" target="_blank" rel="noopener">Ungal Vazhkkai Vazhikatti</a>: the Amirtha, Siddha and Marana yogam table.</li>
      </ul>
    </details>`;

// Footer with links, per language.
export const FOOTER = {
  en: `<p class="about">Free Vedic calendar app: daily Panchangam with tithi, nakshatra, Rahu Kalam and hora, Tamil calendar dates, Hindu festival dates and puja times, auspicious days and times for travel, vehicles, learning and new projects, and South Indian birth charts with Vimshottari dasha. Made for places where printed panchangams aren't available: everything is calculated for your own location, in local time.</p>
    ${REFERENCES}
    <p class="about"><strong>Your data stays with you.</strong> No sign-up and no cookies, and your birth date and time never leave your device. The site counts anonymous page views only. Places not in the built-in list are looked up on OpenStreetMap.</p>
    Calculations run on your device using the <a href="https://www.astro.com/swisseph/">Swiss Ephemeris</a> (AGPL-3.0).
    Place names from <a href="https://www.geonames.org/">GeoNames</a> (CC BY 4.0) and
    <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.
    <a href="https://github.com/aganba/vedic-chart">Source code</a>.`,
  ta: `<p class="about">இலவச வேத நாட்காட்டி செயலி: திதி, நட்சத்திரம், ராகு காலம், ஓரையுடன் தினசரி பஞ்சாங்கம், தமிழ்த் தேதி, பண்டிகை நாட்கள், பூஜை நேரங்கள், பயணம், வாகனம், கல்வி, புதிய முயற்சிகளுக்கான சுப முகூர்த்த நேரங்கள், விம்சோத்தரி தசையுடன் தென்னிந்திய ஜாதகம். அச்சிட்ட பஞ்சாங்கம் கிடைக்காத இடங்களுக்காக உருவாக்கப்பட்டது: அனைத்தும் உங்கள் இருப்பிடத்துக்கும் உள்ளூர் நேரத்துக்கும் ஏற்பக் கணக்கிடப்படுகின்றன.</p>
    ${REFERENCES}
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
    "Aadi Pooram": "ஆடிப்பூரம்",
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
