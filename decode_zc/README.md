Builds a WASM library for decoding Zelda Classic .qst files.

Based on an older python prototype: https://github.com/connorjclark/zquest-data

## Building

```sh
sh decode_zc/download-deps.sh # only need to do this once
sh decode_zc/build.sh
```

## Testing

```sh
# be in root project directory!

# Download some quests (can cancel at any time, don't need all).
sh scripts/download-quests.sh
python3 -m http.server 8001
# Run this or just navigate in browser manually.
open http://localhost:8001/decode_zc/?quest=/tmp/zc_quests/1/OcarinaOfPower.qst
open http://localhost:8001/decode_zc/?quest=/tmp/zc_quests/204/Lost_Isle.qst
```
