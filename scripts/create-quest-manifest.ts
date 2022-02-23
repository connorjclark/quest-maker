// yarn ts-node scripts/create-quest-manifest.ts

import glob from 'glob';
import fs from 'fs';
import puppeteer from 'puppeteer';

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

let questsMap: Map<string, QuestManifest>;

function loadQuests() {
  const quests: QuestManifest[] = JSON.parse(fs.readFileSync('data/quest-manifest.json', 'utf-8'));
  questsMap = new Map<string, QuestManifest>();
  for (const quest of quests) {
    questsMap.set(quest.urls[0], quest);
  }
}

function saveQuests() {
  const quests = [...questsMap.values()];
  const featuredQuests = [
    'BS Zelda 1st Quest',
  ];
  quests.sort((a, b) => {
    if (featuredQuests.includes(a.name) && !featuredQuests.includes(b.name)) return -1;
    if (featuredQuests.includes(b.name) && !featuredQuests.includes(a.name)) return 1;
    return 0;
  });
  fs.writeFileSync('data/quest-manifest.json', JSON.stringify(quests, null, 2));
}

async function processId(page: puppeteer.Page, id: number) {
  const questDir = `zc_quests/${id}`;
  const projectUrl = `https://www.purezc.net/index.php?page=quests&id=${id}`;

  const allImgResponses: Record<string, puppeteer.HTTPResponse> = {};
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image') {
      allImgResponses[response.url()] = response;
    }
  });

  const response = await page.goto(`https://www.purezc.net/index.php?page=quests&id=${id}`, { waitUntil: 'networkidle0' });
  if (response.status() !== 200) {
    return;
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
    const resp = allImgResponses[imagesRaw[i]];
    if (!resp) continue;

    const ext = imagesRaw[i].match(/\.(\w+)$/)[1];
    const imageUrl = `${questDir}/image${i}.${ext}`;
    fs.writeFileSync(imageUrl, await resp.buffer());
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
  questsMap.set(quest.urls[0], quest);
}

async function main() {
  loadQuests();

  // Process the quests stored in source control.
  for (const questFile of glob.sync('data/zc_quests/*/quest.json')) {
    const quest = JSON.parse(fs.readFileSync(questFile, 'utf-8'));
    questsMap.set(quest.urls[0], quest);
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const max = 768;
  for (let i = 1; i <= max; i++) {
    console.log(`processing ${i} of ${max}`);
    try {
      await processId(page, i);
    } catch (e) {
      console.error(e);
    }
    if (questsMap.size % 10 === 0) saveQuests();
  }

  saveQuests();
  await browser.close();
}

main();
