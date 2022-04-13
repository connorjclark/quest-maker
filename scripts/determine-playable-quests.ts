// yarn ts-node scripts/determine-playable-quests.ts
// Must first run: ENVIRONMENT=node sh decode_zc/build.sh

import fs from 'fs';
import { convertZCQst } from '../src/convert-zc-qst.js';
import { readZCQst } from '../src/read-zc-qst.js';

const questManifest = JSON.parse(fs.readFileSync('data/quest-manifest.json', 'utf-8'));

for (let i = 0; i < questManifest.length; i++) {
  const questMeta = questManifest[i];
  console.log(`processing ${i + 1} of ${questManifest.length}`);

  if (questMeta.urls.length === 0) {
    questMeta.playable = false;
    questMeta.errors = ['no valid qst files'];
    continue;
  }

  for (const url of questMeta.urls) {
    const data = new Uint8Array(fs.readFileSync(url));
    try {
      const qstData = await readZCQst(data);
      const result = await convertZCQst(qstData);
      questMeta.playable = result.errors.length === 0;
      questMeta.errors = result.errors.length ? result.errors : undefined;
    } catch (error: any) {
      questMeta.playable = false;
      questMeta.errors = [error.message];
    }
  }
}

fs.writeFileSync('data/quest-manifest.json', JSON.stringify(questManifest, null, 2));
