// yarn ts-node scripts/determine-playable-quests.ts
// Must first run: ENVIRONMENT=node sh decode_zc/build.sh

import fs from 'fs';
import { readZCQst } from '../src/read-zc-qst.js';

const questManifest = JSON.parse(fs.readFileSync('data/quest-manifest.json', 'utf-8'));

for (const questMeta of questManifest) {
  if (questMeta.urls.length === 0) {
    questMeta.playable = false;
    questMeta.error = 'no valid qst files';
    continue;
  }

  const data = new Uint8Array(fs.readFileSync(questMeta.urls[0]));
  try {
    await readZCQst(data);
    questMeta.playable = true;
    questMeta.error = undefined;
  } catch (error: any) {
    questMeta.playable = false;
    questMeta.error = error.message;
  }
}

fs.writeFileSync('data/quest-manifest.json', JSON.stringify(questManifest, null, 2));
