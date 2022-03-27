#!/bin/bash
set -e

if ! [ -f "decode_zc/dist/zc.wasm" ]; then
  echo "Go to decode_zc and build that first."
  exit 1
fi

npx brfs node_modules/timidity/index.js > node_modules/timidity/index.js.tmp
mv node_modules/timidity/index.js.tmp node_modules/timidity/index.js

yarn ts-node scripts/build.ts

mkdir -p dist/quests
cp -r data/debug dist/quests

mkdir -p tmp/zc_quests
cp -r data/zc_quests/* tmp/zc_quests

cp node_modules/timidity/libtimidity.wasm dist
cp -r node_modules/freepats/* dist

cp decode_zc/dist/zc.wasm dist/iife/zc.wasm

# This is just for Zelda Classic on the web. Quest Maker bundles this during build.
cp data/quest-manifest.json dist/

rsync --ignore-existing $PWD/data/zc_quests/ $PWD/tmp/zc_quests/

ln -nfs $PWD/tmp/zc_quests $PWD/dist/zc_quests
ln -nfs $PWD/tmp/zc_sfx $PWD/dist/zc_sfx
