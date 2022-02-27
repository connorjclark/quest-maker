import DecodeZCModule from '../decode_zc/dist/zc.js';
import struct from './third_party/struct.mjs';
import defaultItemNames from '../data/zc-item-names.json';

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

  lte(v1: Version, v2: Version) {
    return Version.compare(v1, v2) <= 0;
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
  intSignedBigEndian: struct('>h'),
  // 4 byte int
  long: struct('<I'),
  longBigEndian: struct('>I'),
};

interface Field {
  name: string;
  type: string;
  arrayLength?: number;
  if?: boolean;
}

function trimString(str: string) {
  const nullIndex = str.indexOf('\0');
  return nullIndex !== -1 ? str.substring(0, nullIndex) : str;
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

  readIntSignedBigEndian(): any {
    return this.readStruct(structs.intSignedBigEndian)[0];
  }

  readLong() {
    return this.readStruct(structs.long)[0];
  }

  readLongBigEndian() {
    return this.readStruct(structs.longBigEndian)[0];
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

    const hasEncodedFormats = Version.gt(version, { zeldaVersion: 0x211, build: 4 });

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

      tiles.push(pixels);
    }

    return { tiles };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/30c9e17409304390527fcf84f75226826b46b819/src/qst.cpp#L13150
  'CMBO': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    let numCombos;
    if (version.zeldaVersion < 0x174) {
      numCombos = 1024;
    } else if (version.zeldaVersion < 0x191) {
      numCombos = 2048;
    } else {
      numCombos = reader.readInt();
    }

    const combos = readArrayFields(reader, numCombos, [
      { name: 'tile', type: sversion >= 11 ? 'I' : 'H' },
      { name: 'flip', type: 'B' },
      { name: 'walk', type: 'B' },
      { name: 'type', type: 'B' },
      { name: 'csets', type: 'B' },
      { name: '_padding', type: '2s', if: version.zeldaVersion < 0x193 },
      { name: '_padding', type: '16s', if: version.zeldaVersion === 0x191 },
      { name: 'frames', type: 'B' },
      { name: 'speed', type: 'B' },
      { name: 'nextcombo', type: 'H' },
      { name: 'nextcset', type: 'B' },
      { name: 'flag', type: 'B', if: sversion >= 3 },
      { name: 'skipanim', type: 'B', if: sversion >= 4 },
      { name: 'nexttimer', type: 'H', if: sversion >= 4 },
      { name: 'skipanimy', type: 'B', if: sversion >= 5 },
      { name: 'animflags', type: 'B', if: sversion >= 6 },
      { name: 'attributes', arrayLength: 4, type: 'I', if: sversion >= 8 },
      { name: 'usrflags', type: 'I', if: sversion >= 8 },

      { name: 'triggerFlags', arrayLength: 2, type: 'I', if: sversion === 9 },
      { name: 'triggerLevel', type: 'I', if: sversion === 9 },
      { name: 'triggerFlags', arrayLength: 3, type: 'I', if: sversion >= 10 },
      { name: 'triggerLevel', type: 'I', if: sversion >= 10 },

      { name: 'label', arrayLength: 11, type: 'B', if: sversion >= 12 },
      { name: '_padding', type: '11s', if: version.zeldaVersion < 0x193 },
    ]);

    return { combos };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L15411
  'CSET': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    const MAXLEVELS = sversion < 3 ? 256 : 512;
    const PALNAMESIZE = 17;

    // https://github.com/ArmageddonGames/ZeldaClassic/blob/0fddc19a02ccf62c468d9201dd54dcb834b764ca/src/colors.h#L47
    let colorDataLength;
    if (sversion >= 4) {
      colorDataLength = (6701 << 4) * 3;
    } else if (Version.gte(version, { zeldaVersion: 0x192, build: 73 })) {
      colorDataLength = (3373 << 4) * 3;
    } else {
      colorDataLength = (240 << 4) * 3;
    }

    const colorData = reader.read(colorDataLength);

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
      palnames,
      cycles,
      csetColors,
    };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L4127
  'DMAP': (reader: Reader, version: Version, sversion: number, cversion: number) => {
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
        { name: 'tmusictrack', type: 'B', if: sversion >= 2 },
        { name: 'active_subscreen', type: 'B', if: sversion >= 2 },
        { name: 'passive_subscreen', type: 'B', if: sversion >= 2 },
        { name: 'di', arrayLength: 32, type: 'B', if: sversion >= 3 },
        { name: 'flags', type: sversion >= 6 ? 'I' : 'B', if: sversion >= 4 },
      ]);

      if (Version.gt(version, { zeldaVersion: 0x192, build: 41 }) && Version.lt(version, { zeldaVersion: 0x193, build: 0 })) {
        // Padding.
        reader.skip(1);
      }

      const dmap_4 = readFields(reader, [
        { name: 'sideview', type: 'B', if: sversion >= 10 },
        { name: 'script', type: 'H', if: sversion >= 12 },
        { name: 'initD', arrayLength: 8, type: 'I', if: sversion >= 12 },
        { name: 'initDLabel', arrayLength: 8 * 65, type: 'B', if: sversion >= 13 },
        { name: 'activeSubscript', type: 'H', if: sversion >= 14 },
        { name: 'passiveSubscript', type: 'H', if: sversion >= 14 },
        { name: 'subInitD', arrayLength: 8, type: 'I', if: sversion >= 14 },
        { name: 'subInitDLabel', arrayLength: 8 * 65, type: 'B', if: sversion >= 14 },
      ]);

      dmaps.push({
        ...dmap,
        ...dmap_1,
        ...dmap_2,
        ...dmap_3,
        ...dmap_4,
      });
    }

    return { dmaps };
  },
  'MAP ': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    const extendedArrays = Version.gt(version, { zeldaVersion: 0x211, build: 7 });

    let numSecretCombos;
    if (Version.lt(version, { zeldaVersion: 0x192, build: 137 })) {
      numSecretCombos = 20;
    } else if (version.zeldaVersion === 0x192 && version.build < 154) {
      numSecretCombos = 256
    } else {
      numSecretCombos = 128;
    }

    let numScreens;
    if (Version.lt(version, { zeldaVersion: 0x192, build: 137 })) {
      numScreens = 132;
    } else {
      numScreens = 136;
    }

    let numMaps = reader.readInt();
    const maps = [];
    for (let i = 0; i < numMaps; i++) {
      const map = { screens: [] as any[] };
      maps.push(map);

      for (let i = 0; i < numScreens; i++) {
        const screen: any = {};

        const screen_1 = readFields(reader, [
          { name: 'valid', type: 'B' },
          { name: 'guy', type: 'B' },
          { name: 'str', type: Version.gt(version, { zeldaVersion: 0x192, build: 146 }) ? 'H' : 'B' },
          { name: 'room', type: 'B' },
          { name: 'item', type: 'B' },
          { name: 'hasItem', type: 'B', if: Version.gte(version, { zeldaVersion: 0x211, build: 14 }) },
          { name: '_padding', type: 'B', if: Version.lt(version, { zeldaVersion: 0x192, build: 154 }) },
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
          { name: 'tileWarpDmap', arrayLength: extendedArrays ? 4 : 1, type: sversion > 11 ? 'H' : 'B' },
          { name: 'tileWarpScreen', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
          { name: 'tileWarpOverlayFlags', type: 'B', if: sversion >= 15 },
          { name: 'exitDir', type: 'B' },
          { name: '_padding', type: 'B', if: version.zeldaVersion < 0x193 },
          { name: '_padding', type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 145 }) && Version.lt(version, { zeldaVersion: 0x192, build: 154 }) },
          { name: 'enemies', arrayLength: 10, type: Version.gte(version, { zeldaVersion: 0x192, build: 10 }) ? 'H' : 'B' },
          { name: 'pattern', type: 'B' },
          { name: 'sideWarpType', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
          { name: 'sideWarpOverlayFlags', type: 'B', if: sversion >= 15 },
          { name: 'warpArrivalX', type: 'B' },
          { name: 'warpArrivalY', type: 'B' },
          { name: 'path', arrayLength: 4, type: 'B' },
          { name: 'sideWarpScreen', arrayLength: extendedArrays ? 4 : 1, type: 'B' },
          { name: 'sideWarpDmap', arrayLength: extendedArrays ? 4 : 1, type: sversion > 11 ? 'H' : 'B' },
          { name: 'sideWarpIndex', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 7 }) },
          { name: 'underCombo', type: 'H' },
          { name: 'old_cpage', type: 'B', if: version.zeldaVersion < 0x193 },
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
          { name: 'oceanSfx', type: 'B', if: sversion >= 14 },
          { name: 'bossSfx', type: 'B', if: sversion >= 14 },
          { name: 'secretSfx', type: 'B', if: sversion >= 14 },
          { name: 'holdUpSfx', type: 'B', if: sversion >= 15 },

          // this is a weird one for older versions
          { name: 'layerMap', arrayLength: 6, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) },
          { name: 'layerScreen', arrayLength: 6, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) },
          { name: '_skip', arrayLength: 4, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 23 }) && Version.lt(version, { zeldaVersion: 0x192, build: 98 }) },

          { name: 'layerOpacity', arrayLength: 6, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 149 }) },
          { name: '_padding', type: 'B', if: Version.eq(version, { zeldaVersion: 0x192, build: 153 }) },
          { name: 'timedWarpTics', type: 'H', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
          { name: 'nextMap', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 2 }) },
          { name: 'nextScreen', type: 'B', if: Version.gt(version, { zeldaVersion: 0x211, build: 2 }) },
          { name: 'secretCombos', arrayLength: numSecretCombos, type: Version.lt(version, { zeldaVersion: 0x192, build: 154 }) ? 'B' : 'H' },
          { name: 'secretCsets', arrayLength: 128, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
          { name: 'secretFlags', arrayLength: 128, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 153 }) },
          { name: '_padding', type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) && Version.lt(version, { zeldaVersion: 0x192, build: 154 }) },
          { name: 'data', arrayLength: 16 * 11, type: 'H' },
          { name: 'sflag', arrayLength: 16 * 11, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 20 }) },
          { name: 'cset', arrayLength: 16 * 11, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 97 }) },
          { name: 'screenMidi', type: 'H', if: sversion > 4 },
          { name: 'lensLayer', type: 'B', if: sversion >= 17 },
        ]);

        if (sversion > 6) {
          const ffBitmask = reader.readLong();
          const MAXFFCS = 32;
          screen.ff = [];
          for (let j = 0; j < MAXFFCS; j++) {
            if ((ffBitmask >> j) & 1) {
              screen.ff.push(readFields(reader, [
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
              screen.ff.push(null);
            }
          }
        }

        const screen_2 = readFields(reader, [
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

        map.screens.push({
          ...screen_1,
          ...screen_2,
          ...screen,
        });
      }
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
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L7423
  'WPN ': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    let numWeapons;
    if (version.zeldaVersion < 0x186) numWeapons = 64;
    if (version.zeldaVersion < 0x185) numWeapons = 32;
    if (version.zeldaVersion > 0x192) numWeapons = reader.readInt();

    const weaponsJustName = readArrayFields(reader, numWeapons, [
      { name: 'name', type: '64s', if: sversion > 2 },
    ]);

    const weaponsRest = readArrayFields(reader, numWeapons, [
      { name: 'tile', type: 'H' },
      { name: 'misc', type: 'B' },
      { name: 'csets', type: 'B' },
      { name: 'frames', type: 'B' },
      { name: 'speed', type: 'B' },
      { name: 'type', type: 'B' },
      { name: 'script', type: 'H', if: sversion >= 7 },
      { name: 'newtile', type: 'I', if: sversion >= 7 },
    ]);
    const weapons = weaponsJustName.map((w, i) => ({ ...w, ...weaponsRest[i] }));

    return { weapons };
  },
  'MIDI': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    const flags = reader.read(32);

    function accessFlag(num: number) {
      const base = Math.floor(num / 8);
      const shift = Math.floor(num % 8);
      return (flags[base] & (1 << shift)) >> shift;
    }

    const tunes = [];
    for (let i = 0; i < 252; i++) {
      if (accessFlag(i) === 0) {
        tunes.push(null);
        continue;
      }

      const tune = readFields(reader, [
        { name: 'title', type: sversion >= 4 ? '36s' : '20s' },
        { name: 'start', type: 'I' },
        { name: 'loopStart', type: 'I' },
        { name: 'loopEnd', type: 'I' },
        { name: 'loop', type: 'H' },
        { name: 'volume', type: 'H' },
        { name: '_padding', type: 'I', if: version.zeldaVersion < 0x193 },
        { name: 'flags', type: 'B', if: sversion >= 3 },
        { name: 'format', type: 'B', if: sversion >= 2 },
      ]);
      tune.divisions = reader.readIntSignedBigEndian();

      tune.tracks = [];
      for (let j = 0; j < 32; j++) {
        const length = reader.readLongBigEndian();
        const data = reader.read(length);
        tune.tracks.push(data);
      }

      tunes.push(tune);
    }

    return { tunes };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L11056
  'SFX ': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    let wavCount = 256;
    if (sversion < 6) wavCount = 128;

    function accessFlag(flags: Uint8Array, num: number) {
      const base = Math.floor(num / 8);
      const shift = Math.floor(num % 8);
      return (flags[base] & (1 << shift)) >> shift;
    }

    const namesBitFlags = sversion >= 4 ?
      reader.read(wavCount >> 3) :
      null;

    const sfxs = [];
    for (let i = 0; i < wavCount; i++) {
      if (sversion > 4 && (!namesBitFlags || accessFlag(namesBitFlags, i))) {
        const name = reader.readStr(36);
        sfxs.push({ name });
      } else {
        sfxs.push(null);
      }
    }

    for (let i = 1; i < wavCount; i++) {
      if (namesBitFlags && !accessFlag(namesBitFlags, i - 1)) {
        continue;
      }

      const sfxRest = readFields(reader, [
        { name: 'bits', type: 'I' },
        { name: 'stereo', type: 'I' },
        { name: 'frequency', type: 'I' },
        { name: 'priority', type: 'I' },
        { name: 'length', type: 'I' },
        { name: 'loopStart', type: 'I' },
        { name: 'loopEnd', type: 'I' },
        { name: 'param', type: 'I' },
      ]);
      if (sfxRest.bits !== 8 && sfxRest.bits !== 16) break; // TODO ? http://localhost:1234/?quest=zc_quests%2F446%2FPromised+Lands.qst
      let numBytes = (sfxRest.bits === 8 ? 1 : 2) * (sfxRest.stereo === 0 ? 1 : 2) * sfxRest.length;
      if (sversion < 3) {
        numBytes = (sfxRest.bits === 8 ? 1 : 2) * sfxRest.length;
      }
      sfxRest.data = reader.read(numBytes);

      sfxs[i - 1] = { ...sfxs[i - 1], ...sfxRest };
    }

    return { sfxs };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L11341
  'GUY ': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    if (sversion === 2) throw new Error('TODO');

    if (sversion <= 2) {
      // readlinksprites2
      const holdSprites = readArrayFields(reader, 2, [
        { name: 'tile', type: 'H' },
        { name: 'tile2', type: 'H' },
        { name: 'extend', type: 'B' },
      ]);

      return { holdSprites, guys: [] };
    }

    const guysJustName = readArrayFields(reader, 512, [
      { name: 'name', type: '64s', if: sversion > 3 },
    ]);
    const guysRest = readArrayFields(reader, 512, [
      { name: 'flags', type: 'I' },
      { name: 'flags2', type: 'I' },
      { name: 'tile', type: sversion >= 36 ? 'I' : 'H' },
      { name: 'width', type: 'B' },
      { name: 'height', type: 'B' },
      { name: 's_tile', type: sversion >= 36 ? 'I' : 'H' },
      { name: 's_width', type: 'B' },
      { name: 's_height', type: 'B' },
      { name: 'e_tile', type: sversion >= 36 ? 'I' : 'H' },
      { name: 'e_width', type: 'B' },
      { name: 'e_height', type: 'B' },
      { name: 'hp', type: 'H' },
      { name: 'family', type: 'H' },
      { name: 'cset', type: 'H' },
      { name: 'anim', type: 'H' },
      { name: 'e_anim', type: 'H' },
      { name: 'frate', type: 'H' },
      { name: 'e_frate', type: 'H' },
      { name: 'dp', type: 'H' },
      { name: 'wdp', type: 'H' },
      { name: 'weapon', type: 'H' },
      { name: 'rate', type: 'H' },
      { name: 'hrate', type: 'H' },
      { name: 'step', type: 'H' },
      { name: 'homing', type: 'H' },
      { name: 'grumble', type: 'H' },
      { name: 'itemSet', type: 'H' },
      { name: 'misc', arrayLength: 10, type: sversion >= 22 ? 'I' : 'H' },
      { name: 'bgsfx', type: 'H' },
      { name: 'bosspal', type: 'H' },
      { name: 'extend', type: 'H' },
      { name: 'defense', arrayLength: 19, type: 'B', if: sversion >= 16 },
      { name: 'hitsfx', type: 'B', if: sversion >= 18 },
      { name: 'deadsfx', type: 'B', if: sversion >= 18 },

      ...(sversion >= 22 ? [
        { name: 'misc11', type: 'I' },
        { name: 'misc12', type: 'I' },
      ] : [
        { name: 'misc11', type: 'H', if: sversion >= 19 },
        { name: 'misc12', type: 'H', if: sversion >= 19 },
      ]),

      { name: '_padding', arrayLength: 41 - 19, type: 'B', if: sversion > 24 },
      { name: 'txsz', type: 'I', if: sversion > 25 },
      { name: 'tysz', type: 'I', if: sversion > 25 },
      { name: 'hxsz', type: 'I', if: sversion > 25 },
      { name: 'hysz', type: 'I', if: sversion > 25 },
      { name: 'hzsz', type: 'I', if: sversion > 25 },
      { name: '_padding', arrayLength: 5, type: 'I', if: sversion >= 26 },
      { name: 'frozenTile', type: 'I', if: sversion >= 30 },
      { name: 'frozenCset', type: 'I', if: sversion >= 30 },
      { name: 'frozenClock', type: 'I', if: sversion >= 30 },
      { name: 'frozenMisc', arrayLength: 10, type: 'H', if: sversion >= 30 },

      ...(sversion >= 34 ? [
        { name: 'fireSfx', type: 'H' },
        { name: 'misc16', arrayLength: 17, type: 'I' },
        { name: 'movement', arrayLength: 32, type: 'I' },
        { name: 'newWeapon', arrayLength: 32, type: 'I' },
        { name: 'script', type: 'H' },
        { name: 'initD', arrayLength: 8, type: 'I' },
        { name: 'initA', arrayLength: 2, type: 'I' },
      ] : []),

      { name: 'editorFlags', type: 'I', if: sversion >= 37 },

      ...(sversion >= 38 ? [
        { name: 'misc13', type: 'I' },
        { name: 'misc14', type: 'I' },
        { name: 'misc15', type: 'I' },
      ] : []),

      { name: '_skip', arrayLength: 8 * 65 * 2, type: 'B', if: sversion >= 39 },
      { name: 'weaponScript', type: 'H', if: sversion >= 40 },
      { name: 'weaponInitialD', arrayLength: 8, type: 'I', if: sversion >= 41 },
    ]);
    const guys = guysJustName.map((w, i) => ({ ...w, ...guysRest[i] }));

    return { guys };
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L16105
  'INIT': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    const extendedArrays = sversion > 12 || Version.eq(version, { zeldaVersion: 0x211, build: 18 });
    return readFields(reader, [
      { name: 'items', arrayLength: 256, type: 'B', if: sversion >= 10 },
      { name: '_padding', arrayLength: 6, type: 'B' },
      { name: '_padding', arrayLength: 7, type: 'B', if: sversion < 10 },
      { name: '_padding', arrayLength: 5, type: 'B', if: sversion < 10 },
      { name: 'bombs', type: 'B' },
      { name: 'superBombs', type: 'B' },
      { name: '_padding', arrayLength: 10, type: 'B', if: sversion < 10 && Version.gt(version, { zeldaVersion: 0x192, build: 173 }) },
      { name: '_padding', arrayLength: 10, type: 'B', if: sversion < 10 && version.zeldaVersion === 0x192 && version.build > 173 },
      { name: 'hc', type: 'B' },
      { name: 'startHeart', type: sversion >= 14 ? 'H' : 'B' },
      { name: 'continueHeart', type: sversion >= 14 ? 'H' : 'B' },
      { name: 'hcp', type: 'B' },
      { name: 'hcpPerHc', type: 'B', if: sversion >= 14 },
      { name: 'maxBombs', type: 'B' },
      { name: 'keys', type: 'B' },
      { name: 'rupees', type: 'H' },
      { name: 'triforce', type: 'B' },
      { name: 'map', arrayLength: extendedArrays ? 64 : 32, type: 'B' },
      { name: 'compass', arrayLength: extendedArrays ? 64 : 32, type: 'B' },
      { name: 'bossKeys', arrayLength: extendedArrays ? 64 : 32, type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 173 }) },
      { name: 'misc', arrayLength: 16, type: 'B' },
      { name: 'swordHearts', arrayLength: 4, type: 'B', if: sversion < 15 },
      { name: 'lastMap', type: 'B' },
      { name: 'lastScreen', type: 'B' },
      { name: 'maxMagic', type: sversion >= 14 ? 'H' : 'B' },
      { name: 'magic', type: sversion >= 14 ? 'H' : 'B' },
      { name: 'beamHearts', arrayLength: 4, type: 'B', if: sversion < 15 },
      { name: 'beamPercent', type: 'B', if: sversion < 15 },
      { name: 'bombRatio', type: 'B', if: sversion >= 15 },
      { name: 'bombPower', arrayLength: 4, type: sversion >= 14 ? 'H' : 'B', if: sversion < 15 },
      { name: 'hookshotLinks', type: 'B', if: sversion < 15 },
      { name: 'hookshotLength', type: 'B', if: sversion < 15 && sversion > 6 },
      { name: 'longshotLinks', type: 'B', if: sversion < 15 && sversion > 6 },
      { name: 'longshotLength', type: 'B', if: sversion < 15 && sversion > 6 },
      { name: 'msgMoreX', type: 'B' },
      { name: 'msgMorey', type: 'B' },
      { name: 'subscreen', type: 'B' },
      { name: 'startDmap', type: sversion > 10 ? 'H' : 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 173 }) },
      { name: 'linkAnimationStyle', type: 'B', if: Version.gt(version, { zeldaVersion: 0x192, build: 173 }) },
    ]);
  },
  // https://github.com/ArmageddonGames/ZeldaClassic/blob/bdac8e682ac1eda23d775dacc5e5e34b237b82c0/src/qst.cpp#L5695
  'ITEM': (reader: Reader, version: Version, sversion: number, cversion: number) => {
    let numItems;
    if (version.zeldaVersion > 0x192) {
      numItems = reader.readInt();
    } else if (version.zeldaVersion < 0x186) {
      numItems = 64;
    } else {
      numItems = 256;
    }

    const itemsJustName = readArrayFields(reader, numItems, [
      { name: 'name', type: '64s', if: sversion > 1 },
    ]);
    const itemsRest = readArrayFields(reader, numItems, [
      { name: 'tile', type: sversion > 35 ? 'I' : 'H' },
      { name: 'misc', type: 'B' },
      { name: 'csets', type: 'B' }, // ffffcccc (f:flash cset, c:cset)
      { name: 'frames', type: 'B' },
      { name: 'speed', type: 'B' },
      { name: 'delay', type: 'B' },
      { name: '_padding', type: 'B', if: version.zeldaVersion < 0x193 },
      { name: 'ltm', type: 'I' },
      { name: '_padding', type: '12s', if: version.zeldaVersion < 0x193 },

      ...(sversion > 1 ? [
        { name: 'family', type: sversion >= 31 ? 'I' : 'B' },
        { name: 'familyType', type: 'B' },
        { name: 'power', type: sversion >= 31 ? 'I' : 'B', if: sversion > 5 },
        { name: 'flags', type: sversion >= 41 ? 'I' : 'H', if: sversion > 5 },
        { name: 'flags_ITEM_GAMEDATA', type: 'B', if: sversion <= 5 },
        { name: 'script', type: 'H' },
        { name: 'count', type: 'B' },
        { name: 'amount', type: 'H' },
        { name: 'collectScript', type: 'H' },
        { name: 'setMax', type: 'H' },
        { name: 'max', type: 'H' },
        { name: 'playSound', type: 'B' },
        { name: 'initialD', arrayLength: 8, type: 'I' },
        { name: 'initialA', arrayLength: 2, type: 'B' },
      ] : []),

      ...(sversion > 4 ? [
        { name: 'flags_ITEM_EDIBLE', type: 'B', if: sversion <= 5 },

        { name: 'wpn', arrayLength: sversion >= 15 ? 10 : 4, type: 'B', if: sversion > 5 },
        { name: 'pickupHearts', type: 'B', if: sversion > 5 },
        { name: 'misc1', type: sversion >= 15 ? 'I' : 'H', if: sversion > 5 },
        { name: 'misc2', type: sversion >= 15 ? 'I' : 'H', if: sversion > 5 },
        { name: 'magic', type: 'B', if: sversion > 5 },
      ] : []),

      ...(sversion >= 12 ? [
        { name: 'misc3', type: 'H', if: sversion < 15 },
        { name: 'misc4', type: 'H', if: sversion < 15 },

        { name: 'misc3', type: 'I', if: sversion >= 15 },
        { name: 'misc4', type: 'I', if: sversion >= 15 },
        { name: 'misc5', type: 'I', if: sversion >= 15 },
        { name: 'misc6', type: 'I', if: sversion >= 15 },
        { name: 'misc7', type: 'I', if: sversion >= 15 },
        { name: 'misc8', type: 'I', if: sversion >= 15 },
        { name: 'misc9', type: 'I', if: sversion >= 15 },
        { name: 'misc10', type: 'I', if: sversion >= 15 },

        { name: 'useSound', type: 'B' },
      ] : []),

      ...(sversion >= 26 ? [
        { name: 'useWeapon', type: 'B' },
        { name: 'useDefense', type: 'B' },
        { name: 'weaponRange', type: 'I' },
        { name: 'weaponDuration', type: 'I' },
        { name: 'weaponPattern', arrayLength: 10, type: 'I' },
      ] : []),

      ...(sversion >= 27 ? [
        { name: 'duplicates', type: 'I' },
        { name: 'weaponInitialD', arrayLength: 8, type: 'I' },
        { name: 'weaponInitialA', arrayLength: 2, type: 'B' },
        { name: 'drawLayer', type: 'B' },
        { name: 'hxofs', type: 'I' },
        { name: 'hyofs', type: 'I' },
        { name: '_skip', arrayLength: 16, type: 'I' },
        { name: '_skip', arrayLength: 1, type: 'H' },
      ] : []),

      ...(sversion >= 28 ? [
        { name: 'overrideFlags', type: 'I' },
        { name: 'tileW', type: 'I' },
        { name: 'tileH', type: 'I' },
      ] : []),

      ...(sversion >= 29 ? [
        { name: 'weaponOverrideFlags', type: 'I' },
        { name: 'weaponTileW', type: 'I' },
        { name: 'weaponTileH', type: 'I' },
      ] : []),

      { name: 'pickup', type: 'I', if: sversion >= 30 },
      { name: 'pString', type: 'H', if: sversion >= 32 },
      { name: 'pickupStringFlags', type: 'H', if: sversion >= 33 },
      { name: 'costCounter', type: 'B', if: sversion >= 34 },

      ...(sversion >= 44 ? [
        { name: '_skip', arrayLength: 8 * (65 * 3 + 4), type: 'B' },
        { name: 'spriteInitialA', arrayLength: 2, type: 'B' },
        { name: 'spriteScript', type: 'H' },
      ] : []),
    ]);
    const items = itemsJustName.map((w, i) => ({ ...w, ...itemsRest[i] }));

    if (sversion <= 1) {
      items.forEach((item, i) => {
        item.name = item.name || defaultItemNames[i];
      });
    }

    return { items };
  },
};

let zc: any;
async function getQstBytes(questFilePathOrData: string | Uint8Array): Promise<Uint8Array> {
  if (!zc) {
    zc = await DecodeZCModule();
    zc.FS.mkdir('/quests');
  }

  let data;
  if (typeof questFilePathOrData === 'string') {
    const resp = await fetch(questFilePathOrData);
    const buffer = await resp.arrayBuffer();
    data = new Uint8Array(buffer);
  } else {
    data = questFilePathOrData;
  }

  // Actual path on virtual fs does not matter. Hardcoded to "/quests/input.quest"
  zc.FS.writeFile('/quests/input.qst', data);

  const read_qst_file = zc.cwrap('read_qst_file', 'number', []);
  const read_qst_file_res = read_qst_file();
  if (read_qst_file_res !== 0) throw new Error(`error: ${read_qst_file_res}`);

  return zc.FS.readFile('/quests/input.qst.dat');
}

function parseQstBytes(qstBytes: Uint8Array, debug: boolean) {
  const qstReader = new Reader(qstBytes);

  const preamble = qstReader.readStr(qstReader.find('\n'));

  const preambles = [
    'AG Zelda Classic Quest File',
    'AG ZC Enhanced Quest File',
  ];

  if (preamble === preambles[0]) {
    // WIP
    // document.body.textContent = new TextDecoder().decode(qstBytes.subarray(0, 50000));

    const data = readFields(qstReader, [
      { name: '_padding', type: '1s' },
      { name: 'zeldaVersion', type: 'H' },
      { name: 'internal', type: 'H' },
      { name: 'questNumber', type: 'B' },
      { name: 'questRules', arrayLength: 2, type: 'B' },
      { name: 'mapCount', type: 'B' },
      { name: 'strCount', type: 'B' },
      { name: 'tiles', type: 'B' },
      { name: 'midiFlags', arrayLength: 4, type: 'B' },
      { name: 'cheats', type: 'B' },
      { name: '_padding', type: '14s' },
      { name: 'moreQuestRules', arrayLength: 2, type: 'B' },
      { name: '_padding', type: '1s' },

      // ????
      { name: '_padding', type: '4s' },

      { name: 'version', type: '9s' },
      { name: 'title', type: '65s' },
      { name: 'author', type: '65s' },
      // TODO the rest
    ]);
    // console.log(data);
  }

  if (preamble !== preambles[1]) {
    throw new Error('TODO: handle ' + preamble);
  }

  qstReader.goto(qstReader.find('HDR '));

  const zcData: Record<string, any> = {
    GUY: { guys: [] },
  };
  let version: Version = { zeldaVersion: 0, build: 0 };

  while (qstReader.hasData()) {
    let [id, sversion, cversion, size] = qstReader.readStruct(structs.sectionHeader);

    // Sometimes there is garbage data between sections.
    if (!/\w{3,4}/.test(id)) {
      if (debug) console.log(`garbage section id: ${JSON.stringify(id)}, skipping ahead some bytes...`);

      const validSectionIds = Object.keys(sections);
      while (!validSectionIds.includes(id)) {
        qstReader.skip(-structs.sectionHeader.size);
        qstReader.skip(1);
        [id, sversion, cversion, size] = qstReader.readStruct(structs.sectionHeader);
      }
    }

    if (debug) console.log({ id, sversion, cversion, size });
    if (size === 0) continue;

    const sectionReader = new Reader(qstReader.read(size));

    const section = sections[id as keyof typeof sections];
    if (section !== undefined) {
      try {
        const sectionData = section(sectionReader, version, sversion, cversion);
        if (id === 'HDR ') {
          version = { zeldaVersion: sectionData.zeldaVersion, build: sectionData.build };
        }
        zcData[id.trim()] = sectionData;
        if (debug) console.log(sectionData);
      } catch (e) {
        if (debug) console.error(e);
        zcData[id.trim()] = { errors: [e] };
      }

      const remainingBytes = sectionReader.dataLeft();
      if (remainingBytes !== 0) {
        const error = `did not read all data, ${remainingBytes} bytes remaining`;
        if (debug) console.error(error);
        zcData[id.trim()] = zcData[id.trim()] || {};
        zcData[id.trim()].errors = zcData[id.trim()].errors || [];
        zcData[id.trim()].errors.push(error);
      }
    }
  }

  return zcData;
}

export async function readZCQst(questFilePathOrData: string | Uint8Array, debug = false) {
  const qstBytes = await getQstBytes(questFilePathOrData);
  const qstData = parseQstBytes(qstBytes, debug);
  return qstData;
}
