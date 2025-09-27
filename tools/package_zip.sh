#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.."; pwd)"
cd "$ROOT"
zip -r attendance-suite.zip python_face_service server src package.json README.md -x "/node_modules/" "/.git/" "/dist/"
echo "Created $ROOT/attendance-suite.zip"