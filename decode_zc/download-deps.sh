#!/bin/sh
set -e

DIR=$(dirname "${BASH_SOURCE[0]}")
cd $DIR

mkdir -p third_party/allegro
mkdir tmp
cd tmp

# ZC actually uses 4.4.2 but this is probably fine.
git clone --branch=4.4.3 --depth=1 https://github.com/liballeg/allegro5.git

cd allegro5
mv * ../../third_party/allegro

echo "
#define ALLEGRO_MACOSX
#define ALLEGRO_NO_ASM
#define ALLEGRO_USE_C
" > ../../third_party/allegro/include/allegro/platform/alplatf.h

cd ../..
rm -rf tmp
