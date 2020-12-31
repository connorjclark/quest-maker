#!/bin/sh -ex

rm -rf dist
yarn
yarn build
ssh root@hoten.cc "mkdir -p /var/www/hoten.cc/public_html/quest-maker/play/"
rsync -ahvz --delete ./dist/ root@hoten.cc:/var/www/hoten.cc/public_html/quest-maker/play/
