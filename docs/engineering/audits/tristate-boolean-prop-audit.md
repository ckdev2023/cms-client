# Tristate Boolean Prop Audit

> Created: 2026-05-09
> Scope: `packages/admin/src` — Vue components, composables, and model files.

## Background

Vue coerces missing optional boolean props to `false`, making "loading" (prop not yet set)
indistinguishable from "disabled" (`false`). When a boolean value comes from an async source
(API call, feature-flag resolve, permission fetch), three distinct UI states exist:

| State    | Meaning                              |
| -------- | ------------------------------------ |
| loading  | async call not yet resolved          |
| enabled  | resolved to `true`                   |
| disabled | resolved to `false`                  |

Using a bare `boolean` prop collapses loading and disabled into the same `false`, which can
cause UI deadlocks (buttons permanently disabled, cards permanently hidden, etc.).

## Naming Convention

When replacing a bare boolean with a string discriminator, use the pattern:

```ts
defineProps<{
  /** @deprecated use featureResolution */
  legacyEnabled?: boolean;
  /**
   * `undefined` = loading; `"enabled"` / `"disabled"` = resolved.
   */
  featureResolution?: "enabled" | "disabled";
}>();
```

Allowed suffixes: `<feature>Resolution` / `<feature>State` / `<feature>Status`.

Choose the suffix that best fits the domain:
- `Resolution` — flag/gate resolve (e.g. `bmvFlagState`)
- `State` — lifecycle/workflow state
- `Status` — external system status

## Selection Methodology

### Inclusion criteria (must satisfy at least one)

1. Parent component uses `ref<boolean | undefined>` or `ref<boolean>(undefined as …)` to manage the value
2. Prop value is filled by `await` / `Promise<boolean>` / `repository.is*Enabled()` or similar async path
3. Prop is absent before async load completes and only passed in after resolution

### Grep patterns used

| Pattern | Target | Hits | Purpose |
| --- | --- | --- | --- |
| `?: boolean` in `defineProps` | `*.vue` | ~60 files | All optional boolean props |
| `ref<boolean \| undefined>` | `*.vue`, `*.ts` | 1 file | Explicitly nullable boolean ref |
| `Ref<boolean \| undefined>` | `*.ts` | 1 file | Composable input typed as nullable boolean |
| `onMounted(async` | `*.vue` | 2 files | Async lifecycle hooks filling boolean refs |
| `watch(…async` | `*.vue` | 0 files | Async watchers filling boolean refs |
| `Promise<boolean>` / `repository.is*Enabled()` | `*.ts` | 1 admin hit | Async boolean source returning to component |
| `permStore.has(…)` / `adminSession.isAdmin` | `*.vue` | 3 files | Permission/session-derived booleans |

### Exclusion rationale for bulk props

The ~50+ remaining `?: boolean` props fall into patterns that are inherently two-state:

- **UI toggles**: `open`, `submitting`, `loading`, `visible`, `menuOpen` — start `false`, toggle synchronously
- **Styling flags**: `disabled`, `readonly`, `pill`, `square`, `bordered`, `hoverable`, `dot` — pure presentation
- **Selection state**: `selected`, `allSelected`, `indeterminate`, `highlighted` — computed from local array state
- **Loading indicators**: `rerunLoading`, `createSpLoading`, `reviewLoading` — operation-in-progress flags (idle→busy→idle)

None of these are populated from async remote sources where the initial `false` differs semantically from "resolved to false".

## Audit Results

| # | Location | Prop / Ref | Async source | True three-state? | Risk | Disposition |
| - | -------- | ---------- | ------------ | ------------------ | ---- | ----------- |
| 1 | `CustomerDetailView.vue` → `CustomerBasicInfoTab.vue` | `bmvEnabled?: boolean` | `await repository.isBmvEnabled()` via `onMounted` | Yes — loading hides card, enabled shows intake card, disabled shows notice | **CLOSED** | Fixed: added `bmvFlagState?: "enabled" \| "disabled"` string discriminator |
| 2 | `useCustomerCreateCaseGateModel.ts` | `bmvEnabled: Ref<boolean \| undefined>` | Same ref from `CustomerDetailView` | Yes — but already handles `undefined` correctly (`if (bmvEnabled === false)` only blocks on explicit false) | **CLOSED** | Same fix scope as #1; model already treats `undefined` as loading |
| 3 | `BillingListView.vue` → `PaymentLogTable.vue` | `isManager?: boolean` | `computed(() => adminSession.isAdmin.value)` — sync hydrate from `localStorage` | No — session is synchronously hydrated at app startup; `isAdmin` is available before any component renders | LOW | Close — two-state; no async gap |
| 4 | `SideNav.vue` | `isAdmin` (internal computed, not a prop) | `useAdminSession()` — sync hydrate | No — nav groups filtered; before hydrate = restricted view, same as no-permission | LOW | Close — synchronous; not a `defineProps` boolean |
| 5 | `TopBar.vue` | `canCreateCase` (internal computed, not a prop) | `permStore.has("case.create")` — async `load()` | No — before load, `has()` returns `false` (empty set); button hidden. After load without permission, button hidden. Same UI result | LOW | Close — two-state from UI perspective; safe default |
| 6 | `CaseDocumentsTab.vue` → `CaseDocumentRow.vue` | `storageRootConfigured?: boolean` | `useOrgSettings()` — sync singleton initialized at app boot via `initOrgSettings()` | No — `ComputedRef<boolean>` derived from synchronously available org settings data | LOW | Close — not async |
| 7 | `CustomerDetailHeader.vue` | `createCaseDisabled?: boolean` / `batchCreateCaseDisabled?: boolean` | Computed from `useCustomerCreateCaseGateModel` gate output (downstream of #1/#2) | No — gate model already handles tristate; these props receive a resolved `boolean` from the gate's `.disabled` field | LOW | Close — downstream of fixed model |
| 8 | `CustomerContactsTab.vue` | `batchCreateCaseDisabled?: boolean` | Same downstream path as #7 | No — same resolved `boolean` from gate model | LOW | Close — downstream of fixed model |

## Summary

- **HIGH = 0** — No new high-risk tristate boolean prop issues found beyond the already-fixed `bmvEnabled`.
- **MED = 0** — No medium-risk cases identified.
- **LOW = 6** — All are genuinely two-state or synchronously resolved; no action required.
- **CLOSED = 2** — The original `bmvEnabled` bug and its model-layer consumer, both fixed in the prior PR.

## Governance

A rule has been added to `AGENTS.md` (Architecture section) and `.cursor/rules/core-operating-rule.mdc`:

> 在 Vue `defineProps` 中由异步赋值 / 远程 resolve 的 boolean 字段必须改用字符串
> discriminator + `undefined` 表示加载态；禁止裸 `boolean` 参与三态语义。
