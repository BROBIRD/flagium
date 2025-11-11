# 如何调试 Flagium 扩展

## 1. 打开 Service Worker 控制台

### 方法 A：从扩展管理页面（最简单）
1. 在 Chrome 地址栏输入：`chrome://extensions/`
2. 确保右上角的 **开发者模式** 已开启
3. 找到 **Flagium** 扩展
4. 点击扩展卡片上的 **"服务工作进程"** 链接（蓝色文字）

### 方法 B：从详细信息页面
1. 访问 `chrome://extensions/`
2. 点击 Flagium 的 **"详细信息"** 按钮
3. 滚动到 **"检查视图"** 部分
4. 点击 **"Service Worker"** 链接

## 2. 查看调试信息

打开 Service Worker 控制台后，你会看到类似这样的日志：

```javascript
// 当访问网站时
webRequest.onResponseStarted triggered: https://www.google.com/ Type: main_frame TabId: 123
Processing main frame request for: https://www.google.com/
Full details object: {
  "url": "https://www.google.com/",
  "statusLine": undefined,  // ← 这就是为什么显示 HTTP/1.1 的原因
  "statusCode": 200,
  "method": "GET",
  "type": "main_frame",
  "ip": "142.250.x.x",
  "fromCache": false,
  "responseHeaders": [
    "cache-control: private, max-age=0",
    "content-type: text/html; charset=UTF-8",
    "alt-svc: h3=\":443\"; ma=86400"  // ← 这表示支持 HTTP/3
  ]
}

// Protocol 检测
Extracting protocol from statusLine: undefined
Alt-Svc header found: h3=":443"; ma=86400
// 应该返回 HTTP/3

// 从内容脚本获取准确信息
Protocol detected from content script: h2 for tab: 123
Updated tab data with accurate protocol: HTTP/2
```

## 3. Protocol 检测机制

### 当前实现了两种检测方法：

#### 方法 1：WebRequest API（background.js）
- 检查 `statusLine`（Manifest V3 中通常不可用）
- 分析响应头（`Alt-Svc` 等）
- 基于 URL 推断

#### 方法 2：Performance API（content_script.js）
- 使用 `navigation.nextHopProtocol`
- 更准确但需要页面加载完成
- 自动更新已获取的数据

## 4. 常见问题排查

### 问题：总是显示 HTTP/1.1
**原因**：
1. `statusLine` 在 Manifest V3 中不可用
2. 响应头没有明确的协议标识
3. 内容脚本还没有更新数据

**解决**：
1. 重新加载扩展
2. 刷新网页（让内容脚本运行）
3. 等待 1-2 秒让内容脚本检测协议

### 问题：Service Worker 控制台没有日志
**解决**：
1. 确保控制台的日志级别包含 "Info"
2. 重新加载扩展
3. 访问一个新网站触发检测

## 5. 测试不同协议的网站

### HTTP/3 网站（查看 Alt-Svc: h3）
- https://www.google.com
- https://www.youtube.com
- https://www.cloudflare.com
- https://www.facebook.com

### HTTP/2 网站
- https://github.com
- https://www.microsoft.com
- https://stackoverflow.com

### HTTP/1.1 网站
- http://example.com (非 HTTPS)
- 一些老旧的服务器

## 6. 控制台命令

在 Service Worker 控制台中，你可以运行：

```javascript
// 查看所有标签页的数据
tabData

// 查看缓存的数据
cache

// 手动清除缓存
cache.clear()
tabData.clear()

// 查看特定标签页的数据
tabData.get(123)  // 替换 123 为实际的 tabId
```

## 7. 实时监控

1. 打开 Service Worker 控制台
2. 清空控制台（Ctrl+L）
3. 访问一个网站
4. 观察日志输出
5. 查看 Protocol 检测过程

## 8. 内容脚本调试

要查看内容脚本的日志：
1. 在网页上右键 → 检查
2. 打开开发者工具的 Console
3. 查看 "Detected protocol:" 日志

## 9. 完整调试流程

1. 重新加载扩展
2. 打开 Service Worker 控制台
3. 访问测试网站（如 google.com）
4. 查看 Service Worker 日志
5. 在网页上打开开发者工具查看内容脚本日志
6. 点击扩展图标查看显示的协议版本
7. 如果不正确，等待 1-2 秒后刷新扩展弹窗

## 10. 报告问题时需要提供的信息

如果 Protocol 检测仍有问题，请提供：
1. 访问的网站 URL
2. Service Worker 控制台的完整日志
3. 网页控制台的内容脚本日志
4. 扩展显示的 Protocol 值