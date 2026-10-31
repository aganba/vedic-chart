# Vedic Chart

A web app for Vedic astrology. Enter a place, date and time to get:

- **Panchanga**: vara, tithi, nakshatra (at the entered time and at sunrise), yoga, karana (with end times), lunar month, samvatsara, sunrise/sunset, Rahu Kalam, Yamaganda and Gulika Kalam
- **Festivals** on the entered date and place, plus those in the next 7 days (Diwali, Ugadi, Pongal, Tamil New Year, Vishu, Onam, Janmashtami, Ganesh Chaturthi, Navaratri, Maha Shivaratri, Holi, Rig/Yajur/Sama Upakarma, Gayatri Japam, Soora Samharam, Karadaiyan Nonbu, Maasi Magam and more), with puja timings such as pradosha, madhyahna and nishita windows, and the shubha muhurtham days in the same 7 days; a **Special Days** tab lists every festival for the year from the entered date, month by month, and the year's **Shubha Muhurtham** days (Tamil calendar style, Valarpirai and Theipirai) with their time windows by lagna
- **Charts**: South Indian Rasi (D1) and Navamsa (D9), planetary degrees, nakshatras, chara karakas, and a bhava (house) table
- **Vimshottari dasha**: mahadashas and antardashas with dates

All calculations run **in the browser** using the [Swiss Ephemeris](https://www.astro.com/swisseph/) compiled to WebAssembly. Birth details never leave the device; the only network requests are optional OpenStreetMap place lookups. After the first visit the app works offline and can be added to a phone's home screen.

## Conventions

The defaults reproduce [Jagannatha Hora](https://www.vedicastrologer.org/jh/):

- Ayanamsa: True Chitrapaksha (Lahiri, Raman and KP also available)
- Planets: true geometric positions, mean node for Rahu
- Lagna: apparent tropical ascendant minus the true-position ayanamsa without nutation
- Bhavas: equal houses with the lagna at the middle of the 1st house (Sripati and Placidus also available)
- Chara karakas: the 8-karaka scheme, including Rahu
- Vimshottari dasha: dasha years measured by the Sun's sidereal motion (t years = the Sun moving t × 360°)
- Sunrise: upper limb of the Sun with standard refraction
- Festivals: tithi festivals fall on the first day whose kaala (sunrise, madhyahna, aparahna, pradosha or nishita) lies in the tithi, in the amanta lunar month, never in an adhika month; Raksha Bandhan and Holika Dahan avoid Bhadra. Tamil and Malayalam months start on the day of the sankranti if it falls before 3/5 of the daytime; Makara Sankranti uses sunset. `tools/festival_check.mjs` checks 53 published 2025–2026 dates and scans both years to make sure no festival is reported twice.
- Shubha muhurtham: good tithi (Valarpirai Dwitiya–Trayodashi except Chaturthi, Ashtami and Navami; Theipirai Dwitiya, Tritiya, Panchami), good nakshatra, not Tuesday or Saturday, not in Aadi, Purattasi or Margazhi; windows between sunrise and sunset outside Rahu Kalam, Yamaganda, Gulika Kalam and Vishti, with no planet in the 8th from the lagna. Panchangams disagree on the finer rules: against LiveChennai's published Valarpirai dates for Chennai this finds 19 of 29 (2025) and 19 of 28 (2026).
- Shadbala (computed but not shown on the page until it matches Jagannatha Hora on more charts): Brihat Parashara Hora Shastra rules, with the conventions listed at the top of `app/shadbala.py` (cyclic hora in Saptavargaja, Dig bala from the lagna, Ayana bala from the true obliquity, hora/abda/masa lords, Mercury's nature, special aspects by sign). Cheshta bala uses Surya Siddhanta mean motions with bija corrections. Planetary war (yuddha bala) is not applied.

## Layout

- `docs/`: the browser app (served by GitHub Pages)
  - `js/astro.js`, `js/shadbala.js`, `js/dasha.js`: calculations
  - `js/tz.js`: time zone and historical UTC offset for a place
  - `js/places.js`: offline place autocomplete and OpenStreetMap search
  - `js/festivals.js`: festival rules
  - `swe/`: Swiss Ephemeris WebAssembly build; `ephe/`: ephemeris data (1800–2400 CE)
  - `data/places.tsv`: [GeoNames](https://www.geonames.org/) towns with population ≥ 1000 (CC BY 4.0)
  - `vendor/tz-lookup.js`: [@photostructure/tz-lookup](https://github.com/photostructure/tz-lookup) (CC0)
- `app/`: the Python reference implementation (FastAPI + pyswisseph) that the JavaScript is checked against
- `tools/`: build scripts (`build_wasm.sh`, `build_places.py`, `make_emblem.py`, `make_icons.sh`) and `parity.py`, which runs both implementations on a set of test charts and compares every value
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
