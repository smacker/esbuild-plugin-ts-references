const fs = require('fs');
const esbuild = require('esbuild');
const { test } = require('uvu');
const asset = require('uvu/assert');
const typescriptReferences = require('../');

const build = (entryPoints) =>
  esbuild.build({
    entryPoints: entryPoints,
    bundle: true,
    outfile: './test/output.js',
    plugins: [typescriptReferences],
  });

test('no resolution', async () => {
  await build(['./test/monorepo/package-a/src/index.ts']);

  const output = fs.readFileSync('./test/output.js', 'utf8');
  asset.fixture(
    output,
    fs.readFileSync('./test/expected/no-resolution.js', 'utf8')
  );
});

test('simple resolution', async () => {
  await build(['./test/monorepo/package-b/src/index.ts']);

  const output = fs.readFileSync('./test/output.js', 'utf8');
  asset.fixture(
    output,
    fs.readFileSync('./test/expected/simple-resolution.js', 'utf8')
  );
});

test('transitive dependency resolution', async () => {
  await build(['./test/monorepo/package-c/src/index.ts']);

  const output = fs.readFileSync('./test/output.js', 'utf8');
  asset.fixture(
    output,
    fs.readFileSync('./test/expected/transitive-resolution.js', 'utf8')
  );
});

test('mutiple entries', async () => {
  // just make sure there is no exception
  esbuild.build({
    entryPoints: [
      './test/monorepo/package-a/src/index.ts',
      './test/monorepo/package-b/src/index.ts',
    ],
    bundle: true,
    outdir: './test/output',
    plugins: [typescriptReferences],
  });
});

test('mutiple entries with entry points object', async () => {
  // just make sure there is no exception
  esbuild.build({
    entryPoints: {
      packageA: './test/monorepo/package-a/src/index.ts',
      packageB: './test/monorepo/package-b/src/index.ts',
    },
    bundle: true,
    outdir: './test/output',
    plugins: [typescriptReferences],
  });
});

test.run();
