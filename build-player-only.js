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

// 播放器专用构建配置
const playerOnlyConfig = {
  input: 'src/js/video.js', // 只使用核心文件
  output: {
    format: 'umd',
    file: 'dist/video-player-only.js',
    name: 'videojs',
    banner
  },
  external: [],
  plugins: [
    // 忽略VTT字幕支持
    {
      name: 'ignore-vtt',
      resolveId(source) {
        if (source === 'videojs-vtt.js') {
          return false;
        }
        return null;
      }
    },
    // 忽略HLS支持
    {
      name: 'ignore-hls',
      resolveId(source) {
        if (source === '@videojs/http-streaming') {
          return false;
        }
        return null;
      }
    },
    // 忽略质量级别选择
    {
      name: 'ignore-quality-levels',
      resolveId(source) {
        if (source === 'videojs-contrib-quality-levels') {
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

async function buildPlayerOnly() {
  try {
    console.log('开始构建播放器专用版本...');
    console.log('功能: 只保留播放功能，默认英语语言，无字幕支持');

    // 执行构建
    const bundle = await rollup.rollup(playerOnlyConfig);

    await bundle.write(playerOnlyConfig.output);

    console.log(`构建完成: ${playerOnlyConfig.output.file}`);

    // 显示文件大小
    const stats = fs.statSync(playerOnlyConfig.output.file);
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

    // 与核心版本比较
    if (fs.existsSync('dist/alt/video.core.js')) {
      const coreStats = fs.statSync('dist/alt/video.core.js');
      const coreSizeInKB = (coreStats.size / 1024).toFixed(2);
      const reduction = ((1 - stats.size / coreStats.size) * 100).toFixed(1);

      console.log(`相比核心版本减小: ${reduction}% (${coreSizeInKB} KB -> ${sizeInKB} KB)`);
    }

    console.log('\n✅ 构建成功！');
    console.log('📝 包含功能:');
    console.log('   - 基本视频播放');
    console.log('   - 播放控制栏');
    console.log('   - 音量控制');
    console.log('   - 全屏支持');
    console.log('   - 默认英语语言');
    console.log('   - 无字幕支持');
    console.log('   - 无HLS支持');
    console.log('   - 无质量级别选择');

  } catch (error) {
    console.error('构建失败:', error);
    process.exit(1);
  }
}

buildPlayerOnly();
