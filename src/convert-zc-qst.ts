import * as assert from 'assert';
import * as constants from '../src/constants.js';
import makeQuest from '../src/make-quest.js';
import { EnemyType, ItemType } from '../src/types.js';
import { defaultGuys } from './default-guys.js';
import { QuestRules } from './quest-rules.js';
import struct from './third_party/struct.mjs';
import { EnemyFamily, Sfx, WarpType, WeaponTypeGameEngine } from './zc-constants.js';

const { tileSize, screenWidth, screenHeight } = constants;

function makeEnum<T>(vals: { [id: number]: T }) {
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

export async function convertZCQst(qstData: any): Promise<{ quest: QuestMaker.Quest, errors: string[] }> {
  const { makeEnemy, makeGraphic, makeTile, makeWeapon, quest } = makeQuest();
  const errors: string[] = [];

  function logError(error: string) {
    console.error(error);
    errors.push(error);
  }

  const screenExists = (dmapIndex: number, screenIndex: number) => {
    const mapIndex = qstData.DMAP.dmaps[dmapIndex]?.map;
    if (mapIndex === undefined) return false;

    return qstData.MAP.maps[mapIndex]?.screens[screenIndex];
  };

  quest.misc.rules = qstData.RULE?.rules || [];

  for (const tile of qstData.TILE.tiles) {
    makeGraphic(tile);
  }

  function concatenate(resultConstructor: any, ...arrays: any[]) {
    let totalLength = 0;
    for (const arr of arrays) {
      totalLength += arr.length;
    }

    const result = new resultConstructor(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  const midiCache = new Map<number, string>();
  // @ts-expect-error
  quest.getMidi = (id: number) => {
    const tune = qstData.MIDI.tunes[id];
    if (!tune) return;
    if (midiCache.has(id)) return midiCache.get(id);

    const tracksWithData = tune.tracks.filter((t: Uint8Array) => t.length);
    const format = tracksWithData.length === 1 ? 0 : 1;
    const dataParts = [];

    dataParts.push(new Uint8Array(
      struct('>4sIhhh').pack('MThd', 6, format, tracksWithData.length, tune.divisions)
    ));
    for (const track of tracksWithData) {
      dataParts.push(new Uint8Array(struct('>4sI').pack('MTrk', track.length)));
      dataParts.push(track);
    }

    const data = concatenate(Uint8Array, ...dataParts);
    const blob = new Blob([data.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    midiCache.set(id, url);
    return url;
  };

  const defaultSounds = [
    'ARROW',
    'BEAM',
    'BOMB',
    'BRANG',
    'CHIME',
    'CHINK',
    'CLEARED',
    'DODONGO',
    'DOOR',
    'EDEAD',
    'EHIT',
    'ER',
    'FIRE',
    'GANON',
    'GASP',
    'HAMMER',
    'HOOKSHOT',
    'MSG',
    'OUCH',
    'PICKUP',
    'PLACE',
    'PLINK',
    'REFILL',
    'ROAR',
    'SCALE',
    'PICKUP', // 'SEA', // TODO: why are items pickup sound incorrectly set to this sfx? for now just force the right value
    'SECRET',
    'SPIRAL',
    'STAIRS',
    'SWORD',
    'VADER',
    'WAND',
    'WHISTLE',
    'ZELDA',
  ];

  const sfxCache = new Map<number, string>();
  // @ts-expect-error
  quest.getSfx = (id: number) => {
    const sfx = qstData.SFX?.sfxs[id];

    if (!sfx || !sfx.data) {
      if (!defaultSounds[id]) return null;

      // Return a default sound.
      return `zc_sfx/${defaultSounds[id].toLowerCase()}.wav`;
    }

    if (sfxCache.has(id)) return sfxCache.get(id);

    const samplerate = sfx.frequency;
    const channels = sfx.stereo ? 2 : 1;
    const datalen = sfx.length * channels * sfx.bits / 8;
    const size = datalen + 36;
    const bytesPerSecond = samplerate * channels * sfx.bits / 8;
    const blockalign = channels * sfx.bits / 8;

    const type = 1;
    const prefix = new Uint8Array(
      struct('<4sI4s4sIHHIIHH4sI').pack('RIFF', size, 'WAVE', 'fmt ', 16, type, channels, samplerate, bytesPerSecond, blockalign, sfx.bits, 'data', datalen)
    );

    for (let i = 0; i < sfx.data.length; i++) {
      sfx.data[i] = sfx.data[i] ^ 0x80;
    }

    const data = concatenate(Uint8Array, prefix, sfx.data);
    const blob = new Blob([data.buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    sfxCache.set(id, url);
    return url;
  };

  for (const combo of qstData.CMBO.combos) {
    const tile = makeTile({
      graphicId: combo.tile,
      type: combo.type,
      walkable: [!(combo.walk & 1), !(combo.walk & 4), !(combo.walk & 2), !(combo.walk & 8)],
      flag: combo.flag,
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
  }

  for (const zcItem of qstData.ITEM.items) {
    if (zcItem.name?.startsWith('zz')) break;

    let type = zcItem.family !== undefined ? zcItem.family : undefined;
    if (type === undefined && zcItem.name.includes('Sword')) {
      type = ItemType.SWORD;
    }

    quest.items.push({
      id: quest.items.length,
      name: zcItem.name || '',
      type,
      tile: zcItem.tile,
      cset: zcItem.csets & 0xF,
      pickupSound: zcItem.playSound,
      useSound: zcItem.useSound,
    });
  }

  for (const zcWeapon of qstData.WPN.weapons) {
    if (zcWeapon.name && zcWeapon.name.startsWith('zz')) break;

    makeWeapon({
      name: zcWeapon.name,
      graphic: zcWeapon.tile,
      cset: zcWeapon.csets,
    });
  }

  const guys = qstData.GUY && qstData.GUY.guys.length ? qstData.GUY.guys : defaultGuys;
  // const NEWENEMYTILES = QuestRules.NEWENEMYTILES(quest.misc.rules);
  const NEWENEMYTILES = false; // TODO
  for (const guy of guys) {
    const animationType = EnemyAnimationType(NEWENEMYTILES ? guy.e_anim : guy.anim);

    const tiles = Array.from(Array(guy.width)).map((_, i) => guy.tile + i);
    let frames: QuestMaker.Enemy['frames'] | undefined = undefined;
    const attributes: QuestMaker.Enemy['attributes'] = {};
    let type = EnemyType.NORMAL;

    // attributes['enemy.life'] = guy.life;
    attributes['enemy.directionChange'] = guy.rate / 16;
    attributes['enemy.halt'] = guy.hrate / 16;
    attributes['enemy.homing'] = guy.homing / 255;
    attributes['enemy.speed'] = guy.step / 100;
    attributes['enemy.hitSfx'] = guy.hitsfx || Sfx.SFX_EHIT;
    attributes['enemy.deathSfx'] = guy.deadsfx || Sfx.SFX_EDEAD;

    if (guy.cset) {
      attributes['enemy.cset'] = guy.cset;
    }

    attributes['enemy.animation.type'] = 'none';
    attributes['enemy.animation.graphics'] = NEWENEMYTILES ? guy.e_tile : guy.tile;
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
        // assert.equal(4, tiles.length);
        frames = {};
        frames.down = [tiles[0], tiles[1]];
        frames.left = [tiles[2], tiles[3]];
        break;
      case 'tek':
        break;
      case 'lev':
        // assert.strictEqual(5, tiles.length);
        frames = {};
        frames.emerging = [tiles[0], tiles[1], tiles[2]];
        frames.moving = [tiles[3], tiles[4]];
        break;
      case 'walk':
        // assert.equal(4, tiles.length);
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
        // assert.equal(4, tiles.length);
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
        // assert.equal(4, tiles.length);
        frames = {};
        frames.down = frames.right = frames.left = [tiles[0], tiles[1]];
        frames.up = [tiles[2], tiles[3]];
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
        attributes['enemy.animation.type'] = animationType;
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
        console.error('unknown animation type:', guy.anim);
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

  function getDmapCoord(zcDmap: any, scr: number) {
    scr += zcDmap.xoff;
    return {
      x: scr % screenWidth,
      y: Math.floor(scr / screenWidth) % screenHeight,
    };
  }

  for (const zcDmap of qstData.DMAP.dmaps) {
    const continueCoord = getDmapCoord(zcDmap, zcDmap.cont);
    const dmap = {
      name: zcDmap.name,
      type: zcDmap.type,
      level: zcDmap.level,
      title: zcDmap.title,
      map: zcDmap.map,
      color: zcDmap.color,
      song: zcDmap.midi,
      continueScreenX: continueCoord.x,
      continueScreenY: continueCoord.y,
      xoff: zcDmap.xoff,
      grid: zcDmap.grid,
    };

    if (dmap.name === '' && dmap.title === '') break;

    quest.dmaps.push(dmap);

    // First 3 options are builtin to ZC, havent exported those midis yet.
    // id >= 4 is for custom midis so shift ids down for now.
    dmap.song = Math.max(0, dmap.song - 4);

    // TODO: midi2 won't play in browser.
    if (dmap.song === 2) dmap.song += 1;
  }

  for (const zcMap of qstData.MAP.maps) {
    const map: QuestMaker.Map_ = { screens: [] };
    quest.maps.push(map);

    for (let screenx = 0; screenx < 16; screenx++) {
      map.screens.push([]);
      for (let screeny = 0; screeny < 9; screeny++) {
        const zcScreen = zcMap.screens[screenx + screeny * 16];
        if (!zcScreen) continue;

        const layerMap: number[] = zcScreen.layerMap; // TODO: should type zcData just a bit ...
        const screen: QuestMaker.Screen = {
          tiles: [],
          secretTiles: (zcScreen.secretCombos as any[]).map((combo, i) => {
            return { tile: combo, cset: zcScreen.secretCsets[i] };
          }),
          layers: layerMap.map((m, i) => {
            if (m === 0) return null;

            return {
              map: m - 1,
              x: zcScreen.layerScreen[i] % screenWidth,
              y: Math.floor(zcScreen.layerScreen[i] / screenWidth),
              opacity: zcScreen.layerOpacity[i] / 255,
            };
          }),
          enemies: (zcScreen.enemies as number[])
            .map(i => {
              if (i === 0 || !quest.enemies.some(e => e.id === i && e.name)) return null;
              return { enemyId: i };
            }),
          enemyFlags: zcScreen.enemyFlags,
          color: zcScreen.color,
          item: zcScreen.hasItem ? {
            id: zcScreen.item,
            x: zcScreen.itemX / tileSize,
            y: zcScreen.itemY / tileSize,
          } : undefined,
          warps: {
            returns: (zcScreen.warpReturnX as number[]).map((x, i) => ({ x, y: zcScreen.warpReturnY[i] })),
            tileWarps: convertWarps('tile', zcScreen.tileWarpType, zcScreen.tileWarpDmap, zcScreen.tileWarpScreen),
            sideWarps: convertWarps('side', zcScreen.sideWarpType, zcScreen.sideWarpDmap, zcScreen.sideWarpScreen),
            timedWarpTicks: zcScreen.timedWarpTics,
          },
          flags: [
            zcScreen.flags,
            zcScreen.flags1,
            zcScreen.flags2,
            zcScreen.flags3,
            zcScreen.flags4,
            zcScreen.flags5,
            zcScreen.flags6,
            zcScreen.flags7,
            zcScreen.flags8,
            zcScreen.flags9,
            zcScreen.flags10,
          ].filter(f => f !== undefined),
          midi: zcScreen.screenMidi !== undefined && zcScreen.screenMidi !== 65535 ? zcScreen.screenMidi : undefined,
          string: zcScreen.str ? zcScreen.str : undefined,
        };
        map.screens[screenx].push(screen);

        // TODO: this is legacy, controlled by 'Use Warp Return Points Only'
        if (zcScreen.warpArrivalX || zcScreen.warpArrivalY) {
          screen.warps.arrival = {
            x: zcScreen.warpArrivalX,
            y: zcScreen.warpArrivalY,
          };
        }

        function convertWarps(sideOrTile: 'side' | 'tile', warpTypes: number[], warpDmaps: number[], warpScreens: number[]) {
          const warps = [];

          for (let i = 0; i < warpTypes.length; i++) {
            const type = warpTypes[i];
            const dmap = warpDmaps[i];
            const xoff = quest.dmaps[dmap].xoff;
            const screen = warpScreens[i];

            // ???
            if (sideOrTile === 'side' && !type && !dmap && !screen) continue;

            if (type === 0) {
              if (!zcScreen.guy && !zcScreen.catchAll) continue;

              warps.push({
                index: i,
                type: 'special-room' as const,
                guy: zcScreen.guy,
                string: zcScreen.str,
                item: zcScreen.catchAll,
              });
            } else {
              const warpScreenAdjusted = screen + xoff;
              if (warpScreenAdjusted >= 128) continue; // TODO: remove check?

              if (!screenExists(dmap, warpScreenAdjusted)) {
                logError(`bad warp, screen does not exist: dmap ${dmap} dmap.xoff ${xoff} screen ${warpScreenAdjusted}`);
                continue;
              }

              const screenCoord = getDmapCoord(quest.dmaps[dmap], screen);
              warps.push({
                index: i,
                type: type === 3 ? ('scroll' as const) : ('direct' as const),
                instant: [WarpType.wtIWARP, WarpType.wtIWARPBLK, WarpType.wtIWARPOPEN, WarpType.wtIWARPWAVE].includes(type),
                dmap,
                screenX: screenCoord.x,
                screenY: screenCoord.y,
              });
            }
          }

          return warps;
        }

        for (let x = 0; x < screenWidth; x++) {
          screen.tiles.push([]);
          for (let y = 0; y < screenHeight; y++) {
            // TODO: why minus one?
            let cset = zcScreen.cset[x + y * screenWidth];
            // console.log(cset)
            // if (cset === 0) cset = undefined;
            // else cset -= 1;

            screen.tiles[x].push({
              tile: zcScreen.data[x + y * screenWidth],
              cset,
            });
          }
        }
      }
    }
  }

  quest.color = { csets: [], palettes: [] };
  for (const zcColors of qstData.CSET.csetColors) {
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
  // https://www.purezc.net/forums/index.php?showtopic=75811
  for (let i = 0; i < qstData.CSET.palnames.length; i++) {
    if (!qstData.CSET.palnames[i]) {
      // Alot of wasted space here for palettes that may not even be used. potential for savings here, but may break things.
      // @ts-ignore
      // quest.color.palettes.push(null);
      // continue;
    }

    // See 'loadlvlpal', 'onColors_Main'.
    const csetOffset = i * 13 + 15;

    quest.color.palettes.push({
      name: qstData.CSET.palnames[i],
      csets: Array.from(new Array(15)).map((_, i) => {
        const index = [2, 3, 4, 9].indexOf(i);
        if (index !== -1) {
          return csetOffset + index;
        }

        return i;
      }),
    });
  }

  if (qstData.LINK?.walk && qstData.LINK?.stab) {
    const walkFrames = qstData.LINK.walk.map((d: any, i: number) => {
      // The 'up' direction is just one frame flipped.
      if (i === 0) {
        return {
          gfxs: [d.tile, d.tile],
          flip: [0, 1],
        }
      }

      return {
        gfxs: [d.tile, d.tile + 1],
        flip: d.flip,
      }
    });
    const stabFrames = qstData.LINK.stab.map((d: any) => ({ gfxs: [d.tile], flip: d.flip }));
    quest.misc.HERO_FRAMES = {
      walk: walkFrames,
      stab: stabFrames,
    };
  } else {
    const linkAnimationStyle = qstData.INIT.linkAnimationStyle || 0;
    const linktile = 4;
    const arr4 = (start: number) => [start, start + 1, start + 2, start + 3];
    const arr2 = (start: number) => [start, start + 1];

    if (linkAnimationStyle === 0) {
      quest.misc.HERO_FRAMES = {
        walk: [
          { gfxs: [linktile + 20, linktile + 20], flip: [0, 1] },
          { gfxs: arr2(linktile + 18), flip: 0 },
          { gfxs: arr2(linktile + 16), flip: 1 },
          { gfxs: arr2(linktile + 16), flip: 0 },
        ],
        stab: [
          { gfxs: [linktile + 23], flip: [0, 1] },
          { gfxs: arr2(linktile + 22), flip: 0 },
          { gfxs: arr2(linktile + 21), flip: 1 },
          { gfxs: arr2(linktile + 21), flip: 0 },
        ],
      };
    } else if (linkAnimationStyle === 1) {
      quest.misc.HERO_FRAMES = {
        walk: [
          { gfxs: arr4(linktile + 24), flip: 0 },
          { gfxs: arr4(linktile + 19), flip: 0 },
          { gfxs: arr4(linktile + 16), flip: 1 },
          { gfxs: arr4(linktile + 16), flip: 0 },
        ],
        stab: [
          { gfxs: arr4(linktile + 27), flip: 0 },
          { gfxs: arr4(linktile + 23), flip: 0 },
          { gfxs: arr4(linktile + 22), flip: 1 },
          { gfxs: arr4(linktile + 22), flip: 0 },
        ],
      };
    } else {
      logError('linkAnimationStyle: ' + linkAnimationStyle);
    }
  }

  if (qstData.STR?.strings) {
    quest.misc.strings = qstData.STR.strings;
  } else {
    quest.misc.strings = [];
  }

  quest.misc.SPAWN_GFX_START = 72;
  quest.misc.START_DMAP = qstData.INIT.startDmap || 0;
  quest.name = '1st';

  // @ts-expect-error
  globalThis.quest = quest;
  // @ts-expect-error
  globalThis.qstData = qstData;

  return { quest, errors };
}
