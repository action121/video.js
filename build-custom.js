/* eslint-disable no-console, no-inline-comments, require-jsdoc, no-unused-vars */

const rollup = require('rollup');
const path = require('path');
const fs = require('fs');
const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const json = require('rollup-plugin-json');
const ignore = require('rollup-plugin-ignore');
const alias = require('rollup-plugin-alias');
const externalGlobals = require('rollup-plugin-external-globals');
const svg = require('rollup-plugin-svg');
const _ = require('lodash');

// 读取package.json获取版本信息
const pkg = require('./package.json');
const compiledLicense = _.template(fs.readFileSync('./build/license-header.txt', 'utf8'));
const bannerData = _.pick(pkg, ['version', 'copyright']);
const banner = compiledLicense(Object.assign({includesVtt: true}, bannerData));

// 功能模块配置
const FEATURES = {
  // 核心功能
  core: {
    description: '核心播放器功能',
    required: true,
    files: ['src/js/video.js']
  },
  // HLS支持
  hls: {
    description: 'HLS流媒体支持',
    required: false,
    files: ['@videojs/http-streaming']
  },
  // 质量级别选择
  qualityLevels: {
    description: '质量级别选择功能',
    required: false,
    files: ['videojs-contrib-quality-levels']
  },
  // 字幕支持
  vtt: {
    description: 'VTT字幕支持',
    required: false,
    files: ['videojs-vtt.js']
  }
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--features') {
      const feature = args[++i];

      options.features = feature ? feature.split(',') : [];
    } else if (arg === '--output') {
      options.output = args[++i];
    } else if (arg === '--format') {
      options.format = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

function showHelp() {
  const featuresList = Object.entries(FEATURES)
    .map(([key, feature]) => `  ${key}${feature.required ? ' (必需)' : ''} - ${feature.description}`)
    .join('\n');

  console.log(`
Video.js 自定义构建工具

用法: node build-custom.js [选项]

选项:
  --features <features>    要包含的功能，用逗号分隔
  --output <file>          输出文件名
  --format <format>        输出格式 (umd, es, cjs)
  --help, -h              显示帮助信息

可用功能:
${featuresList}

示例:
  node build-custom.js --features core,hls --output dist/video-custom.js
  node build-custom.js --features core --format es --output dist/video-core.es.js
`);
}

// 生成入口文件
function generateEntryFile(features) {
  const imports = [];
  const exports = [];

  // 添加核心功能
  imports.push("import videojs from './src/js/video';");
  exports.push('export default videojs;');

  // 添加可选功能
  if (features.includes('hls')) {
    imports.push("import '@videojs/http-streaming';");
  }

  if (features.includes('qualityLevels')) {
    imports.push("import 'videojs-contrib-quality-levels';");
  }

  const entryContent = imports.join('\n') + '\n' + exports.join('\n');

  // 写入临时入口文件
  const entryFile = 'temp-entry.js';

  fs.writeFileSync(entryFile, entryContent);

  return entryFile;
}

// 构建配置
function createRollupConfig(entryFile, options) {
  const config = {
    input: entryFile,
    output: {
      format: options.format || 'umd',
      file: options.output || 'dist/video-custom.js',
      name: 'videojs',
      banner
    },
    external: [],
    plugins: [
      ignore(['videojs-vtt.js']),
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
        exclude: 'node_modules/**(!http-streaming)',
        compact: false,
        presets: [
          ['@babel/preset-env', {
            targets: [
              'last 3 major versions',
              'Firefox ESR',
              'Chrome >= 53',
              'not dead',
              'not ie 11',
              'not baidu 7',
              'not and_qq 11',
              'not and_uc 12',
              'not op_mini all'
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

  return config;
}

// 主构建函数
async function build(options) {
  try {
    console.log('开始自定义构建...');
    console.log('包含功能:', options.features.join(', '));

    // 验证必需功能
    const requiredFeatures = Object.entries(FEATURES)
      .filter(([key, feature]) => feature.required)
      .map(([key]) => key);

    for (const required of requiredFeatures) {
      if (!options.features.includes(required)) {
        options.features.unshift(required);
        console.log(`自动添加必需功能: ${required}`);
      }
    }

    // 生成入口文件
    const entryFile = generateEntryFile(options.features);

    // 创建构建配置
    const config = createRollupConfig(entryFile, options);

    // 执行构建
    const bundle = await rollup.rollup(config);

    await bundle.write(config.output);

    // 清理临时文件
    fs.unlinkSync(entryFile);

    console.log(`构建完成: ${config.output.file}`);

    // 显示文件大小
    const stats = fs.statSync(config.output.file);
    const sizeInKB = (stats.size / 1024).toFixed(2);

    console.log(`文件大小: ${sizeInKB} KB`);

  } catch (error) {
    console.error('构建失败:', error);
    process.exit(1);
  }
}

// 主程序
function main() {
  const options = parseArgs();

  if (options.features && options.features.length > 0) {
    build(options);
  } else {
    console.log('使用默认配置构建...');
    build({
      features: ['core', 'hls', 'qualityLevels', 'vtt'],
      output: 'dist/video-custom.js'
    });
  }
}

main();
