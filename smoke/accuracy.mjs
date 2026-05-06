import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const requireFromE2E = createRequire(join(repoRoot, 'packages/e2e/package.json'));
const { chromium } = requireFromE2E('@playwright/test');
const analysisDist = join(repoRoot, 'packages/rlsc-analysis/dist');
const perspectiveDist = join(repoRoot, 'packages/rlsc-perspective/dist');

const thresholds = {
  maxRectErrorPx: 1,
  minIoU: 0.98,
  maxAspectRatioError: 0.01,
  minXPathMatchRate: 1,
};

const fixtureHtml = String.raw`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>RLSC accuracy fixture</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font: 16px system-ui, sans-serif; }
      button, select { min-height: 36px; border: 1px solid #94a3b8; }
      #fixture-root {
        width: 860px;
        min-height: 680px;
        padding: 18px;
        border: 1px solid #cbd5e1;
      }
      .hero {
        display: grid;
        grid-template-columns: 1.3fr .7fr;
        gap: 12px;
        padding: 18px;
        border: 1px solid #b8d8cf;
      }
      .metrics,
      .columns {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .metric,
      .card {
        position: relative;
        padding: 14px;
        border: 1px solid #d6dde8;
        background: #f8fafc;
      }
      .text-stress {
        height: 22px;
        overflow: hidden;
      }
      .mutated {
        position: relative;
      }
      .spill-chip {
        position: absolute;
        top: -12px;
        right: -14px;
        padding: 4px 7px;
        border-radius: 6px;
        background: #f03e3e;
        color: white;
        font-size: 12px;
      }
      #viewer {
        width: 520px;
        height: 380px;
        margin-top: 24px;
      }
    </style>
  </head>
  <body>
    <article id="fixture-root" data-expected-id="root" data-component-id="FixtureRoot" role="main">
      <section class="hero" data-expected-id="hero" data-component-id="HeroBlock">
        <div class="copy" data-expected-id="copy"><h1>Accuracy fixture</h1><p>Browser geometry baseline</p></div>
        <button type="button" data-expected-id="cta" data-component-id="HeroCta">Action</button>
      </section>
      <section class="metrics" data-expected-id="metrics" data-component-id="MetricGrid">
        <div class="metric" data-expected-id="metric-a">Nodes</div>
        <div class="metric" data-expected-id="metric-b">Relations</div>
        <div class="metric" data-expected-id="metric-c">Text fill</div>
      </section>
      <section class="columns" data-expected-id="columns" data-component-id="ContentColumns">
        <article class="card" data-expected-id="card-a"><h2>Primary flow</h2><p>Spacing and flow.</p></article>
        <article class="card" data-expected-id="card-b"><h2>Boundary pressure</h2><p class="text-stress" data-expected-id="text-stress">A long debug sentence clipped by a fixed height.</p></article>
        <article class="card" data-expected-id="card-c"><h2>Mutation watch</h2><p>DOM changes are collected again.</p></article>
        <article class="card mutated" data-expected-id="mutation-card" data-component-id="MutationCard">
          <span class="spill-chip" data-expected-id="spill-chip" data-component-id="SpillChip">spill</span>
          <h2>New branch</h2>
          <p>Absolute child creates containment pressure.</p>
        </article>
      </section>
    </article>
    <div id="viewer"></div>
    <script type="module">
      import { scanScreen } from '/analysis/browser.js';
      import { createPerspectiveViewer } from '/perspective/index.js';
      window.__rlscAccuracy = { scanScreen, createPerspectiveViewer };
    </script>
  </body>
</html>`;

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/' || url.pathname === '/fixture.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(fixtureHtml);
      return;
    }
    if (url.pathname.startsWith('/analysis/')) {
      await serveFile(response, analysisDist, url.pathname.replace('/analysis/', ''));
      return;
    }
    if (url.pathname.startsWith('/perspective/')) {
      await serveFile(response, perspectiveDist, url.pathname.replace('/perspective/', ''));
      return;
    }
    response.writeHead(404);
    response.end('not found');
  } catch (error) {
    response.writeHead(500);
    response.end(error instanceof Error ? error.stack : String(error));
  }
});

try {
  await listen(server);
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('failed to bind accuracy server');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
    deviceScaleFactor: 1,
  });
  await page.goto(`http://127.0.0.1:${address.port}/fixture.html`, { waitUntil: 'networkidle' });
  const report = await page.evaluate(() => {
    const api = window.__rlscAccuracy;
    if (!api) throw new Error('RLSC browser API missing');
    const root = document.querySelector('#fixture-root');
    if (!root) throw new Error('fixture root missing');
    const result = api.scanScreen(root, {
      includeText: true,
      collect: { addressAttribute: 'data-qa-address' },
    });
    const expected = [...document.querySelectorAll('[data-expected-id]')].map((element) => {
      const rect = element.getBoundingClientRect();
      const id = element.getAttribute('data-expected-id');
      const node = result.nodes.find((item) => item.attributes['data-expected-id'] === id);
      return {
        id,
        actual: plainRect(rect),
        node: node ? { id: node.id, rect: node.rect, xpath: node.identifier.xpath } : null,
        error: node ? rectError(plainRect(rect), node.rect) : null,
      };
    });
    const geometryFailures = expected.filter(
      (item) =>
        !item.node ||
        !item.error ||
        item.error.maxDeltaPx > 1 ||
        item.error.iou < 0.98 ||
        item.error.aspectRatioError > 0.01,
    );
    const xpathMatches = expected.filter(
      (item) => item.node?.xpath && result.byXPath(item.node.xpath)?.id === item.node.id,
    );

    const viewerHost = document.querySelector('#viewer');
    if (!viewerHost) throw new Error('viewer host missing');
    const viewer = api.createPerspectiveViewer(viewerHost, result.doc, {
      projectionMode: 'orthographic',
    });
    viewer.setView('top');
    const spill = expected.find((item) => item.id === 'spill-chip');
    if (!spill?.node) throw new Error('spill-chip node missing');
    const layer = viewerHost.querySelector(`[data-node-id="${CSS.escape(spill.node.id)}"]`);
    if (!layer) throw new Error('spill-chip layer missing');
    const layerRect = layer.getBoundingClientRect();
    const projection = {
      nodeId: spill.node.id,
      xpath: spill.node.xpath,
      actualRatio: spill.actual.width / spill.actual.height,
      layerRatio: layerRect.width / layerRect.height,
      aspectRatioError: Math.abs(
        spill.actual.width / spill.actual.height - layerRect.width / layerRect.height,
      ),
      layerRect: plainRect(layerRect),
    };
    viewer.dispose();

    const maxRectErrorPx = Math.max(
      ...expected.map((item) => item.error?.maxDeltaPx ?? Number.POSITIVE_INFINITY),
    );
    const meanRectErrorPx =
      expected.reduce(
        (sum, item) => sum + (item.error?.meanDeltaPx ?? Number.POSITIVE_INFINITY),
        0,
      ) / expected.length;
    const minIoU = Math.min(...expected.map((item) => item.error?.iou ?? 0));
    const maxAspectRatioError = Math.max(
      ...expected.map((item) => item.error?.aspectRatioError ?? Number.POSITIVE_INFINITY),
    );
    return {
      geometry: {
        sampleCount: expected.length,
        maxRectErrorPx,
        meanRectErrorPx,
        minIoU,
        maxAspectRatioError,
        failures: geometryFailures.map((item) => ({
          id: item.id,
          node: item.node,
          error: item.error,
        })),
      },
      identifier: {
        xpathMatchRate: xpathMatches.length / expected.length,
        matched: xpathMatches.length,
        total: expected.length,
      },
      projection,
    };

    function plainRect(rect) {
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }

    function rectError(actual, collected) {
      const deltas = [
        Math.abs(actual.x - collected.x),
        Math.abs(actual.y - collected.y),
        Math.abs(actual.width - collected.width),
        Math.abs(actual.height - collected.height),
      ];
      return {
        maxDeltaPx: Math.max(...deltas),
        meanDeltaPx: deltas.reduce((sum, value) => sum + value, 0) / deltas.length,
        aspectRatioError: Math.abs(
          actual.width / actual.height - collected.width / collected.height,
        ),
        iou: rectIoU(actual, collected),
      };
    }

    function rectIoU(a, b) {
      const left = Math.max(a.x, b.x);
      const top = Math.max(a.y, b.y);
      const right = Math.min(a.x + a.width, b.x + b.width);
      const bottom = Math.min(a.y + a.height, b.y + b.height);
      const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
      const union = a.width * a.height + b.width * b.height - intersection;
      return union > 0 ? intersection / union : 0;
    }
  });
  await browser.close();

  console.log(JSON.stringify({ mode: 'rlsc-browser-accuracy', thresholds, report }, null, 2));
  assertReport(report);
} finally {
  server.close();
}

async function serveFile(response, root, requestedPath) {
  const normalized = normalize(requestedPath);
  if (normalized.startsWith('..')) {
    response.writeHead(403);
    response.end('forbidden');
    return;
  }
  const file = join(root, normalized);
  const body = await readFile(file);
  response.writeHead(200, { 'content-type': mimeType(file) });
  response.end(body);
}

function mimeType(file) {
  if (extname(file) === '.js') return 'text/javascript; charset=utf-8';
  if (extname(file) === '.map') return 'application/json; charset=utf-8';
  if (extname(file) === '.css') return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

function listen(nextServer) {
  return new Promise((resolve, reject) => {
    nextServer.once('error', reject);
    nextServer.listen(0, '127.0.0.1', () => resolve());
  });
}

function assertReport(report) {
  const failures = [];
  if (report.geometry.maxRectErrorPx > thresholds.maxRectErrorPx) {
    failures.push(
      `maxRectErrorPx ${report.geometry.maxRectErrorPx} > ${thresholds.maxRectErrorPx}`,
    );
  }
  if (report.geometry.minIoU < thresholds.minIoU) {
    failures.push(`minIoU ${report.geometry.minIoU} < ${thresholds.minIoU}`);
  }
  if (report.geometry.maxAspectRatioError > thresholds.maxAspectRatioError) {
    failures.push(
      `maxAspectRatioError ${report.geometry.maxAspectRatioError} > ${thresholds.maxAspectRatioError}`,
    );
  }
  if (report.identifier.xpathMatchRate < thresholds.minXPathMatchRate) {
    failures.push(
      `xpathMatchRate ${report.identifier.xpathMatchRate} < ${thresholds.minXPathMatchRate}`,
    );
  }
  if (report.projection.aspectRatioError > thresholds.maxAspectRatioError) {
    failures.push(
      `projection.aspectRatioError ${report.projection.aspectRatioError} > ${thresholds.maxAspectRatioError}`,
    );
  }
  if (failures.length > 0) throw new Error(`RLSC accuracy smoke failed: ${failures.join('; ')}`);
}
