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
  extraResources?: string[];
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

  // TODO: fix qst files names like "zc_quests/435/Eddy&#39;s Troll Day.qst"

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

  addExtraResources();

  saveQuests();
  await browser.close();
}

function addExtraResources() {
  // https://www.purezc.net/index.php?page=quests&id=731
  const ggQuest = questsMap.get('zc_quests/731/GoGollab_1_FunnyEdition.qst');
  if (!ggQuest) throw new Error();

  // https://drive.google.com/file/d/1h73PdVrcy0XQX403AlLDIMrHrMBVPMfd/view
  ggQuest.extraResources = [
    'GG_AGNBattle.ogg',
    'GG_Dimentio.ogg',
    'GG_LondomHouse.ogg',
    'GG_ToramCave.ogg',
    'GG_TrainLWT.ogg',
    'GG_TrainWMB1.ogg',
    'GG_Archipelago.ogg',
    'GG_EdgelordLabs.ogg',
    'GG_MansionTheme.ogg',
    'GG_ToramValley.ogg',
    'GG_TrainMindGap.ogg',
    'GG_TrainWMB2.ogg',
    'GG_Asteroid.ogg',
    'GG_Elysium.ogg',
    'GG_MathsHell.ogg',
    'GG_TrainBFT1.ogg',
    'GG_TrainPlatform1.ogg',
    'GG_TrainWOK1.ogg',
    'GG_Australia.ogg',
    'GG_FinalA.ogg',
    'GG_Necropolis.ogg',
    'GG_TrainBFT2.ogg',
    'GG_TrainPlatform2.ogg',
    'GG_TrainWOK2.ogg',
    'GG_BasiliskIsle.ogg',
    'GG_FinalFinalDungeon.ogg',
    'GG_Nostalgia.ogg',
    'GG_TrainBMR1.ogg',
    'GG_TrainSLH1.ogg',
    'GG_TrainWYB1.ogg',
    'GG_BooDance.ogg',
    'GG_FrostFlameFire.ogg',
    'GG_PathOfFailures.ogg',
    'GG_TrainBMR2.ogg',
    'GG_TrainSLH2.ogg',
    'GG_TrainWYB2.ogg',
    'GG_Boss.ogg',
    'GG_FrostFlameIce.ogg',
    'GG_PotumVillage.ogg',
    'GG_TrainCJT1.ogg',
    'GG_TrainSRB1.ogg',
    'GG_Underwater.ogg',
    'GG_Boss1.ogg',
    'GG_GeneralKahrin.ogg',
    'GG_Prison.ogg',
    'GG_TrainCJT2.ogg',
    'GG_TrainSRB2.ogg',
    'GG_UniExterior.ogg',
    'GG_Boss2.ogg',
    'GG_GhostBoss.ogg',
    'GG_Rescue.ogg',
    'GG_TrainDest1.ogg',
    'GG_TrainSSI1.ogg',
    'GG_ViridiBoss.ogg',
    'GG_Cancella.ogg',
    'GG_InsidetheShip.ogg',
    'GG_Rouxls.ogg',
    'GG_TrainDest2.ogg',
    'GG_TrainSSI2.ogg',
    'GG_ViridiCaves.ogg',
    'GG_Card.ogg',
    'GG_Intro.ogg',
    'GG_Rouxls2.ogg',
    'GG_TrainERL1.ogg',
    'GG_TrainStepDown.ogg',
    'GG_ViridiForest.ogg',
    'GG_Casino.ogg',
    'GG_ItsShowtime.ogg',
    'GG_ShadowBattle.ogg',
    'GG_TrainERL2.ogg',
    'GG_TrainVDT.ogg',
    'GG_ViridiTown.ogg',
    'GG_Caves.ogg',
    'GG_KahrinKeep.ogg',
    'GG_Shane.ogg',
    'GG_TrainESH1.ogg',
    'GG_TrainVXH1.ogg',
    'GG_Wisp.ogg',
    'GG_CursedKnees.ogg',
    'GG_Keese.ogg',
    'GG_SkyTower.ogg',
    'GG_TrainESH2.ogg',
    'GG_TrainVXH2.ogg',
    'GG_Wisp2.ogg',
    'GG_Darkest.ogg',
    'GG_Khroslands.ogg',
    'GG_SpiderNest.ogg',
    'GG_TrainFor1.ogg',
    'GG_TrainWBF1.ogg',
    'GG_WitheredLeaf.ogg',
    'GG_DeimonCorpGo!.ogg',
    'GG_LabExterior.ogg',
    'GG_Starlight.ogg',
    'GG_TrainFor2.ogg',
    'GG_TrainWBF2.ogg',
    'GG_WyvernVillage.ogg',
    'GG_DeimonLabs.ogg',
    'GG_Lobby.ogg',
    'GG_TBT_Final.ogg',
    'GG_TrainHER1.ogg',
    'GG_TrainWLT1.ogg',
    'GG_Desert.ogg',
    'GG_Londom.ogg',
    'GG_ToramCastle.ogg',
    'GG_TrainHER2.ogg',
    'GG_TrainWLT2.ogg',
  ].map(r => `zc_quests/731/${r}`);
}

main();
