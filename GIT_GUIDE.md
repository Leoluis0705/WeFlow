# Git 提交指南

## 当前状态

所有更改已添加到暂存区（git add -A）：
```
electron/services/analyticsService.ts
electron/services/chatService.ts
electron/services/exportService.ts
electron/services/httpService.ts
electron/services/voiceTranscribeService.ts
electron/services/wcdbService.ts
electron/utils/LRUCache.ts (新增)
package-lock.json
```

---

## 提交步骤

### 1. 配置 Git 用户信息（如果还未配置）

```bash
# 设置你的 Git 用户名和邮箱
git config user.name "你的用户名"
git config user.email "你的邮箱@example.com"

# 或者只在当前仓库设置（推荐）
cd c:\Users\leoluis0705\WeFlow
git config --local user.name "你的用户名"
git config --local user.email "你的邮箱@example.com"
```

### 2. 提交更改

```bash
cd c:\Users\leoluis0705\WeFlow

# 方式 1: 使用准备好的 commit message
git commit -F COMMIT_MESSAGE.txt

# 方式 2: 或者直接提交（会打开编辑器）
git commit
```

### 3. 推送到你的仓库

```bash
# 推送到远程仓库
git push origin main

# 如果遇到问题，先拉取再推送
git pull --rebase origin main
git push origin main
```

### 4. 创建 Pull Request

1. 访问 GitHub 仓库页面
2. 点击 "Pull requests" → "New pull request"
3. 选择你的分支 → 目标分支
4. 将 `PR_DESCRIPTION.md` 的内容粘贴到 PR 描述中
5. 提交 PR

---

## 提交消息预览

已为你准备好的提交消息（COMMIT_MESSAGE.txt）：

```
fix: 修复内存泄漏、SQL注入、文件句柄泄漏和并发安全问题；优化导出功能和日志追踪

主要改进：

1. 内存泄漏修复
   - 新增 LRUCache 工具类，限制缓存大小防止无限增长
   - chatService: 语音缓存限制为 100 条
   - exportService: 联系人/表情缓存限制为 500/50 条
   - httpService: 图片缓存限制为 1000 条

2. SQL 注入修复
   - wcdbService: 添加 params 参数支持参数化查询
   - analyticsService: 改用参数化查询替代字符串拼接
   - httpService: 修复 SQL 拼接问题

3. 文件句柄泄漏修复
   - voiceTranscribeService: 错误处理中添加 writer.destroy()
   - httpService: 响应流错误处理中添加 destroy()
   - 确保所有流操作都正确释放资源

4. 并发安全修复
   - chatService: 为消息游标访问添加互斥锁保护
   - 防止多个并发请求同时操作共享状态

5. 导出功能优化
   - exportService: 修复时间范围逻辑 (区分无限制和时间戳0)
   - 增强日志记录: 追踪游标操作、批次统计、消息数量
   - 详细记录图片导出失败原因 (解密失败/文件不存在/异常)
   - 帮助用户识别双端同步失效导致的图片丢失
```

---

## 文档说明

- **COMMIT_MESSAGE.txt**: Git 提交消息（技术向）
- **PR_DESCRIPTION.md**: Pull Request 描述（精简版）
- **UPDATE_NOTES.md**: 详细更新说明（完整版）

---

## 清理临时文件（可选）

提交后可以删除这些文档文件：

```bash
git rm COMMIT_MESSAGE.txt PR_DESCRIPTION.md UPDATE_NOTES.md GIT_GUIDE.md
git commit -m "docs: 清理临时文档文件"
```

或者保留它们作为项目文档。

---

## 快速命令

```bash
# 一键提交和推送
cd c:\Users\leoluis0705\WeFlow
git commit -F COMMIT_MESSAGE.txt
git push origin main
```

---

完成后就可以在 GitHub 上创建 Pull Request 了！
