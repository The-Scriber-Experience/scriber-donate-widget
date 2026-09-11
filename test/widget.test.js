const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const QRCodeGenerator = require('../public/qr-generator');
const { PLATFORMS, DONATION_TARGETS, ScriberWidget } = require('../public/widget');
const { server, startServer, broadcastEvent, sseClients } = require('../server');

test('QR Code Generator tests', async (t) => {
  await t.test('generates valid QR SVG markup for Cash App', () => {
    const url = 'https://cash.app/$renzoscriber';
    const svg = QRCodeGenerator.generateSVG(url, {
      size: 200,
      margin: 1,
      colorDark: '#00f2ff'
    });

    assert.ok(svg.startsWith('<svg'), 'SVG tag starts correctly');
    assert.ok(svg.endsWith('</svg>'), 'SVG tag ends correctly');
    assert.ok(svg.includes('viewBox='), 'Contains viewBox');
    assert.ok(svg.includes('fill="#00f2ff"'), 'Applies colorDark correctly');
    assert.ok(svg.includes('<path d="M'), 'Contains encoded matrix path coordinates');
  });

  await t.test('generates valid QR matrix', () => {
    const matrix = QRCodeGenerator.getMatrix('https://www.buymeacoffee.com/renzoscriber', 'M');
    assert.ok(Array.isArray(matrix), 'Matrix is an array');
    assert.ok(matrix.length >= 21, 'Matrix size is valid QR dimension');
    assert.ok(matrix[0].length === matrix.length, 'Matrix is square');
  });
});

test('Multistream Platforms & Targets configuration integrity', async (t) => {
  await t.test('contains all 5 streaming platforms with proper handles', () => {
    const expectedPlatforms = ['twitch', 'velora', 'youtube', 'kick', 'beam'];
    for (const key of expectedPlatforms) {
      assert.ok(PLATFORMS[key], `Platform ${key} exists`);
      assert.ok(PLATFORMS[key].url.startsWith('https://'), `Platform ${key} has https URL`);
      assert.ok(PLATFORMS[key].icon, `Platform ${key} has icon`);
      assert.ok(PLATFORMS[key].color, `Platform ${key} has color`);
    }

    assert.strictEqual(PLATFORMS.twitch.url, 'https://www.twitch.tv/renzoscriber');
    assert.strictEqual(PLATFORMS.velora.url, 'https://velora.tv/renzoscriber');
    assert.strictEqual(PLATFORMS.youtube.url, 'https://www.youtube.com/@sofiascriber');
    assert.strictEqual(PLATFORMS.kick.url, 'https://www.kick.com/renzoscriber');
    assert.strictEqual(PLATFORMS.beam.url, 'https://beamstream.gg/renzoscriber');
  });

  await t.test('contains all TSE donation targets with proper handles', () => {
    const expectedTargets = ['cashapp', 'bmac', 'amazon', 'landing'];
    for (const key of expectedTargets) {
      assert.ok(DONATION_TARGETS[key], `Target ${key} exists`);
      assert.ok(DONATION_TARGETS[key].url.startsWith('https://'), `Target ${key} has https URL`);
      assert.ok(DONATION_TARGETS[key].handle, `Target ${key} has handle`);
      assert.ok(DONATION_TARGETS[key].icon, `Target ${key} has icon`);
    }

    assert.strictEqual(DONATION_TARGETS.cashapp.handle, '$renzoscriber');
    assert.strictEqual(DONATION_TARGETS.bmac.handle, 'renzoscriber');
  });
});

test('ScriberWidget logic & state math', async (t) => {
  await t.test('initializes default options correctly', () => {
    const widget = new ScriberWidget({
      mode: 'compact',
      goalCurrent: 50,
      goalTarget: 200
    });

    assert.strictEqual(widget.options.mode, 'compact');
    assert.strictEqual(widget.options.goalCurrent, 50);
    assert.strictEqual(widget.options.goalTarget, 200);
    assert.strictEqual(widget.options.activeTarget, 'cashapp');
    assert.strictEqual(widget.options.autoRotate, false);
    assert.strictEqual(widget.rotateTimer, null);
  });

  await t.test('cycles targets sequentially on nextTarget()', () => {
    const widget = new ScriberWidget();
    assert.strictEqual(widget.options.activeTarget, 'cashapp');

    widget.nextTarget();
    assert.strictEqual(widget.options.activeTarget, 'bmac');

    widget.nextTarget();
    assert.strictEqual(widget.options.activeTarget, 'amazon');

    widget.nextTarget();
    assert.strictEqual(widget.options.activeTarget, 'landing');

    widget.nextTarget();
    assert.strictEqual(widget.options.activeTarget, 'cashapp');
  });
});

test('Server & HTTP / Live API integration tests', async (t) => {
  const TEST_PORT = 38291;
  let activeServer;

  await t.test('starts server and responds to static files', async () => {
    activeServer = await startServer(TEST_PORT);

    // Request root /
    const rootRes = await fetch(`http://localhost:${TEST_PORT}/`);
    assert.strictEqual(rootRes.status, 200);
    const rootHtml = await rootRes.text();
    assert.ok(rootHtml.includes('The Scriber Experience'), 'Serves root / correctly');

    // Request with query parameter /?mode=compact
    const queryRes = await fetch(`http://localhost:${TEST_PORT}/?mode=compact`);
    assert.strictEqual(queryRes.status, 200);
    const queryHtml = await queryRes.text();
    assert.ok(queryHtml.includes('The Scriber Experience'), 'Serves /?mode=compact correctly');

    // Request index.html
    const res = await fetch(`http://localhost:${TEST_PORT}/index.html`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('The Scriber Experience'), 'Serves index.html correctly');
    assert.ok(html.includes('id="tse-pill-mode"'), 'Contains pill mode element');
    assert.ok(html.includes('id="tse-card-mode"'), 'Contains card mode element');
  });

  await t.test('serves CSS stylesheet with glassmorphism, space background & gradients', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/styles.css`);
    assert.strictEqual(res.status, 200);
    const css = await res.text();
    assert.ok(css.includes('--gradient-brand'), 'Contains TSE gradient definition');
    assert.ok(css.includes('.widget-compact-pill'), 'Contains compact pill styles');
    assert.ok(css.includes('spacebackground.jpg') || css.includes('spacebackground.png'), 'Contains space background reference');
    assert.ok(css.includes('min-width: 580px'), 'Contains wider compact pill dimensions');
    assert.ok(css.includes('width: 480px'), 'Contains wider QR card dimensions');
  });

  await t.test('serves spacebackground image assets correctly', async () => {
    const pngRes = await fetch(`http://localhost:${TEST_PORT}/assets/images/spacebackground.png`);
    assert.strictEqual(pngRes.status, 200);
    assert.strictEqual(pngRes.headers.get('content-type'), 'image/png');

    const jpgRes = await fetch(`http://localhost:${TEST_PORT}/assets/images/spacebackground.jpg`);
    assert.strictEqual(jpgRes.status, 200);
    assert.strictEqual(jpgRes.headers.get('content-type'), 'image/jpeg');
  });

  await t.test('status API returns valid metadata', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.app, 'The Scriber Experience OBS Widget');
    assert.strictEqual(data.version, '1.0.0');
  });

  await t.test('cheer API accepts POST alerts and responds', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/cheer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donor: 'Katnip the Brave',
        amount: '$25.00',
        message: 'For the stream!',
        target: 'cashapp'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.alert.donor, 'Katnip the Brave');
    assert.strictEqual(data.alert.amount, '$25.00');
  });

  await t.test('closes test server', async () => {
    await new Promise((resolve) => activeServer.close(resolve));
  });
});
