// yarn ts-node scripts/create-quest-manifest.ts

import glob from 'glob';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { execFileSync } from 'child_process';

interface QuestManifest {
  name: string;
  author: string;
  urls: string[];
  projectUrl: string;
  videoUrl?: string;
  imageUrls: string[];
  genre: string;
  zcVersion: string;
  informationHtml: string;
  descriptionHtml: string;
  storyHtml: string;
  tipsAndCheatsHtml: string;
  creditsHtml: string;
  extraResources?: string[];
  rating: {
    score: number;
    distribution: number[];
  };
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
    '7th Quest',
    'BS Zelda 1st Quest',
  ];
  quests.sort((a, b) => {
    if (featuredQuests.includes(a.name) && !featuredQuests.includes(b.name)) return -1;
    if (featuredQuests.includes(b.name) && !featuredQuests.includes(a.name)) return 1;
    return featuredQuests.indexOf(a.name) - featuredQuests.indexOf(b.name);
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

  const nameRaw = (await page.title()).split('-')[0];
  const metadataRaw1 = await page.evaluate(() => {
    return [...document.querySelectorAll('.ipsBox_container span')].map((e) => e.textContent || '');
  });
  const html = await page.evaluate(() => {
    function clean(el: Element) {
      for (const childEl of el.querySelectorAll('*')) {
        childEl.removeAttribute('style');

        if (childEl.classList.contains('bbc_emoticon') || childEl.classList.contains('bbc_img')) {
          // https://www.purezc.net/forums/public/style_emoticons/default/icon_smile.gif
          let newText = childEl.getAttribute('alt');
          if (!newText) {
            newText = {
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_smile.gif': ':)',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_frown.gif': ':(',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_wink.gif': ';)',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_biggrin.gif': ':D',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_sweat.gif': ':/',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_sorry.gif': ':/',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_lol.gif': ':p',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_razz.gif': ':p',
              'https://www.purezc.net/forums/public/style_emoticons/default/icon_thumbsup.gif': '👍',
            }[childEl.getAttribute('src') || ''] || '';
          }
          childEl.replaceWith(newText || '');
        }
      }
    }

    function collect(el: Element) {
      clean(el);
      return el.innerHTML;
    }

    return {
      tableRows: [...document.querySelectorAll('#item_contentBox .table_row')].map(collect),
      // @ts-expect-error
      entryInfo: collect(document.querySelector('.entryInfo')),
    };
  });

  const imagesRaw = await page.evaluate(() => {
    return [...document.querySelectorAll('#imagelist2 img')]
      .map((e: any) => e.src)
      .filter(url => !url.includes('youtube'));
  });

  const videoUrl = await page.evaluate(() => {
    const el = document.querySelector('#videoPreviewBox iframe');
    if (!el) return;

    // @ts-expect-error
    return el.src;
  });

  const rating = await page.evaluate(() => {
    const el = document.querySelector('*[data-rating]');
    if (!el) {
      return {
        score: 0,
        distribution: [],
      };
    }

    return {
      score: Number(el.getAttribute('data-rating')),
      distribution: eval(el.getAttribute('data-distribution') || '').map(Number),
    };
  });

  const trim = (str: string) => str.replace(/\s+/g, ' ').trim();

  let name = trim(nameRaw);
  if (name[0] === '"' && name[name.length - 1] === '"') name = name.substring(1, name.length - 1);

  const author = trim((metadataRaw1[1].match(/Creator: (.*)/ms) || [])[1]);
  const genre = trim((metadataRaw1[2].match(/Genre: (.*)/ms) || [])[1]);
  const zcVersion = trim((metadataRaw1[4].match(/ZC Version: (.*)/ms) || [])[1]);
  const informationHtml = trim(html.entryInfo);
  const descriptionHtml = trim(html.tableRows[1]);
  const storyHtml = trim(html.tableRows[3]);
  const tipsAndCheatsHtml = trim(html.tableRows[5]);
  const creditsHtml = trim(html.tableRows[7]);

  const imageUrls = [];
  for (let i = 0; i < imagesRaw.length; i++) {
    const resp = allImgResponses[imagesRaw[i]];
    if (!resp) continue;

    const ext = imagesRaw[i].match(/\.(\w+)$/)[1];
    const imageUrl = `${questDir}/image${i}.${ext}`;
    fs.writeFileSync(`${imageUrl}`, await resp.buffer());
    imageUrls.push(imageUrl);
  }

  // Fix file names like "zc_quests/435/Eddy&#39;s Troll Day.qst"
  for (const file of glob.sync(`${questDir}/**/*.qst`, { nocase: false })) {
    const sanitized = file.replace(/&#39;|[#&;]/g, '');
    if (file !== sanitized) {
      fs.renameSync(file, sanitized);
    }
  }

  const qstFiles = glob.sync(`${questDir}/**/*.qst`, { nocase: false });
  const quest: QuestManifest = {
    name,
    author,
    urls: qstFiles,
    projectUrl,
    videoUrl,
    imageUrls,
    genre,
    zcVersion,
    informationHtml,
    descriptionHtml,
    storyHtml,
    tipsAndCheatsHtml,
    creditsHtml,
    rating,
  };
  questsMap.set(quest.urls[0], quest);
}

async function main() {
  loadQuests();

  // Process the quests stored in source control.
  for (const questFile of glob.sync('data/zc_quests/**/quest.json')) {
    const quest = JSON.parse(fs.readFileSync(questFile, 'utf-8'));
    questsMap.set(quest.urls[0], quest);
  }
  for (const questFile of glob.sync('data/zc_quests/**/quests.json')) {
    const quests = JSON.parse(fs.readFileSync(questFile, 'utf-8'));
    for (const quest of quests) {
      questsMap.set(quest.urls[0], quest);
    }
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const max = 771;
  for (let i = 1; i <= max; i++) {
    console.log(`processing ${i} of ${max}`);
    try {
      await processId(page, i);
    } catch (e) {
      console.error(e);
    }
    if (i % 10 === 0) saveQuests();
  }

  for (const quest of questsMap.values()) {
    const questDir = quest.urls[0].split('/', 2).join('/');
    const text = quest.descriptionHtml + quest.informationHtml;
    const match = text.match(/(https?:\/\/([^\s]*?)\.zip)/) || text.match(/(https?:\/\/drive\.google\.com([^\s]*))"/);
    if (!match) continue;

    let url = match[1];

    if (url === 'https://www.dropbox.com/s/31kdsjdd1n8mxt4/TLoZ%20Beginnings%20Music.zip') {
      // 404
      continue;
    }

    // Some people link directly to the mediafire zip file... and those links tend to die.
    url = {
      'http://download1855.mediafire.com/yfbcefc4vulg/641lva6riprra7j/Music.zip': 'http://www.mediafire.com/file/641lva6riprra7j/Music.zip',
      'http://download1688.mediafire.com/5nccux8bvp3g/2llbdzzq8heiuqk/Mayath+Music.zip': 'http://www.mediafire.com/file/2llbdzzq8heiuqk/Mayath+Music.zip',
    }[url] || url;

    const destZip = `tmp/music-zips/${quest.name.replace(/[^a-zA-Z\d]/g, '')}-${path.basename(url)}`;
    if (fs.existsSync(destZip)) continue;

    const host = new URL(url).host;
    const directAccessHosts = [
      'cdn.discordapp.com',
      'bloodstar.rustedlogic.net',
    ];

    if (host === 'www.mediafire.com') {
      await page.goto(url);
      url = await page.evaluate(() => {
        // @ts-expect-error
        return document.querySelector('*[aria-label="Download file"]')?.href;
      });
      if (!url) throw new Error('...');
    } else if (host === 'drive.google.com') {
      const id = new URL(url).searchParams.get('id') || (url.match(/([^\/]{20,})/) || [])[0];
      await page.goto(`https://drive.google.com/uc?export=download&id=${id}`);
      url = await page.evaluate(() => {
        // @ts-expect-error
        return document.querySelector('#downloadForm')?.action;
      });
    } else if (directAccessHosts.includes(host)) {
      // OK!
    } else if (host === 'www.dropbox.com') {
      url += '?dl=1'
    } else {
      console.log('skip', url);
      continue;
    }

    console.log('downloading:', url);
    execFileSync('bash', [
      '-c',
      `curl -L '${url}' > '${destZip}'`,
    ]);

    console.log('unzipping:', destZip, 'to:', questDir);
    execFileSync('bash', [
      '-c',
      `unzip -o -j '${destZip}' -d '${questDir}'`,
    ]);
  }

  for (const quest of questsMap.values()) {
    const questDir = quest.urls[0].split('/', 2).join('/');
    const extraResources = [];
    for (const file of glob.sync(`${questDir}/**/*.{gbs,gym,it_format,mod,mp3,nsf,ogg,s3m,spc,vgm,xm}`, { nocase: false })) {
      extraResources.push(file);
    }
    extraResources.sort();
    if (extraResources.length) quest.extraResources = extraResources;
  }

  saveQuests();
  await browser.close();
}

main();
