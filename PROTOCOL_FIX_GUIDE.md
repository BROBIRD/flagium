# Protocol 检测修复说明

## 修复内容

1. **添加了 scripting 权限**
   - 允许扩展主动注入脚本到页面

2. **改进了内容脚本配置**
   - 只在 http/https 页面运行（避免在扩展页面运行）
   - 在 document_start 时运行，更早检测

3. **添加了主动注入机制**
   - 当标签页加载完成时，主动注入检测脚本
   - 使用 chrome.scripting.executeScript API

4. **双重检测机制**
   - 内容脚本自动运行
   - 标签页更新时主动注入

## 测试步骤

### 1. 重新加载扩展（重要！）
```
1. 打开 chrome://extensions/
2. 找到 Flagium
3. 点击刷新按钮
4. 如果提示权限变更，点击确认
```

### 2. 测试协议检测

访问以下网站并查看控制台：

#### A. Service Worker 控制台
应该看到：
```
Injecting protocol detection script into tab: 123
Protocol detected from content script: HTTP/3 for tab: 123 method: injected
Updated tab data with accurate protocol: HTTP/3 (detected via injected)
```

#### B. 网页控制台（F12）
应该看到：
```
[Flagium] Navigation nextHopProtocol: h3
[Flagium] Detected protocol: {version: "HTTP/3", method: "navigation"}
[Flagium Injected] Detected protocol: HTTP/3 from h3
```

### 3. 检查扩展弹窗

点击扩展图标，Protocol 应该显示：
- **HTTP/3** - 如果网站支持（Google, YouTube, Cloudflare）
- **HTTP/2** - 大部分 HTTPS 网站
- **HTTP/1.1** - HTTP 网站

## 验证方法

### 方法 1：对比 Chrome DevTools
1. F12 打开开发者工具
2. Network 标签
3. 右键列标题 → 勾选 "Protocol"
4. 刷新页面
5. 查看 Protocol 列（h3 = HTTP/3, h2 = HTTP/2）

### 方法 2：查看 Performance API
在网页控制台运行：
```javascript
performance.getEntriesByType('navigation')[0].nextHopProtocol
```
应该返回：`"h3"` 或 `"h2"` 或 `"http/1.1"`

## 故障排除

### 如果还是显示 HTTP/1.1

1. **确认扩展已重新加载**
   - 必须重新加载才能应用新权限

2. **刷新网页**
   - Ctrl+F5 强制刷新

3. **等待页面完全加载**
   - 脚本在页面加载完成后注入

4. **检查控制台错误**
   - Service Worker 控制台
   - 网页控制台

5. **手动测试 Performance API**
   在网页控制台运行上面的命令，确认浏览器能获取到协议信息

## 技术说明

### 为什么需要这些修复？

1. **Manifest V3 限制**
   - webRequest API 的 statusLine 只显示初始连接
   - 不反映协议升级（HTTP/1.1 → HTTP/2 → HTTP/3）

2. **内容脚本可能不运行**
   - 某些页面可能阻止内容脚本
   - 需要主动注入作为备用方案

3. **Performance API 最准确**
   - `navigation.nextHopProtocol` 显示实际协议
   - 与 Chrome DevTools 一致

## 预期结果

访问 https://www.google.com：
- Chrome DevTools: `h3`
- 扩展显示: `HTTP/3` ✓

访问 https://github.com：
- Chrome DevTools: `h2`
- 扩展显示: `HTTP/2` ✓