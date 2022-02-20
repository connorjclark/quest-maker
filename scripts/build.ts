// yarn ts-node build/build.ts

// import fs from 'fs';
// import path from 'path';

import htmlPlugin from '@chialab/esbuild-plugin-html';
import {NodeGlobalsPolyfillPlugin} from '@esbuild-plugins/node-globals-polyfill';
import esbuild from 'esbuild';
// import {nodeBuiltIns} from 'esbuild-node-builtins';
// import glob from 'glob';

async function build() {
  await esbuild.build({
    plugins: [
      // @ts-expect-error
      htmlPlugin(),
      // fixPixiBundling,
    ],
    entryPoints: ['src/index.html'],
    entryNames: '[dir]/[name]-[hash]',
    bundle: true,
    loader: {
      '.ttf': 'file', // TODO: remove this
    },
    // define: {
    //   'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
    // },
    outdir: 'dist',
    minify: true,
    sourcemap: true,
  });
}

build();
