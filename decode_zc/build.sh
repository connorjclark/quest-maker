#!/bin/sh
set -e

DIR=$(dirname "${BASH_SOURCE[0]}")
cd $DIR

ENVIRONMENT="${ENVIRONMENT:-web}"

OPTIMIZE_FLAGS="-Oz -s ENVIRONMENT=$ENVIRONMENT" # PRODUCTION
# OPTIMIZE_FLAGS="-s ASSERTIONS=2 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=1 -g3" # DEBUG

emcc -o dist/zc.js $OPTIMIZE_FLAGS \
  -Ithird_party/allegro/include \
  -s MODULARIZE \
  -s EXPORT_ALL=1 \
  -s FORCE_FILESYSTEM=1 \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","FS"]' \
  -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
  lib/fake-allegro.c lib/decode.c third_party/allegro/src/file.c third_party/allegro/src/unicode.c third_party/allegro/src/libc.c third_party/allegro/src/lzss.c third_party/allegro/src/unix/ufile.c

echo '{"type": "commonjs"}' > dist/package.json
