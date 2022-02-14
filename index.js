const fs = require('fs');
const path = require('path');

const resolveRefPackages = (entrypoint) => {
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
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  return (tsconfig.references || []).reduce((acc, r) => {
    const refPath = path.resolve(baseDir, r.path);
    const refPackage = JSON.parse(
      fs.readFileSync(path.join(refPath, 'package.json'), 'utf8')
    );
    const refTsconfig = JSON.parse(
      fs.readFileSync(path.join(refPath, 'tsconfig.json'), 'utf8')
    );

    acc[refPackage.name] = path.resolve(
      refPath,
      refTsconfig.compilerOptions.rootDir
    );
    return acc;
  }, {});
};

const tsReferences = {
  name: 'typescript-references',
  setup(build) {
    const refPackages = build.initialOptions.entryPoints.reduce(
      (acc, entrypoint) => {
        return Object.assign(acc, resolveRefPackages(entrypoint));
      },
      {}
    );

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
            file = './' + package.replace(name + '/', '');
            package = name;
            break;
          }
        }
      }

      const result = await build.resolve(file, {
        resolveDir: refPackages[package],
      });
      if (result.errors.length > 0) {
        return { errors: result.errors };
      }

      return { path: result.path };
    });
  },
};

module.exports = tsReferences;
