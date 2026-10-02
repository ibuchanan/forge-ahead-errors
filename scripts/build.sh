#!/usr/bin/env sh
set -eu

tsdown --no-dts
tsc -p tsconfig.declarations.json

for file in dist/*.d.ts dist/*/*.d.ts; do
  [ -f "$file" ] || continue
  cp "$file" "${file%.d.ts}.d.cts"
done
