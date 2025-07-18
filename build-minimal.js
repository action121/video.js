/* eslint-disable no-console, no-inline-comments, require-jsdoc, no-unused-vars */

const rollup = require('rollup');
const path = require('path');
const fs = require('fs');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const externalGlobals = require('rollup-plugin-external-globals');
const svg = require('rollup-plugin-svg');
const alias = require('rollup-plugin-alias');
const _ = require('lodash');

// 读取package.json获取版本信息
const pkg = require('./package.json');
const compiledLicense = _.template(fs.readFileSync('./build/license-header.txt', 'utf8'));
const bannerData = _.pick(pkg, ['version', 'copyright']);
const banner = compiledLicense(Object.assign({includesVtt: false}, bannerData));

// 最小化构建配置
const minimalConfig = {
  input: 'src/js/video.js', // 只使用核心文件
  output: {
    format: 'umd',
    file: 'dist/video-minimal.js',
    name: 'videojs',
    banner
  },
  external: [],
  plugins: [
    // 忽略VTT支持
    {
      name: 'ignore-vtt',
      resolveId(source) {
        if (source === 'videojs-vtt.js') {
          return false;
        }
        return null;
      }
    },
    alias({
      'video.js': path.resolve(__dirname, './src/js/video.js')
    }),
    resolve({
      mainFields: ['jsnext:main', 'module', 'main'],
      browser: true
    }),
    json(),
    externalGlobals({
      'global': 'window',
      'global/window': 'window',
      'global/document': 'document'
    }),
    commonjs({
      sourceMap: false
    }),
    babel({
      runtimeHelpers: true,
      babelrc: false,
      exclude: 'node_modules/**',
      compact: true, // 启用压缩
      presets: [
        ['@babel/preset-env', {
          targets: [
            'last 2 versions',
            'Chrome >= 60',
            'Firefox >= 60',
            'Safari >= 12',
            'Edge >= 79'
          ],
          bugfixes: true,
          loose: true,
          modules: false
        }]
      ],
      plugins: [
        ['@babel/plugin-transform-runtime', {regenerator: false}]
      ]
    }),
    svg()
  ]
};

async function buildMinimal() {
  try {
    console.log('开始构建最小化版本...');

    // 执行构建
    const bundle = await rollup.rollup(minimalConfig);

    await bundle.write(minimalConfig.output);

    console.log(`构建完成: ${minimalConfig.output.file}`);

    // 显示文件大小
    const stats = fs.statSync(minimalConfig.output.file);
    const sizeInKB = (stats.size / 1024).toFixed(2);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`文件大小: ${sizeInKB} KB (${sizeInMB} MB)`);

    // 与完整版本比较
    if (fs.existsSync('dist/video.js')) {
      const fullStats = fs.statSync('dist/video.js');
      const fullSizeInKB = (fullStats.size / 1024).toFixed(2);
      const reduction = ((1 - stats.size / fullStats.size) * 100).toFixed(1);

      console.log(`相比完整版本减小: ${reduction}% (${fullSizeInKB} KB -> ${sizeInKB} KB)`);
    }

  } catch (error) {
    console.error('构建失败:', error);
    process.exit(1);
  }
}

buildMinimal();
