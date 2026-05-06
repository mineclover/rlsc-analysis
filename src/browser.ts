// @def.boundary rlsc
import {
  createAreaDocument,
  createNodeIndex,
  createScreenIdentifier,
  analyzeAreas,
  DATA_BOUNDARY_ATTRIBUTE,
  DATA_COMPONENT_ID_ATTRIBUTE,
  DATA_DEBUG_LABEL_ATTRIBUTE,
  DATA_QA_ADDRESS_ATTRIBUTE,
  type AreaAnalysisNode,
  type AreaAnalysisResult,
  type RLSCDocument,
  type RLSCNode,
  type RLSCNodeIndex,
  type ScreenIdentifier,
  type TextOccupancy,
  type TextPreparedMap,
  analyzeTextOccupancy,
} from './index.js';

export interface CollectorOptions {
  readonly minSize?: number;
  readonly maxDepth?: number;
  readonly includeHidden?: boolean;
  readonly maxTextLength?: number;
  readonly addressAttribute?: string;
  readonly collectFontInfo?: boolean;
}

export interface ScreenScanOptions {
  readonly collect?: CollectorOptions;
  readonly includeText?: boolean;
  readonly includeIssues?: boolean;
}

export interface ScreenScanResult extends AreaAnalysisResult {
  readonly textOccupancies: readonly TextOccupancy[];
  readonly textPrepared: TextPreparedMap;
  readonly index: RLSCNodeIndex;
  byId(id: string): AreaAnalysisNode | undefined;
  byXPath(xpath: string): AreaAnalysisNode | undefined;
  byCssSelector(cssSelector: string): AreaAnalysisNode | undefined;
  byComponentId(componentId: string): readonly AreaAnalysisNode[];
  byQaAddress(qaAddress: string): readonly AreaAnalysisNode[];
}

export interface LayoutChange {
  readonly type: 'added' | 'removed' | 'moved' | 'resized' | 'reordered';
  readonly nodeId: string;
  readonly before?: RLSCNode['rect'];
  readonly after?: RLSCNode['rect'];
  readonly timestamp: string;
}

export interface MonitorOptions {
  readonly debounceMs?: number;
  readonly collectOptions?: CollectorOptions;
  readonly trackText?: boolean;
  readonly onTextOccupancyChange?: (occupancies: readonly TextOccupancy[]) => void;
  readonly onConformanceChange?: (result: unknown) => void;
}

export interface LayoutMonitor {
  start(): void;
  stop(): void;
  snapshot(): RLSCDocument;
  readonly changes: readonly LayoutChange[];
  onConformanceChange?: (result: unknown) => void;
}

export type ScreenIdentifierElement = Element;
export type ScreenIdentifierKind = ScreenIdentifier['kind'];
export type ScreenIdentifierSource = ScreenIdentifier;

let nodeCounter = 0;

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'link', 'meta', 'head', 'br', 'wbr']);

export function collectLayout(root?: Element, options: CollectorOptions = {}): RLSCDocument {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('collectLayout is only available in a browser environment');
  }
  nodeCounter = 0;
  const target = root ?? document.body;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const rootNode = collectNode(target, 0, options, viewport);
  if (!rootNode) throw new Error('unable to collect layout from root element');
  return createAreaDocument({
    root: rootNode,
    viewport,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
}

export function collectLayoutWithText(
  root?: Element,
  options: CollectorOptions = {},
): { doc: RLSCDocument; textPrepared: TextPreparedMap } {
  return { doc: collectLayout(root, options), textPrepared: new Map() };
}

export function scanScreen(root?: Element, options: ScreenScanOptions = {}): ScreenScanResult {
  const { doc, textPrepared } = collectLayoutWithText(root, options.collect);
  const textOccupancies =
    options.includeText === false ? [] : analyzeTextOccupancy(doc, textPrepared);
  const analysis = analyzeAreas(doc, {
    textOccupancies: options.includeIssues === false ? [] : textOccupancies,
  });
  const index = createNodeIndex(doc);
  return {
    ...analysis,
    index,
    textOccupancies,
    textPrepared,
    byId: (id) => index.findById(id),
    byXPath: (xpath) => index.findByXPath(xpath),
    byCssSelector: (cssSelector) => index.findByCssSelector(cssSelector),
    byComponentId: (componentId) => index.findByComponentId(componentId),
    byQaAddress: (qaAddress) => index.findByQaAddress(qaAddress),
  };
}

export function createLayoutMonitor(root?: Element, options: MonitorOptions = {}): LayoutMonitor {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('createLayoutMonitor is only available in a browser environment');
  }
  const target = root ?? document.body;
  const changes: LayoutChange[] = [];
  let current = collectLayout(target, options.collectOptions);
  let mutationObserver: MutationObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function collectNext(): void {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const before = current;
      current = collectLayout(target, options.collectOptions);
      changes.push(...diffDocuments(before, current));
      if (options.trackText && options.onTextOccupancyChange) {
        options.onTextOccupancyChange(analyzeTextOccupancy(current, new Map()));
      }
    }, options.debounceMs ?? 200);
  }

  return {
    start() {
      mutationObserver = new MutationObserver(collectNext);
      mutationObserver.observe(target, { childList: true, subtree: true, attributes: true });
      resizeObserver = new ResizeObserver(collectNext);
      resizeObserver.observe(target);
    },
    stop() {
      if (timer) window.clearTimeout(timer);
      timer = null;
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      mutationObserver = null;
      resizeObserver = null;
    },
    snapshot() {
      return current;
    },
    get changes() {
      return changes;
    },
    onConformanceChange: options.onConformanceChange,
  };
}

export function identifyElement(element: Element): ScreenIdentifier {
  return createScreenIdentifier({
    nodeId: element.id || element.tagName.toLowerCase(),
    componentId: element.getAttribute(DATA_COMPONENT_ID_ATTRIBUTE) ?? undefined,
    qaAddress: element.getAttribute(DATA_QA_ADDRESS_ATTRIBUTE) ?? undefined,
    cssSelector: createCssSelector(element),
    xpath: createElementXPath(element),
  });
}

export function createCssSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
    const tag = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`${tag}#${cssEscape(current.id)}`);
      break;
    }
    const classes = [...current.classList]
      .slice(0, 2)
      .map((item) => `.${cssEscape(item)}`)
      .join('');
    parts.unshift(`${tag}${classes}`);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

function collectNode(
  element: Element,
  depth: number,
  options: CollectorOptions,
  viewport: { readonly width: number; readonly height: number },
  root: Element = element,
): RLSCNode | null {
  const maxDepth = options.maxDepth ?? 20;
  if (depth > maxDepth) return null;
  const tag = element.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return null;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const includeHidden = options.includeHidden === true;
  const visible =
    includeHidden ||
    (style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width >= (options.minSize ?? 4) &&
      rect.height >= (options.minSize ?? 4) &&
      rect.x + rect.width >= 0 &&
      rect.y + rect.height >= 0 &&
      rect.x <= viewport.width &&
      rect.y <= viewport.height);
  if (!visible && !includeHidden) return null;

  const id = element.id
    ? `${element.tagName.toLowerCase()}#${element.id}`
    : `${element.tagName.toLowerCase()}-${++nodeCounter}`;
  const attributes = collectAttributes(element);
  const qaAddress =
    attributes[options.addressAttribute ?? DATA_QA_ADDRESS_ATTRIBUTE] ??
    attributes[DATA_QA_ADDRESS_ATTRIBUTE];
  const xpath = createElementXPath(element, root);
  const cssSelector = createCssSelector(element);
  const identifier = createScreenIdentifier({
    nodeId: id,
    componentId: attributes[DATA_COMPONENT_ID_ATTRIBUTE],
    qaAddress,
    cssSelector,
    xpath,
  });
  const children = [...element.children]
    .map((child) => collectNode(child, depth + 1, options, viewport, root))
    .filter((child): child is RLSCNode => child !== null);
  const textContent = ownText(element).slice(0, options.maxTextLength ?? 80) || undefined;

  return {
    id,
    tag,
    classes: [...element.classList],
    role: element.getAttribute('role') ?? inferRole(element) ?? undefined,
    rect: {
      x: Math.max(0, rect.x),
      y: Math.max(0, rect.y),
      width: Math.min(rect.width, viewport.width),
      height: Math.min(rect.height, viewport.height),
    },
    zIndex: parseZIndex(style.zIndex),
    depth,
    display: style.display,
    position: style.position,
    overflow: style.overflow,
    visible,
    textContent,
    address: qaAddress,
    debugLabel: attributes[DATA_DEBUG_LABEL_ATTRIBUTE],
    boundary: attributes[DATA_BOUNDARY_ATTRIBUTE],
    fontInfo:
      options.collectFontInfo === false
        ? undefined
        : {
            fontString: style.font,
            lineHeight:
              Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) || 16,
            textAlign: style.textAlign,
            padding: {
              top: Number.parseFloat(style.paddingTop) || 0,
              right: Number.parseFloat(style.paddingRight) || 0,
              bottom: Number.parseFloat(style.paddingBottom) || 0,
              left: Number.parseFloat(style.paddingLeft) || 0,
            },
          },
    identifier,
    attributes,
    children,
  };
}

function collectAttributes(element: Element): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attribute of element.attributes) {
    if (
      attribute.name.startsWith('data-') ||
      attribute.name.startsWith('aria-') ||
      attribute.name === 'href' ||
      attribute.name === 'src' ||
      attribute.name === 'alt' ||
      attribute.name === 'type' ||
      attribute.name === 'name'
    ) {
      result[attribute.name] = attribute.value;
    }
  }
  return result;
}

function ownText(element: Element): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
}

function parseZIndex(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function diffDocuments(before: RLSCDocument, after: RLSCDocument): LayoutChange[] {
  const previous = new Map(flatten(before.root).map((node) => [node.id, node]));
  const next = new Map(flatten(after.root).map((node) => [node.id, node]));
  const changes: LayoutChange[] = [];
  const timestamp = new Date().toISOString();
  for (const [id, node] of next) {
    const old = previous.get(id);
    if (!old) changes.push({ type: 'added', nodeId: id, after: node.rect, timestamp });
    else if (JSON.stringify(old.rect) !== JSON.stringify(node.rect)) {
      changes.push({ type: 'moved', nodeId: id, before: old.rect, after: node.rect, timestamp });
    }
  }
  for (const id of previous.keys()) {
    if (!next.has(id)) changes.push({ type: 'removed', nodeId: id, timestamp });
  }
  return changes;
}

function flatten(node: RLSCNode): RLSCNode[] {
  return [node, ...node.children.flatMap((child) => flatten(child))];
}

function cssEscape(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function createElementXPath(element: Element, root?: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    parts.unshift(xpathSegment(current));
    if (root && current === root) break;
    current = current.parentElement;
  }
  return `/${parts.join('/')}`;
}

function xpathSegment(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const parent = element.parentElement;
  const siblings = parent
    ? [...parent.children].filter((child) => child.tagName.toLowerCase() === tag)
    : [element];
  const index = Math.max(1, siblings.indexOf(element) + 1);
  return `${tag}[${index}]`;
}

function inferRole(element: Element): string | null {
  const roles: Record<string, string> = {
    header: 'banner',
    footer: 'contentinfo',
    main: 'main',
    nav: 'navigation',
    aside: 'complementary',
    section: 'region',
    article: 'article',
    form: 'form',
    button: 'button',
    a: 'link',
    img: 'img',
    input: 'textbox',
    select: 'combobox',
    textarea: 'textbox',
    ul: 'list',
    ol: 'list',
    li: 'listitem',
    table: 'table',
    dialog: 'dialog',
  };
  return roles[element.tagName.toLowerCase()] ?? null;
}

export type { AreaAnalysisNode };
