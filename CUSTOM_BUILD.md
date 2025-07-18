# Video.js 定制构建指南

本指南介绍如何定制 Video.js 的构建，以只保留必需的功能，从而减小文件大小。

## 构建版本对比

| 版本     | 文件大小  | 包含功能     | 适用场景      |
| ------ | ----- | -------- | --------- |
| 完整版本   | 2.3MB | 所有功能     | 需要完整功能的项目 |
| 核心版本   | 959KB | 核心播放器功能  | 只需要基本播放功能 |
| 最小化版本  | 842KB | 核心功能，无插件 | 轻量级应用     |
| 无VTT版本 | 902KB | 无字幕支持    | 不需要字幕的项目  |

## 方案1：使用现有构建版本

### 1. 构建所有版本

```bash
npm run build
```

### 2. 选择合适的版本

* **完整版本**: `dist/video.js` (2.3MB)
* **核心版本**: `dist/alt/video.core.js` (959KB)
* **无VTT版本**: `dist/alt/video.novtt.js` (2.2MB)
* **最小化版本**: `dist/alt/video.core.novtt.js` (902KB)

## 方案2：使用自定义构建脚本

### 1. 构建最小化版本

```bash
node build-minimal.js
```

生成文件: `dist/video-minimal.js` (842KB)

### 2. 使用自定义构建工具

```bash
# 只包含核心功能
node build-custom.js --features core --output dist/video-core.js

# 包含核心和HLS支持
node build-custom.js --features core,hls --output dist/video-hls.js

# 包含所有功能
node build-custom.js --features core,hls,qualityLevels,vtt --output dist/video-full.js

# 生成ES模块格式
node build-custom.js --features core,hls --format es --output dist/video-core.es.js
```

## 方案3：修改 Rollup 配置

### 1. 创建自定义 Rollup 配置

复制 `rollup.config.js` 并修改：

```javascript
// 自定义配置示例
export default cliargs => [
  {
    input: 'src/js/video.js', // 只使用核心文件
    output: {
      format: 'umd',
      file: 'dist/video-custom.js',
      name: 'videojs',
      banner
    },
    external: [],
    plugins: [
      // 忽略不需要的模块
      ignore(['videojs-vtt.js', '@videojs/http-streaming']),
      // ... 其他插件
    ]
  }
];
```

### 2. 运行自定义构建

```bash
rollup -c custom-rollup.config.js
```

## 功能模块说明

### 核心功能 (core)

* **必需**: 是
* **大小**: ~842KB
* **功能**: 基本视频播放、控制栏、事件系统

### HLS支持 (hls)

* **必需**: 否
* **大小**: ~1.5MB
* **功能**: HLS流媒体播放支持

### 质量级别选择 (qualityLevels)

* **必需**: 否
* **大小**: ~50KB
* **功能**: 多质量级别切换

### VTT字幕支持 (vtt)

* **必需**: 否
* **大小**: ~100KB
* **功能**: WebVTT字幕显示

## 优化建议

### 1. 按需选择功能

根据项目需求选择功能：

* 只需要基本播放：使用核心版本
* 需要HLS支持：添加hls功能
* 需要字幕：添加vtt功能
* 需要质量切换：添加qualityLevels功能

### 2. 代码分割

对于大型应用，考虑使用代码分割：

```javascript
// 动态加载HLS支持
if (needsHls) {
  import('@videojs/http-streaming');
}
```

### 3. 压缩优化

使用更激进的压缩设置：

```javascript
babel({
  compact: true,
  presets: [
    ['@babel/preset-env', {
      targets: ['last 2 versions'],
      modules: false
    }]
  ]
})
```

## 文件大小对比

| 构建类型   | 未压缩   | 压缩后   | Gzip后 |
| ------ | ----- | ----- | ----- |
| 完整版本   | 2.3MB | 671KB | 201KB |
| 核心版本   | 959KB | 256KB | 75KB  |
| 最小化版本  | 842KB | 225KB | 66KB  |
| 无VTT版本 | 902KB | 242KB | 68KB  |

## 使用示例

### HTML中使用

```html
<!-- 使用最小化版本 -->
<script src="dist/video-minimal.js"></script>
<link href="dist/video-js.css" rel="stylesheet">

<video id="my-video" class="video-js">
  <source src="video.mp4" type="video/mp4">
</video>

<script>
  var player = videojs('my-video');
</script>
```

### 模块化使用

```javascript
// 使用ES模块版本
import videojs from './dist/video-core.es.js';
import 'video-js/dist/video-js.css';

const player = videojs('my-video');
```

## 注意事项

1. **兼容性**: 最小化版本可能不支持某些高级功能
1. **测试**: 构建后务必测试所有功能
1. **依赖**: 确保所有必需的依赖都已包含
1. **更新**: 升级Video.js版本时需要重新构建

## 故障排除

### 常见问题

1. **构建失败**
   * 检查Node.js版本
   * 确保所有依赖已安装
   * 查看错误日志

1. **功能缺失**
   * 确认所需功能已包含在构建中
   * 检查外部依赖是否正确加载

1. **文件过大**
   * 使用更激进的压缩设置
   * 移除不需要的功能模块
   * 考虑使用CDN版本

## 更多资源

* [Video.js 官方文档](https://docs.videojs.com/)
* [Rollup 配置文档](https://rollupjs.org/configuration-options/)
* [Babel 配置指南](https://babeljs.io/docs/en/configuration) 
