#!/bin/sh
# Compile Swiss Ephemeris (C, AGPL-3.0) to WebAssembly for the browser app.
# Usage: tools/build_wasm.sh [path-to-swisseph-source]
# Without an argument, clones https://github.com/aloistr/swisseph at v2.10.03
# (the version bundled with pyswisseph 2.10.03, so results match exactly).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$1"
if [ -z "$SRC" ]; then
  SRC="$(mktemp -d)/swisseph"
  git clone -q --depth 1 --branch v2.10.03 https://github.com/aloistr/swisseph.git "$SRC"
fi
OUT="$ROOT/docs/swe"
mkdir -p "$OUT"
FUNCS='["_swe_set_ephe_path","_swe_set_sid_mode","_swe_julday","_swe_revjul","_swe_calc_ut",
"_swe_houses_ex","_swe_get_ayanamsa_ut","_swe_get_ayanamsa_ex_ut","_swe_rise_trans","_swe_sol_eclipse_when_loc",
"_swe_lun_eclipse_when","_malloc","_free"]'
emcc -O3 \
  "$SRC/swedate.c" "$SRC/swehouse.c" "$SRC/swejpl.c" "$SRC/swemmoon.c" "$SRC/swemplan.c" \
  "$SRC/sweph.c" "$SRC/swephlib.c" "$SRC/swecl.c" "$SRC/swehel.c" \
  -o "$OUT/swisseph.mjs" \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,node -sALLOW_MEMORY_GROWTH=1 -sFORCE_FILESYSTEM=1 \
  -sEXPORTED_FUNCTIONS="$(echo $FUNCS | tr -d ' \n')" \
  -sEXPORTED_RUNTIME_METHODS='["FS","HEAPF64","HEAP32","stringToUTF8"]'
ls -la "$OUT"
