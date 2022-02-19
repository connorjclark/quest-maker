#!/bin/bash

set -e

mkdir -p dist/midi

cp -r quests dist

cp node_modules/timidity/libtimidity.wasm dist
cp -r node_modules/freepats/* dist

yarn parcel build src/index.html

cp decode_zc/dist/zc.wasm dist/zc.wasm
ln -s $PWD/tmp/ $PWD/dist/tmp
