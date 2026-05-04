const TIMELINE_ENTITY_TYPES = new Set([
  "organization",
  "user",
  "customer",
  "case",
  "lead",
  "conversation",
  "document_item",
  "reminder",
  "company",
  "contact_person",
  "case_party",
  "document_file",
  "communication_log",
  "task",
  "generated_document",
  "billing_record",
  "billing_plan",
  "payment_record",
  "group",
]);
/**
 * 判断输入是否为 TimelineEntityType。
 *
 * @param value 待判断值
 * @returns 是否为 TimelineEntityType
 */
export function isTimelineEntityType(value) {
  return typeof value === "string" && TIMELINE_ENTITY_TYPES.has(value);
}
//# sourceMappingURL=coreEntities.js.map
