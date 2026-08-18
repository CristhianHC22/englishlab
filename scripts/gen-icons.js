/* Generate PNG app icons from icon.svg (Playwright Chromium). */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const svg = fs.readFileSync(path.join(ROOT, "icon.svg"), "utf8");
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0b7a72"/>
  <circle cx="256" cy="256" r="140" fill="#e8f1ee"/>
  <text x="256" y="300" text-anchor="middle" font-family="system-ui,sans-serif" font-size="96" font-weight="800" fill="#0b7a72">EL</text>
</svg>`;

async function renderPng(markup, size, file) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  const scaled = markup.replace("<svg", `<svg width="${size}" height="${size}"`);
  await page.setContent(`<!DOCTYPE html><html><head><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:#0b7a72;overflow:hidden}
  </style></head><body>${scaled}</body></html>`);
  await page.screenshot({ path: path.join(ROOT, file), type: "png" });
  await browser.close();
}

(async () => {
  await renderPng(svg, 180, "icon-180.png");
  await renderPng(svg, 192, "icon-192.png");
  await renderPng(svg, 512, "icon-512.png");
  await renderPng(maskable, 512, "icon-maskable-512.png");
  console.log("Wrote icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png");
})();
