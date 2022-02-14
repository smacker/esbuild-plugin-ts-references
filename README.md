# esbuild-plugin-ts-references

[esbuild](https://github.com/evanw/esbuild) plugin for [Typescript references](https://www.typescriptlang.org/docs/handbook/project-references.html).

## Rationale

A common approach for monorepos is yarn/npm/pnpm workspaces + typescript references.

While it works in VSCode and using `tsc --build`, esbuild doesn't resolve such references automatically. The [feature request](https://github.com/evanw/esbuild/issues/1250) to add support for it was closed as it is not in the scope of the bundler and creation of a plugin was suggested.

This is *the* plugin.

## Installation

```sh
npm install --save-dev esbuild-plugin-ts-references
```

## Usage

Define plugin in the `plugins` section of esbuild config like this:

```js
const esbuild = require('esbuild');
const tsReferences = require('esbuild-plugin-ts-references');

esbuild.build({
  // ...
  plugins: [tsReferences]
});
```

## Implementation details

Currently the algorithm to resolve the references is very simple (but it works for me):

- Find the closest `tsconfig.json` to the build target
- Resolve `package.json` and `tsconfig.json` of references
- Map package name from `package.json` to `rootDir` from `tsconfig.json`
- Profit!
