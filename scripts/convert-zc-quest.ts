// ./docker_run.sh "test_data/bs/2.5/NewBS 3.1 - 1st Quest.qst"
// ts-node -T scripts/convert-zc-quest.ts ../../zquest-data/output/data.json

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as constants from '../src/constants';
import makeQuest from '../src/make-quest';

const { tileSize, screenWidth, screenHeight } = constants;

const dataPath = process.argv[2];
const dataDir = path.dirname(dataPath);
const zcData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const outputDir = `${__dirname}/../quests/1st`;

const { make, makeAdvanced, makeEnemy, makeGraphic, makeTile, makeWeapon, quest } = makeQuest();

for (const imgPath of glob.sync('*.png', { cwd: dataDir })) {
  fs.copyFileSync(`${dataDir}/${imgPath}`, `${outputDir}/${imgPath}`);

  for (let y = 0; y < 13; y++) {
    for (let x = 0; x < 20; x++) {
      makeGraphic({
        file: imgPath,
        x: x * tileSize,
        y: y * tileSize,
        width: tileSize,
        height: tileSize,
      });
    }
  }
}

for (const combo of zcData.combos) {
  makeTile({
    graphicId: combo.tile,
    walkable: [!(combo.walk & 1), !(combo.walk & 4), !(combo.walk & 2), !(combo.walk & 8)],
  });
}

for (const map of zcData.maps) {
  for (let screenx = 0; screenx < 16; screenx++) {
    quest.screens.push([]);
    for (let screeny = 0; screeny < 9; screeny++) {
      const zcScreen = map.screens[screenx + screeny * 16];
      if (!zcScreen) continue;

      const screen: QuestMaker.Screen = {
        tiles: [],
        enemies: [],
        warps: {},
      };
      quest.screens[screenx].push(screen);

      for (let x = 0; x < screenWidth; x++) {
        screen.tiles.push([]);
        for (let y = 0; y < screenHeight; y++) {
          screen.tiles[x].push({ tile: zcScreen.data[x + y * screenWidth] });
        }
      }
    }
  }

  // Just one for now.
  break;
}

fs.writeFileSync(`${outputDir}/quest.json`, JSON.stringify(quest, null, 2));
