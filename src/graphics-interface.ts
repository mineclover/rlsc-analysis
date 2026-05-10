// @def.boundary rlsc
import type { FigmaLayoutMode, RLSCNode, StandardStyleStack } from './index.js';

export type GraphicsAxis = 'horizontal' | 'vertical';
export type GraphicsLayoutMode = 'none' | 'flex' | 'grid';
export type GraphicsAxisAlign = 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';

export interface GraphicsGeometrySpec {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GraphicsLayoutSpec {
  readonly mode: GraphicsLayoutMode;
  readonly axis: GraphicsAxis | null;
  readonly wraps: boolean;
  readonly gap: number;
  readonly rowGap: number;
  readonly columnGap: number;
  readonly justifyContent: GraphicsAxisAlign;
  readonly alignItems: GraphicsAxisAlign;
  readonly alignContent: GraphicsAxisAlign;
}

export interface GraphicsInterfaceNode {
  readonly id: string;
  readonly tag: string;
  readonly geometry: GraphicsGeometrySpec;
  readonly visible: boolean;
  readonly layout: GraphicsLayoutSpec | null;
  readonly children: readonly GraphicsInterfaceNode[];
}

export type FigmaAxisAlign =
  | 'MIN'
  | 'CENTER'
  | 'MAX'
  | 'SPACE_BETWEEN';

export interface GraphicsFigmaAutoLayoutSpec {
  readonly layoutMode: 'HORIZONTAL' | 'VERTICAL';
  readonly itemSpacing: number;
  readonly counterAxisSpacing: number;
  readonly primaryAxisAlignItems: FigmaAxisAlign;
  readonly counterAxisAlignItems: FigmaAxisAlign;
}

export function normalizeGraphicsLayoutSpecFromStyleStack(
  styleStack?: StandardStyleStack,
): GraphicsLayoutSpec | null {
  if (!styleStack) return null;

  if (styleStack.figma.layoutMode === 'NONE') return null;
  if (styleStack.figma.layoutMode === 'GRID') {
    return {
      mode: 'grid',
      axis: null,
      wraps: false,
      gap: 0,
      rowGap: styleStack.grid?.rowGap ?? 0,
      columnGap: styleStack.grid?.columnGap ?? 0,
      justifyContent: 'start',
      alignItems: 'stretch',
      alignContent: 'stretch',
    };
  }

  if (styleStack.autoLayout) {
    const fallbackGap = styleStack.autoLayout.gap ?? 0;
    return {
      mode: 'flex',
      axis: convertFigmaLayoutAxis(styleStack.figma.layoutMode),
      wraps: styleStack.autoLayout.wrap,
      gap: fallbackGap,
      rowGap: styleStack.autoLayout.rowGap ?? fallbackGap,
      columnGap: styleStack.autoLayout.columnGap ?? fallbackGap,
      justifyContent: normalizeAxisAlign(styleStack.autoLayout.justifyContent),
      alignItems: normalizeAxisAlign(styleStack.autoLayout.alignItems),
      alignContent: normalizeAxisAlign(styleStack.autoLayout.alignContent),
    };
  }

  return null;
}

export function normalizeGraphicsLayoutSpecFromRLSCNode(node: RLSCNode): GraphicsLayoutSpec | null {
  return normalizeGraphicsLayoutSpecFromStyleStack(node.styleStack);
}

export function toGraphicsGeometrySpec(node: Pick<RLSCNode, 'rect'>): GraphicsGeometrySpec {
  return {
    x: node.rect.x,
    y: node.rect.y,
    width: node.rect.width,
    height: node.rect.height,
  };
}

export function toGraphicsInterfaceNode(node: RLSCNode): GraphicsInterfaceNode {
  return {
    id: node.id,
    tag: node.tag,
    geometry: toGraphicsGeometrySpec(node),
    visible: node.visible,
    layout: normalizeGraphicsLayoutSpecFromRLSCNode(node),
    children: node.children.map((child) => toGraphicsInterfaceNode(child)),
  };
}

export function toFigmaAutoLayoutFromGraphicsLayout(
  layout: GraphicsLayoutSpec | null,
): GraphicsFigmaAutoLayoutSpec | null {
  if (!layout || layout.mode !== 'flex' || layout.axis === null) return null;

  const itemSpacing = layout.axis === 'horizontal' ? layout.columnGap : layout.rowGap;
  const counterAxisSpacing =
    layout.wraps === true && layout.axis === 'horizontal' ? layout.rowGap : layout.axis === 'horizontal' ? 0 : layout.wraps ? layout.columnGap : 0;

  return {
    layoutMode: layout.axis === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL',
    itemSpacing,
    counterAxisSpacing,
    primaryAxisAlignItems: toFigmaAxisAlign(layout.justifyContent),
    counterAxisAlignItems: toFigmaAxisAlign(layout.alignItems),
  };
}

export function toFigmaAutoLayoutFromRLSCNode(
  node: RLSCNode,
): GraphicsFigmaAutoLayoutSpec | null {
  return toFigmaAutoLayoutFromGraphicsLayout(normalizeGraphicsLayoutSpecFromRLSCNode(node));
}

export function isCanonicalFlexLayout(layout: GraphicsLayoutSpec | null): layout is GraphicsLayoutSpec & {
  mode: 'flex';
  axis: GraphicsAxis;
} {
  return !!layout && layout.mode === 'flex' && layout.axis !== null;
}

function toFigmaAxisAlign(align: GraphicsAxisAlign): FigmaAxisAlign {
  if (align === 'center') return 'CENTER';
  if (align === 'end') return 'MAX';
  if (align === 'space-between' || align === 'space-around' || align === 'space-evenly')
    return 'SPACE_BETWEEN';
  return 'MIN';
}

function normalizeAxisAlign(value: string): GraphicsAxisAlign {
  switch (value) {
    case 'center':
      return 'center';
    case 'flex-start':
    case 'start':
    case 'left':
      return 'start';
    case 'flex-end':
    case 'end':
    case 'right':
      return 'end';
    case 'space-between':
      return 'space-between';
    case 'space-around':
      return 'space-around';
    case 'space-evenly':
      return 'space-evenly';
    case 'stretch':
    default:
      return 'stretch';
  }
}

function convertFigmaLayoutAxis(layoutMode: FigmaLayoutMode): GraphicsAxis {
  return layoutMode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
}
