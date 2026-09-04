#!/usr/bin/env bash
# Fabrique le zip à téléverser sur le Chrome Web Store.
#   ./assets/package.sh   ->   highlight2anki-<version>.zip
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
out="highlight2anki-${version}.zip"
rm -f "$out"
zip -r "$out" manifest.json src icons -x '*.DS_Store' >/dev/null
echo "$out  ($(du -h "$out" | cut -f1))"
unzip -l "$out"
