# Vedic Calendar

A web app for Vedic astrology. Enter a place, date and time to get:

- **Panchanga**: Tamil calendar date (month, day and year, e.g. Aippasi 14, Parabhava), vara, tithi, nakshatra (at the entered time and at sunrise), yoga, karana (with end times), hora (the planetary hour at the entered time), lunar month, samvatsara, sunrise/sunset, Rahu Kalam, Yamaganda and Gulika Kalam
- **Festivals** on the entered date and place, plus those in the next 7 days (Diwali, Ugadi, Pongal, Tamil New Year, Vishu, Onam, Janmashtami, Ganesh Chaturthi, Navaratri, Maha Shivaratri, Holi, Rig/Yajur/Sama Upakarma, Gayatri Japam, Aadi Pooram, Soora Samharam, Karadaiyan Nonbu, Maasi Magam and more), with puja timings such as pradosha, madhyahna and nishita windows; a **Festivals** tab lists every festival for the year from the entered date, month by month, a **Special Days** tab lists the year's eclipses that can be seen from the place (with sparsha, madhya and moksha times), Amavasya, Pournami, Tamil month beginnings (maasa pirappu), Sankatahara Chaturthi and Pradosham, each in its own colour-coded card, and an **Auspicious Days** (Shubha Muhurtham) tab covers the next six months (183 days) in two sub-tabs: **Dr. B. V. Raman's method** lists muhurtham times in a table, each tagged with the events it suits (vehicles, travel, day-to-day matters, learning music and arts, auspicious events, sports, new projects), and **Tamil calendar** lists the shubha muhurtham days in the style of Tamil calendars, for marriage and other auspicious beginnings, with their times by lagna
- **Charts**: South Indian Rasi (D1) and Navamsa (D9), planetary degrees, nakshatras, chara karakas, and a bhava (house) table
- **Vimshottari dasha**: mahadashas and antardashas with dates
- **Search** tab: pick Festival, Tithi or Nakshatra. A festival shows its date(s) in the chosen year (every one, when it comes twice in a Gregorian year), with its tithi or nakshatra times and Tamil date; a tithi or nakshatra shows every occurrence in the chosen month and the months either side, grouped by month, with start and end times, the day(s) it holds at sunrise in bold (none for a kshaya tithi) and the Tamil date. Results use the place at the top, update as the choices change, link each date to the Panchanga tab, and the URL keeps the search so it can be bookmarked or shared
- **English or Tamil**: a button in the header switches the whole page to Tamil (தமிழ்), including panchanga terms, festival names and dates; the choice is remembered, and `?lang=ta` opens the page in Tamil

All calculations run **in the browser** using the [Swiss Ephemeris](https://www.astro.com/swisseph/) compiled to WebAssembly. Birth details never leave the device; the only network requests are optional OpenStreetMap place lookups and an anonymous Google Analytics page view (no cookies, sent without the URL's query string, so dates, times and places entered or shared in a link are not included). After the first visit the app works offline and can be added to a phone's home screen.

## Conventions

The defaults reproduce [Jagannatha Hora](https://www.vedicastrologer.org/jh/):

- Ayanamsa: True Chitrapaksha (Lahiri, Raman and KP are implemented in the code but not offered on the page)
- Planets: true geometric positions, mean node for Rahu
- Lagna: apparent tropical ascendant minus the true-position ayanamsa without nutation
- Bhavas: equal houses with the lagna at the middle of the 1st house (Sripati and Placidus are implemented in the code but not offered on the page)
- Chara karakas: the 8-karaka scheme, including Rahu
- Vimshottari dasha: dasha years measured by the Sun's sidereal motion (t years = the Sun moving t × 360°)
- Hora: the Vedic day's daytime and night are each split into 12 equal horas, ruled in the Chaldean order (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon) starting from the vara lord at sunrise
- Sunrise: upper limb of the Sun with standard refraction
- Festivals: tithi festivals fall on the first day whose kaala (sunrise, madhyahna, aparahna, pradosha or nishita) lies in the tithi, in the amanta lunar month, never in an adhika month; Raksha Bandhan and Holika Dahan avoid Bhadra. Tamil and Malayalam months start on the day of the sankranti if it falls before 3/5 of the daytime; Makara Sankranti uses sunset. `tools/festival_check.mjs` checks 53 published 2025–2026 dates and scans both years to make sure no festival is reported twice.
- Shubha muhurtham, Dr. B. V. Raman's method: rules from Bangalore Niranjan Babu's master class [Selecting Auspicious Muhurthas](https://www.youtube.com/watch?v=OMcodmmokcU) (Raman & Rajeswari Research Foundation, 2024), which follows B. V. Raman's *Muhurtha*. The Moon's nakshatra type picks the events: movable (Punarvasu, Swati, Shravana, Dhanishta, Shatabhisha) for vehicles and travel, mixed (Krittika, Vishakha) for day-to-day matters, soft (Mrigashira, Chitra, Anuradha, Revati) for learning music and arts and auspicious events, light (Ashwini, Pushya, Hasta, Abhijit) for sports, new projects and travel; sharp and dreadful nakshatras are never used. Every time also avoids Navami and Chaturdashi, the yogas Atiganda, Shula, Ganda, Vyaghata, Vyatipata, Parigha and Vaidhriti, the karanas Vishti, Shakuni and Chatushpada, Lagna Thyajya degrees and 16 ghatis either side of the Sun entering a sign, and needs a good Panchaka (tithi + weekday + nakshatra + lagna leaving 0, 3, 5 or 7 mod 9; checked against Drik Panchang's Panchaka Rahita times). Rahu Kalam, Yamaganda, Gulika Kalam and eclipse days are also excluded. Times last at least 20 minutes and, as a practical limit not from the master class, run from an hour before sunrise to two hours after sunset. Vijayadashami is always listed, for all events and all day. The tab also shows the day's Abhijit Muhurtha (the 8th of 15 daytime muhurthas), which Niranjan Babu recommends in the master class's Q&A when no other time is free. Personal factors (tarabala, chandrabala) aren't applied.
- Shubha muhurtham, Tamil calendar: every day is not a Tuesday or Saturday, a Kari naal (the fixed inauspicious days of each Tamil month), the first day of a Tamil month, an eclipse day or a Marana/Prabalarishta yogam (Tamil weekday–nakshatra yogam at sunrise, table from [Ungal Vazhkkai Vazhikatti](https://ungalvazhkkai.seithisaral.in/how-to-predict-amitha-yoga-chitha-yoga-and-marana-yoga/)), and not in Aadi, Purattasi or Margazhi; the tithi (not Pratipada, Ashtami, Navami, Purnima, Amavasya or Krishna Chaturdashi) and nakshatra follow Tamil calendar lists. Windows run from an hour before sunrise (not before 5 am) to two hours after sunset, outside Rahu Kalam, Yamaganda, Gulika Kalam and Vishti, with no planet in the 8th from the lagna and the lagna not in the first or last degree of its sign. Checked against [Harikesanallur Venkatraman's](https://www.harikesanallur.com/subha-muhurtha-days/) 2026–27 Chennai list, which uses the vakya panchangam: all 47 of its days are found, plus 22 it leaves out, since the app uses drik positions. That list doesn't apply the panchanga yoga, moudhyam or Raman's marriage rules (empty 7th house, no malefic in the lagna), so they aren't applied here either.
- Special Days: Amavasya is the day it prevails at aparahna, Pournami at sunset, Sankatahara Chaturthi (Krishna Chaturthi) at moonrise and Pradosham (Trayodashi) at sunset, with the kshaya fallback used for festivals, except that a Krishna Chaturthi in force at neither moonrise is kept on the day it holds at sunrise, as Drik Panchang does; the Pradosha kaalam shown is 1½ hours before sunset to sunset, as in Tamil calendars. Eclipses come from the Swiss Ephemeris eclipse search: a solar eclipse is listed when the Sun is up for part of it at the place, a lunar eclipse when the Moon is up while it is in the umbra; penumbral lunar eclipses are left out.
- Shadbala (computed but not shown on the page until it matches Jagannatha Hora on more charts): Brihat Parashara Hora Shastra rules, with the conventions listed at the top of `app/shadbala.py` (cyclic hora in Saptavargaja, Dig bala from the lagna, Ayana bala from the true obliquity, hora/abda/masa lords, Mercury's nature, special aspects by sign). Cheshta bala uses Surya Siddhanta mean motions with bija corrections. Planetary war (yuddha bala) is not applied.

## Layout

- `docs/`: the browser app (served by GitHub Pages)
  - `js/astro.js`, `js/shadbala.js`, `js/dasha.js`: calculations
  - `js/i18n.js`: English and Tamil display text; the calculations always produce English names, which the page translates when it draws
  - `js/tz.js`: time zone and historical UTC offset for a place
  - `js/places.js`: offline place autocomplete and OpenStreetMap search
  - `js/festivals.js`: festival rules
  - `js/search.js`: tithi and nakshatra occurrences for the Search tab
  - `swe/`: Swiss Ephemeris WebAssembly build; `ephe/`: ephemeris data (1800–2400 CE)
  - `data/places.tsv`: [GeoNames](https://www.geonames.org/) towns with population ≥ 1000 (CC BY 4.0)
  - `vendor/tz-lookup.js`: [@photostructure/tz-lookup](https://github.com/photostructure/tz-lookup) (CC0)
- `app/`: the Python reference implementation (FastAPI + pyswisseph) that the JavaScript is checked against
- `tools/`: build scripts (`build_wasm.sh`, `build_places.py`, `make_emblem.py`, `make_icons.sh`) `i18n_check.mjs`, which makes sure every festival name, label and interface phrase has Tamil text and that two years of output translate fully, and `parity.py`, which runs both implementations on a set of test charts and compares every value
- `tests/`: pytest suite, including the JavaScript/Python parity check

## Running locally

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
./run.sh                      # serves the app at http://localhost:8000
.venv/bin/python -m pytest    # tests (the parity check needs Node.js)
```

Any static file server works too, e.g. `python3 -m http.server --directory docs`.

## Rebuilding generated files

- WebAssembly: `tools/build_wasm.sh` (needs [Emscripten](https://emscripten.org/); builds Swiss Ephemeris 2.10.03, the version bundled with pyswisseph)
- Place list: download `cities1000.zip`, `admin1CodesASCII.txt` and `countryInfo.txt` from https://download.geonames.org/export/dump/ into `data/`, unzip, then run `.venv/bin/python tools/build_places.py`

## License

AGPL-3.0, as required by the Swiss Ephemeris. Place data © GeoNames (CC BY 4.0) and © OpenStreetMap contributors.
