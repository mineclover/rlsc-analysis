import { describe, expect, it } from 'vitest';
import {
  analyzeAreas,
  analyzeTextOccupancy,
  createNodeIndex,
  detectAreaOverflow,
  formatRLSCSnapshot,
  findNodeByXPath,
  getFigmaCoverage,
  getGraphicsAdapterCoverage,
  getGraphicsAdapterCoverages,
  toFigmaAutoLayoutFromGraphicsLayout,
  summarizeRLSCDocument,
} from './index.js';
import type { AreaOverflowIssue, RLSCDocument, RLSCNode } from './index.js';

describe('rlsc-analysis public API', () => {
  it('exports RLSCDocument and issue data types without rendering dependencies', () => {
    const doc = {
      version: '1.0',
      viewport: { width: 100, height: 100 },
      url: 'about:blank',
      timestamp: '2026-05-04T00:00:00.000Z',
      root: {
        id: 'root',
        tag: 'main',
        classes: [],
        rect: { x: 0, y: 0, width: 100, height: 100 },
        zIndex: 0,
        depth: 0,
        display: 'block',
        position: 'static',
        overflow: 'visible',
        visible: true,
        attributes: {},
        children: [],
      },
      grid: { cellSize: 8, cols: 1, rows: 1, cells: [] },
      layers: [],
      relations: [],
    } satisfies RLSCDocument;
    const issue = {
      parentId: 'root',
      childId: 'child',
      overflow: { top: 0, right: 1, bottom: 0, left: 0 },
      exceededPx: 1,
    } satisfies AreaOverflowIssue;

    expect(doc.root.id).toBe('root');
    expect(issue.childId).toBe('child');
  });

  it('exports graphics adapter conversion and coverage APIs', () => {
    expect(getFigmaCoverage().id).toBe('figma');
    expect(getGraphicsAdapterCoverage('figma')?.id).toBe('figma');
    expect(getGraphicsAdapterCoverages()).toHaveLength(5);
    expect(toFigmaAutoLayoutFromGraphicsLayout(null)).toBeNull();
  });
});

describe('debug issue analysis', () => {
  it('detects child rectangles leaking outside their parent', () => {
    const parent = node({
      id: 'parent',
      rect: { x: 10, y: 10, width: 100, height: 60 },
      children: [
        node({
          id: 'child',
          rect: { x: 92, y: 12, width: 40, height: 20 },
        }),
      ],
    });
    const doc = documentWithRoot(parent);

    expect(detectAreaOverflow(doc)).toEqual([
      {
        parentId: 'parent',
        childId: 'child',
        overflow: { top: 0, right: 22, bottom: 0, left: 0 },
        exceededPx: 22,
      },
    ]);
  });

  it('reports text overflow metrics when text occupancy data is provided', () => {
    const doc = documentWithRoot(
      node({
        id: 'copy',
        rect: { x: 0, y: 0, width: 42, height: 18 },
        textContent: 'A long identifier label that wraps beyond the available height',
        fontInfo: {
          fontString: '16px sans-serif',
          lineHeight: 16,
          textAlign: 'left',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
        },
      }),
    );
    const text = analyzeTextOccupancy(doc, new Map());

    expect(text).toHaveLength(1);
    expect(text[0]?.overflows).toBe(true);
    expect(analyzeAreas(doc, { textOccupancies: text }).metrics.textOverflowCount).toBe(1);
  });

  it('indexes nodes by xpath and stable screen identifiers', () => {
    const child = node({
      id: 'child',
      rect: { x: 10, y: 10, width: 40, height: 20 },
      identifier: {
        kind: 'componentId',
        value: 'Card.Title',
        componentId: 'Card.Title',
        qaAddress: 'card:title',
        cssSelector: 'main > h2',
        xpath: '/main[1]/h2[1]',
        nodeId: 'child',
      },
    });
    const doc = documentWithRoot(
      node({
        id: 'root',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        children: [child],
      }),
    );
    const index = createNodeIndex(doc);

    expect(index.findByXPath('/main[1]/h2[1]')?.id).toBe('child');
    expect(index.findByCssSelector('main > h2')?.id).toBe('child');
    expect(index.findByComponentId('Card.Title')).toHaveLength(1);
    expect(index.findByQaAddress('card:title')).toHaveLength(1);
    expect(findNodeByXPath(doc, '/main[1]/h2[1]')?.identifier.value).toBe('Card.Title');
    expect(analyzeAreas(doc).index.findById('child')?.identifier.xpath).toBe('/main[1]/h2[1]');
  });
});

describe('snapshot readability helpers', () => {
  it('summarizes a document without losing relation-type counts', () => {
    const child = node({
      id: 'child',
      tag: 'button',
      rect: { x: 10, y: 12, width: 40, height: 20 },
      debugLabel: 'Submit order',
      address: 'checkout:submit',
    });
    const doc = documentWithRoot(
      node({
        id: 'root',
        tag: 'main',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        children: [child],
      }),
    );
    const summary = summarizeRLSCDocument(doc);

    expect(summary.nodeCount).toBe(2);
    expect(summary.visibleNodeCount).toBe(2);
    expect(summary.relationCount).toBe(0);
    expect(summary.relationsByType.contains).toBe(0);
    expect(summary.root).toEqual({ id: 'root', tag: 'main' });
  });

  it('formats a compact tree with readable identifiers and bounded output', () => {
    const child = node({
      id: 'child',
      tag: 'button',
      classes: ['primary'],
      rect: { x: 10, y: 12, width: 40, height: 20 },
      debugLabel: 'Submit order',
      attributes: { 'data-qa-address': 'checkout:submit', type: 'submit' },
      textContent: 'Submit',
      identifier: {
        kind: 'qaAddress',
        value: 'checkout:submit',
        qaAddress: 'checkout:submit',
        nodeId: 'child',
      },
    });
    const doc = documentWithRoot(
      node({
        id: 'root',
        tag: 'main',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        children: [child],
      }),
    );

    const output = formatRLSCSnapshot(doc, {
      maxDepth: 0,
      maxNodes: 1,
      includeLayers: false,
      includeRelations: false,
      includeAttributes: true,
    });

    expect(output).toContain('RLSC snapshot v1.0');
    expect(output).toContain('viewport 200×120');
    expect(output).toContain('- main @0,0 100×100 id=root');
    expect(output).toContain('… 1 node omitted');
    expect(output).not.toContain('data-qa-address=');
    expect(formatRLSCSnapshot(doc, { includeAttributes: true })).toContain(
      'data-qa-address="checkout:submit"',
    );
  });
});

function documentWithRoot(root: RLSCNode): RLSCDocument {
  return {
    version: '1.0',
    viewport: { width: 200, height: 120 },
    url: 'about:blank',
    timestamp: '2026-05-04T00:00:00.000Z',
    root,
    grid: { cellSize: 8, cols: 1, rows: 1, cells: [] },
    layers: [],
    relations: [],
  };
}

function node(overrides: Partial<RLSCNode> & Pick<RLSCNode, 'id' | 'rect'>): RLSCNode {
  return {
    id: overrides.id,
    tag: overrides.tag ?? 'div',
    classes: overrides.classes ?? [],
    role: overrides.role,
    rect: overrides.rect,
    zIndex: overrides.zIndex ?? 0,
    depth: overrides.depth ?? 0,
    display: overrides.display ?? 'block',
    position: overrides.position ?? 'static',
    overflow: overrides.overflow ?? 'visible',
    visible: overrides.visible ?? true,
    textContent: overrides.textContent,
    address: overrides.address,
    fontInfo: overrides.fontInfo,
    identifier: overrides.identifier,
    attributes: overrides.attributes ?? {},
    children: overrides.children ?? [],
  };
}
