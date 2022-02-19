/*
  Decodes a ZeldaClassic .qst file.

  A qst file is encoded in two layers.
  1) The top layer is from Zelda Classic. It is defined by the method decode_file_007.
     [0-24]    Preamble "Zelda Classic Quest File"
     [25-28]   Initial decoding seed value.
     [29-X]    Allegro-encoded payload (AKA "packed" file)
     [last 4]  Checksum
  2) The bottom layer is a "compressed packed file" from Allegro 4. The entire payload
     is XOR'd with a password. Once that is done, the first four bytes are "slh!", followed
     by a lzss compressed representation of the payload.

  Helpful links:
  - https://www.allegro.cc/forums/thread/479372
  - decode_file_007 https://github.com/ArmageddonGames/ZeldaClassic/blob/023dd17eaf6a969f47650cb6591cedd0baeaab64/src/zsys.cpp#L492
*/

#include <stdbool.h>
#include <stdio.h>
#include <allegro/file.h>
#include <emscripten.h>

#define ENC_METHOD_MAX 5

static int32_t seed = 0;
static int32_t enc_mask[ENC_METHOD_MAX] = {0x4C358938, 0x91B2A2D1, 0x4A7C1B87, 0xF93941E6, 0xFD095E94};
static int32_t pvalue[ENC_METHOD_MAX] = {0x62E9, 0x7D14, 0x1A82, 0x02BB, 0xE09C};
static int32_t qvalue[ENC_METHOD_MAX] = {0x3619, 0xA26B, 0xF03C, 0x7B12, 0x4E8F};
static char datapwd[8] = {('l' + 11), ('o' + 22), ('n' + 33), ('g' + 44), ('t' + 55), ('a' + 66), ('n' + 77), (0 + 88)};

bool has_resolved_pwd = false;
void resolve_password(char *pwd)
{
  if (has_resolved_pwd) return;

  for(int i=0; i<8; i++)
    pwd[i]-=(i+1)*11;
  has_resolved_pwd = true;
}

int rand_007(int method)
{
  int16_t BX = seed >> 8;
  int16_t CX = (seed & 0xFF) << 8;
  int8_t AL = seed >> 24;
  int8_t C = AL >> 7;
  int8_t D = BX >> 15;
  AL <<= 1;
  BX = (BX << 1) | C;
  CX = (CX << 1) | D;
  CX += seed & 0xFFFF;
  BX += (seed >> 16) + C;
  //  CX += 0x62E9;
  //  BX += 0x3619 + D;
  CX += pvalue[method];
  BX += qvalue[method] + D;
  seed = (BX << 16) + CX;
  return (CX << 16) + BX;
}

PACKFILE *pack_fopen_password(const char *filename, const char *mode, const char *password) {
  resolve_password(datapwd);
	packfile_password(password);
	PACKFILE *new_pf = pack_fopen(filename, mode);
	packfile_password("");
	return new_pf;
}

short fget_2byteint(FILE* f) {
  int byte1 = fgetc(f);
  int byte2 = fgetc(f);
  return (byte1 << 8) + byte2;
}

int fget_4byteint(FILE* f) {
  int byte1 = fgetc(f);
  int byte2 = fgetc(f);
  int byte3 = fgetc(f);
  int byte4 = fgetc(f);
  return (byte1 << 24) + (byte2 << 16) + (byte3 << 8) + byte4;
}

int decode(const char *qst_file, const char *destfname, int32_t method)
{
  const char *preamble = "Zelda Classic Quest File";
  int c;

  FILE* f = fopen(qst_file, "r");
  fseek(f, 0, SEEK_END);
  uint64_t size = ftell(f);
  fseek(f, 0, SEEK_SET);
  
  // First check that the file starts with the correct preamble.
  for (int i = 0; preamble[i]; i++) {
    c = fgetc(f);
    if (c != preamble[i]) {
      return 1;
    }
  }

  // Get the seed value used to decode the top layer of encoding.
  seed = fget_4byteint(f);
  seed ^= enc_mask[method];

  // 4 bytes for seed, 4 bytes for checksum
  size -= 8;
  size -= strlen(preamble);

  FILE* packfile_data = fopen("/tmp/packfile_data", "w");
  bool tog = false;
  int r = 0;
  short c1 = 0;
  short c2 = 0;
  for (int i = 0; i < size; i++) {
    c = fgetc(f);
    if (c == EOF) {
      // Should never happen.
      return 2;
    }

    if (tog)
    {
      c -= r;
    }
    else
    {
      r = rand_007(method);
      c ^= r;
    }

    tog = !tog;

    c &= 255;
    c1 += c;
    c2 = (c2 << 4) + (c2 >> 12) + c;
    fputc(c, packfile_data);
  }

  // Checksums.
  short check1 = fget_2byteint(f);
  short check2 = fget_2byteint(f);
  r = rand_007(method);
  check1 ^= r;
  check2 -= r;
  check1 &= 0xFFFF;
  check2 &= 0xFFFF;
  if (check1 != c1 || check2 != c2) {
    return 3;
  }

  fclose(f);
  fclose(packfile_data);

  struct PACKFILE *packfile = pack_fopen_password("/tmp/packfile_data", F_READ_PACKED, datapwd);
  f = fopen("/quests/input.qst.dat", "w");
  while ((c = pack_getc(packfile)) != EOF) {
    fputc(c, f);
  }
  fclose(f);

  return 0;
}

EMSCRIPTEN_KEEPALIVE
int read_qst_file() {
  const char* qstpath = "/quests/input.qst";

  for (int32_t method = 4; method >= 0; method--) {
    int result = decode(qstpath, "/quests/input.qst.dat", method);
    if (result == 0) {
      // All good!
      return 0;
    }

    if (result == 3) {
      // Bad method.
      continue;
    }

    // Fatal error.
    return result;
  }

  return -1;
}
