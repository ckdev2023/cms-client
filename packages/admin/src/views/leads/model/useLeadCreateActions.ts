import { computed, ref, type ComputedRef, type Ref } from "vue";
import type { DedupMatch, LeadCreateFormFields } from "../types";
import type { LeadDedupResult, LeadCreateInput } from "./LeadAdapterTypes";
import type { LeadRepository } from "./LeadRepository";

interface CreateActionsOptions {
  repository: LeadRepository;
  localShowDedupe: ComputedRef<boolean>;
  localDedupeMatches: ComputedRef<DedupMatch[]>;
}

/**
 * 将表单字段映射为 API 入参。
 *
 * @param f - 表单字段
 * @returns API 创建入参
 */
function formToCreateInput(f: LeadCreateFormFields): LeadCreateInput {
  return {
    name: f.name,
    phone: f.phone || undefined,
    email: f.email || undefined,
    source: f.source || undefined,
    referrer: f.referrer || undefined,
    businessType: f.businessType || undefined,
    groupId: f.group || undefined,
    ownerUserId: f.owner || undefined,
    nextAction: f.nextAction || undefined,
    nextFollowUp: f.nextFollowUp || undefined,
    language: f.language || undefined,
    note: f.note || undefined,
  };
}

/**
 * phone/email blur 时触发服务端去重检查。
 *
 * @param repo - 线索仓库
 * @param resultRef - 服务端去重结果引用
 * @param loadingRef - 加载状态引用
 * @param phone - 电话
 * @param email - 邮箱
 */
async function runDedupCheck(
  repo: LeadRepository,
  resultRef: Ref<LeadDedupResult | null>,
  loadingRef: Ref<boolean>,
  phone: string,
  email: string,
) {
  const tp = phone.trim();
  const te = email.trim();
  if (!tp && !te) {
    resultRef.value = null;
    return;
  }
  loadingRef.value = true;
  try {
    resultRef.value = await repo.dedup({
      phone: tp || undefined,
      email: te || undefined,
    });
  } catch {
    resultRef.value = null;
  } finally {
    loadingRef.value = false;
  }
}

/**
 * 将 LeadDedupResult 映射为 DedupMatch 数组。
 *
 * @param r - 去重结果（可为 null）
 * @returns 去重匹配列表
 */
function toDedupMatches(r: LeadDedupResult | null): DedupMatch[] {
  if (!r) return [];
  return [
    ...r.leads.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      email: l.email,
    })),
    ...r.customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
    })),
  ];
}

/**
 * 封装线索新建弹窗中的服务端去重检查与创建提交逻辑。
 *
 * @param options - 依赖项：仓库、本地去重状态
 * @returns 去重 / 创建相关状态与操作
 */
export function useLeadCreateActions(options: CreateActionsOptions) {
  const { repository, localShowDedupe, localDedupeMatches } = options;

  const createSubmitting = ref(false);
  const serverDedupResult = ref<LeadDedupResult | null>(null);
  const serverDedupLoading = ref(false);

  const serverDedupeMatches = computed(() =>
    toDedupMatches(serverDedupResult.value),
  );
  const showDedupe = computed(
    () => serverDedupeMatches.value.length > 0 || localShowDedupe.value,
  );
  const dedupeMatches = computed<DedupMatch[]>(() =>
    serverDedupeMatches.value.length > 0
      ? serverDedupeMatches.value
      : localDedupeMatches.value,
  );

  /**
   * 提交创建线索请求，成功返回 true，失败返回 false。
   *
   * @param fields - 表单字段
   * @returns 是否创建成功
   */
  async function createLead(fields: LeadCreateFormFields): Promise<boolean> {
    if (createSubmitting.value) return false;
    createSubmitting.value = true;
    try {
      await repository.createLead(formToCreateInput(fields));
      return true;
    } catch {
      return false;
    } finally {
      createSubmitting.value = false;
    }
  }

  return {
    createSubmitting,
    serverDedupLoading,
    showDedupe,
    dedupeMatches,
    handleDedupCheck: (phone: string, email: string) =>
      runDedupCheck(
        repository,
        serverDedupResult,
        serverDedupLoading,
        phone,
        email,
      ),
    resetServerDedup: () => {
      serverDedupResult.value = null;
    },
    createLead,
  };
}
