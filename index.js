const fs = require('fs');
const path = require('path');

// regexp is taken from https://github.com/tarkh/json-easy-strip
const commentsRegexp = /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g;

const parseJSONFile = (filePath, stripComments) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (stripComments) {
    content = content.replace(commentsRegexp, (m, g) => (g ? '' : m));
  }
  return JSON.parse(content);
};

const replacePrefix = (input, searchValue, replaceValue) => {
  if (input.startsWith(searchValue)) {
    return replaceValue + input.slice(searchValue.length);
  }
  return input;
};

const resolveRefPackages = (baseDir, tsconfig, processedDirs) => {
  if (processedDirs.includes(baseDir)) {
    return {};
  }

  processedDirs.push(baseDir);

  return (tsconfig.references || []).reduce((acc, r) => {
    const refPath = path.resolve(baseDir, r.path);
    const refPackage = parseJSONFile(path.join(refPath, 'package.json'));
    const refTsconfig = parseJSONFile(
      path.join(refPath, 'tsconfig.json'),
      true
    );
    if (!refTsconfig.compilerOptions?.rootDir) {
      throw new Error(
        `rootDir is not defined in tsconfig.json of package '${refPackage.name}'`
      );
    }

    acc[refPackage.name] = {
      rootDir: refTsconfig.compilerOptions.rootDir,
      resolveDir: path.resolve(refPath, refTsconfig.compilerOptions.rootDir),
    };

    Object.assign(acc, resolveRefPackages(refPath, refTsconfig, processedDirs));

    return acc;
  }, {});
};

const resolveEntrypoint = (entrypoint) => {
  // look for the closest tsconfig
  const rootDir = path.parse(entrypoint).root;
  let baseDir = path.dirname(entrypoint);
  let tsconfigPath;
  while (true) {
    tsconfigPath = path.join(baseDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      break;
    }
    if (baseDir === rootDir) {
      throw new Error('tsconfig.json not found');
    }

    baseDir = path.resolve(baseDir, '..');
  }

  // build map of {'package-name': '/absolute/path'}
  const tsconfig = parseJSONFile(tsconfigPath, true);
  // avoid infinite loop for circular dependencies
  const processedDirs = [];
  return resolveRefPackages(baseDir, tsconfig, processedDirs);
};

const tsReferences = {
  name: 'typescript-references',
  setup(build) {
    // Pull out entry points, which can either be specified as an array or an object with custom output paths
    // https://esbuild.github.io/api/#entry-points
    const entryPointOptions = build.initialOptions.entryPoints;
    const entryPoints = Array.isArray(entryPointOptions)
      ? entryPointOptions
      : Object.values(entryPointOptions);
    const refPackages = entryPoints.reduce((acc, entrypoint) => {
      return Object.assign(acc, resolveEntrypoint(entrypoint));
    }, {});

    // resolve packages
    const packageNames = Object.keys(refPackages);
    if (!packageNames.length) {
      return;
    }

    const filter = new RegExp(`^(${packageNames.join('|')})`);
    build.onResolve({ filter }, async (args) => {
      let package = args.path;
      let file = './index.ts';
      if (!refPackages[package]) {
        for (const name of packageNames) {
          if (package.startsWith(name)) {
            file = './' + package.slice(name.length + 1);
            package = name;
            break;
          }
        }
      }
      file = replacePrefix(file, refPackages[package].rootDir, './');

      const result = await build.resolve(file, {
        resolveDir: refPackages[package].resolveDir,
        kind: 'entry-point'
      });
      if (result.errors.length > 0) {
        return { errors: result.errors };
      }

      return { path: result.path };
    });
  },
};

module.exports = tsReferences;
