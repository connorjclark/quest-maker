#!/bin/bash
set -e

mkdir -p dist/quests
cp -r data/debug dist/quests

mkdir -p tmp/zc_quests
cp -r data/zc_quests/* tmp/zc_quests

cp node_modules/timidity/libtimidity.wasm dist
cp -r node_modules/freepats/* dist

cp decode_zc/dist/zc.wasm dist/zc.wasm

rsync --ignore-existing $PWD/data/zc_quests/ $PWD/tmp/zc_quests/

ln -nfs $PWD/tmp/zc_quests $PWD/dist/zc_quests
ln -nfs $PWD/tmp/zc_sfx $PWD/dist/zc_sfx
