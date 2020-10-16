// ./docker_run.sh "test_data/bs/2.5/NewBS 3.1 - 1st Quest.qst"
// ts-node -T scripts/convert-zc-quest.ts ../../zquest-data/output/data.json

import * as assert from 'assert';

enum EnemyAnimationType {
  aNONE,
  aFLIP,
  aUNUSED1,
  a2FRM,
  aUNUSED2,
  // 5
  aOCTO,
  aTEK,
  aLEV,
  aWALK,
  aZORA,
  // 10
  aNEWZORA,
  aGHINI,
  aARMOS,
  aROPE,
  aWALLM,
  aNEWWALLM,
  aDWALK,
  aVIRE,
  a3FRM,
  aWIZZ,
  aAQUA,
  aDONGO,
  aMANHAN,
  aGLEEOK,
  aDIG,
  aGHOMA,
  aLANM,
  a2FRMPOS,
  a4FRM4EYE,
  a4FRM8EYE,
  a4FRM4DIRF,
  a4FRM4DIR,
  a4FRM8DIRF,
  aARMOS4,
  a4FRMPOS4DIR,
  a4FRMPOS8DIR,
  aUNUSED3,
  a4FRM8DIRB,
  aNEWTEK,
  a3FRM4DIR,
  a2FRM4DIR,
  aNEWLEV,
  a2FRM4EYE,
  aNEWWIZZ,
  aNEWDONGO,
  aDONGOBS,
  a4FRMPOS8DIRF,
  a4FRMPOS4DIRF,
  a4FRMNODIR,
  aGANON,
  a2FRMB,
  aMAX,
}

enum EnemyFamily {
  eeGUY = 0, eeWALK,
  eeSHOOT/*DEPRECATED*/,
  eeTEK, eeLEV, eePEAHAT, eeZORA, eeROCK,
  //8
  eeGHINI, eeARMOS/*DEPRECATED*/, eeKEESE, eeGEL/*DEPRECATED*/, eeZOL/*DEPRECATED*/, eeROPE/*DEPRECATED*/, eeGORIYA/*DEPRECATED*/, eeTRAP,
  //16
  eeWALLM, eeBUBBLE/*DEPRECATED*/, eeVIRE/*DEPRECATED*/, eeLIKE/*DEPRECATED*/, eePOLSV/*DEPRECATED*/, eeWIZZ, eeAQUA, eeMOLD,
  //24
  eeDONGO, eeMANHAN, eeGLEEOK, eeDIG, eeGHOMA, eeLANM, eePATRA, eeGANON,
  //32
  eePROJECTILE, eeGELTRIB/*DEPRECATED*/, eeZOLTRIB/*DEPRECATED*/, eeVIRETRIB/*DEPRECATED*/, eeKEESETRIB/*DEPRECATED*/, eeSPINTILE, eeNONE,
  //39
  eeFAIRY, eeFIRE, eeOTHER, eeMAX250, //eeFire is Other (Floating), eeOther is Other in the Editor.
  eeSCRIPT01, eeSCRIPT02, eeSCRIPT03, eeSCRIPT04, eeSCRIPT05, eeSCRIPT06, eeSCRIPT07, eeSCRIPT08, eeSCRIPT09, eeSCRIPT10,
  eeSCRIPT11, eeSCRIPT12, eeSCRIPT13, eeSCRIPT14, eeSCRIPT15, eeSCRIPT16, eeSCRIPT17, eeSCRIPT18, eeSCRIPT19, eeSCRIPT20,
  eeFFRIENDLY01, eeFFRIENDLY02, eeFFRIENDLY03, eeFFRIENDLY04, eeFFRIENDLY05, eeFFRIENDLY06, eeFFRIENDLY07, eeFFRIENDLY08,
  eeFFRIENDLY09, eeFFRIENDLY10,
  eeMAX
}

enum WeaponType {
  weaptypeNONE, weaptypeSWORD, weaptypeSWORDBEAM, weaptypeBRANG, weaptypeBOMBBLAST,
  weaptypeSBOMBBLAST, weaptypeBOMB, weaptypeSBOMB, weaptypeARROW, weaptypeFIRE,
  weaptypeWHISTLE, weaptypeBAIT, weaptypeWAND, weaptypeMAGIC, weaptypeCANDLE,
  weaptypeWIND, weaptypeREFMAGIC, weaptypeREFFIREBALL, weaptypeREFROCK, weaptypeHAMMER,
  weaptypeHOOKSHOT, weaptype21, weaptype22, weaptypeSPARKLE, weaptype24,
  weaptype25, weaptypeBYRNA, weaptypeREFBEAM, weaptype28, weaptype29,
  weaptypeSCRIPT1, weaptypeSCRIPT2, weaptypeSCRIPT3, weaptypeSCRIPT4, weaptypeSCRIPT5,
  weaptypeSCRIPT6, weaptypeSCRIPT7, weaptypeSCRIPT8, weaptypeSCRIPT9, weaptypeSCRIPT10
};

// Not sure why there are two enums for this ...
enum WeaponTypeGameEngine {
  // 0
  wNone, wSword, wBeam, wBrang,
  wBomb, wSBomb, wLitBomb, wLitSBomb,
  // 8
  wArrow, wFire, wWhistle, wBait,
  wWand, wMagic, wCatching, wWind,
  // 16
  wRefMagic, wRefFireball, wRefRock, wHammer,
  wHookshot, wHSHandle, wHSChain, wSSparkle,
  // 24
  wFSparkle, wSmack, wPhantom, wCByrna,
  //28
  wRefBeam, wStomp,
  //30
  lwMax,
  // Dummy weapons - must be between lwMax and wEnemyWeapons!
  //31
  wScript1, wScript2, wScript3, wScript4,
  //35
  wScript5, wScript6, wScript7, wScript8,
  //39
  wScript9, wScript10, wIce, wFlame, //ice rod, fire rod
  wSound, // -Z: sound + defence split == digdogger, sound + one hit kill == pols voice -Z
  wThrowRock, wPot, //Thrown pot or rock -Z
  wLit, //Lightning or Electric -Z
  wBombos, wEther, wQuake,// -Z
  wSword180, wSwordLA,
  // Enemy weapons
  wEnemyWeapons = 128,
  //129
  ewFireball, ewArrow, ewBrang, ewSword,
  ewRock, ewMagic, ewBomb, ewSBomb,
  //137
  ewLitBomb, ewLitSBomb, ewFireTrail, ewFlame,
  ewWind, ewFlame2, ewFlame2Trail,
  //145
  ewIce, ewFireball2,
  wMax
};

const ComboTypes = [
  '(None)',
  'Stairs [A]',
  'Cave (Walk Down) [A]',
  'Water',
  'Armos',
  'Grave',
  'Dock',
  '-Unused',
  'Push (Wait)',
  'Push (Heavy)',
  'Push (Heavy, Wait)',
  'Left Statue',
  'Right Statue',
  'Slow Walk',
  'Conveyor Up',
  'Conveyor Down',
  'Conveyor Left',
  'Conveyor Right',
  'Swim Warp [A]',
  'Dive Warp [A]',
  'Ladder or Hookshot',
  'Step->Secrets (Temporary)',
  'Step->Secrets (Permanent)',
  '-Unused',
  'Slash',
  'Slash (Item)',
  'Push (Very Heavy)',
  'Push (Very Heavy, Wait)',
  'Pound',
  'Hookshot Grab',
  '-Hookshot Bridge',
  'Damage (1/2 Heart)',
  'Damage (1 Heart)',
  'Damage (2 hearts)',
  'Damage (4 Hearts)',
  'Center Statue',
  'Trap (Horizontal, Line of Sight)',
  'Trap (Vertical, Line of Sight)',
  'Trap (4-Way)',
  'Trap (Horizontal, Constant)',
  'Trap (Vertical, Constant)',
  'Direct Warp [A]',
  'Hookshot Only',
  'Overhead',
  'No Flying Enemies',
  'Magic Mirror (4-Way)',
  'Magic Mirror (Up-Left, Down-Right)',
  'Magic Mirror (Up-Right, Down-Left)',
  'Magic Prism (3-Way)',
  'Magic Prism (4-Way)',
  'Block Magic',
  'Cave (Walk Up) [A]',
  'Eyeball (8-Way A)',
  'Eyeball (8-Way B)',
  'No Jumping Enemies',
  'Bush',
  'Flowers',
  'Tall Grass',
  'Shallow Water',
  'Lock Block (Normal)',
  'Lock Block (Normal, Copycat)',
  'Lock Block (Boss)',
  'Lock Block (Boss, Copycat)',
  'Ladder Only',
  'BS Grave',
  'Treasure Chest (Normal)',
  'Treasure Chest (Normal, Copycat)',
  'Treasure Chest (Locked)',
  'Treasure Chest (Locked, Copycat)',
  'Treasure Chest (Boss)',
  'Treasure Chest (Boss, Copycat)',
  'Reset Room',
  'Save Point',
  'Save-Quit Point',
  'Cave (Walk Down) [B]',
  'Cave (Walk Down) [C]',
  'Cave (Walk Down) [D]',
  'Stairs [B]',
  'Stairs [C]',
  'Stairs [D]',
  'Direct Warp [B]',
  'Direct Warp [C]',
  'Direct Warp [D]',
  'Cave (Walk Up) [B]',
  'Cave (Walk Up) [C]',
  'Cave (Walk Up) [D]',
  'Swim Warp [B]',
  'Swim Warp [C]',
  'Swim Warp [D]',
  'Dive Warp [B]',
  'Dive Warp [C]',
  'Dive Warp [D]',
  'Stairs [Random]',
  'Direct Warp [Random]',
  'Auto Side Warp [A]',
  'Auto Side Warp [B]',
  'Auto Side Warp [C]',
  'Auto Side Warp [D]',
  'Auto Side Warp [Random]',
  'Sensitive Warp [A]',
  'Sensitive Warp [B]',
  'Sensitive Warp [C]',
  'Sensitive Warp [D]',
  'Sensitive Warp [Random]',
  'Step->Secrets (Sensitive, Temp)',
  'Step->Secrets (Sensitive, Perm.)',
  'Step->Next',
  'Step->Next (Same)',
  'Step->Next (All)',
  'Step->Next (Copycat)',
  'No Enemies',
  'Block Arrow (L1)',
  'Block Arrow (L1, L2)',
  'Block Arrow (All)',
  'Block Brang (L1)',
  'Block Brang (L1, L2)',
  'Block Brang (All)',
  'Block Sword Beam',
  'Block All',
  'Block Fireball',
  'Damage (8 hearts)',
  'Damage (16 hearts)',
  'Damage (32 hearts)',
  '-Unused',
  'Spinning Tile (Immediate)',
  '-Unused",',
  'Screen Freeze (Except FFCs)',
  'Screen Freeze (FFCs Only)',
  'No Ground Enemies',
  'Slash->Next',
  'Slash->Next (Item)',
  'Bush->Next',
  'Slash (Continuous)',
  'Slash (Item, Continuous)',
  'Bush (Continuous)',
  'Flowers (Continuous)',
  'Tall Grass (Continuous)',
  'Slash->Next (Continuous)',
  'Slash->Next (Item, Continuous)',
  'Bush->Next (Continuous)',
  'Eyeball (4-Way)',
  'Tall Grass->Next',
  'Script 01',
  'Script 02',
  'Script 03',
  'Script 04',
  'Script 05',
  'Script 06',
  'Script 07',
  'Script 08',
  'Script 09',
  'Script 10',
  'Script 11',
  'Script 12',
  'Script 13',
  'Script 14',
  'Script 15',
  'Script 16',
  'Script 17',
  'Script 18',
  'Script 19',
  'Script 20',
  'Generic',
  'Pitfall',
  'Step->Effects',
] as const;
function getComboTypeName(id: number) {
  return ComboTypes[id];
}

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import * as constants from '../src/constants';
import makeQuest from '../src/make-quest';
import { EnemyType, TileType } from '../src/types';

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
  const tile = makeTile({
    graphicId: combo.tile,
    walkable: [!(combo.walk & 1), !(combo.walk & 4), !(combo.walk & 2), !(combo.walk & 8)],
  });
  if (combo.frames >= 2) {
    tile.numFrames = combo.frames;
    // https://www.zeldaclassic.com/wiki/index.php?title=Animation&q=%2Fwiki%2Findex.php%2FAnimation_Speed
    const tics = combo.speed + 1;
    tile.speed = 1 / tics;
  }
  if (combo.flip & 1) {
    tile.flipHorizontal = true;
  }
  if (combo.flip & 2) {
    tile.flipVertical = true;
  }

  const extraCsetQuadrants = combo.csets >> 4;
  let extraCsetOffset = combo.csets & 0xf;
  if (extraCsetOffset > 8) extraCsetOffset = extraCsetOffset - 16;
  if (extraCsetQuadrants > 0) {
    tile.extraCset = {
      quadrants: [!(extraCsetQuadrants & 1), !(extraCsetQuadrants & 4), !(extraCsetQuadrants & 2), !(extraCsetQuadrants & 8)],
      offset: extraCsetOffset,
    };
  }

  const type = getComboTypeName(combo.type);
  if (type === 'Slow Walk') {
    tile.type = TileType.SLOW_WALK;
  } else if (type.includes('Cave')) {
    // tile.type = TileType.WARP;
  }
}

for (const zcWeapon of zcData.weapons) {
  if (zcWeapon.name.startsWith('zz')) break;

  makeWeapon({
    name: zcWeapon.name,
    graphic: zcWeapon.tile,
    cset: zcWeapon.csets,
  });
}

for (const guy of zcData.guys) {
  const tiles = Array.from(Array(guy.width)).map((_, i) => guy.tile + i);
  const frames: QuestMaker.Enemy['frames'] = {};
  const attributes: QuestMaker.Enemy['attributes'] = {};
  let type = EnemyType.NORMAL;

  // attributes['enemy.life'] = guy.life;
  attributes['enemy.directionChange'] = guy.rate / 16;
  attributes['enemy.halt'] = guy.hrate / 16;
  attributes['enemy.homing'] = guy.homing / 255;
  attributes['enemy.speed'] = guy.step / 100;

  if (guy.cset) {
    attributes['enemy.cset'] = guy.cset;
  }

  let ignoreFrames = false;
  switch (guy.anim as EnemyAnimationType) {
    case EnemyAnimationType.aNONE:
      // assert.equal(0, tiles.length);
      ignoreFrames = true;
      break;
    case EnemyAnimationType.aFLIP:
      break;
    case EnemyAnimationType.aUNUSED1:
      break;
    case EnemyAnimationType.a2FRM:
      break;
    case EnemyAnimationType.aUNUSED2:
      break;
    case EnemyAnimationType.aOCTO:
      assert.equal(4, tiles.length);
      frames.down = [tiles[0], tiles[1]];
      frames.left = [tiles[2], tiles[3]];
      break;
    case EnemyAnimationType.aTEK:
      break;
    case EnemyAnimationType.aLEV:
      assert.equal(5, tiles.length);
      frames.emerging = [tiles[0], tiles[1], tiles[2]];
      frames.moving = [tiles[3], tiles[4]];
      break;
    case EnemyAnimationType.aWALK:
      assert.equal(4, tiles.length);
      frames.right = [tiles[0], tiles[1]];
      frames.down = [tiles[2]];
      frames.up = [tiles[3]];
      break;
    case EnemyAnimationType.aZORA:
      break;
    case EnemyAnimationType.aNEWZORA:
      break;
    case EnemyAnimationType.aGHINI:
      break;
    case EnemyAnimationType.aARMOS:
      assert.equal(4, tiles.length);
      frames.down = [tiles[0], tiles[1]];
      frames.up = [tiles[2], tiles[3]];
      break;
    case EnemyAnimationType.aROPE:
      break;
    case EnemyAnimationType.aWALLM:
      break;
    case EnemyAnimationType.aNEWWALLM:
      break;
    case EnemyAnimationType.aDWALK:
      break;
    case EnemyAnimationType.aVIRE:
      break;
    case EnemyAnimationType.a3FRM:
      break;
    case EnemyAnimationType.aWIZZ:
      break;
    case EnemyAnimationType.aAQUA:
      break;
    case EnemyAnimationType.aDONGO:
      break;
    case EnemyAnimationType.aMANHAN:
      break;
    case EnemyAnimationType.aGLEEOK:
      break;
    case EnemyAnimationType.aDIG:
      break;
    case EnemyAnimationType.aGHOMA:
      break;
    case EnemyAnimationType.aLANM:
      break;
    case EnemyAnimationType.a2FRMPOS:
      break;
    case EnemyAnimationType.a4FRM4EYE:
      break;
    case EnemyAnimationType.a4FRM8EYE:
      break;
    case EnemyAnimationType.a4FRM4DIRF:
      break;
    case EnemyAnimationType.a4FRM4DIR:
      break;
    case EnemyAnimationType.a4FRM8DIRF:
      break;
    case EnemyAnimationType.aARMOS4:
      break;
    case EnemyAnimationType.a4FRMPOS4DIR:
      break;
    case EnemyAnimationType.a4FRMPOS8DIR:
      break;
    case EnemyAnimationType.aUNUSED3:
      break;
    case EnemyAnimationType.a4FRM8DIRB:
      break;
    case EnemyAnimationType.aNEWTEK:
      break;
    case EnemyAnimationType.a3FRM4DIR:
      break;
    case EnemyAnimationType.a2FRM4DIR:
      break;
    case EnemyAnimationType.aNEWLEV:
      break;
    case EnemyAnimationType.a2FRM4EYE:
      break;
    case EnemyAnimationType.aNEWWIZZ:
      break;
    case EnemyAnimationType.aNEWDONGO:
      break;
    case EnemyAnimationType.aDONGOBS:
      break;
    case EnemyAnimationType.a4FRMPOS8DIRF:
      break;
    case EnemyAnimationType.a4FRMPOS4DIRF:
      break;
    case EnemyAnimationType.a4FRMNODIR:
      break;
    case EnemyAnimationType.aGANON:
      break;
    case EnemyAnimationType.a2FRMB:
      break;
    case EnemyAnimationType.aMAX:
      break;
  }

  switch (guy.family as EnemyFamily) {
    case EnemyFamily.eeLEV:
      type = EnemyType.LEEVER;
      break;
  }

  if (!Object.keys(frames).length) {
    // if (guy.anim) console.log('TODO anim', guy.anim);
    // frames.default = [0];
    makeEnemy({ name: '', frames: {}, attributes: {} });
    continue;
  }

  if (guy.weapon === WeaponTypeGameEngine.ewRock) {
    // attributes['enemy.weapon'] = 1;
    // TODO ...
  }

  // TODO: figure out weapons.
  const wpnsprite = getDefaultWeaponSprite(guy);
  attributes['enemy.weapon'] = wpnsprite + 1;
  // if (guy.weapon) {
  //   const weaponGraphic = getDefaultWeaponSprite(guy);
  //   let weapon = quest.weapons.find(w => w.graphic === weaponGraphic);
  //   if (!weapon) {
  //     weapon = makeWeapon({
  //       name: 'weapon',
  //       graphic: weaponGraphic,
  //     });
  //   }
  //   attributes['enemy.weapon'] = weapon.id;
  // }

  makeEnemy({
    name: guy.name,
    type,
    frames,
    attributes,
  });
}

function getDefaultWeaponSprite(guy: any) {
  let wpnsprite = 0

  switch (guy.weapon as WeaponTypeGameEngine) {
    case WeaponTypeGameEngine.wSword:
    case WeaponTypeGameEngine.wBeam:
    case WeaponTypeGameEngine.wBrang:
    case WeaponTypeGameEngine.wBomb:
    case WeaponTypeGameEngine.wSBomb:
    case WeaponTypeGameEngine.wLitBomb:
    case WeaponTypeGameEngine.wLitSBomb:
    case WeaponTypeGameEngine.wArrow:
    case WeaponTypeGameEngine.wFire:
    case WeaponTypeGameEngine.wWhistle:
    case WeaponTypeGameEngine.wBait:
    case WeaponTypeGameEngine.wWand:
    case WeaponTypeGameEngine.wMagic:
    case WeaponTypeGameEngine.wCatching:
    case WeaponTypeGameEngine.wWind:
    case WeaponTypeGameEngine.wRefMagic:
    case WeaponTypeGameEngine.wRefFireball:
    case WeaponTypeGameEngine.wRefRock:
    case WeaponTypeGameEngine.wHammer:
    case WeaponTypeGameEngine.wHookshot:
    case WeaponTypeGameEngine.wHSHandle:
    case WeaponTypeGameEngine.wHSChain:
    case WeaponTypeGameEngine.wSSparkle:
    case WeaponTypeGameEngine.wFSparkle:
    case WeaponTypeGameEngine.wSmack:
    case WeaponTypeGameEngine.wPhantom:
    case WeaponTypeGameEngine.wCByrna:
    case WeaponTypeGameEngine.wRefBeam:
    case WeaponTypeGameEngine.wStomp:
    case WeaponTypeGameEngine.lwMax:
    case WeaponTypeGameEngine.wScript1:
    case WeaponTypeGameEngine.wScript2:
    case WeaponTypeGameEngine.wScript3:
    case WeaponTypeGameEngine.wScript4:
    case WeaponTypeGameEngine.wScript5:
    case WeaponTypeGameEngine.wScript6:
    case WeaponTypeGameEngine.wScript7:
    case WeaponTypeGameEngine.wScript8:
    case WeaponTypeGameEngine.wScript9:
    case WeaponTypeGameEngine.wScript10:
    case WeaponTypeGameEngine.wIce:
      wpnsprite = -1;
      break;

    case WeaponTypeGameEngine.wEnemyWeapons:
    case WeaponTypeGameEngine.ewFireball: wpnsprite = 17; break;

    case WeaponTypeGameEngine.ewArrow: wpnsprite = 19; break;
    case WeaponTypeGameEngine.ewBrang: wpnsprite = 4; break;
    case WeaponTypeGameEngine.ewSword: wpnsprite = 20; break;
    case WeaponTypeGameEngine.ewRock: wpnsprite = 18; break;
    case WeaponTypeGameEngine.ewMagic: wpnsprite = 21; break;
    case WeaponTypeGameEngine.ewBomb: wpnsprite = 78; break;
    case WeaponTypeGameEngine.ewSBomb: wpnsprite = 79; break;
    case WeaponTypeGameEngine.ewLitBomb: wpnsprite = 76; break;
    case WeaponTypeGameEngine.ewLitSBomb: wpnsprite = 77; break;
    case WeaponTypeGameEngine.ewFireTrail: wpnsprite = 80; break;
    case WeaponTypeGameEngine.ewFlame: wpnsprite = 35; break;
    case WeaponTypeGameEngine.ewWind: wpnsprite = 36; break;
    case WeaponTypeGameEngine.ewFlame2: wpnsprite = 81; break;
    case WeaponTypeGameEngine.ewFlame2Trail: wpnsprite = 82; break;
    case WeaponTypeGameEngine.ewIce: wpnsprite = 83; break;
    case WeaponTypeGameEngine.ewFireball2: wpnsprite = 17; break; //fireball (rising)

    default: break; //No assign.
  }

  return wpnsprite;
}

for (const zcMap of zcData.maps) {
  const map: QuestMaker.Map_ = { screens: [] };
  quest.maps.push(map);

  for (let screenx = 0; screenx < 16; screenx++) {
    map.screens.push([]);
    for (let screeny = 0; screeny < 9; screeny++) {
      const zcScreen = zcMap.screens[screenx + screeny * 16];
      if (!zcScreen) continue;

      const screen: QuestMaker.Screen = {
        tiles: [],
        enemies: [],
        warps: {},
      };
      map.screens[screenx].push(screen);

      for (let x = 0; x < screenWidth; x++) {
        screen.tiles.push([]);
        for (let y = 0; y < screenHeight; y++) {
          // TODO: why minus one?
          let cset = zcScreen.cset[x + y * screenWidth];
          // console.log(cset)
          // if (cset === 0) cset = undefined;
          // else cset -= 1;

          screen.tiles[x].push({ tile: zcScreen.data[x + y * screenWidth], cset });
        }
      }

      screen.enemies = (zcScreen.enemies as number[])
        .filter(i => {
          return i > 0 && quest.enemies.some(e => e.id === i && e.name);
        })
        .map(i => ({ enemyId: i }));
    }
  }
}

quest.csets = [];
for (const zcColors of zcData.csets.cset_colors) {
  const colors = [];
  for (const [r, g, b] of zcColors) {
    colors.push({ r, g, b });
  }
  quest.csets.push({ colors });
}

const walkFrames = zcData.link_sprites.walk.map((d: any) => ({ graphicIds: [d.tile, d.tile + 1, d.tile + 2], flip: d.flip }));
const stabFrames = zcData.link_sprites.stab.map((d: any) => ({ graphicIds: [d.tile, d.tile + 1, d.tile + 2], flip: d.flip }));
quest.misc.HERO_FRAMES = {
  up: walkFrames[0],
  down: walkFrames[1],
  left: walkFrames[2],
  right: walkFrames[3],

  'useItem-up': stabFrames[0],
  'useItem-down': stabFrames[1],
  'useItem-left': stabFrames[2],
  'useItem-right': stabFrames[3],
};

quest.misc.SPAWN_GFX_START = 72;

// TODO
quest.misc.START_X = 7;
quest.misc.START_Y = 7;

fs.writeFileSync(`${outputDir}/quest.json`, JSON.stringify(quest, null, 2));
