# @qa-sdk/rlsc-analysis

Screen analysis package for RLSC. It owns the screen document model, metadata helpers, DOM collection, layout analysis, identifier extraction, and issue detection.

This package does not depend on Three.js or perspective rendering.

## Metadata

Use metadata helpers when application code can mark component boundaries before collection.

```ts
import { createMetadataAttributes, annotateElement } from '@qa-sdk/rlsc-analysis';

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
import { analyzeAreas, createNodeIndex, detectAreaOverflow } from '@qa-sdk/rlsc-analysis';

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

Browser-only APIs are exported from `@qa-sdk/rlsc-analysis/browser`.

```ts
import { collectLayoutWithText, scanScreen } from '@qa-sdk/rlsc-analysis/browser';

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

## Node Index

Use `createNodeIndex(doc)` when a document was collected elsewhere and only lookup helpers are needed.

```ts
import { createNodeIndex } from '@qa-sdk/rlsc-analysis';

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
pnpm --filter @qa-sdk/rlsc-analysis accuracy:browser
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
