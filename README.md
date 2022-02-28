# Quest Maker

## What is this?

TLDR: This is a (very beta!) web viewer for the custom quests made in Zelda Classic.

## What is Zelda Classic?

[Zelda Classic](https://www.zeldaclassic.com/) is a game editor modeled from the original Zelda game, originally meant
to recreate and tweak the orignal game but after 20+ years of development is capable of making
far more advanced games. The "games" are referred to as quests, and 600+ quests can be found
at [purezc.net](https://www.purezc.net/)

## More on this project

This project originally started as me wanting to create my own "Zelda" game editor, using Zelda 
Classic quest files as a way to bootstrap a MVP's feature set (creating my own rules and ideas for how
to make the engine, but then converting the ZC .qst files to fit into my own world). Pretty quickly I became
less interested in designing my own engine, and just wanted to have the Zelda Classic quest files work, so I then
focused entirely on that.

I scraped the quest database from purezc.net and created a landing page of all the quests.

No quest works perfectly, some load to fail entirely, and most load but with awful glitches. In general, the earlier the quest
was made the better it works. There is some basic support for secrets, layers, screen flags, etc., but mostly in the sense that play testing kinda gets it right, and not everything has editing support.

As I am attempting to emulate a 20+ year old engine with hundreds of subtle flags and edge cases, I don't know if
this project will ever be finished! I previously looked into compiling Zelda Classic for the web (WASM), but for a number of reasons
that is very difficult. It's been more rewarding (read: faster feedback) to recreate the engine piece-wise, but I want to
do the proper thing eventually!

## Technical Details

- Source code is on GitHub
- Written in TypeScript
- The .qst files are decoded by the same code Zelda Classic uses (allegro), which I compiled to WASM to run in the browser
- Uses PIXI.js for rendering
- Use Preact

## Notes

- https://docs.google.com/document/d/1mo73_s9l0pLEnOjZ0Az3VXZuB686BJqOSqWlxi-DawA/edit#
- https://www.playemulator.com/nes-online/the-legend-of-zelda/
- https://www.zeldaclassic.com/wiki/index.php
- http://zcguides.celestialrealm.net/tutorials/main/start
- http://wiki.zfgc.com/Project_Zelda_Engine
