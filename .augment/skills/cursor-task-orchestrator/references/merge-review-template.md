# Merge Review Template

## 输入
- manifest.json
- artifacts/*.result.json
- 各任务 summary

## 检查项
- 是否存在失败或阻塞任务
- 是否存在 changed_files 重叠
- 是否存在集成断层
- 是否存在遗漏的全量回归
- 是否需要调整 merge 顺序
- 是否存在必须人工决策的冲突

## 输出格式

# 汇总合并评审

## 1. 总体状态
- success / partial / blocked

## 2. 失败或阻塞任务
- Txx:

## 3. 文件重叠与冲突风险
- Txx vs Tyy:

## 4. 集成风险
- 风险 1：

## 5. 建议 merge 顺序
1. Txx
2. Tyy

## 6. 全量回归命令
- command 1
- command 2

## 7. 需要人工确认的事项
- item 1
