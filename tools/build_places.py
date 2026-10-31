"""Build docs/data/places.tsv, a compact place list for browser autocomplete.

Input: GeoNames dumps in data/ (https://download.geonames.org/export/dump/,
CC BY 4.0): cities1000.txt, admin1CodesASCII.txt, countryInfo.txt.

Output format (tab-separated):
  first lines:  "R" <tab> region names joined by "|"   (index table)
                "C" <tab> country names joined by "|"
  then per place: name, ascii alternates joined by "|", region index,
                  country index, lat, lon, population
Alternate names (old names like Madras, Bombay) are kept only for places with
population >= ALT_MIN_POP to keep the file small.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data"
OUT = ROOT / "docs" / "data" / "places.tsv"
ALT_MIN_POP = 50000


def main() -> None:
    countries = {}
    for line in (SRC / "countryInfo.txt").read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#"):
            c = line.split("\t")
            countries[c[0]] = c[4]
    admin1 = {}
    for line in (SRC / "admin1CodesASCII.txt").read_text(encoding="utf-8").splitlines():
        c = line.split("\t")
        if len(c) >= 2:
            admin1[c[0]] = c[1]

    regions, region_idx = [], {}
    country_list, country_idx = [], {}

    def index(table, idx, value):
        if value not in idx:
            idx[value] = len(table)
            table.append(value)
        return idx[value]

    rows = []
    with open(SRC / "cities1000.txt", encoding="utf-8") as f:
        for line in f:
            c = line.rstrip("\n").split("\t")
            name, ascii_name, pop = c[1], c[2], int(c[14] or 0)
            alts = set()
            if ascii_name != name:
                alts.add(ascii_name)
            if pop >= ALT_MIN_POP:
                for alt in c[3].split(","):
                    if (len(alt) >= 3 and alt.isascii() and not alt.isupper() and "http" not in alt
                            and not any(ch.isdigit() for ch in alt) and alt != name):
                        alts.add(alt)
            r = index(regions, region_idx, admin1.get(f"{c[8]}.{c[10]}", ""))
            k = index(country_list, country_idx, countries.get(c[8], c[8]))
            rows.append("\t".join([name, "|".join(sorted(alts)), str(r), str(k),
                                   f"{float(c[4]):.4f}", f"{float(c[5]):.4f}", str(pop)]))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("R\t" + "|".join(regions) + "\n")
        f.write("C\t" + "|".join(country_list) + "\n")
        f.write("\n".join(rows) + "\n")
    print(f"{len(rows)} places -> {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
