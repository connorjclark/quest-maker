import DecodeZCModule from '../decode_zc/dist/zc.js';
import struct from './third_party/struct.mjs';

interface Version {
  zeldaVersion: number;
  build: number;
}

const Version = {
  eq(v1: Version, v2: Version) {
    return Version.compare(v1, v2) === 0;
  },

  gte(v1: Version, v2: Version) {
    return Version.compare(v1, v2) >= 0;
  },

  gt(v1: Version, v2: Version) {
    return Version.compare(v1, v2) > 0;
  },

  lt(v1: Version, v2: Version) {
    return Version.compare(v1, v2) < 0;
  },

  compare(v1: Version, v2: Version) {
    if (v1.zeldaVersion > v2.zeldaVersion) return 1;
    if (v1.zeldaVersion < v2.zeldaVersion) return -1;

    if (v1.build > v2.build) return 1;
    if (v1.build < v2.build) return -1;

    return 0;
  }
};

const structs = {
  sectionHeader: struct('<4sHHI'),
  //  byte int
  byte: struct('B'),
  // 2 byte int
  int: struct('<H'),
  // 4 byte int
  long: struct('<I'),
};

interface Field {
  name: string;
  type: string;
  arrayLength?: number;
  if?: boolean;
}

function trimString(str: string) {
  // Trim trailing null bytes.
  return str.replace(/\0+$/, '');
}

function readFields(reader: Reader, fields_: Array<Field | false>) {
  const fields = fields_.filter(f => f && (f.if === undefined || f.if)) as Field[];
  const format = '<' + fields.map(f => {
    return (f.arrayLength ? f.arrayLength : '') + f.type;
  }).join('');
  const structResult = reader.readStruct(struct(format));
  const data: any = {};

  for (let i = 0; i < structResult.length; i++) {
    if (typeof structResult[i] === 'string') {
      structResult[i] = trimString(structResult[i]);
    }
  }

  let resultOffset = 0;
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.arrayLength) {
      data[field.name] = structResult.slice(resultOffset, resultOffset + field.arrayLength);
      resultOffset += field.arrayLength;
    } else {
      data[field.name] = structResult[resultOffset];
      resultOffset += 1;
    }
  }

  return data;
}

function readArrayFields(reader: Reader, len: number, fields: Array<Field | false>) {
  const result = [];
  for (let i = 0; i < len; i++) {
    result.push(readFields(reader, fields));
  }
  return result;
}

class Reader {
  private cur = 0;

  constructor(private data: Uint8Array) {
  }

  hasData() {
    return this.data.length > this.cur;
  }

  dataLeft() {
    return this.data.length - this.cur;
  }

  skip(len: number) {
    this.cur += len;
  }

  goto(pos: number) {
    this.cur = pos;
  }

  read(len: number) {
    const result = this.data.subarray(this.cur, this.cur + len);
    this.cur += len;
    return result;
  }

  readStruct(struct_: ReturnType<typeof struct>) {
    const result = struct_.unpack_from(this.data.buffer, this.data.byteOffset + this.cur);
    this.cur += struct_.size;
    return result;
  }

  readByte() {
    return this.readStruct(structs.byte)[0];
  }

  readInt() {
    return this.readStruct(structs.int)[0];
  }

  readLong() {
    return this.readStruct(structs.long)[0];
  }

  readStr(len: number) {
    return trimString(new TextDecoder().decode(this.read(len)));
  }

  find(value: number | string) {
    if (typeof value === 'string' && value.length === 1) {
      value = value.charCodeAt(0);
    }

    if (typeof value === 'number') {
      const index = this.data.subarray(this.cur, this.data.length).findIndex(v => v === value);
      if (index === -1) {
        throw new Error('did not find: ' + value);
      }
      return this.cur + index;
    }

    let matched = 0;
    const needle = new TextEncoder().encode(value);
    for (let i = this.cur; i < this.data.length; i++) {
      if (this.data[i] === needle[matched]) {
        matched += 1;
        if (matched === needle.length) return i - needle.length + 1;
      } else {
        matched = 0;
      }
    }

    throw new Error('did not find: ' + value);
  }
}

const sections = {
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/zq_class.cpp#L6189
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/20f9807a8e268172d0bd2b0461e417f1588b3882/src/qst.cpp#L2005
  // zdefs.h
  'HDR ': (reader: Reader) => {
    return readFields(reader, [
      { name: 'zeldaVersion', type: 'H' },
      { name: 'build', type: 'B' },
      { name: 'pwHash', arrayLength: 16, type: 'B' },
      { name: 'internal', type: 'H' },
      { name: 'questNumber', type: 'B' },
      { name: 'version', type: '9s' },
      { name: 'minVersion', type: '9s' },
      { name: 'title', type: '65s' },
      { name: 'author', type: '65s' },
      { name: 'useKeyfile', type: 'B' },
      // TODO the rest
    ]);
  },
  'TILE': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    let numTiles;
    if (Version.gte(version, { zeldaVersion: 0x254, build: 41 })) {
      numTiles = reader.readLong();
    } else {
      numTiles = reader.readInt();
    }

    const hasEncodedFormats = Version.gte(version, { zeldaVersion: 0x211, build: 4 });

    // https://github.com/ArmageddonGames/ZeldaClassic/blob/b56ba20bc6be4a8e4bf01c7c681238d545069baf/src/tiles.cpp#L2579
    function tilesize(format: number) {
      if (format == 5) return 1024;
      if (format == 4) return 768;
      if (format >= 1 && format <= 3) return 64 << format;
      return 256;
    }

    const tiles = [];
    for (let i = 0; i < numTiles; i++) {
      const format = hasEncodedFormats ? reader.readByte() : 1;
      // Note: usages like this will always keep the qstBytes array buffer in memory.
      let pixels = reader.read(tilesize(format));
      switch (format) {
        case 1:
          const pixelsExpanded = new Uint8Array(pixels.length * 2);
          for (let j = 0; j < pixels.length; j++) {
            const pixel = pixels[j];
            pixelsExpanded[j * 2] = pixel & 0xF;
            pixelsExpanded[j * 2 + 1] = (pixel >> 4) & 0xF;
          }
          pixels = pixelsExpanded;
          break;
        case 0:
        case 2:
        case 3:
          continue;
        default:
          throw new Error('unexpected tile format: ' + format);
      }

      tiles.push({ format, pixels });
    }

    return { tiles };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/30c9e17409304390527fcf84f75226826b46b819/src/qst.cpp#L13150
  'CMBO': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    // TODO: determine which versions each key was added in.
    const comboFields = [
      { version: 0, name: 'tile', type: sversion >= 11 ? 'I' : 'H' },
      { version: 0, name: 'flip', type: 'B' },
      { version: 0, name: 'walk', type: 'B' },
      { version: 0, name: 'type', type: 'B' },
      { version: 0, name: 'csets', type: 'B' },
      { version: 0, name: 'frames', type: 'B' },
      { version: 0, name: 'speed', type: 'B' },
      { version: 0, name: 'nextcombo', type: 'H' },
      { version: 0, name: 'nextcset', type: 'B' },
      { version: 0, name: 'flag', type: 'B' },
      { version: 0, name: 'skipanim', type: 'B' },
      { version: 0, name: 'nexttimer', type: 'H' },
      { version: 0, name: 'skipanimy', type: 'B' },
      { version: 0, name: 'animflags', type: 'B' },
      // Not tested.
      // {'version': 0, 'key': 'attributes', 'read': lambda: section_bytes.read_array(4, NUM_COMBO_ATTRIBUTES)},
      // {'version': 0, 'key': 'usrflags', 'read': lambda: section_bytes.read_long()},
      // {'version': 0, 'key': 'triggerflags', 'read': lambda: section_bytes.read_array(4, 3)},
      // {'version': 12, 'key': 'triggerlevel', 'read': lambda: section_bytes.read_long()},
    ].filter(f => version.zeldaVersion >= f.version);

    const numCombos = reader.readInt();
    const combos = []
    for (let i = 0; i < numCombos; i++) {
      combos.push(readFields(reader, comboFields));
    }

    return { combos };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L15411
  'CSET': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    // https://github.com/ArmageddonGames/ZeldaClassic/blob/0fddc19a02ccf62c468d9201dd54dcb834b764ca/src/colors.h#L47
    const newerpsTOTAL = (6701 << 4) * 3
    const MAXLEVELS = 512
    const PALNAMESIZE = 17

    const colorData = reader.read(newerpsTOTAL);

    const palnames = []
    for (let i = 0; i < MAXLEVELS; i++) {
      palnames.push(reader.readStr(PALNAMESIZE));
    }

    const cycles = readArrayFields(reader, reader.readInt(), [
      { name: 'first', arrayLength: 3, type: 'B' },
      { name: 'count', arrayLength: 3, type: 'B' },
      { name: 'speed', arrayLength: 3, type: 'B' },
    ]);

    let i = 0;
    const csetColors = [];
    while (i < colorData.length) {
      const colors = [];
      for (let j = 0; j < 16; j++) {
        const r = colorData[i] * 4;
        i++;
        const g = colorData[i] * 4;
        i++;
        const b = colorData[i] * 4;
        i++;
        const a = j === 0 ? 0 : 255;
        colors.push([r, g, b, a]);
      }

      if (colors.every(([r, g, b]) => r + g + b === 0)) {
        csetColors.push([]);
      } else {
        csetColors.push(colors);
      }
    }

    return {
      colorData,
      palnames,
      cycles,
      csetColors,
    };
  },
  'DMAP': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    if (sversion < 9) throw new Error('TODO');

    const numDmaps = reader.readInt();
    const dmaps = [];
    for (let i = 0; i < numDmaps; i++) {
      const dmap: any = {};

      const dmap_1 = readFields(reader, [
        { name: 'map', type: 'B' },
        { name: 'level', type: sversion >= 5 ? 'H' : 'B' },
        { name: 'xoff', type: 'B' },
        { name: 'compass', type: 'B' },
        { name: 'color', type: sversion >= 9 ? 'H' : 'B' },
        { name: 'midi', type: 'B' },
        { name: 'cont', type: 'B' },
        { name: 'type', type: 'B' },
        { name: 'grid', arrayLength: 8, type: 'B' },
      ]);

      if (Version.lt(version, { zeldaVersion: 0x192, build: 41 })) {
        throw new Error('TODO');
      }

      const dmap_2 = readFields(reader, [
        { name: 'name', type: '21s' },
        { name: 'title', type: '21s' },
        { name: 'intro', type: '73s' },
      ]);

      dmap.minimap = readArrayFields(reader, 4, [
        { name: 'tile', type: sversion >= 11 ? 'I' : 'H' },
        { name: 'cset', type: 'B' },
      ]);

      const dmap_3 = readFields(reader, [
        { name: 'tmusic', arrayLength: 56, type: 'B' },
        sversion >= 2 && { name: 'tmusictrack', type: 'B' },
        sversion >= 2 && { name: 'active_subscreen', type: 'B' },
        sversion >= 2 && { name: 'passive_subscreen', type: 'B' },
        sversion >= 3 && { name: 'di', arrayLength: 32, type: 'B' },
        sversion >= 4 && { name: 'flags', type: sversion >= 6 ? 'I' : 'B' },
      ]);

      if (Version.gt(version, { zeldaVersion: 0x192, build: 41 }) && Version.lt(version, { zeldaVersion: 0x193, build: 0 })) {
        // Padding.
        reader.skip(1);
      }

      const dmap_4 = readFields(reader, [
        sversion >= 10 && { name: 'sideview', type: 'B' },
        sversion >= 12 && { name: 'script', type: 'H' },
        sversion >= 12 && { name: 'initD', arrayLength: 8, type: 'I' },
        sversion >= 13 && { name: 'initDLabel', arrayLength: 8 * 65, type: 'B' },
        sversion >= 14 && { name: 'activeSubscript', type: 'H' },
        sversion >= 14 && { name: 'passiveSubscript', type: 'H' },
        sversion >= 14 && { name: 'subInitD', arrayLength: 8, type: 'I' },
        sversion >= 14 && { name: 'subInitDLabel', arrayLength: 8 * 65, type: 'B' },
      ]);

      dmaps.push({
        ...dmap,
        ...dmap_1,
        ...dmap_2,
        ...dmap_3,
        ...dmap_4,
      });
    }
  },
  'MAP ': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    if (sversion < 15) throw new Error('TODO');
    if (sversion < 19 && version.zeldaVersion > 0x253) throw new Error('TODO');

    const extendedArrays = Version.gt(version, { zeldaVersion: 0x211, build: 7 });

    let numSecretCombos;
    if (Version.lt(version, { zeldaVersion: 0x192, build: 137 })) {
      numSecretCombos = 20;
    } else if (Version.lt(version, { zeldaVersion: 0x192, build: 154 })) {
      numSecretCombos = 256
    } else {
      numSecretCombos = 128;
    }

    const numMaps = reader.readInt();
    const maps = [];
    for (let i = 0; i < numMaps; i++) {
      const map: any = {};

      const map_1 = readFields(reader, [
        { name: 'valid', type: 'B' },
        { name: 'guy', type: 'B' },
        { name: 'str', type: 'H' },
        { name: 'room', type: 'B' },
        { name: 'item', type: 'B' },
        { name: 'hasitem', type: 'B' },
        { name: 'tileWarpType', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
        { name: 'doorComboSet', type: 'H', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
        { name: 'warpReturnX', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
        { name: 'warpReturnY', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
        { name: 'warpReturnC', type: sversion >= 18 ? 'H' : 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 7 }) },
        { name: 'stairX', type: 'B' },
        { name: 'stairY', type: 'B' },
        { name: 'itemX', type: 'B' },
        { name: 'itemY', type: 'B' },
        { name: 'color', type: sversion > 15 ? 'H' : 'B' },
        { name: 'enemyFlags', type: 'B' },
        { name: 'doors', arrayLength: 4, type: 'B' },
        { name: 'tileWarpDmap', arrayLength: 2, type: 'H' },
        { name: 'tileWarpScreen', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
        { name: 'tileWarpOverlayFlags', type: 'B', if: sversion >= 15 },
        { name: 'exitDir', type: 'B' },
        { name: 'enemies', arrayLength: 10, type: Version.gte(version, { zeldaVersion: 0x192, build: 10 }) ? 'H' : 'B' },
        { name: 'pattern', type: 'B' },
        { name: 'sideWarpType', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
        { name: 'sideWarpOverlayFlags', type: 'B', if: sversion >= 15 },
        { name: 'warpArrivalX', type: 'B' },
        { name: 'warpArrivalY', type: 'B' },
        { name: 'path', arrayLength: 4, type: 'B' },
        { name: 'sideWarpScreen', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
        { name: 'sideWarpDmap', arrayLength: 4, type: 'H' },
        { name: 'sideWarpIndex', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 7 }) },
        { name: 'underCombo', type: 'H' },
        { name: 'underCset', type: 'B' },
        { name: 'catchAll', type: 'H' },
        { name: 'flags', type: 'B' },
        { name: 'flags2', type: 'B' },
        { name: 'flags3', type: 'B' },
        { name: 'flags4', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 1 }) },
        { name: 'flags5', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 7 }) },
        { name: 'noreset', type: 'H', if: Version.gt(version, { zeldaVersion: 0x211, build: 7 }) },
        { name: 'nocarry', type: 'H', if: Version.gt(version, { zeldaVersion: 0x211, build: 7 }) },
        { name: 'flags6', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 9 }) },
        { name: 'flags7', type: 'B', if: sversion > 5 },
        { name: 'flags8', type: 'B', if: sversion > 5 },
        { name: 'flags9', type: 'B', if: sversion > 5 },
        { name: 'flags10', type: 'B', if: sversion > 5 },
        { name: 'csensitive', type: 'B', if: sversion > 5 },
        { name: 'oceanSfx', type: 'B', if: sversion >= 15 },
        { name: 'bossSfx', type: 'B', if: sversion >= 15 },
        { name: 'secretSfx', type: 'B', if: sversion >= 15 },
        { name: 'holdUpSfx', type: 'B', if: sversion >= 16 },
        { name: 'layerMap', arrayLength: 6, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) },
        { name: 'layerScreen', arrayLength: 6, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) },
        { name: 'layerOpacity', arrayLength: 6, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 149 }) },
        { name: '_padding', type: 'B', if: Version.eq(version, { zeldaVersion: 0x192, build: 153 }) },
        { name: 'timedWarpTics', type: 'H', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
        { name: 'nextMap', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 2 }) },
        { name: 'nextScreen', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 2 }) },
        { name: 'secretCombos', arrayLength: numSecretCombos, type: Version.lt(version, { zeldaVersion: 0x192, build: 154 }) ? 'B' : 'H' },
        { name: 'secretCsets', arrayLength: 128, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
        { name: 'secretFlags', arrayLength: 128, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
        { name: 'data', arrayLength: 16 * 11, type: 'H' },
        { name: 'sflag', arrayLength: 16 * 11, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 20 }) },
        { name: 'cset', arrayLength: 16 * 11, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) },
        { name: 'screenMidi', type: 'H', if: sversion > 4 },
        { name: 'lensLayer', type: 'B', if: sversion >= 17 },
      ]);

      if (sversion > 6) {
        const ffBitmask = reader.readLong();
        const MAXFFCS = 32;
        map.ff = [];
        for (let j = 0; j < MAXFFCS; j++) {
          if ((ffBitmask >> j) & 1) {
            map.ff.push(readFields(reader, [
              { name: 'data', type: 'H' },
              { name: 'cset', type: 'B' },
              { name: 'delay', type: 'H' },
              { name: 'x', type: 'I', if: sversion >= 9 },
              { name: 'y', type: 'I', if: sversion >= 9 },
              { name: 'xDelta', type: 'I', if: sversion >= 9 },
              { name: 'yDelta', type: 'I', if: sversion >= 9 },
              { name: 'xDelta2', type: 'I', if: sversion >= 9 },
              { name: 'yDelta2', type: 'I', if: sversion >= 9 },
              { name: 'link', type: 'B' },
              { name: 'width', type: 'B', if: sversion > 7 },
              { name: 'height', type: 'B', if: sversion > 7 },
              { name: 'flags', type: 'I', if: sversion > 7 },
              { name: 'script', type: 'H', if: sversion > 9 },
              { name: 'initd', arrayLength: 8, type: 'I', if: sversion > 10 },
              { name: 'inita', arrayLength: 2, type: 'B', if: sversion > 10 },
            ]));
          } else {
            map.ff.push(null);
          }
        }
      }

      const map_2 = readFields(reader, [
        { name: 'npcStrings', arrayLength: 10, type: 'I', if: sversion >= 19 && version.zeldaVersion > 0x253 },
        { name: 'newItems', arrayLength: 10, type: 'H', if: sversion >= 19 && version.zeldaVersion > 0x253 },
        { name: 'newItemX', arrayLength: 10, type: 'H', if: sversion >= 19 && version.zeldaVersion > 0x253 },
        { name: 'newItemY', arrayLength: 10, type: 'H', if: sversion >= 19 && version.zeldaVersion > 0x253 },
        { name: 'script', type: 'H', if: sversion >= 20 && version.zeldaVersion > 0x253 },
        { name: 'screenInitd', arrayLength: 8, type: 'I', if: sversion >= 20 && version.zeldaVersion > 0x253 },
        { name: 'preloadScript', type: 'B', if: sversion >= 21 && version.zeldaVersion > 0x253 },
        { name: 'hideLayers', type: 'B', if: sversion >= 22 && version.zeldaVersion > 0x253 },
        { name: 'hideScriptLayers', type: 'B', if: sversion >= 22 && version.zeldaVersion > 0x253 },
      ]);

      maps.push({
        ...map_1,
        ...map_2,
        ...map,
      });
    }

    return { maps };
  },
  'LINK': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    if (sversion >= 6) throw new Error('TODO');

    const fields = [
      { name: 'tile', type: 'H' },
      { name: 'flip', type: 'B' },
      { name: 'extend', type: 'B' },
    ];
    return {
      walk: readArrayFields(reader, 4, fields),
      stab: readArrayFields(reader, 4, fields),
      slash: readArrayFields(reader, 4, fields),
    };
  },
};

export async function convertZCQst(questFilePath: string) {
  const zc = await DecodeZCModule();

  const resp = await fetch(questFilePath);
  const buffer = await resp.arrayBuffer();
  const data = new Int8Array(buffer);

  // Actual path on virtual fs does not matter. Hardcoded to "/quests/input.quest"
  zc.FS.mkdir('/quests');
  zc.FS.writeFile('/quests/input.qst', data);

  const read_qst_file = zc.cwrap('read_qst_file', 'number', []);
  const read_qst_file_res = read_qst_file();
  if (read_qst_file_res !== 0) throw new Error(`error: ${read_qst_file_res}`);

  const qstBytes: Uint8Array = zc.FS.readFile('/quests/input.qst.dat');
  const qstReader = new Reader(qstBytes);

  document.body.textContent = (new TextDecoder().decode(
    qstBytes.subarray(0, 10000)
  ));

  const preamble = qstReader.readStr(qstReader.find('\n'));

  const preambles = [
    'AG Zelda Classic Quest File',
    'AG ZC Enhanced Quest File',
  ];

  if (preamble !== preambles[1]) {
    throw new Error('TODO: handle ' + preamble);
  }

  qstReader.goto(qstReader.find('HDR '));

  const zcData: Record<string, any> = {};
  let version: Version = { zeldaVersion: 0, build: 0 };

  while (qstReader.hasData()) {
    const [id, sversion, cversion, size] = qstReader.readStruct(structs.sectionHeader);
    const sectionReader = new Reader(qstReader.read(size));

    console.log({ id, sversion, cversion, size });

    const section = sections[id as keyof typeof sections];
    if (section !== undefined) {
      try {
        const sectionData = section(sectionReader, version, sversion, cversion);
        if (id === 'HDR ') {
          version = { zeldaVersion: sectionData.version, build: sectionData.build };
        }
        zcData[id.trim()] = sectionData;
        console.log(sectionData);
      } catch (e) {
        console.error(e);
        zcData[id.trim()] = { errors: [e] };
      }

      const remainingBytes = sectionReader.dataLeft();
      if (remainingBytes !== 0) {
        const error = `did not read all data, ${remainingBytes} bytes remaining`;
        console.error(error);
        zcData[id.trim()].errors = zcData[id.trim()].errors || [];
        zcData[id.trim()].errors.push(error);
      }
    }
  }

  console.log(zcData);
  return zcData;
}
