# Earth 图标更新说明

## 更新内容

已将 **Earth 地球图标** 设置为 Flagium 扩展的默认图标，用于以下场景：

### 使用 Earth 图标的情况

1. **无法识别国家**
   - IP 地址无法解析到具体国家
   - GeoIP API 返回错误或无数据

2. **Anycast IP**
   - CDN 服务（如 Cloudflare、Fastly）
   - 全球分布式服务
   - 无法确定具体地理位置

3. **本地/私有网络**
   - localhost (127.0.0.1)
   - 局域网地址 (192.168.x.x, 10.x.x.x)
   - IPv6 本地地址

4. **错误情况**
   - 国旗文件不存在
   - 图标加载失败

## 文件更新

### 图标文件
- `icons/icon16.png` - 16x16 Earth 图标（工具栏小图标）
- `icons/icon48.png` - 48x48 Earth 图标（弹出窗口）
- `icons/icon128.png` - 128x128 Earth 图标（高分辨率）
- `flags_png/*/earth.png` - 各尺寸的 Earth PNG 文件

### 代码更新
- **background.js**
  - `updateTabData()`: 默认使用 Earth 图标
  - `setFlagIcon()`: 错误时回退到 Earth 图标
  - `onActivated`: 无国家数据时显示 Earth 图标

- **popup.js**
  - `updateFlag()`: 无国旗时显示 Earth 图标
  - 本地/私有地址显示 Earth 图标

## 视觉效果

🌍 **Earth 图标特点**：
- 蓝绿色地球，显示全球视角
- 清晰识别度高，即使在 16x16 尺寸
- 与国旗图标风格统一
- 表达"全球互联网"的概念

## 测试场景

1. **访问本地服务**
   - http://localhost:3000
   - http://127.0.0.1
   - 应显示 Earth 图标

2. **访问内网地址**
   - http://192.168.1.1
   - 应显示 Earth 图标

3. **访问 Anycast 服务**
   - 某些 CDN 加速的网站
   - 可能显示 Earth 图标

4. **正常网站**
   - https://google.com → 美国国旗
   - https://baidu.com → 中国国旗
   - 应显示对应国旗

## 优势

✅ **更好的用户体验**：Earth 图标比 unknown 图标更友好
✅ **清晰的语义**：地球代表全球网络，更容易理解
✅ **视觉一致性**：与国旗图标保持相同的设计风格
✅ **专业外观**：提升扩展的整体质感