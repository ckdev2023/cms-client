import type { ChipTone } from "../../../shared/ui/Chip.vue";

/**
 * 用户自定义标签的哈希色池：仅使用中性 / primary / success 三种"温和色"，
 * 不放 `warning` / `danger`，避免无业务含义的随机标签被误读为告警态——
 * 那两种 tone 仅留给 `SEMANTIC` 中的真业务语义标签使用。
 */
const HASH_TONES: readonly ChipTone[] = ["neutral", "primary", "success"];

const SEMANTIC: ReadonlyMap<string, ChipTone> = new Map(
  (
    [
      [["vip"], "primary"],
      [["優先", "优先", "急", "urgent"], "warning"],
      [["面談済", "面谈过", "已签约", "已簽約", "signed"], "success"],
      [["流失", "lost", "風險", "risk"], "danger"],
    ] as const
  ).flatMap(([keys, tone]) => keys.map((k) => [k, tone] as const)),
);

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * 将标签映射到 Chip 色调：预置语义映射优先，未命中时用哈希分配稳定色调。
 *
 * 配合 `Chip` 的 `variant="tag"` 使用时，色调仅作用于左侧色点，标签
 * 主体保持中性外观；这样既不影响"用户自定义标签"的视觉一致性，
 * 又能让 VIP / 优先 / 已签约 / 流失 等业务词通过色点保留语义。
 *
 * @param tag - 标签原始文本
 * @returns 对应的 ChipTone
 */
export function resolveTagTone(tag: string): ChipTone {
  const semantic = SEMANTIC.get(tag.toLowerCase());
  if (semantic) return semantic;
  return HASH_TONES[djb2(tag) % HASH_TONES.length];
}
