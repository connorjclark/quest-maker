#!/bin/bash
set -e

mkdir -p dist/midi

mkdir -p dist/quests
cp -r data/debug dist/quests

cp node_modules/timidity/libtimidity.wasm dist
cp -r node_modules/freepats/* dist

yarn parcel build src/index.html

cp decode_zc/dist/zc.wasm dist/zc.wasm

ln -s $PWD/tmp/ $PWD/dist/tmp
mkdir -p $PWD/dist/tmp/zc_quests/
cp -r $PWD/data/zc_quests/* $PWD/dist/tmp/zc_quests/
