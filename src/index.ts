// @def.boundary rlsc
export interface LayoutRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TextFontInfo {
  readonly fontString: string;
  readonly lineHeight: number;
  readonly textAlign: string;
  readonly padding: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

export type FigmaLayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL' | 'GRID';
export type FigmaPositionMode = 'AUTO' | 'ABSOLUTE';

export interface SpacingBox {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface AutoLayoutStyleStack {
  readonly direction: 'row' | 'column';
  readonly wrap: boolean;
  readonly gap?: number;
  readonly rowGap?: number;
  readonly columnGap?: number;
  readonly justifyContent: string;
  readonly alignItems: string;
  readonly alignContent: string;
}

export interface GridLayoutStyleStack {
  readonly templateColumns: string;
  readonly templateRows: string;
  readonly autoFlow: string;
  readonly rowGap?: number;
  readonly columnGap?: number;
}

export interface StandardStyleStack {
  readonly display: string;
  readonly position: string;
  readonly boxSizing: string;
  readonly overflow: string;
  readonly figma: {
    readonly layoutMode: FigmaLayoutMode;
    readonly positionMode: FigmaPositionMode;
  };
  readonly padding: SpacingBox;
  readonly autoLayout?: AutoLayoutStyleStack;
  readonly grid?: GridLayoutStyleStack;
}

export interface ScreenIdentifier {
  readonly kind: 'componentId' | 'qaAddress' | 'cssSelector' | 'nodeId';
  readonly value: string;
  readonly componentId?: string;
  readonly qaAddress?: string;
  readonly cssSelector?: string;
  readonly xpath?: string;
  readonly nodeId: string;
}

export interface RLSCNode {
  readonly id: string;
  readonly tag: string;
  readonly classes: readonly string[];
  readonly role?: string;
  readonly rect: LayoutRect;
  readonly zIndex: number;
  readonly depth: number;
  readonly display: string;
  readonly position: string;
  readonly overflow: string;
  readonly visible: boolean;
  readonly textContent?: string;
  readonly address?: string;
  readonly debugLabel?: string;
  readonly boundary?: string;
  readonly fontInfo?: TextFontInfo;
  readonly styleStack?: StandardStyleStack;
  readonly identifier?: ScreenIdentifier;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly RLSCNode[];
}

export interface GridCell {
  readonly nodeIds: readonly string[];
  readonly zStack: readonly string[];
  readonly dominant?: string;
  readonly coverage: number;
}

export interface LayoutGrid {
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  readonly cells: readonly (readonly GridCell[])[];
}

export type LayerRole = 'background' | 'content' | 'sticky' | 'overlay' | 'modal' | 'tooltip';

export interface LayerStack {
  readonly zIndex: number;
  readonly role: LayerRole;
  readonly nodeIds: readonly string[];
  readonly totalArea: number;
}

export type RelationType =
  | 'contains'
  | 'overlaps'
  | 'adjacent-x'
  | 'adjacent-y'
  | 'aligned-x'
  | 'aligned-y'
  | 'stacked'
  | 'flow';

export interface RLSCRelation {
  readonly type: RelationType;
  readonly source: string;
  readonly target: string;
  readonly strength?: number;
}

export interface RLSCDocument {
  readonly version: '1.0';
  readonly viewport: { readonly width: number; readonly height: number };
  readonly url: string;
  readonly timestamp: string;
  readonly address?: string;
  readonly root: RLSCNode;
  readonly grid: LayoutGrid;
  readonly layers: readonly LayerStack[];
  readonly relations: readonly RLSCRelation[];
}

export interface ProximityGroup {
  readonly nodeIds: readonly string[];
  readonly centroid: { readonly x: number; readonly y: number };
  readonly boundingRect: LayoutRect;
}

export interface LayoutMetrics {
  readonly balance: { readonly x: number; readonly y: number };
  readonly dominantFlow: 'horizontal' | 'vertical' | 'grid' | 'free';
  readonly gridPattern: { readonly cols: number; readonly rows: number } | null;
  readonly goldenRatioScore: number;
  readonly proximityGroups: readonly ProximityGroup[];
  readonly columnSystem: {
    readonly cols: number;
    readonly gutterPx: number;
    readonly marginPx: number;
    readonly rowGapPx?: number;
  } | null;
  readonly spacingValues: readonly number[];
  readonly spacingBase: number | null;
  readonly aspectRatioDistribution: readonly { readonly ratio: number; readonly count: number }[];
  readonly textDensity?: number;
  readonly textBoundaryContactRate?: number;
  readonly textOverflowCount?: number;
}

export interface GridSystemPattern {
  readonly columns: number;
  readonly gutter: number;
  readonly margin?: number;
  readonly rowGap?: number;
  readonly columnWidthPx?: number;
}

export interface SpacingPattern {
  readonly base?: number;
  readonly scale: readonly number[];
  readonly consistent: boolean;
}

export interface ProportionPattern {
  readonly dominant?: number;
  readonly namedRatio?: '1:1' | '4:3' | '16:9' | 'golden' | '2:1' | '3:1';
  readonly distribution: readonly { readonly ratio: number; readonly count: number }[];
}

export interface GestaltPattern {
  readonly proximity?: 'tight' | 'loose';
  readonly continuity?: 'strong' | 'weak';
  readonly minGroupCount?: number;
}

export interface LayoutPattern {
  readonly gridPattern?:
    | '3x3'
    | '2-col'
    | '1-col'
    | { readonly cols: number; readonly rows: number };
  readonly balanceRatio?: {
    readonly x?: readonly [number, number];
    readonly y?: readonly [number, number];
  };
  readonly flowDirection?: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'grid';
  readonly goldenRatio?: boolean;
  readonly gestalt?: GestaltPattern;
  readonly gridSystem?: GridSystemPattern;
  readonly spacing?: SpacingPattern;
  readonly proportions?: ProportionPattern;
  readonly textDensityRange?: readonly [number, number];
}

export interface TextOccupancy {
  readonly nodeId: string;
  readonly renderedRect: LayoutRect;
  readonly fillX: number;
  readonly fillY: number;
  readonly lineCount: number;
  readonly naturalWidth: number;
  readonly margins: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly boundaryContact: {
    readonly top: boolean;
    readonly right: boolean;
    readonly bottom: boolean;
    readonly left: boolean;
  };
  readonly overflows: boolean;
}

export interface TextRegionDensity {
  readonly regionId: string;
  readonly textArea: number;
  readonly regionArea: number;
  readonly density: number;
  readonly avgFillX: number;
  readonly avgFillY: number;
  readonly contactCount: number;
}

export type TextPreparedMap = Map<string, { readonly width?: number; readonly height?: number }>;

export interface TextOccupancyOptions {
  readonly contactThreshold?: number;
}

export interface AreaOverflowIssue {
  readonly parentId: string;
  readonly childId: string;
  readonly overflow: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly exceededPx: number;
}

export interface AreaDocumentInput {
  readonly root: RLSCNode;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly url?: string;
  readonly timestamp?: string;
  readonly address?: string;
}

export interface AreaAnalysisOptions {
  readonly textOccupancies?: readonly TextOccupancy[];
}

export interface AreaAnalysisNode extends RLSCNode {
  readonly identifier: ScreenIdentifier;
}

export interface AreaAnalysisResult {
  readonly doc: RLSCDocument;
  readonly nodes: readonly AreaAnalysisNode[];
  readonly index: RLSCNodeIndex;
  readonly metrics: LayoutMetrics;
  readonly pattern: LayoutPattern;
  readonly overflowIssues: readonly AreaOverflowIssue[];
}

export interface RLSCNodeIndex {
  readonly all: readonly AreaAnalysisNode[];
  readonly byId: ReadonlyMap<string, AreaAnalysisNode>;
  readonly byXPath: ReadonlyMap<string, AreaAnalysisNode>;
  readonly byCssSelector: ReadonlyMap<string, AreaAnalysisNode>;
  readonly byComponentId: ReadonlyMap<string, readonly AreaAnalysisNode[]>;
  readonly byQaAddress: ReadonlyMap<string, readonly AreaAnalysisNode[]>;
  findById(id: string): AreaAnalysisNode | undefined;
  findByXPath(xpath: string): AreaAnalysisNode | undefined;
  findByCssSelector(cssSelector: string): AreaAnalysisNode | undefined;
  findByComponentId(componentId: string): readonly AreaAnalysisNode[];
  findByQaAddress(qaAddress: string): readonly AreaAnalysisNode[];
}

export const DATA_QA_ADDRESS_ATTRIBUTE = 'data-qa-address';
export const DATA_COMPONENT_ID_ATTRIBUTE = 'data-component-id';
export const DATA_DEBUG_LABEL_ATTRIBUTE = 'data-debug-label';
export const DATA_BOUNDARY_ATTRIBUTE = 'data-boundary';
export const QA_ADDRESS_ATTRIBUTE = DATA_QA_ADDRESS_ATTRIBUTE;
export const COMPONENT_ID_ATTRIBUTE = DATA_COMPONENT_ID_ATTRIBUTE;
export const DEBUG_LABEL_ATTRIBUTE = DATA_DEBUG_LABEL_ATTRIBUTE;
export const BOUNDARY_ATTRIBUTE = DATA_BOUNDARY_ATTRIBUTE;

export interface ScreenMetadata {
  readonly qaAddress?: string;
  readonly componentId?: string;
  readonly debugLabel?: string;
  readonly boundary?: string;
}

export type MetadataAttributes = Readonly<Record<string, string>>;
export type MetadataAttributeTarget = Pick<Element, 'setAttribute'>;

export function createMetadataAttributes(metadata: ScreenMetadata): MetadataAttributes {
  const attributes: Record<string, string> = {};
  if (metadata.qaAddress) attributes[DATA_QA_ADDRESS_ATTRIBUTE] = metadata.qaAddress;
  if (metadata.componentId) attributes[DATA_COMPONENT_ID_ATTRIBUTE] = metadata.componentId;
  if (metadata.debugLabel) attributes[DATA_DEBUG_LABEL_ATTRIBUTE] = metadata.debugLabel;
  if (metadata.boundary) attributes[DATA_BOUNDARY_ATTRIBUTE] = metadata.boundary;
  return attributes;
}

export function annotateElement<T extends MetadataAttributeTarget>(
  element: T,
  metadata: ScreenMetadata,
): T {
  for (const [name, value] of Object.entries(createMetadataAttributes(metadata))) {
    element.setAttribute(name, value);
  }
  return element;
}

export function createScreenIdentifier(args: {
  readonly nodeId: string;
  readonly componentId?: string;
  readonly qaAddress?: string;
  readonly cssSelector?: string;
  readonly xpath?: string;
}): ScreenIdentifier {
  if (args.componentId) return { ...args, kind: 'componentId', value: args.componentId };
  if (args.qaAddress) return { ...args, kind: 'qaAddress', value: args.qaAddress };
  if (args.cssSelector) return { ...args, kind: 'cssSelector', value: args.cssSelector };
  return { ...args, kind: 'nodeId', value: args.nodeId };
}

export function flattenTree(node: RLSCNode): RLSCNode[] {
  return [node, ...node.children.flatMap((child) => flattenTree(child))];
}

export function createAreaDocument(input: AreaDocumentInput): RLSCDocument {
  const nodes = flattenTree(input.root);
  return {
    version: '1.0',
    viewport: input.viewport,
    url: input.url ?? 'about:blank',
    timestamp: input.timestamp ?? new Date().toISOString(),
    address: input.address,
    root: input.root,
    grid: analyzeGrid(input.root, input.viewport),
    layers: classifyLayers(nodes),
    relations: detectRelations(nodes),
  };
}

export function analyzeAreas(
  input: RLSCDocument | AreaDocumentInput,
  options: AreaAnalysisOptions = {},
): AreaAnalysisResult {
  const doc = 'grid' in input ? input : createAreaDocument(input);
  const nodes = flattenTree(doc.root).map((node) => withIdentifier(node));
  const index = createNodeIndex(doc);
  const metrics = measureLayout(doc, options.textOccupancies);
  return {
    doc,
    nodes,
    index,
    metrics,
    pattern: classifyLayout(metrics),
    overflowIssues: detectAreaOverflow(doc),
  };
}

export function createNodeIndex(doc: RLSCDocument): RLSCNodeIndex {
  const all = flattenTree(doc.root).map((node) => withIdentifier(node));
  const byId = new Map<string, AreaAnalysisNode>();
  const byXPath = new Map<string, AreaAnalysisNode>();
  const byCssSelector = new Map<string, AreaAnalysisNode>();
  const byComponentId = new Map<string, AreaAnalysisNode[]>();
  const byQaAddress = new Map<string, AreaAnalysisNode[]>();

  for (const node of all) {
    byId.set(node.id, node);
    if (node.identifier.xpath) byXPath.set(node.identifier.xpath, node);
    if (node.identifier.cssSelector) byCssSelector.set(node.identifier.cssSelector, node);
    if (node.identifier.componentId)
      appendIndexValue(byComponentId, node.identifier.componentId, node);
    if (node.identifier.qaAddress) appendIndexValue(byQaAddress, node.identifier.qaAddress, node);
  }

  return {
    all,
    byId,
    byXPath,
    byCssSelector,
    byComponentId,
    byQaAddress,
    findById: (id) => byId.get(id),
    findByXPath: (xpath) => byXPath.get(xpath),
    findByCssSelector: (cssSelector) => byCssSelector.get(cssSelector),
    findByComponentId: (componentId) => byComponentId.get(componentId) ?? [],
    findByQaAddress: (qaAddress) => byQaAddress.get(qaAddress) ?? [],
  };
}

export function findNodeById(doc: RLSCDocument, id: string): AreaAnalysisNode | undefined {
  return createNodeIndex(doc).findById(id);
}

export function findNodeByXPath(doc: RLSCDocument, xpath: string): AreaAnalysisNode | undefined {
  return createNodeIndex(doc).findByXPath(xpath);
}

export function findNodeByCssSelector(
  doc: RLSCDocument,
  cssSelector: string,
): AreaAnalysisNode | undefined {
  return createNodeIndex(doc).findByCssSelector(cssSelector);
}

export function findNodesByComponentId(
  doc: RLSCDocument,
  componentId: string,
): readonly AreaAnalysisNode[] {
  return createNodeIndex(doc).findByComponentId(componentId);
}

export function findNodesByQaAddress(
  doc: RLSCDocument,
  qaAddress: string,
): readonly AreaAnalysisNode[] {
  return createNodeIndex(doc).findByQaAddress(qaAddress);
}

export function detectAreaOverflow(doc: RLSCDocument): AreaOverflowIssue[] {
  const issues: AreaOverflowIssue[] = [];
  visit(doc.root, (parent) => {
    for (const child of parent.children) {
      const overflow = {
        top: Math.max(0, parent.rect.y - child.rect.y),
        right: Math.max(0, child.rect.x + child.rect.width - (parent.rect.x + parent.rect.width)),
        bottom: Math.max(
          0,
          child.rect.y + child.rect.height - (parent.rect.y + parent.rect.height),
        ),
        left: Math.max(0, parent.rect.x - child.rect.x),
      };
      const exceededPx = Math.max(overflow.top, overflow.right, overflow.bottom, overflow.left);
      if (exceededPx > 0)
        issues.push({ parentId: parent.id, childId: child.id, overflow, exceededPx });
    }
  });
  return issues;
}

export function analyzeGrid(
  root: RLSCNode,
  viewport: { readonly width: number; readonly height: number },
  cellSize = 32,
): LayoutGrid {
  const cols = Math.max(1, Math.ceil(viewport.width / cellSize));
  const rows = Math.max(1, Math.ceil(viewport.height / cellSize));
  const nodes = flattenTree(root).filter((node) => node.visible);
  const cells = Array.from({ length: rows }, (_rowToken, row) =>
    Array.from({ length: cols }, (_colToken, col): GridCell => {
      const rect: LayoutRect = {
        x: col * cellSize,
        y: row * cellSize,
        width: cellSize,
        height: cellSize,
      };
      const covering = nodes.filter((node) => intersects(node.rect, rect));
      const sorted = covering.toSorted((a, b) => a.zIndex - b.zIndex);
      return {
        nodeIds: covering.map((node) => node.id),
        zStack: sorted.map((node) => node.id),
        dominant: largestByArea(covering)?.id,
        coverage: covering.length > 0 ? 1 : 0,
      };
    }),
  );
  return { cellSize, cols, rows, cells };
}

export function classifyLayers(nodes: readonly RLSCNode[]): LayerStack[] {
  const groups = new Map<number, RLSCNode[]>();
  for (const node of nodes.filter((item) => item.visible)) {
    const items = groups.get(node.zIndex) ?? [];
    items.push(node);
    groups.set(node.zIndex, items);
  }
  return [...groups.entries()]
    .toSorted(([a], [b]) => a - b)
    .map(([zIndex, items]) => ({
      zIndex,
      role: layerRole(zIndex),
      nodeIds: items.map((item) => item.id),
      totalArea: items.reduce((sum, item) => sum + area(item.rect), 0),
    }));
}

export function detectRelations(nodes: readonly RLSCNode[]): RLSCRelation[] {
  const relations: RLSCRelation[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a || !b) continue;
      if (!a.visible || !b.visible) continue;
      if (contains(a.rect, b.rect))
        relations.push({ type: 'contains', source: a.id, target: b.id, strength: 1 });
      else if (contains(b.rect, a.rect))
        relations.push({ type: 'contains', source: b.id, target: a.id, strength: 1 });
      else if (intersects(a.rect, b.rect))
        relations.push({ type: 'overlaps', source: a.id, target: b.id, strength: 0.5 });
      if (Math.abs(a.rect.y - b.rect.y) <= 4)
        relations.push({ type: 'aligned-y', source: a.id, target: b.id });
      if (Math.abs(a.rect.x - b.rect.x) <= 4)
        relations.push({ type: 'aligned-x', source: a.id, target: b.id });
    }
  }
  return relations;
}

export function measureLayout(
  doc: RLSCDocument,
  textOccupancies: readonly TextOccupancy[] = [],
): LayoutMetrics {
  const nodes = flattenTree(doc.root).filter((node) => node.visible);
  const viewportArea = doc.viewport.width * doc.viewport.height || 1;
  const leftArea = nodes.reduce(
    (sum, node) =>
      sum +
      clippedArea(node.rect, {
        x: 0,
        y: 0,
        width: doc.viewport.width / 2,
        height: doc.viewport.height,
      }),
    0,
  );
  const rightArea = nodes.reduce(
    (sum, node) =>
      sum +
      clippedArea(node.rect, {
        x: doc.viewport.width / 2,
        y: 0,
        width: doc.viewport.width / 2,
        height: doc.viewport.height,
      }),
    0,
  );
  const topArea = nodes.reduce(
    (sum, node) =>
      sum +
      clippedArea(node.rect, {
        x: 0,
        y: 0,
        width: doc.viewport.width,
        height: doc.viewport.height / 2,
      }),
    0,
  );
  const bottomArea = nodes.reduce(
    (sum, node) =>
      sum +
      clippedArea(node.rect, {
        x: 0,
        y: doc.viewport.height / 2,
        width: doc.viewport.width,
        height: doc.viewport.height / 2,
      }),
    0,
  );
  const ratios = nodes.map(
    (node) => Math.round((node.rect.width / Math.max(1, node.rect.height)) * 100) / 100,
  );
  const ratioCounts = [...new Set(ratios)].map((ratioValue) => ({
    ratio: ratioValue,
    count: ratios.filter((item) => item === ratioValue).length,
  }));
  const textArea = textOccupancies.reduce((sum, item) => sum + area(item.renderedRect), 0);
  const spacing = measureSpacing(doc.relations, nodes);
  return {
    balance: { x: areaRatio(leftArea, rightArea), y: areaRatio(topArea, bottomArea) },
    dominantFlow: detectDominantFlow(doc.relations),
    gridPattern: detectGridPattern(doc.grid),
    goldenRatioScore: scoreGoldenRatio(doc.viewport),
    proximityGroups: detectProximityGroups(nodes),
    columnSystem: detectColumnSystem(nodes, doc.viewport),
    spacingValues: spacing.values,
    spacingBase: spacing.base,
    aspectRatioDistribution: ratioCounts.toSorted((a, b) => b.count - a.count),
    textDensity: textOccupancies.length > 0 ? textArea / viewportArea : undefined,
    textBoundaryContactRate:
      textOccupancies.length > 0
        ? textOccupancies.filter(
            (item) =>
              item.boundaryContact.top ||
              item.boundaryContact.right ||
              item.boundaryContact.bottom ||
              item.boundaryContact.left,
          ).length / textOccupancies.length
        : undefined,
    textOverflowCount:
      textOccupancies.length > 0
        ? textOccupancies.filter((item) => item.overflows).length
        : undefined,
  };
}

export function classifyLayout(metrics: LayoutMetrics): LayoutPattern {
  return {
    gridPattern: metrics.gridPattern
      ? metrics.gridPattern.cols === 1
        ? '1-col'
        : metrics.gridPattern
      : undefined,
    flowDirection:
      metrics.dominantFlow === 'vertical'
        ? 'top-to-bottom'
        : metrics.dominantFlow === 'horizontal'
          ? 'left-to-right'
          : metrics.dominantFlow === 'grid'
            ? 'grid'
            : undefined,
    goldenRatio: metrics.goldenRatioScore >= 0.8 ? true : undefined,
    spacing: {
      base: metrics.spacingBase ?? undefined,
      scale: metrics.spacingValues,
      consistent: metrics.spacingValues.length <= 6,
    },
    proportions: { distribution: metrics.aspectRatioDistribution },
  };
}

export function analyzeTextOccupancy(
  doc: RLSCDocument,
  _preparedMap: TextPreparedMap,
  options: TextOccupancyOptions = {},
): TextOccupancy[] {
  const threshold = options.contactThreshold ?? 4;
  return flattenTree(doc.root)
    .filter((node) => node.visible && node.textContent)
    .map((node) => {
      const padding = node.fontInfo?.padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
      const contentWidth = Math.max(1, node.rect.width - padding.left - padding.right);
      const contentHeight = Math.max(1, node.rect.height - padding.top - padding.bottom);
      const naturalWidth = Math.min(contentWidth, (node.textContent?.length ?? 0) * 7);
      const lineHeight = node.fontInfo?.lineHeight ?? 16;
      const lineCount = Math.max(
        1,
        Math.ceil(((node.textContent?.length ?? 0) * 7) / contentWidth),
      );
      const renderedRect = {
        x: node.rect.x + padding.left,
        y: node.rect.y + padding.top,
        width: naturalWidth,
        height: Math.min(contentHeight, lineCount * lineHeight),
      };
      const margins = {
        top: padding.top,
        right: Math.max(0, contentWidth - renderedRect.width),
        bottom: Math.max(0, contentHeight - renderedRect.height),
        left: padding.left,
      };
      return {
        nodeId: node.id,
        renderedRect,
        fillX: renderedRect.width / contentWidth,
        fillY: renderedRect.height / contentHeight,
        lineCount,
        naturalWidth,
        margins,
        boundaryContact: {
          top: margins.top < threshold,
          right: margins.right < threshold,
          bottom: margins.bottom < threshold,
          left: margins.left < threshold,
        },
        overflows: lineCount * lineHeight > contentHeight,
      };
    });
}

export function aggregateTextRegions(
  doc: RLSCDocument,
  occupancies: readonly TextOccupancy[],
): TextRegionDensity[] {
  const byNode = new Map(occupancies.map((item) => [item.nodeId, item]));
  return flattenTree(doc.root).flatMap((node) => {
    const occupancy = byNode.get(node.id);
    if (!occupancy) return [];
    const regionArea = Math.max(1, area(node.rect));
    return [
      {
        regionId: node.id,
        textArea: area(occupancy.renderedRect),
        regionArea,
        density: area(occupancy.renderedRect) / regionArea,
        avgFillX: occupancy.fillX,
        avgFillY: occupancy.fillY,
        contactCount:
          occupancy.boundaryContact.top ||
          occupancy.boundaryContact.right ||
          occupancy.boundaryContact.bottom ||
          occupancy.boundaryContact.left
            ? 1
            : 0,
      },
    ];
  });
}

export function prepareTextMap(_doc: RLSCDocument): TextPreparedMap {
  return new Map();
}

export function detectDominantFlow(
  relations: readonly RLSCRelation[],
): LayoutMetrics['dominantFlow'] {
  const horizontal = relations.filter(
    (relation) => relation.type === 'adjacent-x' || relation.type === 'aligned-y',
  ).length;
  const vertical = relations.filter(
    (relation) => relation.type === 'adjacent-y' || relation.type === 'aligned-x',
  ).length;
  if (horizontal > vertical * 1.5) return 'horizontal';
  if (vertical > horizontal * 1.5) return 'vertical';
  if (horizontal > 0 && vertical > 0) return 'grid';
  return 'free';
}

export function detectGridPattern(
  grid: LayoutGrid,
): { readonly cols: number; readonly rows: number } | null {
  return grid.cols > 0 && grid.rows > 0 ? { cols: grid.cols, rows: grid.rows } : null;
}

export function scoreGoldenRatio(viewport: {
  readonly width: number;
  readonly height: number;
}): number {
  const ratioValue =
    Math.max(viewport.width, viewport.height) /
    Math.max(1, Math.min(viewport.width, viewport.height));
  return Math.max(0, 1 - Math.abs(ratioValue - 1.618) / 1.618);
}

export function detectProximityGroups(nodes: readonly RLSCNode[]): ProximityGroup[] {
  return nodes.length === 0
    ? []
    : [
        {
          nodeIds: nodes.map((node) => node.id),
          centroid: {
            x:
              nodes.reduce((sum, node) => sum + node.rect.x + node.rect.width / 2, 0) /
              nodes.length,
            y:
              nodes.reduce((sum, node) => sum + node.rect.y + node.rect.height / 2, 0) /
              nodes.length,
          },
          boundingRect: nodes.map((node) => node.rect).reduce(unionRect),
        },
      ];
}

export function detectColumnSystem(
  nodes: readonly RLSCNode[],
  viewport: { readonly width: number; readonly height: number },
): LayoutMetrics['columnSystem'] {
  const topLevel = nodes.filter(
    (node) => node.depth <= 2 && node.rect.height < viewport.height * 0.9,
  );
  return topLevel.length >= 2
    ? {
        cols: Math.min(topLevel.length, 12),
        gutterPx: 0,
        marginPx: Math.min(...topLevel.map((node) => node.rect.x)),
      }
    : null;
}

export function measureSpacing(
  _relations: readonly RLSCRelation[],
  nodes: readonly RLSCNode[],
): { values: readonly number[]; base: number | null } {
  const sorted = nodes.toSorted((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const values = sorted
    .slice(1)
    .map((node, index) => {
      const previous = sorted[index];
      return previous ? Math.max(0, node.rect.y - (previous.rect.y + previous.rect.height)) : 0;
    })
    .filter((value) => value > 0);
  const unique = [...new Set(values.map(Math.round))].toSorted((a, b) => a - b);
  return { values: unique, base: unique[0] ?? null };
}

export function measureBalance(
  nodes: readonly RLSCNode[],
  viewport: { readonly width: number; readonly height: number },
): LayoutMetrics['balance'] {
  return measureLayout(createAreaDocument({ root: syntheticRoot(nodes, viewport), viewport }))
    .balance;
}

export function measureAspectRatios(
  nodes: readonly RLSCNode[],
): readonly { readonly ratio: number; readonly count: number }[] {
  const ratios = nodes.map(
    (node) => Math.round((node.rect.width / Math.max(1, node.rect.height)) * 100) / 100,
  );
  return [...new Set(ratios)].map((value) => ({
    ratio: value,
    count: ratios.filter((item) => item === value).length,
  }));
}

export function gridToText(grid: LayoutGrid): string {
  return `${grid.cols}x${grid.rows}`;
}

export function layersToText(layers: readonly LayerStack[]): string {
  return layers.map((layer) => `${layer.role}:${layer.nodeIds.length}`).join('\n');
}

export function relationsToText(relations: readonly RLSCRelation[]): string {
  return relations
    .map((relation) => `${relation.source} ${relation.type} ${relation.target}`)
    .join('\n');
}

export function predictTextReflow(): undefined {
  return undefined;
}

export function findBreakpointWidth(): undefined {
  return undefined;
}

function withIdentifier(node: RLSCNode): AreaAnalysisNode {
  return {
    ...node,
    identifier:
      node.identifier ??
      createScreenIdentifier({
        nodeId: node.id,
        componentId: node.attributes[DATA_COMPONENT_ID_ATTRIBUTE],
        qaAddress: node.attributes[DATA_QA_ADDRESS_ATTRIBUTE] ?? node.address,
        xpath: node.attributes['data-rlsc-xpath'],
      }),
  };
}

function appendIndexValue(
  index: Map<string, AreaAnalysisNode[]>,
  key: string,
  node: AreaAnalysisNode,
): void {
  const nodes = index.get(key) ?? [];
  nodes.push(node);
  index.set(key, nodes);
}

function visit(node: RLSCNode, callback: (node: RLSCNode) => void): void {
  callback(node);
  for (const child of node.children) visit(child, callback);
}

function area(rect: LayoutRect): number {
  return rect.width * rect.height;
}

function clippedArea(a: LayoutRect, b: LayoutRect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

function areaRatio(a: number, b: number): number {
  if (a === 0 && b === 0) return 1;
  if (b === 0) return 99;
  return a / b;
}

function intersects(a: LayoutRect, b: LayoutRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function contains(a: LayoutRect, b: LayoutRect): boolean {
  return (
    b.x >= a.x && b.y >= a.y && b.x + b.width <= a.x + a.width && b.y + b.height <= a.y + a.height
  );
}

function largestByArea(nodes: readonly RLSCNode[]): RLSCNode | undefined {
  return nodes.toSorted((a, b) => area(b.rect) - area(a.rect))[0];
}

function layerRole(zIndex: number): LayerRole {
  if (zIndex <= 0) return 'background';
  if (zIndex < 10) return 'content';
  if (zIndex < 100) return 'sticky';
  if (zIndex < 1000) return 'overlay';
  if (zIndex < 10000) return 'modal';
  return 'tooltip';
}

function unionRect(a: LayoutRect, b: LayoutRect): LayoutRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: maxX - x, height: maxY - y };
}

function syntheticRoot(
  nodes: readonly RLSCNode[],
  viewport: { readonly width: number; readonly height: number },
): RLSCNode {
  return {
    id: 'root',
    tag: 'root',
    classes: [],
    rect: { x: 0, y: 0, width: viewport.width, height: viewport.height },
    zIndex: 0,
    depth: 0,
    display: 'block',
    position: 'static',
    overflow: 'visible',
    visible: true,
    attributes: {},
    children: nodes,
  };
}
