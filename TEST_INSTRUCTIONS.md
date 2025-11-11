# 测试说明 - Flagium 扩展

## 修复内容

1. **修复了国旗显示逻辑**
   - 添加了调试日志来跟踪数据流
   - 修复了 country code 的处理（保持小写以匹配文件名）
   - 改进了 flag icon 的渲染逻辑

2. **修复了扩展图标更新（工具栏图标）**
   - 实现了两种设置图标的方法：直接使用 SVG 路径（优先）和 Canvas imageData（备用）
   - 使用正确的 Chrome API 设置图标
   - 添加了对不同尺寸的支持（16, 19, 32, 38px）
   - 改进了图标的纵横比处理
   - 添加了标签页切换时的图标恢复逻辑

3. **改进了 IP 地址获取**
   - 添加了 DNS 备用查询（当 webRequest API 无法获取 IP 时）
   - 添加了更多的调试日志
   - 增强了错误处理

## 测试步骤

### 1. 重新加载扩展
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 找到 Flagium 扩展
4. 点击"重新加载"按钮（循环箭头图标）

### 2. 打开开发者工具查看日志
1. 在扩展页面，找到 Flagium
2. 点击"服务工作进程"（Service Worker）链接
3. 这会打开一个新的开发者工具窗口
4. 切换到 Console 标签查看日志

### 3. 测试网站访问
访问以下测试网站，观察扩展行为：

1. **国际网站测试**
   - https://www.google.com （美国）
   - https://www.baidu.com （中国）
   - https://www.bbc.com （英国）
   - https://www.yahoo.co.jp （日本）

2. **检查点**
   - 扩展图标应该变成对应国家的国旗
   - 点击扩展图标，弹出窗口应显示：
     - 正确的国旗图标
     - 国家名称
     - IP 地址
     - 城市（如果有）
     - ISP/组织信息

### 4. 查看控制台日志
在 Service Worker 控制台中，你应该看到类似以下的日志：

```
webRequest.onResponseStarted triggered: https://www.google.com/ Type: main_frame TabId: 123
Processing main frame request for: https://www.google.com/
Details object: {url: "...", ip: "142.250.x.x", ...}
Fetching geo data for IP: 142.250.x.x
API response data: {country: "United States", country_code: "US", ...}
Processed geo data: {country: "United States", countryCode: "us", ...}
Updating tab data: {domain: "www.google.com", ip: "142.250.x.x", ...}
Country code found: us Setting flag icon...
Setting flag icon for country: us
Flag found, setting src to: chrome-extension://[id]/flags/us.svg
Setting icon with imageData for tabId: 123
```

### 5. 故障排除

如果国旗仍然不显示：

1. **检查 IP 地址是否被获取**
   - 在日志中查找 "Details object"
   - 确认是否有 `ip` 字段

2. **检查 API 响应**
   - 在日志中查找 "API response data"
   - 确认返回了正确的 country_code

3. **检查文件是否存在**
   - 在日志中查找 "Flag not found" 错误
   - 确认 flags 目录中有对应的国旗文件

4. **清除缓存**
   - 点击扩展弹出窗口中的刷新按钮
   - 或在设置中清除缓存

### 6. 如果 webRequest 没有提供 IP

如果日志显示 "IP not available from webRequest"，扩展会尝试使用 Google DNS API 解析 IP。检查：
- "Resolving via DNS for: [domain]"
- "Resolved IP via DNS: [ip]"

## 预期结果

- ✅ 扩展图标应该显示当前网站服务器所在国家的国旗
- ✅ 点击扩展时，弹出窗口显示正确的国旗和地理信息
- ✅ 本地网站（localhost）显示默认的 unknown 图标
- ✅ 私有 IP 地址显示默认图标

## 额外调试

如果需要更多调试信息，可以在弹出窗口中右键 -> 检查，查看 popup.js 的控制台日志。