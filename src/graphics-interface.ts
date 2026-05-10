// @def.boundary rlsc
import type { FigmaLayoutMode, RLSCNode, StandardStyleStack } from './index.js';

export type GraphicsAxis = 'horizontal' | 'vertical';
export type GraphicsLayoutMode = 'none' | 'stack' | 'grid' | 'absolute' | 'group';
export type GraphicsAxisAlign =
  | 'start'
  | 'center'
  | 'end'
  | 'stretch'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type GraphicsPositionMode = 'auto' | 'absolute' | 'fixed';
export type GraphicsSizingMode = 'fixed' | 'hug' | 'fill' | 'unknown';

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
  readonly padding: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly position: {
    readonly mode: GraphicsPositionMode;
  };
  readonly sizing: {
    readonly width: GraphicsSizingMode;
    readonly height: GraphicsSizingMode;
  };
}

export interface GraphicsInterfaceNode {
  readonly id: string;
  readonly tag: string;
  readonly geometry: GraphicsGeometrySpec;
  readonly visible: boolean;
  readonly layout: GraphicsLayoutSpec | null;
  readonly children: readonly GraphicsInterfaceNode[];
}

export type GraphicsAdapterId = 'css-dom' | 'figma' | 'pencil' | 'photoshop' | 'stitch';

export type AdapterSourceAuthorityKind = 'docs' | 'mcp' | 'types' | 'fixture';

export interface AdapterSourceAuthority {
  readonly kind: AdapterSourceAuthorityKind;
  readonly name: string;
  readonly locator: string;
}

export interface AdapterCoverage {
  readonly id: GraphicsAdapterId;
  readonly sourceAuthority: readonly AdapterSourceAuthority[];
  readonly supported: readonly string[];
  readonly degraded: readonly string[];
  readonly unsupported: readonly string[];
}

export type GraphicsAdapterDiagnosticCode =
  | 'unsupported-layout-mode'
  | 'unsupported-target-value'
  | 'unknown-source-value'
  | 'lossy-target-equivalent';

export interface GraphicsAdapterDiagnostic {
  readonly adapter: GraphicsAdapterId;
  readonly code: GraphicsAdapterDiagnosticCode;
  readonly message: string;
  readonly path: string;
}

export interface GraphicsAdapterConversion<T> {
  readonly artifact: T;
  readonly diagnostics: readonly GraphicsAdapterDiagnostic[];
}

export interface GraphicsAdapterConversionOptions {
  readonly onDiagnostic?: (diagnostic: GraphicsAdapterDiagnostic) => void;
}

export type FigmaAxisAlign =
  | 'MIN'
  | 'CENTER'
  | 'MAX'
  | 'SPACE_BETWEEN';

export interface GraphicsFigmaAutoLayoutSpec {
  readonly layoutMode: 'HORIZONTAL' | 'VERTICAL';
  readonly layoutWrap: 'NO_WRAP' | 'WRAP';
  readonly itemSpacing: number;
  readonly counterAxisSpacing: number;
  readonly paddingTop: number;
  readonly paddingRight: number;
  readonly paddingBottom: number;
  readonly paddingLeft: number;
  readonly primaryAxisAlignItems: FigmaAxisAlign;
  readonly counterAxisAlignItems: FigmaAxisAlign;
  readonly counterAxisAlignContent: 'AUTO' | 'SPACE_BETWEEN';
  readonly primaryAxisSizingMode: 'FIXED' | 'AUTO';
  readonly counterAxisSizingMode: 'FIXED' | 'AUTO';
}

const CSS_DOM_GRAPHICS_ADAPTER_COVERAGE: AdapterCoverage = {
  id: 'css-dom',
  sourceAuthority: [
    {
      kind: 'docs',
      name: 'Web platform computed style + DOM geometry',
      locator: 'Web platform computed style + DOM geometry',
    },
    {
      kind: 'types',
      name: 'TypeScript `lib.dom.d.ts`, browser smoke fixtures',
      locator: 'browser smoke fixtures',
    },
  ],
  supported: ['computed style', 'dom geometry', 'raw style stack persistence'],
  degraded: ['position absolute/fixed nuance'],
  unsupported: ['native layout graph transforms'],
};

const FIGMA_GRAPHICS_ADAPTER_COVERAGE: AdapterCoverage = {
  id: 'figma',
  sourceAuthority: [
    {
      kind: 'docs',
      name: 'Figma Plugin API docs',
      locator: 'https://developers.figma.com/docs/plugins/api/typings/',
    },
    {
      kind: 'types',
      name: '@figma/plugin-typings package',
      locator: '@figma/plugin-typings',
    },
  ],
  supported: ['stack axis and wrapping', 'gap', 'padding', 'alignment', 'sizing'],
  degraded: ['alignContent non-space-between', 'sizing.fill', 'alignItems space-around/evenly'],
  unsupported: ['native CSS grid'],
};

const PENCIL_GRAPHICS_ADAPTER_COVERAGE: AdapterCoverage = {
  id: 'pencil',
  sourceAuthority: [
    {
      kind: 'docs',
      name: 'Pencil .pen format docs',
      locator: 'https://docs.pencil.dev/for-developers/the-pen-format',
    },
    { kind: 'fixture', name: '.pen fixture files', locator: '.pen fixture files' },
  ],
  supported: ['placeholder pending'],
  degraded: ['placeholder pending'],
  unsupported: ['native Figma/PDF export behaviors'],
};

const PHOTOSHOP_GRAPHICS_ADAPTER_COVERAGE: AdapterCoverage = {
  id: 'photoshop',
  sourceAuthority: [
    {
      kind: 'docs',
      name: 'Adobe Photoshop UXP docs',
      locator: 'https://developer.adobe.com/photoshop/uxp/',
    },
    {
      kind: 'types',
      name: 'UXP/Photoshop type declarations when installed',
      locator: 'UXP/Photoshop type declarations when installed',
    },
  ],
  supported: ['placeholder pending'],
  degraded: ['placeholder pending'],
  unsupported: ['native auto layout'],
};

const STITCH_GRAPHICS_ADAPTER_COVERAGE: AdapterCoverage = {
  id: 'stitch',
  sourceAuthority: [
    {
      kind: 'mcp',
      name: 'Stitch MCP setup and exposed MCP tools',
      locator: 'https://stitch.withgoogle.com/docs/mcp/setup',
    },
    {
      kind: 'docs',
      name: 'generated screen code/artifacts',
      locator: 'generated screen code/artifacts',
    },
  ],
  supported: ['placeholder pending'],
  degraded: ['placeholder pending'],
  unsupported: ['native adapter contract'],
};

const GRAPHICS_ADAPTER_COVERAGES: Record<GraphicsAdapterId, AdapterCoverage> = {
  'css-dom': CSS_DOM_GRAPHICS_ADAPTER_COVERAGE,
  figma: FIGMA_GRAPHICS_ADAPTER_COVERAGE,
  pencil: PENCIL_GRAPHICS_ADAPTER_COVERAGE,
  photoshop: PHOTOSHOP_GRAPHICS_ADAPTER_COVERAGE,
  stitch: STITCH_GRAPHICS_ADAPTER_COVERAGE,
};

export const GRAPHICS_ADAPTER_IDS: readonly GraphicsAdapterId[] = [
  'css-dom',
  'figma',
  'pencil',
  'photoshop',
  'stitch',
] as const;

export function getCssDomCoverage(): AdapterCoverage {
  return CSS_DOM_GRAPHICS_ADAPTER_COVERAGE;
}

export function getFigmaCoverage(): AdapterCoverage {
  return FIGMA_GRAPHICS_ADAPTER_COVERAGE;
}

export function getGraphicsAdapterCoverage(id: string): AdapterCoverage | undefined {
  if (!isGraphicsAdapterId(id)) return undefined;
  return GRAPHICS_ADAPTER_COVERAGES[id];
}

export function getGraphicsAdapterCoverages(): readonly AdapterCoverage[] {
  return GRAPHICS_ADAPTER_IDS.map((id) => GRAPHICS_ADAPTER_COVERAGES[id]);
}

export function isGraphicsAdapterId(value: string): value is GraphicsAdapterId {
  return GRAPHICS_ADAPTER_IDS.includes(value as GraphicsAdapterId);
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
      padding: styleStack.padding,
      position: { mode: normalizePositionMode(styleStack.position) },
      sizing: { width: 'unknown', height: 'unknown' },
    };
  }

  if (styleStack.autoLayout) {
    const fallbackGap = styleStack.autoLayout.gap ?? 0;
    return {
      mode: 'stack',
      axis: convertFigmaLayoutAxis(styleStack.figma.layoutMode),
      wraps: styleStack.autoLayout.wrap,
      gap: fallbackGap,
      rowGap: styleStack.autoLayout.rowGap ?? fallbackGap,
      columnGap: styleStack.autoLayout.columnGap ?? fallbackGap,
      justifyContent: normalizeAxisAlign(styleStack.autoLayout.justifyContent),
      alignItems: normalizeAxisAlign(styleStack.autoLayout.alignItems),
      alignContent: normalizeAxisAlign(styleStack.autoLayout.alignContent),
      padding: styleStack.padding,
      position: { mode: normalizePositionMode(styleStack.position) },
      sizing: { width: 'unknown', height: 'unknown' },
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
  options?: GraphicsAdapterConversionOptions,
): GraphicsFigmaAutoLayoutSpec | null {
  const result = toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(layout, options);
  if (!result) return null;
  return result.artifact;
}

export function toFigmaAutoLayoutFromGraphicsLayoutWithDiagnostics(
  layout: GraphicsLayoutSpec | null,
  options: GraphicsAdapterConversionOptions = {},
): GraphicsAdapterConversion<GraphicsFigmaAutoLayoutSpec> | null {
  if (!layout || layout.mode !== 'stack' || layout.axis === null) {
    if (layout) {
      pushDiagnostic(options.onDiagnostic, createDiagnostic('unsupported-layout-mode', layout, 'mode'));
    }
    return null;
  }

  const diagnostics: GraphicsAdapterDiagnostic[] = [];
  const onDiagnostic = options.onDiagnostic ?? (() => undefined);

  const primaryAxisSizingMode = toFigmaSizingModeWithDiagnostics(
    layout.axis === 'horizontal' ? layout.sizing.width : layout.sizing.height,
    'sizing.width',
    onDiagnostic,
    diagnostics,
  );
  const counterAxisSizingMode = toFigmaSizingModeWithDiagnostics(
    layout.axis === 'horizontal' ? layout.sizing.height : layout.sizing.width,
    'sizing.height',
    onDiagnostic,
    diagnostics,
  );

  if (layout.alignContent !== 'space-between') {
    const diagnostic = createDiagnostic(
      'lossy-target-equivalent',
      layout,
      'alignContent',
      `alignContent "${layout.alignContent}" does not round-trip to a dedicated Figma counterAxisAlignContent mode; using AUTO.`,
    );
    diagnostics.push(diagnostic);
    onDiagnostic(diagnostic);
  }

  const artifact: GraphicsFigmaAutoLayoutSpec = {
    layoutMode: layout.axis === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL',
    layoutWrap: layout.wraps ? 'WRAP' : 'NO_WRAP',
    itemSpacing: layout.axis === 'horizontal' ? layout.columnGap : layout.rowGap,
    counterAxisSpacing:
      layout.wraps === true && layout.axis === 'horizontal'
        ? layout.rowGap
        : layout.axis === 'horizontal'
          ? 0
          : layout.wraps
            ? layout.columnGap
            : 0,
    paddingTop: layout.padding.top,
    paddingRight: layout.padding.right,
    paddingBottom: layout.padding.bottom,
    paddingLeft: layout.padding.left,
    primaryAxisAlignItems: toFigmaAxisAlign(layout.justifyContent),
    counterAxisAlignItems: toFigmaAxisAlign(layout.alignItems),
    counterAxisAlignContent: layout.alignContent === 'space-between' ? 'SPACE_BETWEEN' : 'AUTO',
    primaryAxisSizingMode,
    counterAxisSizingMode,
  };

  return { artifact, diagnostics };
}

function createDiagnostic(
  code: GraphicsAdapterDiagnosticCode,
  layout: GraphicsLayoutSpec,
  path: string,
  customMessage?: string,
): GraphicsAdapterDiagnostic {
  return {
    adapter: 'figma',
    code,
    path,
    message:
      customMessage ??
      `layout.${path}="${(layout as unknown as Record<string, string>)[path]}" is lossy/unsupported for Figma auto-layout conversion.`,
  };
}

function toFigmaSizingModeWithDiagnostics(
  value: GraphicsSizingMode,
  path: string,
  onDiagnostic: (diagnostic: GraphicsAdapterDiagnostic) => void,
  diagnostics: GraphicsAdapterDiagnostic[],
): 'FIXED' | 'AUTO' {
  if (value === 'fill') {
    const diagnostic = {
      adapter: 'figma' as const,
      code: 'unsupported-target-value' as const,
      path,
      message:
        'fill sizing is not supported by Figma auto-layout sizing; using FIXED.',
    } satisfies GraphicsAdapterDiagnostic;
    diagnostics.push(diagnostic);
    onDiagnostic(diagnostic);
    return 'FIXED';
  }

  if (value === 'unknown') {
    const diagnostic = {
      adapter: 'figma' as const,
      code: 'unknown-source-value' as const,
      path,
      message: 'unknown sizing source value; defaulting to FIXED for safety.',
    } satisfies GraphicsAdapterDiagnostic;
    diagnostics.push(diagnostic);
    onDiagnostic(diagnostic);
    return 'FIXED';
  }

  return value === 'hug' ? 'AUTO' : 'FIXED';
}

function pushDiagnostic(
  onDiagnostic: GraphicsAdapterConversionOptions['onDiagnostic'],
  diagnostic: GraphicsAdapterDiagnostic,
) {
  if (!onDiagnostic) {
    return;
  }
  onDiagnostic(diagnostic);
}

export function toFigmaAutoLayoutFromRLSCNode(
  node: RLSCNode,
  options?: GraphicsAdapterConversionOptions,
): GraphicsFigmaAutoLayoutSpec | null {
  return toFigmaAutoLayoutFromGraphicsLayout(normalizeGraphicsLayoutSpecFromRLSCNode(node), options);
}

export function isCanonicalStackLayout(layout: GraphicsLayoutSpec | null): layout is GraphicsLayoutSpec & {
  mode: 'stack';
  axis: GraphicsAxis;
} {
  return !!layout && layout.mode === 'stack' && layout.axis !== null;
}

export const isCanonicalFlexLayout = isCanonicalStackLayout;

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

function normalizePositionMode(value: string): GraphicsPositionMode {
  if (value === 'absolute') return 'absolute';
  if (value === 'fixed') return 'fixed';
  return 'auto';
}
