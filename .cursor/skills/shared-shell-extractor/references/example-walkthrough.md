# Example Walkthrough: Billing Module Shell Extraction

> Real repo example demonstrating the shared-shell-extractor skill.
> Source: `packages/prototype/admin/billing/INVENTORY.md` §2 (style analysis)

---

## Scenario

User request: "把 billing.html 中与 shared 重复的样式和壳层 HTML 提取到共享层。"

## Step 1 — Diff analysis (from INVENTORY.md §2)

The INVENTORY.md for billing performed a line-by-line comparison between `billing.html` inline styles and `shared/styles/`. Key findings:

### Tokens — 100% match, direct replacement

| Variable | billing.html | shared/tokens.css | Action |
|----------|-------------|-------------------|--------|
| `--bg` | `#f8fafc` | `#f8fafc` | Replace |
| `--surface` | `#ffffff` | `#ffffff` | Replace |
| `--primary` | `#0369a1` | `#0369a1` | Replace |
| `--shadow-hover` | **missing** | present | No conflict |

**Decision**: Delete `:root` block from billing.html, add `<link>` to `shared/styles/tokens.css`.

### Shell layout — 100% match except topbar max-width

| Class | billing.html | shared/shell.css | Diff |
|-------|-------------|------------------|------|
| `.app-shell` | identical | identical | Replace |
| `.side-nav` family | identical | identical | Replace |
| `.topbar-inner max-width` | `1120px` | `1280px` | ⚠️ Align to shared |
| `.mobile-nav` family | identical | identical | Replace |

**Decision**: Use shared version, accept 1280px as canonical. Document the change.

### Component styles — minor differences

| Class | Diff | Resolution |
|-------|------|------------|
| `.btn-primary` | `border-radius: 14px` vs `var(--radius)` (= 14px) | Replace (equivalent) |
| `.chip` | shared adds `white-space: nowrap` | Replace (enhancement) |
| `.apple-table` | Significant `th`/`td` padding and border diffs | Replace, align to shared |
| `.segmented-control` | `button` vs `.segment-btn` selector | Requires HTML update too |

### Unique to billing (keep in module layer)

| Class | Lines | Reason to keep |
|-------|-------|----------------|
| `.text-hero` | L45–50 | May become shared later, but only billing uses it now |
| `.tag` family | L287–317 | Candidate for shared, but needs cross-module alignment first |

## Step 2 — Shell HTML extraction

### Before (billing.html — inline navigation)

```html
<!-- L471-553: Desktop side nav — 82 lines, copied from admin-prototype.html -->
<aside class="side-nav">
  <nav>
    <a href="admin-prototype.html" class="nav-item">仪表盘</a>
    <a href="customers.html" class="nav-item">客户</a>
    <a href="billing.html" class="nav-item" aria-current="page">收费与财务</a>
    <!-- ... 10+ more items ... -->
  </nav>
</aside>
```

### After (billing/index.html — references shared shell)

```html
<!-- Shell from shared/shell/ — single source of truth -->
<!-- Navigation paths adjusted for billing/ subdirectory -->
<aside class="side-nav">
  <!-- Content from shared/shell/side-nav.html with ../prefix paths -->
  <!-- aria-current="page" set on 收费与财务 item -->
</aside>
```

### Path adjustment rule

When a module moves from `admin/billing.html` to `admin/billing/index.html`:

| Target | Root-level path | Subdirectory path |
|--------|----------------|-------------------|
| Dashboard | `admin-prototype.html` | `../admin-prototype.html` |
| Customers | `customers/index.html` | `../customers/index.html` |
| Self | `billing.html` | `index.html` |

## Step 3 — Script extraction

```
billing.html L780-801 (移动导航 IIFE)
  → Already identical to shared/scripts/mobile-nav.js
  → Replace with <script src="../shared/scripts/mobile-nav.js"></script>
```

## Step 4 — Produce extraction report

The skill outputs a diff report summarizing:

```markdown
## Extraction Summary

### Replaced with shared (safe)
- :root CSS tokens (L11-26) → shared/styles/tokens.css
- Body base styles (L28-43) → shared/styles/tokens.css
- Shell layout (L52-159) → shared/styles/shell.css
- Mobile nav CSS (L340-375) → shared/styles/shell.css
- Component styles (L161-252) → shared/styles/components.css
- Side nav HTML (L471-553) → shared/shell/side-nav.html
- Mobile nav HTML (L381-469) → shared/shell/mobile-nav.html
- Topbar HTML (L555-583) → shared/shell/topbar.html
- Mobile nav JS (L780-801) → shared/scripts/mobile-nav.js

### Aligned to shared (minor diff resolved)
- .topbar-inner max-width: 1120px → 1280px (shared wins)
- .apple-table padding/borders: billing values → shared values

### Kept in module layer
- .text-hero — module-specific large heading
- .tag family — cross-module candidate (deferred to separate PR)
- Overdue row red highlight — billing-specific semantic

### New shared candidates identified
- .tag / .tag-green / .tag-blue / .tag-orange / .tag-red
  → Used in billing + tasks, recommend promoting to components.css
```

## Actual shared/ structure (post-extraction)

```
packages/prototype/admin/shared/
├── shell/
│   ├── mobile-nav.html      ← single source for all modules
│   ├── side-nav.html         ← single source for all modules
│   └── topbar.html           ← single source for all modules
├── scripts/
│   ├── mobile-nav.js         ← shared behavior
│   └── navigate.js           ← global search + ⌘K
└── styles/
    ├── tokens.css            ← design tokens (:root variables)
    ├── components.css        ← shared component styles
    └── shell.css             ← app shell + nav layout
```
