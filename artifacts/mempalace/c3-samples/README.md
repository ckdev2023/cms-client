# C3 脱敏样本目录

本目录存放经人工复核后的 C3 脱敏候选样本。

## 命名规范

```
C3-SAMPLE-NNN.md
```

- `NNN` 为三位数字序号，从 001 开始。
- 每个文件对应 `c3-review-log.json` 中的一条 review 记录。

## 要求

1. 样本只能是纯 Markdown 文本，不得嵌入图片、文件路径或原始编号。
2. 样本写入前必须已在 `c3-review-log.json` 中创建对应记录。
3. 未通过人工复核的样本不得提交到本目录。

## 参考

- 选取标准：`plan/mempalace/desensitized-pilot-pack.md` §4
- 复核流程：`plan/mempalace/desensitized-pilot-pack.md` §5
- 复核记录：`artifacts/mempalace/c3-review-log.json`
