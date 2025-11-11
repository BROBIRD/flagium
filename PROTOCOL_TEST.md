# Protocol 检测测试指南

## 问题：Chrome 显示 h3 但扩展显示 HTTP/1.1

### 原因分析
1. **webRequest API 的 statusLine** 显示的是初始连接协议（HTTP/1.1）
2. **实际协商后的协议** 是 HTTP/3（h3）
3. Chrome 在连接后会升级协议，但 webRequest 只捕获初始请求

### 解决方案
使用内容脚本的 Performance API 获取准确的 `nextHopProtocol`

## 测试步骤

### 1. 重新加载扩展
```
chrome://extensions/ → Flagium → 刷新
```

### 2. 打开两个控制台

#### A. Service Worker 控制台
- chrome://extensions/ → Flagium → "服务工作进程"
- 查看 background.js 日志

#### B. 网页控制台
- 访问网站（如 https://www.google.com）
- F12 打开开发者工具
- Console 标签

### 3. 查看日志

#### 网页控制台应显示：
```
[Flagium] Navigation nextHopProtocol: h3
[Flagium] Detected protocol: {version: "HTTP/3", method: "navigation"}
```

#### Service Worker 控制台应显示：
```
Protocol detected from content script: HTTP/3 for tab: 123 method: navigation
Updated tab data with accurate protocol: HTTP/3 (detected via navigation)
```

### 4. 验证显示

点击扩展图标，Protocol 应显示：
- **HTTP/3**（如果网站支持）
- **HTTP/2**（大部分 HTTPS 网站）
- **HTTP/1.1**（HTTP 网站或老旧服务器）

## 测试网站

### HTTP/3 网站（h3）
```
https://www.google.com
https://www.youtube.com
https://www.cloudflare.com
https://u.sb (你测试的网站)
```

### HTTP/2 网站（h2）
```
https://github.com
https://www.microsoft.com
```

## Chrome 开发者工具对比

在 Chrome 开发者工具的 Network 标签中：
1. 右键列标题
2. 勾选 "Protocol"
3. 查看 Protocol 列显示的值（h3, h2, http/1.1）

我们的扩展现在应该显示相同的协议版本！

## 调试提示

如果还是显示 HTTP/1.1：
1. **等待 2 秒**：内容脚本会延迟发送更新
2. **刷新页面**：让内容脚本重新运行
3. **关闭并重新打开扩展弹窗**：获取最新数据

## 技术说明

### webRequest statusLine 问题
- 显示初始 HTTP/1.1 连接
- 不反映协议升级（HTTP/2, HTTP/3）

### Performance API 优势
- `navigation.nextHopProtocol` 显示实际使用的协议
- 与 Chrome 开发者工具显示一致
- 准确反映 ALPN 协商结果