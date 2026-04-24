/**
 * CaseAdapter barrel — 聚合导出所有 adapter 子模块（p0-fe-002a 冻结边界）。
 *
 * - 类型契约：`CaseAdapterTypes`
 * - URL / 路径构造：`CaseAdapterReaders`
 * - 列表读取适配：`CaseAdapterMappers`
 * - 详情读取适配：`CaseAdapterDetailAggregate`
 * - 写入响应适配：`CaseAdapterMutationResults`
 * - 写入请求体构造：`CaseAdapterWriteBuilders`
 * - 沟通/日志独立 adapter：`CaseCommsLogsAdapter`
 * - 配套模块接缝：`CaseAdapterSupportSeams`（仅类型与占位函数）
 */
export * from "./CaseAdapterTypes";
export * from "./CaseAdapterReaders";
export * from "./CaseAdapterMappers";
export * from "./CaseAdapterDetailAggregate";
export * from "./CaseAdapterMutationResults";
export * from "./CaseAdapterWriteBuilders";
export * from "./CaseCommsLogsAdapter";
export * from "./CaseAdapterSupportSeams";
