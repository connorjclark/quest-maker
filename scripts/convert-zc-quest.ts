// ./docker_run.sh "test_data/bs/2.5/NewBS 3.1 - 1st Quest.qst"
// ts-node -T scripts/convert-zc-quest.ts ../../zquest-data/output/data.json

import * as assert from 'assert';

function makeEnum<T>(vals: {[id: number]: T}) {
  return (id: number) => vals[id];
}

const EnemyAnimationType = makeEnum([
  'none',
  'flip',
  'unused1',
  '2frm',
  'unused2',
  'octo',
  'tek',
  'lev',
  'walk',
  'zora',
  'newzora',
  'ghini',
  'armos',
  'rope',
  'wallm',
  'newwallm',
  'dwalk',
  'vire',
  '3frm',
  'wizz',
  'aqua',
  'dongo',
  'manhan',
  'gleeok',
  'dig',
  'ghoma',
  'lanm',
  '2frmpos',
  '4frm4eye',
  '4frm8eye',
  '4frm4dirf',
  '4frm4dir',
  '4frm8dirf',
  'armos4',
  '4frmpos4dir',
  '4frmpos8dir',
  'unused3',
  '4frm8dirb',
  'newtek',
  '3frm4dir',
  '2frm4dir',
  'newlev',
  '2frm4eye',
  'newwizz',
  'newdongo',
  'dongobs',
  '4frmpos8dirf',
  '4frmpos4dirf',
  '4frmnodir',
  'ganon',
  '2frmb',
] as const);

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

export enum ItemFamily {
  // 0
  itype_sword, itype_brang, itype_arrow, itype_candle, itype_whistle,
  itype_bait, itype_letter, itype_potion, itype_wand, itype_ring,
  itype_wallet, itype_amulet, itype_shield, itype_bow, itype_raft,
  itype_ladder, itype_book, itype_magickey, itype_bracelet, itype_flippers,
  // 20
  itype_boots, itype_hookshot, itype_lens, itype_hammer, itype_dinsfire,
  itype_faroreswind, itype_nayruslove, itype_bomb, itype_sbomb, itype_clock,
  itype_key, itype_magiccontainer, itype_triforcepiece, itype_map, itype_compass,
  itype_bosskey, itype_quiver, itype_lkey, itype_cbyrna, itype_rupee,
  // 40
  itype_arrowammo, itype_fairy, itype_magic, itype_heart, itype_heartcontainer,
  itype_heartpiece, itype_killem, itype_bombammo, itype_bombbag, itype_rocs,
  itype_hoverboots, itype_spinscroll, itype_crossscroll, itype_quakescroll, itype_whispring,
  itype_chargering, itype_perilscroll, itype_wealthmedal, itype_heartring, itype_magicring,
  // 60
  itype_spinscroll2, itype_quakescroll2, itype_agony, itype_stompboots, itype_whimsicalring,
  itype_perilring, itype_misc,
  // 67
  itype_custom1, itype_custom2, itype_custom3, itype_custom4, itype_custom5,
  itype_custom6, itype_custom7, itype_custom8, itype_custom9, itype_custom10,
  itype_custom11, itype_custom12, itype_custom13, itype_custom14, itype_custom15,
  itype_custom16, itype_custom17, itype_custom18, itype_custom19, itype_custom20,
  // 87
  itype_bowandarrow, itype_letterpotion,
  itype_last,
  itype_script1 = 256, //Scripted Weapons
  itype_script2,
  itype_script3,
  itype_script4,
  itype_script5,
  itype_script6,
  itype_script7,
  itype_script8,
  itype_script9,
  itype_script10,
  itype_icerod, //ice Rod

  itype_templast,
  itype_ether, itype_bombos, itype_quake,
  itype_powder,
  itype_trowel,
  itype_instrument,
  itype_sword180,
  itype_sword_gb,
  itype_firerod,
  itype_scripted_001 = 400,
  itype_scripted_002,
  itype_scripted_003,
  itype_scripted_004,
  itype_scripted_005,
  itype_scripted_006,
  itype_scripted_007,
  itype_scripted_008,
  itype_scripted_009,
  itype_scripted_010,

  itype_max = 512
};

const ComboNameType = makeEnum([
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
] as const);

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

for (const midiPath of glob.sync('*.mid', { cwd: dataDir })) {
  fs.copyFileSync(`${dataDir}/${midiPath}`, `${outputDir}/${midiPath}`);
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

  const type = ComboNameType(combo.type);
  if (type === 'Slow Walk') {
    tile.type = TileType.SLOW_WALK;
  } else if (type.includes('Cave')) {
    tile.type = TileType.WARP;
  }
}

for (const zcItem of zcData.items) {
  if (zcItem.name.startsWith('zz')) break;

  quest.items.push({
    name: zcItem.name,
    type: zcItem.family,
    tile: zcItem.tile,
  });
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
  const animationType = EnemyAnimationType(guy.anim);

  if (quest.enemies.length === 49) {
    // console.log(guy, {animationType});
  }

  const tiles = Array.from(Array(guy.width)).map((_, i) => guy.tile + i);
  let frames: QuestMaker.Enemy['frames'] | undefined = undefined;
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

  attributes['enemy.animation.type'] = 'normal';
  attributes['enemy.animation.graphics'] = guy.tile;
  attributes['enemy.animation.numGraphics'] = guy.width;

  switch (animationType) {
    case 'none':
      // assert.equal(0, tiles.length);
      break;
    case 'flip':
      attributes['enemy.animation.type'] = 'flip';
      break;
    case 'unused1':
      break;
    case '2frm':
      break;
    case 'unused2':
      break;
    case 'octo':
      assert.equal(4, tiles.length);
      frames = {};
      frames.down = [tiles[0], tiles[1]];
      frames.left = [tiles[2], tiles[3]];
      break;
    case 'tek':
      break;
    case 'lev':
      assert.strictEqual(5, tiles.length);
      frames = {};
      frames.emerging = [tiles[0], tiles[1], tiles[2]];
      frames.moving = [tiles[3], tiles[4]];
      break;
    case 'walk':
      assert.equal(4, tiles.length);
      frames = {};
      frames.right = [tiles[0], tiles[1]];
      frames.down = [tiles[2]];
      frames.up = [tiles[3]];
      break;
    case 'zora':
      break;
    case 'newzora':
      break;
    case 'ghini':
      break;
    case 'armos':
      assert.equal(4, tiles.length);
      frames = {};
      frames.down = [tiles[0], tiles[1]];
      frames.up = [tiles[2], tiles[3]];
      break;
    case 'rope':
      break;
    case 'wallm':
      break;
    case 'newwallm':
      break;
    case 'dwalk':
      attributes['enemy.animation.type'] = 'dwalk';
      break;
    case 'vire':
      break;
    case '3frm':
      break;
    case 'wizz':
      frames = {};
      frames.right = [tiles[1]];
      frames.down = [tiles[1]];
      frames.up = [tiles[3]];
      break;
    case 'aqua':
      break;
    case 'dongo':
      break;
    case 'manhan':
      break;
    case 'gleeok':
      break;
    case 'dig':
      break;
    case 'ghoma':
      break;
    case 'lanm':
      break;
    case '2frmpos':
      // OK
      break;
    case '4frm4eye':
      break;
    case '4frm8eye':
      break;
    case '4frm4dirf':
      break;
    case '4frm4dir':
      break;
    case '4frm8dirf':
      break;
    case 'armos4':
      break;
    case '4frmpos4dir':
      break;
    case '4frmpos8dir':
      break;
    case 'unused3':
      break;
    case '4frm8dirb':
      break;
    case 'newtek':
      break;
    case '3frm4dir':
      break;
    case '2frm4dir':
      break;
    case 'newlev':
      break;
    case '2frm4eye':
      break;
    case 'newwizz':
      break;
    case 'newdongo':
      break;
    case 'dongobs':
      break;
    case '4frmpos8dirf':
      break;
    case '4frmpos4dirf':
      break;
    case '4frmnodir':
      break;
    case 'ganon':
      break;
    case '2frmb':
      break;
    default:
      throw new Error('unknown ' + guy.anim);
  }

  switch (guy.family as EnemyFamily) {
    case EnemyFamily.eeLEV:
      type = EnemyType.LEEVER;
      break;
    case EnemyFamily.eeWIZZ:
      type = EnemyType.WIZARD;
      break;
    // case EnemyFamily.eeZOL:
    //   type = EnemyType.ZOL;
    //   break;
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
  let wpnsprite = -1;

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

for (const zcDmap of zcData.dmaps) {
  const dmap = {
    name: zcDmap.name,
    map: zcDmap.map,
    color: zcDmap.color,
    song: zcDmap.midi,
  };

  if (dmap.name === '') break;

  quest.dmaps.push(dmap);

  // First 3 options are builtin to ZC, havent exported those midis yet.
  // id >= 4 is for custom midis so shift ids down for now.
  dmap.song = Math.max(0, dmap.song - 4);

  // TODO: midi2 won't play in browser.
  if (dmap.song === 2) dmap.song += 1;
}

for (const zcMap of zcData.maps) {
  const map: QuestMaker.Map_ = { screens: [] };
  quest.maps.push(map);

  for (let screenx = 0; screenx < 16; screenx++) {
    map.screens.push([]);
    for (let screeny = 0; screeny < 9; screeny++) {
      const zcScreen = zcMap.screens[screenx + screeny * 16];
      if (!zcScreen) continue;

      if (zcData.maps.indexOf(zcMap) === 1 && screenx === 3 && screeny === 6) {
        // console.log(zcScreen);
      }

      const screen: QuestMaker.Screen = {
        tiles: [],
        enemies: [],
        warps: {},
      };
      map.screens[screenx].push(screen);

      if (zcScreen.warparrivalx || zcScreen.warparrivaly) {
        screen.warps.arrival = {
          x: zcScreen.warparrivalx,
          y: zcScreen.warparrivaly,
        };
      }

      for (let i = 0; i < zcScreen.warpreturnx.length; i++) {
        const returnx = zcScreen.warpreturnx[i];
        const returny = zcScreen.warpreturny[i];
        const warpDMap = zcScreen.tilewarpdmap[i];
        const warpScreen = zcScreen.tilewarpscr[i];
        const type = zcScreen.tilewarptype[i];
        if (!returnx && !returny && !type && !warpScreen && !warpDMap) break;

        screen.warps.data = screen.warps.data || [];

        if (type === 0) {
          screen.warps.data.push({
            type: 'special-room',
            guy: zcScreen.guy,
            string: zcScreen.str,
            item: zcScreen.catchall,
            return: { x: returnx, y: returny },
          });
        } else if (type === 2) {
          screen.warps.data.push({
            type: 'screen',
            dmap: warpDMap,
            screenX: warpScreen % 16,
            screenY: Math.floor(warpScreen / 16),
          });
        } else {
          // console.log(type); // ?
        }
      }

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

quest.color = { csets: [], palettes: [] };
for (const zcColors of zcData.csets.cset_colors) {
  const colors = [];
  for (const [r, g, b] of zcColors) {
    colors.push({ r, g, b });
  }
  quest.color.csets.push({ colors });
}

// Main palette, numbers 0-15.
const mainPalette = {
  name: 'Main',
  csets: Array.from(new Array(15)).map((_, i) => i),
};
quest.color.palettes.push(mainPalette);

// Each level palette is the same as the main palette, except for csets 2, 3, 4, 9.
for (let i = 0; i < zcData.csets.palnames.length; i++) {
  if (!zcData.csets.palnames[i]) {
    // Alot of wasted space here for palettes that may not even be used. potential for savings here, but may break things.
    // @ts-ignore
    // quest.color.palettes.push(null);
    // continue;
  }

  // See 'loadlvlpal', 'onColors_Main'.
  const csetOffset = i * 13 + 15;

  quest.color.palettes.push({
    name: zcData.csets.palnames[i],
    csets: Array.from(new Array(15)).map((_, i) => {
      const index = [2, 3, 4, 9].indexOf(i);
      if (index !== -1) {
        return csetOffset + index;
      }

      return i;
    }),
  });
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

quest.name = '1st';

fs.writeFileSync(`${outputDir}/quest.json`, JSON.stringify(quest, null, 2));
