# PNG 国旗图标更新说明

## 更新内容

使用了专业制作的高质量 PNG 国旗图标，替换了之前自动转换的低质量版本。

### 图标来源
- **来源**: https://github.com/yammadev/flag-icons
- **版本**: v3.0.0
- **特点**: 专业设计，清晰度高，多分辨率支持

### 文件结构

```
flags_png/
├── 1x/     # 21x15 像素（标准密度）
├── 2x/     # 42x30 像素（2倍密度）
└── 3x/     # 63x45 像素（3倍密度）
```

每个目录包含 250+ 个国家的 PNG 国旗文件。

## 显示策略

### 工具栏图标（必须使用 PNG）
- **16px 图标**: 使用 1x PNG (21x15)
- **32px 图标**: 使用 2x PNG (42x30)
- **48px 图标**: 使用 3x PNG (63x45)
- **128px 图标**: 使用 3x PNG (63x45)

### 弹出窗口（使用 SVG）
- **优势**: SVG 可缩放，在弹出窗口中显示更清晰
- **位置**: `flags/` 目录下的 SVG 文件
- **默认**: earth.svg（地球图标）

## 代码更新

### background.js
```javascript
// 使用专业 PNG 图标
const flagPaths = {
  16: `flags_png/1x/${countryCode}.png`,
  32: `flags_png/2x/${countryCode}.png`,
  48: `flags_png/3x/${countryCode}.png`,
  128: `flags_png/3x/${countryCode}.png`
};
```

### popup.js
```javascript
// 弹出窗口使用 SVG
const svgUrl = chrome.runtime.getURL(`flags/${countryCode}.svg`);
flagIcon.src = svgUrl;
```

## 优势

✅ **专业品质**: 使用专业设计的 PNG 图标
✅ **清晰显示**: 多种分辨率支持不同像素密度
✅ **最佳实践**: 工具栏用 PNG，弹出窗口用 SVG
✅ **更好的用户体验**: 图标在各种尺寸下都清晰可见

## 特殊图标

- **Earth 图标**: 用于无法识别国家、Anycast IP、本地地址等情况
  - 工具栏: `icons/icon*.png`（从 earth.svg 转换）
  - 弹出窗口: `flags/earth.svg`（原始 SVG）

## 测试建议

1. 重新加载扩展
2. 访问不同国家的网站
3. 检查工具栏图标是否清晰
4. 打开弹出窗口查看 SVG 国旗显示

## 文件大小对比

- **之前**: 自动转换的 PNG，文件较大，质量一般
- **现在**: 专业优化的 PNG，文件小，质量高
  - 1x: ~500-1000 字节
  - 2x: ~1-2 KB
  - 3x: ~1.5-3 KB

## 兼容性

- Chrome 扩展完全支持 PNG 路径
- 弹出窗口完全支持 SVG 显示
- 所有现代浏览器都能正确渲染