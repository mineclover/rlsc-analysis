// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { collectLayout, identifyElement, scanScreen } from './browser.js';

describe('rlsc-analysis browser collection', () => {
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
