#!/bin/bash
set -e

mkdir -p dist/midi

mkdir -p dist/quests
cp -r data/debug dist/quests

cp node_modules/timidity/libtimidity.wasm dist
cp -r node_modules/freepats/* dist

cp decode_zc/dist/zc.wasm dist/zc.wasm

rsync --ignore-existing $PWD/data/zc_quests/ $PWD/tmp/zc_quests/

ln -nfs $PWD/tmp/zc_quests $PWD/dist/zc_quests
