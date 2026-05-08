/**
 * 向后兼容出口——所有定义已迁移到 `shared/i18n/businessTypes.ts`。
 *
 * 现有消费者（`_shared/businessTypes` 路径）仍可正常导入；
 * 新代码应直接从 `shared/i18n/businessTypes` 导入。
 */

export {
  BUSINESS_TYPE_VALUES,
  type BusinessType,
  type BusinessTypeOptionI18N,
  BUSINESS_TYPE_OPTIONS_I18N,
  LEGACY_BUSINESS_TYPE_ALIAS,
  mapBusinessTypeToCaseTypeCode,
  normalizeBusinessType,
} from "../../../shared/i18n/businessTypes";
