const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const childprocess = require('child_process');
const prompt = inquirer.createPromptModule();

prompt([{
  type: 'input',
  name: 'project',
  message: '请输入项目名称'
}]).then(data => {
  const dir = createProjectDir(data.project);
  createTypeScriptConfigFile(dir);
  createPackageFile(dir, data.project);
  createRollup(dir);
  createReadme(dir, data.project);
  const src = createDir(dir, 'src');
  const test = createDir(dir, '__tests__');
  createIndexFile(src, data.project);
  createTestFile(test, data.project);
  childprocess.spawn('lerna', ['bootstrap'], {
    stdio: 'inherit'
  });
});

function createProjectDir(name) {
  const dir = path.resolve(process.cwd(), 'packages', name);
  fs.mkdirSync(dir);
  return dir;
}

function createTypeScriptConfigFile(dir) {
  const template = {
    "extends": "../../tsconfig.json",
    "extendsExact": true,
    "compilerOptions": {
      "declaration": true,
      "outDir": "dist",
    },
    "include": ["src"]
  }
  fs.writeFileSync(path.resolve(dir, 'tsconfig.json'), JSON.stringify(template, null, 2), 'utf8');
}

function createPackageFile(dir, project) {
  const template = {
    "name": "@typeclient/" + project,
    "version": "1.0.0",
    "description": "typeclient " + project,
    "author": "",
    "homepage": "https://github.com/flowxjs/TypeClient",
    "license": "MIT",
    "main": "dist/index.js",
    "module": "dist/index.es.js",
    "directories": {
      "lib": "src",
      "test": "__tests__"
    },
    "files": [
      "dist"
    ],
    "scripts": {
      "build": "rollup -c"
    },
    "publishConfig": {
      "access": "public"
    }
  }
  fs.writeFileSync(path.resolve(dir, 'package.json'), JSON.stringify(template, null, 2), 'utf8');
}

function createReadme(dir, project) {
  template = `# \`${project}\`

  > TODO: description
  
  ## Usage
  
  \`\`\`
  const container = require('@typeclient/${project}');
  
  // TODO: DEMONSTRATE API
  \`\`\``;
  fs.writeFileSync(path.resolve(dir, 'README.md'), template, 'utf8');
}

function createDir(dir, name) {
  const _dir = path.resolve(dir, name);
  fs.mkdirSync(_dir);
  return _dir;
}

function createIndexFile(src, project) {
  const name = project[0].toUpperCase() + project.substring(1);
  fs.writeFileSync(path.resolve(src, 'index.ts'), `export const abc = 1;`, 'utf8');
}

function createTestFile(test, project) {
  fs.writeFileSync(path.resolve(test, project + '.test.ts'), `import * as core from '../src';

  describe('core', () => {
      it('needs tests');
  });
  `, 'utf8');
}

function createRollup(dir) {
  const template = `import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named'
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named'
    },
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
plugins: [
    typescript({
      typescript: require('typescript'),
    }),
  ],
}`;
  fs.writeFileSync(path.resolve(dir, 'rollup.config.js'), template, 'utf8');
}