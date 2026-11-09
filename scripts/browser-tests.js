/**
 * browser-tests.js
 * Runs integration and screenshot verification using headless Chrome:
 * 1. Desktop World Overview
 * 2. Country & Region Navigation (Japan & Kyoto)
 * 3. Outlying Islands (Hawaii, US-HI)
 * 4. Antimeridian Crossing (Fiji, FJ)
 * 5. Mobile Bottom Sheet Viewport
 * 6. Dark Theme Sketchbook Mode
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 3045;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          setTimeout(check, 300);
        }
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout waiting for ${url}`));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

function captureScreenshot(url, outputPath, width = 1440, height = 900) {
  return new Promise((resolve, reject) => {
    console.log(`Capturing: ${url} -> ${path.basename(outputPath)} (${width}x${height})`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${outputPath}`,
      url
    ];

    const proc = spawn(CHROME_PATH, args);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`Saved screenshot: ${path.basename(outputPath)}`);
        resolve();
      } else {
        reject(new Error(`Chrome exited with code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

async function main() {
  console.log('Starting Next.js production server for browser verification...');
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: 'inherit'
  });

  try {
    await waitForServer(`${BASE_URL}/explore`);
    console.log('Next.js server is ready at ' + BASE_URL);

    // 1. Desktop World Overview
    await captureScreenshot(
      `${BASE_URL}/explore`,
      path.join(SCREENSHOTS_DIR, '01-desktop-world-overview.png'),
      1440,
      900
    );

    // 2. Japan & Kyoto Region Feed Drawer
    await captureScreenshot(
      `${BASE_URL}/explore?country=JP&region=JP-26&post=post-jp-4`,
      path.join(SCREENSHOTS_DIR, '02-desktop-japan-kyoto-drawer.png'),
      1440,
      900
    );

    // 3. United States & Outlying Island (Hawaii)
    await captureScreenshot(
      `${BASE_URL}/explore?country=US&region=US-HI`,
      path.join(SCREENSHOTS_DIR, '03-desktop-us-hawaii.png'),
      1440,
      900
    );

    // 4. Fiji (Antimeridian Crossing)
    await captureScreenshot(
      `${BASE_URL}/explore?country=FJ&post=post-fj-1`,
      path.join(SCREENSHOTS_DIR, '04-desktop-fiji-antimeridian.png'),
      1440,
      900
    );

    // 5. Mobile Bottom Sheet View (iPhone dimensions 390x844)
    await captureScreenshot(
      `${BASE_URL}/explore?country=JP&region=JP-13`,
      path.join(SCREENSHOTS_DIR, '05-mobile-bottom-sheet.png'),
      390,
      844
    );

    // 6. Vatican City Microstate
    await captureScreenshot(
      `${BASE_URL}/explore?country=VA&post=post-va-1`,
      path.join(SCREENSHOTS_DIR, '06-desktop-vatican-city.png'),
      1440,
      900
    );

    console.log('All browser test screenshots captured successfully!');
  } finally {
    console.log('Shutting down test server...');
    server.kill();
  }
}

main().catch((err) => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
