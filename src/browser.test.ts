// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INSPECTED_STYLE_FIELDS,
  collectLayout,
  identifyElement,
  scanScreen,
} from './browser.js';

describe('rlsc-analysis browser collection', () => {
  it('documents the default computed style fields used by the inspector', () => {
    expect(DEFAULT_INSPECTED_STYLE_FIELDS.map((field) => field.property)).toEqual([
      'display',
      'visibility',
      'z-index',
      'position',
      'overflow',
      'box-sizing',
      'flex-direction',
      'flex-wrap',
      'justify-content',
      'align-items',
      'align-content',
      'gap',
      'row-gap',
      'column-gap',
      'grid-template-columns',
      'grid-template-rows',
      'grid-auto-flow',
      'font',
      'font-size',
      'line-height',
      'text-align',
      'padding-*',
    ]);
    expect(DEFAULT_INSPECTED_STYLE_FIELDS.map((field) => field.category)).toContain('text');
  });

  it('collects xpath, metadata, inferred role, and semantic attributes', () => {
    document.body.innerHTML = `
      <main id="app" data-component-id="App" data-qa-address="demo:app">
        <section class="panel" data-boundary="component">
          <article data-component-id="Card" data-debug-label="Primary card">
            <a href="/detail">Detail</a>
          </article>
        </section>
      </main>
    `;
    setRect('#app', { x: 0, y: 0, width: 320, height: 240 });
    setRect('.panel', { x: 10, y: 20, width: 200, height: 120 });
    setRect('article', { x: 20, y: 30, width: 160, height: 80 });
    setRect('a', { x: 30, y: 40, width: 60, height: 20 });

    const root = document.querySelector('#app');
    if (!root) throw new Error('fixture root missing');

    const doc = collectLayout(root);
    const link = scanScreen(root).byXPath('/main[1]/section[1]/article[1]/a[1]');
    const identified = identifyElement(document.querySelector('a')!);

    expect(doc.root.identifier?.xpath).toBe('/main[1]');
    expect(doc.root.role).toBe('main');
    expect(doc.root.children[0]?.boundary).toBe('component');
    expect(doc.root.children[0]?.children[0]?.debugLabel).toBe('Primary card');
    expect(link?.attributes['href']).toBe('/detail');
    expect(link?.role).toBe('link');
    expect(identified.xpath).toBe('/html[1]/body[1]/main[1]/section[1]/article[1]/a[1]');
  });

  it('extracts a Figma-oriented standard layout stack from computed style', () => {
    document.body.innerHTML = `
      <main id="app" style="display: flex; flex-direction: column; gap: 12px; padding: 8px 10px; justify-content: center; align-items: stretch;">
        <section class="panel" style="position: absolute; overflow: hidden;">Panel</section>
      </main>
    `;
    setRect('#app', { x: 0, y: 0, width: 320, height: 240 });
    setRect('.panel', { x: 10, y: 20, width: 200, height: 120 });

    const root = document.querySelector('#app');
    if (!root) throw new Error('fixture root missing');

    const doc = collectLayout(root);
    const stack = doc.root.styleStack;
    const panelStack = doc.root.children[0]?.styleStack;

    expect(stack?.figma.layoutMode).toBe('VERTICAL');
    expect(stack?.figma.positionMode).toBe('AUTO');
    expect(stack?.autoLayout).toMatchObject({
      direction: 'column',
      gap: 12,
      justifyContent: 'center',
      alignItems: 'stretch',
    });
    expect(stack?.padding).toEqual({ top: 8, right: 10, bottom: 8, left: 10 });
    expect(panelStack?.figma.positionMode).toBe('ABSOLUTE');
    expect(panelStack?.overflow).toBe('hidden');
  });
});

function setRect(
  selector: string,
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): void {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`missing fixture element: ${selector}`);
  element.getBoundingClientRect = () => ({
    x: rect.x,
    y: rect.y,
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
    toJSON: () => rect,
  });
}
