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

### Readable snapshot output

`scanScreen().doc` is the lossless `RLSCDocument` contract. It is appropriate for
JSON exchange, but printing it directly includes the full grid, relation list,
computed style stack, and nested children. For a review, terminal, or demo
panel, use the bounded text projection instead:

```ts
import { formatRLSCSnapshot } from 'rlsc-analysis';
import { scanScreen } from 'rlsc-analysis/browser';

const scan = scanScreen(document.body, { includeText: true });
console.log(formatRLSCSnapshot(scan.doc, {
  maxDepth: 5,
  maxNodes: 120,
  maxRelations: 24,
}));
```

The output starts with viewport/node/layer/relation counts, then prints an
indented element tree with geometry and stable identifiers (`componentId`,
`qaAddress`, or `debugLabel`). Layer and relation sections follow with bounded
row counts. `summarizeRLSCDocument(doc)` exposes the same counters as a JSON
object when a UI wants to render its own summary. Use `JSON.stringify(doc,
null, 2)` when a lossless machine-readable artifact is required.

For a human review that also needs layout signals, opt in to the compact
analysis section. It reports dominant flow, balance, grid/spacing signals,
golden-ratio score, and bounded area-overflow diagnostics. The analysis is
derived from the document and does not replace the lossless snapshot.

```ts
import { formatRLSCSnapshot, summarizeRLSCAnalysis } from 'rlsc-analysis';

const review = formatRLSCSnapshot(result.doc, {
  includeAnalysis: true,
  maxIssues: 8,
});
console.log(review);

const analysis = summarizeRLSCAnalysis(result.doc);
// analysis.overflowIssueCount / analysis.maxOverflowPx
// analysis.dominantFlow / analysis.spacingBase / analysis.gridPattern
```

`includeAnalysis` defaults to `false` so existing bounded output remains stable.
Use `analyzeAreas(doc)` when the full metrics, pattern, node index, or complete
issue records are required.

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
  toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics,
  getFigmaCoverage,
  getGraphicsAdapterCoverage,
  GraphicsAdapterDiagnostic,
} from 'rlsc-analysis';

const canonical = normalizeGraphicsLayoutSpecFromRLSCNode(doc.root);
const figmaLayout = canonical ? toFigmaAutoLayoutFromGraphicsLayout(canonical) : null;
const figmaWithDiagnostics = canonical
  ? toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(canonical, {
      onDiagnostic: (diagnostic: GraphicsAdapterDiagnostic) => {
        console.debug(
          diagnostic.reason,
          diagnostic.severity,
          diagnostic.field,
          diagnostic.sourceValue,
        );
      },
    })
  : null;
const figmaCoverage = getFigmaCoverage();
const cssCoverage = getGraphicsAdapterCoverage('css-dom');
```

The canonical interface types are:

- `GraphicsInterfaceNode`
- `GraphicsGeometrySpec`
- `GraphicsLayoutSpec`
- `GraphicsFigmaAutoLayoutSpec`

Mapping policy:

- CSS flex is normalized to canonical `layout.mode: "stack"` instead of keeping CSS-specific naming.
- Canonical `layout.mode` now also allows `none`, `absolute`, and `group` to represent
  non-auto-layout intents.
- Figma auto layout is generated from canonical stack layout through `toFigmaAutoLayoutFromGraphicsLayout()`.
- For richer consumers, `toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics()` reports
  unsupported or lossy field mappings while preserving the same artifact output.
- Photoshop-style exports should treat stack/grid as higher-level intent and degrade to grouped layers, bounds, transforms, and text layers when native auto layout is unavailable.

Adapter coverage helpers provide source authority and support/degraded/unsupported snapshots:

```ts
import {
  getCssDomCoverage,
  getFigmaCoverage,
  getGraphicsAdapterCoverages,
} from 'rlsc-analysis';

const allCoverages = getGraphicsAdapterCoverages();
const figmaCoverage = getFigmaCoverage();
const cssCoverage = getCssDomCoverage();
const byName = getGraphicsAdapterCoverage('figma');
```

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

Use the browser accuracy smoke when changing collection, identifier, or perspective integration behavior. The command requires the sibling `rlsc-perspective` and `@qa-sdk/e2e` workspace packages; it fails closed when either package is absent.

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

In the qa-sdk repository, `rlsc-perspective` is externalized to
[pnpm-mcp](https://github.com/mineclover/pnpm-mcp/tree/main/packages/rlsc-perspective).
Run the full accuracy smoke from that checkout. The qa-sdk-local checks are the
`rlsc-analysis` unit/build checks and the `visbug-bridge` integration smoke.
