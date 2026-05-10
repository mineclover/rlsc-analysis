# rlsc-analysis

Screen analysis package for RLSC. It owns the screen document model, metadata helpers, DOM collection, layout analysis, identifier extraction, and issue detection.

This package does not depend on Three.js or perspective rendering.

## Metadata

Use metadata helpers when application code can mark component boundaries before collection.

```ts
import { createMetadataAttributes, annotateElement } from 'rlsc-analysis';

const attrs = createMetadataAttributes({
  componentId: 'CheckoutForm.SubmitButton',
  qaAddress: 'checkout:form:submit',
  debugLabel: 'Submit order',
});

annotateElement(buttonElement, attrs);
```

Standard attributes:

- `data-qa-address`
- `data-component-id`
- `data-debug-label`
- `data-boundary`

## Analysis-Only Usage

```ts
import { analyzeAreas, createNodeIndex, detectAreaOverflow } from 'rlsc-analysis';

const result = analyzeAreas(doc, { textOccupancies });
const containmentLeaks = detectAreaOverflow(doc);
const index = createNodeIndex(doc);
const selected = index.findByXPath('/article[1]/section[3]/article[4]/span[1]');
```

The preferred identifier order is:

```txt
componentId > qaAddress > cssSelector > nodeId
```

## Browser Collection

Browser-only APIs are exported from `rlsc-analysis/browser`.

```ts
import { collectLayoutWithText, scanScreen } from 'rlsc-analysis/browser';

const { doc, textPrepared } = collectLayoutWithText(document.body, {
  addressAttribute: 'data-qa-address',
});

const result = scanScreen(document.body, {
  includeText: true,
  collect: { addressAttribute: 'data-qa-address' },
});

const node = result.byXPath('/body[1]/main[1]/button[1]');
```

Keep pure analysis imports separate from browser collection imports when building non-browser tooling.

`scanScreen()` is the recommended browser-facing entrypoint when the caller wants a complete snapshot:

- `doc` — collected `RLSCDocument`
- `nodes` — analysis nodes with guaranteed identifiers
- `index` — lookup maps and helpers
- `metrics` / `pattern` — layout analysis result
- `overflowIssues` — child elements that exceed parent bounds
- `textOccupancies` — text fill and overflow estimates
- `byId()` / `byXPath()` / `byCssSelector()` / `byComponentId()` / `byQaAddress()` — direct lookup helpers

Browser collection records stable re-identification metadata when available:

- `identifier.componentId`
- `identifier.qaAddress`
- `identifier.cssSelector`
- `identifier.xpath`
- `debugLabel`
- `boundary`

### Default Style Inspection

The browser inspector intentionally records only layout-critical computed style.
It does not copy the full CSS declaration into the snapshot.

| Category | Computed style | Stored as | Used for |
|---|---|---|---|
| visibility | `display` | `RLSCNode.display` | hide/filter `display: none` nodes |
| visibility | `visibility` | `RLSCNode.visible` | hide/filter `visibility: hidden` nodes |
| stacking | `z-index` | `RLSCNode.zIndex` | layer ordering and perspective depth |
| layout | `position` | `RLSCNode.position` | positioning-mode diagnosis |
| layout | `overflow` | `RLSCNode.overflow` | clipping and containment diagnosis |
| layout | `box-sizing` | `RLSCNode.styleStack.boxSizing` | frame sizing semantics |
| layout | `flex-direction`, `flex-wrap` | `RLSCNode.styleStack.autoLayout` | Figma auto layout direction and wrapping |
| layout | `justify-content`, `align-items`, `align-content` | `RLSCNode.styleStack.autoLayout` | primary and counter-axis alignment |
| layout | `gap`, `row-gap`, `column-gap` | `RLSCNode.styleStack.autoLayout` / `grid` | item spacing |
| layout | `grid-template-columns`, `grid-template-rows`, `grid-auto-flow` | `RLSCNode.styleStack.grid` | grid track and placement metadata |
| text | `font` | `RLSCNode.fontInfo.fontString` | text measurement |
| text | `font-size`, `line-height` | `RLSCNode.fontInfo.lineHeight` | text height and overflow |
| text | `text-align` | `RLSCNode.fontInfo.textAlign` | boundary contact direction |
| text/layout | `padding-*` | `RLSCNode.fontInfo.padding` / `styleStack.padding` | content-box text occupancy and frame padding |

The exported `DEFAULT_INSPECTED_STYLE_FIELDS` constant is the public checklist for these fields.

### Figma-Oriented Style Stack

Each collected node includes `styleStack`, a compact layout stack intended for Figma-style visualization and debugging.

| DOM signal | Stored as | Figma-oriented meaning |
|---|---|---|
| `display: flex` | `styleStack.figma.layoutMode` | `HORIZONTAL` or `VERTICAL` auto layout |
| `display: grid` | `styleStack.figma.layoutMode` | `GRID` layout metadata |
| non-layout display | `styleStack.figma.layoutMode` | `NONE` |
| `position: absolute` / `fixed` | `styleStack.figma.positionMode` | `ABSOLUTE` child placement |
| other position modes | `styleStack.figma.positionMode` | `AUTO` flow placement |
| `padding-*` | `styleStack.padding` | frame padding |
| `gap`, `row-gap`, `column-gap` | `styleStack.autoLayout` / `grid` | item spacing |

This stack is intentionally descriptive rather than a full CSS clone. It should be used as the standard bridge between DOM scanning and perspective/Figma-like renderers.

### Canonical Graphics Interface Types

`StandardStyleStack` remains the raw/intermediate DOM-computed style record.

Use the canonical graphics helpers for cross-model normalization. The canonical layer uses
tool-neutral names such as `stack`, `grid`, `geometry`, `padding`, and `sizing`; CSS, Figma,
and Photoshop-like layer models should be handled by adapters.

```ts
import {
  normalizeGraphicsLayoutSpecFromRLSCNode,
  toFigmaAutoLayoutFromGraphicsLayout,
} from 'rlsc-analysis';

const canonical = normalizeGraphicsLayoutSpecFromRLSCNode(doc.root);
const figmaLayout = canonical ? toFigmaAutoLayoutFromGraphicsLayout(canonical) : null;
```

The canonical interface types are:

- `GraphicsInterfaceNode`
- `GraphicsGeometrySpec`
- `GraphicsLayoutSpec`
- `GraphicsFigmaAutoLayoutSpec`

Mapping policy:

- CSS flex is normalized to canonical `layout.mode: "stack"` instead of keeping CSS-specific naming.
- Figma auto layout is generated from canonical stack layout through `toFigmaAutoLayoutFromGraphicsLayout()`.
- Photoshop-style exports should treat stack/grid as higher-level intent and degrade to grouped layers, bounds, transforms, and text layers when native auto layout is unavailable.

## Node Index

Use `createNodeIndex(doc)` when a document was collected elsewhere and only lookup helpers are needed.

```ts
import { createNodeIndex } from 'rlsc-analysis';

const index = createNodeIndex(doc);
const componentNodes = index.findByComponentId('CheckoutForm.SubmitButton');
const xpathNode = index.findByXPath('/main[1]/form[1]/button[1]');
```

The index treats `node.id` as a runtime identifier and `ScreenIdentifier` fields as stable re-identification metadata. Prefer `componentId`, `qaAddress`, `xpath`, or `cssSelector` for cross-snapshot debugging.

## Accuracy Smoke

Use the browser accuracy smoke when changing collection, identifier, or perspective integration behavior.

Inside this standalone repository, run:

```bash
pnpm accuracy:browser
```

Inside the qa-sdk monorepo, run:

```bash
pnpm --filter rlsc-analysis accuracy:browser
```

The smoke runs a real Chromium page and reports:

- geometry accuracy between `getBoundingClientRect()` and `RLSCNode.rect`
- XPath re-identification match rate through `scanScreen().byXPath()`
- Perspective top-view aspect-ratio accuracy for a small absolutely positioned child

Default thresholds:

- max rect delta: `<= 1px`
- min IoU: `>= 0.98`
- max aspect-ratio error: `<= 0.01`
- XPath match rate: `1.0`
