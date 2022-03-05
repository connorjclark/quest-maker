// yarn ts-node scripts/build.ts

import fs from 'fs';

import htmlPlugin from '@chialab/esbuild-plugin-html';
import { nodeBuiltIns } from 'esbuild-node-builtins';
import esbuild from 'esbuild';

async function buildClient() {
  const entries = [
    'src/index.html',
  ];

  await esbuild.build({
    plugins: [
      // @ts-expect-error
      htmlPlugin(),
      nodeBuiltIns({ include: ['events'] }),
      // fixPixiBundling,
    ],
    entryPoints: entries,
    entryNames: '[dir]/[name]-[hash]',
    bundle: true,
    loader: {
      '.ttf': 'file', // TODO: remove this
    },
    outdir: 'dist',
    minify: true,
    sourcemap: true,
  });

  for (const entry of entries) {
    const fileParts = entry.split('/');
    const file = `./dist/${fileParts[fileParts.length - 1]}`;
    fs.copyFileSync(file, `./dist/${fileParts[fileParts.length - 1]}`);
  }
}

buildClient();
