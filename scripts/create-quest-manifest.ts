// yarn ts-node scripts/create-quest-manifest.ts

import * as glob from 'glob';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';

interface QuestManifest {
  name: string;
  author: string;
  urls: string[];
  projectUrl: string;
  imageUrls: string[];
  genre: string;
  zcVersion: string;
  description: string;
  story: string;
  tipsAndCheats: string;
  credits: string;
}

async function main() {
  const quests: QuestManifest[] = [];

  // Process the quests stored in source control.
  for (const questFile of glob.sync('data/zc_quests/*/quest.json')) {
    const quest = JSON.parse(fs.readFileSync(questFile, 'utf-8'));
    quests.push(quest);
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const max = 768;
  for (let i = 1; i <= max; i++) {
    console.log(`processing ${i} of ${max}`);
    const questDir = `tmp/zc_quests/${i}`;
    const projectUrl = `https://www.purezc.net/index.php?page=quests&id=${i}`;
    const response = await page.goto(`https://www.purezc.net/index.php?page=quests&id=${i}`, { waitUntil: 'networkidle0' });

    if (response.status() !== 200) {
      continue;
    }

    const name = (await page.title()).split('-')[0].trim();
    const metadataRaw1 = await page.evaluate(() => {
      return [...document.querySelectorAll('.ipsBox_container span')].map((e) => e.textContent || '');
    });
    const metadataRaw2 = await page.evaluate(() => {
      return [...document.querySelectorAll('#item_contentBox .table_row')].map((e) => e.textContent || '');
    });

    const imagesRaw = await page.evaluate(() => {
      return [...document.querySelectorAll('#imagelist2 img')].map((e: any) => e.src);
    });

    const author = (metadataRaw1[1].match(/Creator: (.*)/ms) || [])[1].trim();
    const genre = (metadataRaw1[2].match(/Genre: (.*)/ms) || [])[1].trim();
    const zcVersion = (metadataRaw1[4].match(/ZC Version: (.*)/ms) || [])[1].trim();
    const description = metadataRaw2[1];
    const story = metadataRaw2[3];
    const tipsAndCheats = metadataRaw2[5];
    const credits = metadataRaw2[7];

    const imageUrls = [];
    for (let i = 0; i < imagesRaw.length; i++) {
      const imagePage = await page.goto(imagesRaw[i]);
      const ext = imagesRaw[i].match(/\.(\w+)$/)[1];
      const imageUrl = `${questDir}/image${i}.${ext}`;
      fs.writeFileSync(imageUrl, await imagePage.buffer());
      imageUrls.push(imageUrl);
    }

    const qstFiles = glob.sync(`${questDir}/*.qst`);
    const quest: QuestManifest = {
      name,
      author,
      urls: qstFiles,
      projectUrl,
      imageUrls,
      genre,
      zcVersion,
      description,
      story,
      tipsAndCheats,
      credits,
    };
    quests.push(quest);

    fs.writeFileSync('data/quest-manifest.json', JSON.stringify(quests, null, 2));
  }

  fs.writeFileSync('data/quest-manifest.json', JSON.stringify(quests, null, 2));
  await browser.close();
}

main();
