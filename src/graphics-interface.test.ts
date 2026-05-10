import { describe, expect, it } from 'vitest';
import type { FigmaAxisAlign, GraphicsLayoutSpec, RLSCNode } from './index.js';
import {
  normalizeGraphicsLayoutSpecFromRLSCNode,
  toFigmaAutoLayoutFromGraphicsLayout,
} from './index.js';

function createNode(styleStack: RLSCNode['styleStack']): RLSCNode {
  return {
    id: 'node-1',
    tag: 'div',
    classes: [],
    rect: { x: 0, y: 0, width: 320, height: 180 },
    zIndex: 0,
    depth: 0,
    display: 'flex',
    position: 'relative',
    overflow: 'visible',
    visible: true,
    attributes: {},
    children: [],
    styleStack,
  };
}

describe('graphics interface normalization', () => {
  it('maps CSS row flex to canonical layout and Figma row auto-layout values', () => {
    const rowNode = createNode({
      display: 'flex',
      position: 'relative',
      boxSizing: 'border-box',
      overflow: 'visible',
      figma: { layoutMode: 'HORIZONTAL', positionMode: 'AUTO' },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      autoLayout: {
        direction: 'row',
        wrap: false,
        gap: 16,
        justifyContent: 'flex-start',
        alignItems: 'center',
        alignContent: 'stretch',
      },
    });
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(rowNode);
    const figmaLayout = toFigmaAutoLayoutFromGraphicsLayout(layout);
    const expectedLayout: GraphicsLayoutSpec = {
      mode: 'flex',
      axis: 'horizontal',
      wraps: false,
      gap: 16,
      rowGap: 16,
      columnGap: 16,
      justifyContent: 'start',
      alignItems: 'center',
      alignContent: 'stretch',
    };

    expect(layout).toEqual(expectedLayout);
    expect(figmaLayout).toEqual({
      layoutMode: 'HORIZONTAL',
      itemSpacing: 16,
      counterAxisSpacing: 0,
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'CENTER',
    });
  });

  it('maps CSS column flex wrap with gaps to canonical and Figma column auto-layout values', () => {
    const columnNode = createNode({
      display: 'flex',
      position: 'relative',
      boxSizing: 'border-box',
      overflow: 'visible',
      figma: { layoutMode: 'VERTICAL', positionMode: 'AUTO' },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
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
    });
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(columnNode);
    const figmaLayout = toFigmaAutoLayoutFromGraphicsLayout(layout);

    expect(layout).toEqual({
      mode: 'flex',
      axis: 'vertical',
      wraps: true,
      gap: 8,
      rowGap: 12,
      columnGap: 24,
      justifyContent: 'space-between',
      alignItems: 'end',
      alignContent: 'space-around',
    });
    expect(figmaLayout).toEqual({
      layoutMode: 'VERTICAL',
      itemSpacing: 12,
      counterAxisSpacing: 24,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'MAX',
    } satisfies { layoutMode: 'HORIZONTAL' | 'VERTICAL' } & {
      itemSpacing: number;
      counterAxisSpacing: number;
      primaryAxisAlignItems: FigmaAxisAlign;
      counterAxisAlignItems: FigmaAxisAlign;
    });
  });

  it('uses row/column gap precedence and stretch mapping to Figma axis MIN align', () => {
    const rowWrapNode = createNode({
      display: 'flex',
      position: 'relative',
      boxSizing: 'border-box',
      overflow: 'visible',
      figma: { layoutMode: 'HORIZONTAL', positionMode: 'AUTO' },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      autoLayout: {
        direction: 'row',
        wrap: true,
        rowGap: 18,
        justifyContent: 'space-around',
        alignItems: 'stretch',
        alignContent: 'flex-end',
      },
    });
    const layout = normalizeGraphicsLayoutSpecFromRLSCNode(rowWrapNode);
    const figmaLayout = toFigmaAutoLayoutFromGraphicsLayout(layout);

    expect(layout).toEqual({
      mode: 'flex',
      axis: 'horizontal',
      wraps: true,
      gap: 0,
      rowGap: 18,
      columnGap: 0,
      justifyContent: 'space-around',
      alignItems: 'stretch',
      alignContent: 'end',
    });
    expect(figmaLayout).toEqual({
      layoutMode: 'HORIZONTAL',
      itemSpacing: 0,
      counterAxisSpacing: 18,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'MIN',
    });
  });
});
