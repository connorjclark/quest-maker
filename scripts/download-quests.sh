#!/bin/sh
set -e

DIR=$(dirname "${BASH_SOURCE[0]}")
cd $DIR

cd ..
mkdir -p tmp/zc_quests
cd tmp/zc_quests

for i in {1..768}
do
  if [ ! -d "$i" ]
  then
    wget "https://www.purezc.net/index.php?page=download&section=Quests&id=$i" -O temp.zip
    mkdir -p "$i"
    unzip -d "$i" temp.zip
    rm temp.zip
  fi
done
