# PNG 国旗测试说明

## 完成的改动

### 1. 转换了所有国旗为 PNG 格式
- 将 271 个 SVG 国旗文件转换为 PNG
- 创建了 4 种尺寸：16x16, 32x32, 48x48, 128x128
- 文件存储在 `flags_png/` 目录下，按尺寸分子目录

### 2. 修改了代码使用 PNG
- **background.js**: 工具栏图标现在使用 PNG 文件
  - 使用 `chrome.action.setIcon` 的 `path` 参数直接加载 PNG
  - 支持多种尺寸以适配不同分辨率显示
- **popup.js**: 弹出窗口优先使用 PNG，SVG 作为备用

## 测试步骤

### 1. 重新加载扩展
1. 打开 `chrome://extensions/`
2. 找到 Flagium 扩展
3. 点击刷新按钮重新加载

### 2. 测试工具栏图标
访问以下网站，观察工具栏图标是否变成对应国旗：

- **美国网站**: https://www.google.com （🇺🇸）
- **中国网站**: https://www.baidu.com （🇨🇳）
- **英国网站**: https://www.bbc.com （🇬🇧）
- **日本网站**: https://www.yahoo.co.jp （🇯🇵）
- **德国网站**: https://www.spiegel.de （🇩🇪）

### 3. 检查 Service Worker 控制台
1. 在扩展页面点击 "服务工作进程" 链接
2. 查看控制台日志，应该看到：
```
Setting flag icon for country: us
Setting icon with PNG paths for tabId: 123
Successfully set flag icon using PNG for tab: 123
```

### 4. 测试弹出窗口
1. 点击扩展图标打开弹出窗口
2. 检查弹出窗口中的国旗图标是否正确显示
3. 在弹出窗口上右键 -> 检查，查看控制台应该显示：
```
Updating flag for country code: us
Trying PNG flag URL: chrome-extension://[id]/flags_png/48/us.png
PNG flag found, setting src to: [url]
```

## 预期结果

✅ 工具栏图标应该显示为对应国家的 PNG 国旗
✅ 切换标签页时，图标自动更新
✅ 弹出窗口显示清晰的 PNG 国旗
✅ 本地地址显示 unknown 图标（xx.png）

## 文件结构

```
flagium/
├── flags/              # 原始 SVG 文件（保留作为备用）
├── flags_png/          # PNG 国旗文件
│   ├── 16/            # 16x16 图标（工具栏小尺寸）
│   ├── 32/            # 32x32 图标（工具栏标准尺寸）
│   ├── 48/            # 48x48 图标（弹出窗口使用）
│   └── 128/           # 128x128 图标（高分辨率显示）
```

## 优势

1. **更好的兼容性**: PNG 是 Chrome 扩展原生支持的格式
2. **更快的加载**: 无需 Canvas 转换，直接加载 PNG
3. **更清晰的显示**: 预渲染的 PNG 在小尺寸下显示更清晰
4. **减少 CPU 使用**: 无需实时渲染 SVG

## 故障排除

如果图标仍不显示：
1. 确保 `flags_png/` 目录存在且包含 PNG 文件
2. 检查控制台是否有 404 错误
3. 尝试清除浏览器缓存并重新加载扩展