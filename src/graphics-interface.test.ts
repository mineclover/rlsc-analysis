import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  FigmaAxisAlign,
  GraphicsAdapterDiagnostic,
  GraphicsLayoutSpec,
  RLSCNode,
  StandardStyleStack,
} from './index.js';
import {
  isCanonicalStackLayout,
  normalizeGraphicsLayoutSpecFromRLSCNode,
  normalizeGraphicsLayoutSpecFromStyleStack,
  getCssDomCoverage,
  getFigmaCoverage,
  getGraphicsAdapterCoverage,
  getGraphicsAdapterCoverages,
  toFigmaAutoLayoutFromGraphicsLayout,
  toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics,
  toFigmaAutoLayoutFromRLSCNode,
  toGraphicsInterfaceNode,
} from './index.js';

function createNode(
  styleStack: RLSCNode['styleStack'],
  overrides: Partial<RLSCNode> = {},
): RLSCNode {
  return {
    id: overrides.id ?? 'node-1',
    tag: overrides.tag ?? 'div',
    classes: overrides.classes ?? [],
    rect: overrides.rect ?? { x: 0, y: 0, width: 320, height: 180 },
    zIndex: overrides.zIndex ?? 0,
    depth: overrides.depth ?? 0,
    display: overrides.display ?? 'flex',
    position: overrides.position ?? 'relative',
    overflow: overrides.overflow ?? 'visible',
    visible: overrides.visible ?? true,
    attributes: overrides.attributes ?? {},
    children: overrides.children ?? [],
    styleStack,
  };
}

function baseStyleStack(overrides: Partial<StandardStyleStack> = {}): StandardStyleStack {
  return {
    display: 'block',
    position: 'static',
    boxSizing: 'border-box',
    overflow: 'visible',
    figma: { layoutMode: 'NONE', positionMode: 'AUTO' },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    ...overrides,
  };
}

const graphicsAdapterCoverageSpecPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs/specs/viz-system/viz-language-system/graphics-interface-adapter-coverage.spec.md',
);

function readGraphicsAdapterCoverageSpec(): string {
  return readFileSync(graphicsAdapterCoverageSpecPath, 'utf8');
}

function parseSpecSourceAuthorityRows(specText: string): Record<
  string,
  { primary: string; secondary: string }
> {
  const lines = specText.split('\n');
  const headerIndex = lines.findIndex((line) => line.includes('| Adapter | 1차 기준 | 2차 기준 |'));
  if (headerIndex < 0) return {};

  const rows: Record<string, { primary: string; secondary: string }> = {};
  for (let idx = headerIndex + 2; idx < lines.length; idx += 1) {
    const line = lines[idx];
    if (!line.startsWith('|')) break;
    if (!line.includes('`')) continue;

    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;

    const [rawId, primary, secondary] = cells;
    const id = rawId.replace(/`/g, '');
    rows[id] = { primary, secondary };
  }
  return rows;
}

describe('graphics interface normalization', () => {
  it('maps CSS row flex to canonical layout and Figma row auto-layout values', () => {
    const rowNode = createNode(baseStyleStack({
      display: 'inline-flex',
      figma: { layoutMode: 'HORIZONTAL', positionMode: 'AUTO' },
      autoLayout: {
        direction: 'row',
        wrap: false,
        gap: 16,
        justifyContent: 'flex-start',
        alignItems: 'center',
        alignContent: 'stretch',
      },
    }));
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(rowNode);
    const figmaLayout = toFigmaAutoLayoutFromGraphicsLayout(layout);
    const expectedLayout: GraphicsLayoutSpec = {
      mode: 'stack',
      axis: 'horizontal',
      wraps: false,
      gap: 16,
      rowGap: 16,
      columnGap: 16,
      justifyContent: 'start',
      alignItems: 'center',
      alignContent: 'stretch',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      position: { mode: 'auto' },
      sizing: { width: 'unknown', height: 'unknown' },
    };

    expect(layout).toEqual(expectedLayout);
    expect(figmaLayout).toEqual({
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'NO_WRAP',
      itemSpacing: 16,
      counterAxisSpacing: 0,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'CENTER',
      counterAxisAlignContent: 'AUTO',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
    });
  });

  it('maps CSS column flex wrap with gaps to canonical and Figma column auto-layout values', () => {
    const columnNode = createNode(baseStyleStack({
      display: 'flex',
      figma: { layoutMode: 'VERTICAL', positionMode: 'AUTO' },
      autoLayout: {
        direction: 'column',
        wrap: true,
        rowGap: 12,
        columnGap: 24,
        gap: 8,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        alignContent: 'space-around',
      },
    }));
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(columnNode);
    const figmaLayout = toFigmaAutoLayoutFromGraphicsLayout(layout);

    expect(layout).toEqual({
      mode: 'stack',
      axis: 'vertical',
      wraps: true,
      gap: 8,
      rowGap: 12,
      columnGap: 24,
      justifyContent: 'space-between',
      alignItems: 'end',
      alignContent: 'space-around',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      position: { mode: 'auto' },
      sizing: { width: 'unknown', height: 'unknown' },
    });
    expect(figmaLayout).toEqual({
      layoutMode: 'VERTICAL',
      layoutWrap: 'WRAP',
      itemSpacing: 12,
      counterAxisSpacing: 24,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'MAX',
      counterAxisAlignContent: 'AUTO',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
    } satisfies { layoutMode: 'HORIZONTAL' | 'VERTICAL' } & {
      layoutWrap: 'NO_WRAP' | 'WRAP';
      itemSpacing: number;
      counterAxisSpacing: number;
      paddingTop: number;
      paddingRight: number;
      paddingBottom: number;
      paddingLeft: number;
      primaryAxisAlignItems: FigmaAxisAlign;
      counterAxisAlignItems: FigmaAxisAlign;
      counterAxisAlignContent: 'AUTO' | 'SPACE_BETWEEN';
      primaryAxisSizingMode: 'FIXED' | 'AUTO';
      counterAxisSizingMode: 'FIXED' | 'AUTO';
    });
  });

  it('uses row/column gap precedence and stretch mapping to Figma axis MIN align', () => {
    const rowWrapNode = createNode(baseStyleStack({
      display: 'flex',
      figma: { layoutMode: 'HORIZONTAL', positionMode: 'AUTO' },
      autoLayout: {
        direction: 'row',
        wrap: true,
        rowGap: 18,
        justifyContent: 'space-around',
        alignItems: 'stretch',
        alignContent: 'flex-end',
      },
    }));
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(rowWrapNode);
    const figmaLayout = toFigmaAutoLayoutFromGraphicsLayout(layout);

    expect(layout).toEqual({
      mode: 'stack',
      axis: 'horizontal',
      wraps: true,
      gap: 0,
      rowGap: 18,
      columnGap: 0,
      justifyContent: 'space-around',
      alignItems: 'stretch',
      alignContent: 'end',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      position: { mode: 'auto' },
      sizing: { width: 'unknown', height: 'unknown' },
    });
    expect(figmaLayout).toEqual({
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      itemSpacing: 0,
      counterAxisSpacing: 18,
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'MIN',
      counterAxisAlignContent: 'AUTO',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
    });
  });

  it('keeps non-layout and grid nodes out of the Figma auto-layout adapter', () => {
    expect(normalizeGraphicsLayoutSpecFromStyleStack(baseStyleStack())).toBeNull();

    const gridLayout = normalizeGraphicsLayoutSpecFromStyleStack(baseStyleStack({
      display: 'grid',
      position: 'fixed',
      figma: { layoutMode: 'GRID', positionMode: 'ABSOLUTE' },
      padding: { top: 4, right: 8, bottom: 12, left: 16 },
      grid: {
        templateColumns: '120px 1fr',
        templateRows: 'auto auto',
        autoFlow: 'row',
        rowGap: 10,
        columnGap: 20,
      },
    }));

    expect(gridLayout).toEqual({
      mode: 'grid',
      axis: null,
      wraps: false,
      gap: 0,
      rowGap: 10,
      columnGap: 20,
      justifyContent: 'start',
      alignItems: 'stretch',
      alignContent: 'stretch',
      padding: { top: 4, right: 8, bottom: 12, left: 16 },
      position: { mode: 'fixed' },
      sizing: { width: 'unknown', height: 'unknown' },
    });
    expect(toFigmaAutoLayoutFromGraphicsLayout(gridLayout)).toBeNull();
    expect(isCanonicalStackLayout(gridLayout)).toBe(false);
  });

  it('passes padding, absolute positioning, and align-content through Figma adapter fields', () => {
    const absoluteStack = createNode(baseStyleStack({
      display: 'flex',
      position: 'absolute',
      figma: { layoutMode: 'HORIZONTAL', positionMode: 'ABSOLUTE' },
      padding: { top: 6, right: 10, bottom: 14, left: 18 },
      autoLayout: {
        direction: 'row',
        wrap: true,
        rowGap: 9,
        columnGap: 15,
        justifyContent: 'center',
        alignItems: 'flex-start',
        alignContent: 'space-between',
      },
    }));
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(absoluteStack);

    expect(isCanonicalStackLayout(layout)).toBe(true);
    expect(layout?.position.mode).toBe('absolute');
    expect(toFigmaAutoLayoutFromRLSCNode(absoluteStack)).toEqual({
      layoutMode: 'HORIZONTAL',
      layoutWrap: 'WRAP',
      itemSpacing: 15,
      counterAxisSpacing: 9,
      paddingTop: 6,
      paddingRight: 10,
      paddingBottom: 14,
      paddingLeft: 18,
      primaryAxisAlignItems: 'CENTER',
      counterAxisAlignItems: 'MIN',
      counterAxisAlignContent: 'SPACE_BETWEEN',
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
    });
  });

  it('converts an RLSC subtree into a canonical graphics interface tree', () => {
    const child = createNode(baseStyleStack(), {
      id: 'child',
      tag: 'button',
      rect: { x: 12, y: 16, width: 80, height: 32 },
      visible: false,
      display: 'block',
    });
    const root = createNode(baseStyleStack({
      display: 'flex',
      figma: { layoutMode: 'VERTICAL', positionMode: 'AUTO' },
      autoLayout: {
        direction: 'column',
        wrap: false,
        gap: 6,
        justifyContent: 'start',
        alignItems: 'stretch',
        alignContent: 'stretch',
      },
    }), {
      id: 'root',
      tag: 'main',
      rect: { x: 0, y: 0, width: 240, height: 120 },
      children: [child],
    });

    expect(toGraphicsInterfaceNode(root)).toEqual({
      id: 'root',
      tag: 'main',
      geometry: { x: 0, y: 0, width: 240, height: 120 },
      visible: true,
      layout: {
        mode: 'stack',
        axis: 'vertical',
        wraps: false,
        gap: 6,
        rowGap: 6,
        columnGap: 6,
        justifyContent: 'start',
        alignItems: 'stretch',
        alignContent: 'stretch',
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        position: { mode: 'auto' },
        sizing: { width: 'unknown', height: 'unknown' },
      },
      children: [
        {
          id: 'child',
          tag: 'button',
          geometry: { x: 12, y: 16, width: 80, height: 32 },
          visible: false,
          layout: null,
          children: [],
        },
      ],
    });
  });
});

describe('graphics interface adapter coverage and diagnostics', () => {
  it('reads graphics adapter coverage spec and validates figma locators', () => {
    const spec = readGraphicsAdapterCoverageSpec();

    expect(spec).toContain('AdapterCoverage');
    expect(spec).toContain('https://developers.figma.com/docs/plugins/api/typings/');
    expect(spec).toContain('@figma/plugin-typings');
  });

  it('exports non-empty adapter coverage buckets and aligns source authorities', () => {
    const specText = readGraphicsAdapterCoverageSpec();
    const rows = parseSpecSourceAuthorityRows(specText);
    const coverages = getGraphicsAdapterCoverages();
    const rowIds = new Set(Object.keys(rows));
    const ids = new Set(coverages.map((coverage) => coverage.id));

    expect(ids).toEqual(new Set(['css-dom', 'figma', 'pencil', 'photoshop', 'stitch']));
    for (const id of ids) {
      expect(rowIds).toContain(id);
    }

    expect(getCssDomCoverage().id).toBe('css-dom');
    expect(getFigmaCoverage().id).toBe('figma');
    expect(getGraphicsAdapterCoverage('figma')?.id).toBe('figma');
    expect(getGraphicsAdapterCoverage('missing')).toBeUndefined();

    for (const coverage of coverages) {
      const row = rows[coverage.id];
      expect(row).toBeDefined();
      if (!row) continue;

      const rowText = `${row.primary} ${row.secondary}`.toLowerCase().replace(/`/g, '');
      for (const sourceAuthority of coverage.sourceAuthority) {
        expect(rowText).toContain(sourceAuthority.name.toLowerCase().replace(/`/g, ''));
        if (
          sourceAuthority.locator.startsWith('http')
          || sourceAuthority.locator.includes('@')
        ) {
          expect(specText).toContain(sourceAuthority.locator);
        }
      }

      expect(coverage.supported.length).toBeGreaterThan(0);
      expect(coverage.degraded.length).toBeGreaterThan(0);
      expect(coverage.unsupported.length).toBeGreaterThan(0);
    }

    const figmaCoverage = getFigmaCoverage();
    const row = rows.figma;
    expect(row).toBeDefined();
    if (row) {
      const rowText = `${row.primary} ${row.secondary}`.toLowerCase().replace(/`/g, '');
      for (const authority of figmaCoverage.sourceAuthority) {
        expect(rowText).toContain(authority.name.toLowerCase().replace(/`/g, ''));
        if (authority.locator.startsWith('http') || authority.locator.includes('@')) {
          expect(specText).toContain(authority.locator);
        }
      }
    }

    expect(figmaCoverage.sourceAuthority.map((authority) => authority.locator)).toContain(
      'https://developers.figma.com/docs/plugins/api/typings/',
    );
    expect(figmaCoverage.sourceAuthority.map((authority) => authority.locator)).toContain(
      '@figma/plugin-typings',
    );
  });

  it('returns null with unsupported diagnostic for absolute and group non-stack modes', () => {
    const absoluteModeLayout: GraphicsLayoutSpec = {
      mode: 'absolute',
      axis: null,
      wraps: false,
      gap: 0,
      rowGap: 0,
      columnGap: 0,
      justifyContent: 'start',
      alignItems: 'stretch',
      alignContent: 'space-between',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      position: { mode: 'auto' },
      sizing: { width: 'fixed', height: 'fixed' },
    };
    const groupModeLayout: GraphicsLayoutSpec = {
      ...absoluteModeLayout,
      mode: 'group',
    };
    const absoluteDiagnostics: GraphicsAdapterDiagnostic[] = [];
    const groupDiagnostics: GraphicsAdapterDiagnostic[] = [];

    const absoluteResult = toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(absoluteModeLayout, {
      onDiagnostic: (diagnostic) => absoluteDiagnostics.push(diagnostic),
    });
    const groupResult = toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(groupModeLayout, {
      onDiagnostic: (diagnostic) => groupDiagnostics.push(diagnostic),
    });

    expect(absoluteResult).toBeNull();
    expect(groupResult).toBeNull();
    expect(absoluteDiagnostics).toHaveLength(1);
    expect(groupDiagnostics).toHaveLength(1);
    expect(absoluteDiagnostics[0]?.reason).toBe('unsupported-layout-mode');
    expect(absoluteDiagnostics[0]?.severity).toBe('unsupported');
    expect(absoluteDiagnostics[0]?.field).toBe('mode');
    expect(absoluteDiagnostics[0]?.path).toBe('mode');
    expect(absoluteDiagnostics[0]?.sourceValue).toBe('absolute');
    expect(absoluteDiagnostics[0]?.targetValue).toBeNull();
    expect(absoluteDiagnostics[0]?.adapterId).toBe('figma');
    expect(absoluteDiagnostics[0]?.sourceAuthority).toEqual(getFigmaCoverage().sourceAuthority);

    expect(groupDiagnostics[0]?.reason).toBe('unsupported-layout-mode');
    expect(groupDiagnostics[0]?.severity).toBe('unsupported');
    expect(groupDiagnostics[0]?.field).toBe('mode');
    expect(groupDiagnostics[0]?.path).toBe('mode');
    expect(groupDiagnostics[0]?.sourceValue).toBe('group');
    expect(groupDiagnostics[0]?.targetValue).toBeNull();
    expect(groupDiagnostics[0]?.adapterId).toBe('figma');
    expect(groupDiagnostics[0]?.sourceAuthority).toEqual(getFigmaCoverage().sourceAuthority);
    expect(toFigmaAutoLayoutFromGraphicsLayout(absoluteModeLayout)).toBeNull();
    expect(toFigmaAutoLayoutFromGraphicsLayout(groupModeLayout)).toBeNull();
  });

  it('maps fill/unknown sizing with specific sizing diagnostics', () => {
    const fillUnknownSizingLayout: GraphicsLayoutSpec = {
      mode: 'stack',
      axis: 'horizontal',
      wraps: false,
      gap: 0,
      rowGap: 0,
      columnGap: 0,
      justifyContent: 'start',
      alignItems: 'stretch',
      alignContent: 'space-between',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      position: { mode: 'auto' },
      sizing: { width: 'fill', height: 'unknown' },
    };

    const diagnostics: GraphicsAdapterDiagnostic[] = [];
    const result = toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(fillUnknownSizingLayout, {
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });
    const unsupportedSizingDiagnostic = diagnostics.find(
      (entry) => entry.reason === 'unsupported-target-value',
    );
    const unknownSizingDiagnostic = diagnostics.find(
      (entry) => entry.reason === 'unknown-source-value',
    );

    expect(result?.artifact.primaryAxisSizingMode).toBe('FIXED');
    expect(result?.artifact.counterAxisSizingMode).toBe('FIXED');
    expect(unsupportedSizingDiagnostic).toMatchObject({
      reason: 'unsupported-target-value',
      severity: 'unsupported',
      field: 'sizing.width',
      path: 'sizing.width',
      sourceValue: 'fill',
      targetValue: 'FIXED',
      adapterId: 'figma',
      code: 'unsupported-target-value',
      sourceAuthority: getFigmaCoverage().sourceAuthority,
    });
    expect(unknownSizingDiagnostic).toMatchObject({
      reason: 'unknown-source-value',
      severity: 'degraded',
      field: 'sizing.height',
      path: 'sizing.height',
      sourceValue: 'unknown',
      targetValue: 'FIXED',
      adapterId: 'figma',
      code: 'unknown-source-value',
      sourceAuthority: getFigmaCoverage().sourceAuthority,
    });
  });

  it('emits lossy diagnostic when alignContent fallback is AUTO', () => {
    const lossyAlignLayout: GraphicsLayoutSpec = {
      mode: 'stack',
      axis: 'vertical',
      wraps: false,
      gap: 0,
      rowGap: 0,
      columnGap: 0,
      justifyContent: 'start',
      alignItems: 'center',
      alignContent: 'start',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      position: { mode: 'auto' },
      sizing: { width: 'fixed', height: 'fixed' },
    };

    const diagnostics: GraphicsAdapterDiagnostic[] = [];
    const result = toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(lossyAlignLayout, {
      onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    });

    expect(result?.artifact.counterAxisAlignContent).toBe('AUTO');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      reason: 'lossy-target-equivalent',
      severity: 'degraded',
      sourceValue: 'start',
      targetValue: 'AUTO',
      field: 'alignContent',
      path: 'alignContent',
      adapterId: 'figma',
      sourceAuthority: getFigmaCoverage().sourceAuthority,
    });
  });
});
