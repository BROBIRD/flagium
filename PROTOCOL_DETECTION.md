# Protocol 检测说明

## 问题背景

在 Chrome Manifest V3 中，`webRequest.onResponseStarted` 事件的 `statusLine` 字段可能不可用，导致无法直接获取 HTTP 协议版本。

## 解决方案

实现了多层检测机制来识别 HTTP 协议版本：

### 1. StatusLine 检测（优先）
如果 `statusLine` 可用，直接从中提取协议版本：
- `HTTP/3`
- `HTTP/2`
- `HTTP/1.1`
- `HTTP/1.0`

### 2. Headers 分析（备用）

#### HTTP/3 检测
通过 `Alt-Svc` 响应头识别：
```
Alt-Svc: h3=":443"; ma=86400
Alt-Svc: h3-29=":443"; ma=86400
Alt-Svc: h3-Q050=":443"; ma=86400
```

#### HTTP/2 推断
- HTTPS 网站大部分使用 HTTP/2
- 如果是 HTTPS 且无 HTTP/3 标识，推断为 HTTP/2

#### HTTP/1.1 默认
- HTTP (非加密) 网站通常使用 HTTP/1.1

## 检测流程

```javascript
1. 检查 statusLine（如果存在）
   ↓
2. 检查 Alt-Svc 头（HTTP/3）
   ↓
3. 判断 URL 协议
   - https:// → HTTP/2（默认）
   - http:// → HTTP/1.1
   ↓
4. 返回检测结果
```

## 调试信息

Service Worker 控制台会显示：
```
WebRequest details: {
  statusLine: undefined,  // Manifest V3 可能不提供
  statusCode: 200,
  url: "https://example.com",
  responseHeaders: "Available"
}
Extracting protocol from statusLine: undefined
Alt-Svc header found: h3=":443"; ma=86400
```

## 测试网站

### HTTP/3 网站
- https://www.google.com
- https://www.youtube.com
- https://www.cloudflare.com

### HTTP/2 网站
- https://github.com
- https://www.microsoft.com
- 大部分 HTTPS 网站

### HTTP/1.1 网站
- 大部分 HTTP (非加密) 网站
- 一些老旧的 HTTPS 网站

## 已知限制

1. **Manifest V3 限制**：无法获取完整的 `statusLine`
2. **推断准确性**：某些情况下只能推断，不是 100% 准确
3. **缓存影响**：协议信息会被缓存，可能不反映最新状态

## 改进建议

如需更准确的协议检测，可以考虑：
1. 使用 Chrome DevTools Protocol
2. 注入内容脚本获取 `performance.timing` API
3. 使用专门的网络分析 API

## 当前实现效果

- ✅ 能识别大部分 HTTP/3 网站（通过 Alt-Svc）
- ✅ 能正确推断 HTTPS 使用 HTTP/2
- ✅ 能识别 HTTP 网站使用 HTTP/1.1
- ⚠️ 某些边缘情况可能不准确