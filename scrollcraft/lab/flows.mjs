// Drives the quiz and results flows and screenshots key states. Run from scrollcraft/lab.
// node flows.mjs <outDir> [width height] [--reduced]
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const { chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core");

const [out = "flows", w = "1440", h = "900"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const reduced = process.argv.includes("--reduced");
fs.mkdirSync(out, { recursive: true });
const BASE = "http://localhost:3100";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, reducedMotion: reduced ? "reduce" : "no-preference" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: `${out}/${name}.png` }); };

// Quiz: fresh start, answer budget, range, body; then results.
await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
await shot("q0-start");
await page.getByRole("radio", { name: /£30–40k/ }).click();
await shot("q1-range");
await page.getByRole("radio", { name: /250\+ miles/ }).click();
await shot("q2-body");
await page.getByRole("radio", { name: /^SUV/ }).click();
await shot("q3-priority");
await page.getByRole("button", { name: "Show my matches" }).click();
await page.waitForURL(/results/);
await page.waitForLoadState("networkidle");
console.log("results url:", page.url());
await shot("r0-top");
const act = page.locator(".peak-act");
const box = await act.boundingBox();
const top = box.y + (await page.evaluate(() => scrollY));
for (const p of [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1]) {
  await page.evaluate((y) => scrollTo(0, y), top + p * (box.height - +h));
  await shot(`r1-peak-${String(p * 100).padStart(3, "0")}`);
}
await page.evaluate((y) => scrollTo(0, y), top + box.height + 100);
await shot("r2-more");

// Homepage budget picker hands over to question 2.
await page.goto(`${BASE}/quiz?budget=under-30k`, { waitUntil: "networkidle" });
await shot("q-preset");
// Edit answers round trip and an impossible combination.
await page.goto(`${BASE}/results?budget=under-30k&range=350&body=estate&priority=range&seats=7`, { waitUntil: "networkidle" });
await shot("r-none");
console.log("errors:", errors.filter((e) => !/404/.test(e)));
await browser.close();
