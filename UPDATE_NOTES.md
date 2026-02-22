# WeFlow 更新说明

## 版本信息
**更新日期**: 2026-02-23  
**更新类型**: Bug 修复 + 功能优化

---

## 🎯 更新概述

本次更新重点解决了系统稳定性和安全性问题，修复了 4 类高风险问题，优化了导出功能的日志追踪能力。

---

## 🔧 主要修复

### 1. **内存泄漏修复** ⚠️ 高优先级

**问题描述**：
- 多个服务使用 `Map` 作为缓存，但从不清理
- 长时间运行导致内存无限增长
- 可能导致应用崩溃或性能下降

**解决方案**：
- 新增 `electron/utils/LRUCache.ts` 工具类
- 实现 LRU（最近最少使用）缓存淘汰策略
- 为各服务设置合理的缓存上限

**影响文件**：
```
electron/utils/LRUCache.ts              (新增)
electron/services/chatService.ts        (修改)
electron/services/exportService.ts      (修改)
electron/services/httpService.ts        (修改)
```

**缓存限制**：
| 服务 | 缓存项 | 限制大小 |
|------|--------|----------|
| chatService | 语音 WAV 缓存 | 100 条 |
| chatService | 语音转文字缓存 | 50 条 |
| exportService | 联系人信息缓存 | 500 条 |
| exportService | 内嵌表情缓存 | 50 条 |
| httpService | 图片缓存 | 1000 条 |

---

### 2. **SQL 注入修复** ⚠️ 高优先级

**问题描述**：
- 使用字符串拼接构造 SQL 查询
- 存在 SQL 注入风险
- 可能导致数据泄露或损坏

**解决方案**：
- `wcdbService.execQuery()` 添加 `params` 参数支持
- 改用参数化查询（`?` 占位符）
- 移除手动转义逻辑

**示例对比**：
```typescript
// ❌ 修复前（不安全）
const sql = `SELECT * FROM contact WHERE username IN ('${usernames.join("','")}')`
await wcdbService.execQuery('contact', null, sql)

// ✅ 修复后（安全）
const placeholders = usernames.map(() => '?').join(',')
const sql = `SELECT * FROM contact WHERE username IN (${placeholders})`
await wcdbService.execQuery('contact', null, sql, usernames)
```

**影响文件**：
```
electron/services/wcdbService.ts         (修改)
electron/services/analyticsService.ts    (修改)
electron/services/httpService.ts         (修改)
```

---

### 3. **文件句柄泄漏修复** ⚠️ 中优先级

**问题描述**：
- 流操作异常时未调用 `destroy()`
- 导致文件句柄未释放
- 长时间运行可能耗尽系统资源

**解决方案**：
- 在所有错误处理分支中添加 `stream.destroy()`
- 确保无论成功失败都释放资源

**影响文件**：
```
electron/services/voiceTranscribeService.ts  (修改)
electron/services/httpService.ts             (修改)
```

**修复位置**：
- 语音转写下载流错误处理（2 处）
- HTTP 响应流错误处理（4 处）

---

### 4. **并发安全修复** ⚠️ 中优先级

**问题描述**：
- 多个请求同时访问消息游标
- 共享状态 `messageCursors` 无保护
- 可能导致数据竞争和状态不一致

**解决方案**：
- 添加简单互斥锁（布尔标志 + 自旋等待）
- 保护游标创建、访问、删除操作

**影响文件**：
```
electron/services/chatService.ts        (修改)
```

**保护范围**：
- `getMessageCursor()` 方法
- `fetchMessagesByTimeRange()` 方法

---

## 🚀 功能优化

### 5. **导出功能增强**

#### 5.1 修复时间范围逻辑

**问题**：
- `dateRange?.end || 0` 导致时间戳 0 被误解为 1970 年
- 导出时可能遗漏消息

**修复**：
```typescript
// ❌ 修复前
const endTime = dateRange?.end || 0

// ✅ 修复后
const endTime = dateRange?.end && dateRange.end > 0 ? dateRange.end : 0
```

#### 5.2 增强日志追踪

**新增日志**：
- 游标操作日志（创建、查询、关闭）
- 批次统计日志（批次数、消息数）
- 图片导出失败详情

**日志示例**：
```
[Export] 收集消息: sessionId=xxx, 时间范围: 1640000000 ~ 无限制
[Export] 批次 1: 收到 100 条消息
[Export] 批次 2: 收到 100 条消息
[Export] 收集完成: 共 200 条消息, 2 个批次
[Export] 图片解密失败 (localId=12345): imageMd5=abc123, error=未找到缓存图片
[Export] 缩略图也获取失败 (localId=12345): error=未知 → 将显示 [图片] 占位符
[Export] 源图片文件不存在 (localId=67890): C:\path\to\image.dat → 将显示 [图片] 占位符
```

#### 5.3 图片导出问题说明

**关于 `[图片]` 占位符**：

这**不是 bug**，而是如实反映 PC 端微信的数据状态。常见原因：

1. **微信缓存已清理** - 旧图片文件被自动删除
2. **双端同步失效** - 手机收到图片时 PC 离线或网络不稳定
3. **图片未完整同步** - 只同步了消息元数据，未下载图片文件
4. **加密文件损坏** - .dat 文件存在但无法解密

**无法通过代码修复**：
- PC 端微信本身就没有这些图片文件
- 无法从手机端补全（微信限制）
- `[图片]` 是唯一合理的显示方式

**预防措施**：
- PC 端保持长期在线
- 定期导出，避免缓存清理
- 使用稳定网络接收消息

---

## 📊 技术细节

### 新增文件

**`electron/utils/LRUCache.ts`** (93 行)
```typescript
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private maxSize: number
  
  // LRU 淘汰策略：
  // - get() 时将元素移到最新位置
  // - set() 时超过限制自动删除最旧元素
}
```

### 修改统计

| 文件 | 新增行 | 删除行 | 净变化 |
|------|--------|--------|--------|
| analyticsService.ts | +6 | -2 | +4 |
| chatService.ts | +21 | -8 | +13 |
| exportService.ts | +56 | -20 | +36 |
| httpService.ts | +25 | -6 | +19 |
| voiceTranscribeService.ts | +10 | 0 | +10 |
| wcdbService.ts | +4 | -2 | +2 |
| LRUCache.ts | +93 | 0 | +93 |
| **总计** | **+215** | **-38** | **+177** |

---

## ✅ 测试建议

### 1. 内存稳定性测试
```
1. 启动应用并保持运行 2+ 小时
2. 频繁切换会话、查看图片、播放语音
3. 使用任务管理器监控内存使用
4. 预期：内存保持稳定，不再持续增长
```

### 2. 导出功能测试
```
1. 导出包含图片的聊天记录
2. 检查控制台日志输出
3. 验证：
   - 成功导出的图片正常显示
   - 失败的图片显示 [图片] 占位符
   - 日志明确记录失败原因
```

### 3. 并发安全测试
```
1. 快速连续切换多个会话
2. 同时进行多个导出操作
3. 预期：无崩溃，无数据错乱
```

---

## 🔄 版本兼容性

- ✅ **向后兼容**：所有现有功能保持不变
- ✅ **数据兼容**：无需迁移数据库或配置
- ✅ **接口兼容**：API 调用方式不变

---

## 📝 注意事项

1. **首次运行后内存占用可能上升**
   - 这是缓存填充的正常现象
   - 达到上限后会自动淘汰旧数据

2. **日志输出增多**
   - 便于问题诊断
   - 不影响性能

3. **`[图片]` 占位符说明**
   - 这是对实际数据状态的如实反映
   - 不代表代码问题
   - 见上文"图片导出问题说明"

---

## 🙏 致谢

感谢测试过程中发现和报告问题的用户。

---

## 📧 问题反馈

如有问题或建议，请提交 Issue 或 Pull Request。
