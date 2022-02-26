#!/bin/bash
set -ex

rm -rf dist
sh decode_zc/build.sh
yarn
yarn build
ssh root@hoten.cc "mkdir -p /var/www/hoten.cc/public_html/quest-maker/play/"
rsync -ahvzL --delete ./dist/ root@hoten.cc:/var/www/hoten.cc/public_html/quest-maker/play/
ssh root@hoten.cc "sudo chown -R www-data:www-data /var/www/hoten.cc/"
