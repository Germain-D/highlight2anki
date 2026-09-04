// Régénère les captures d'écran du store (assets/screenshots/*.png).
//   cd assets && python3 -m http.server 8099 &   # sert demo-page.html
//   xvfb-run -a node assets/make-screenshots.js   # puis composition : voir STORE.md
// Nécessite playwright (npm i playwright) et le Chromium préinstallé.
const { chromium } = require('playwright');
const fs = require('fs');
const EXT = '/home/user/highlight2anki';
const OUT = `${EXT}/assets/screenshots`;

const toast = (id) => `
  const l = document.createElement('link');
  l.rel='stylesheet'; l.href='chrome-extension://${id}/src/content.css';
  document.head.appendChild(l);
  const host = document.createElement('div');
  host.id='h2a-toast-host'; host.className='h2a-success h2a-visible';
  const s=document.createElement('strong'); s.textContent='Ajouté à Anki';
  host.appendChild(s);
  for (const t of ['sérendipité','Fait de faire une découverte inattendue grâce au hasard.']) {
    const p=document.createElement('span'); p.textContent=t; host.appendChild(p);
  }
  document.documentElement.appendChild(host);
`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const ctx = await chromium.launchPersistentContext('/tmp/pw-profile2', {
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox'],
    viewport: { width: 1280, height: 800 },
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker', { timeout: 15000 });
  const id = new URL(sw.url()).host;

  // 1. page réelle + toast
  const p1 = await ctx.newPage();
  await p1.setViewportSize({ width: 1280, height: 800 });
  await p1.goto('http://localhost:8099/demo-page.html');
  await p1.evaluate(toast(id));
  await p1.waitForTimeout(600);
  await p1.screenshot({ path: `${OUT}/01-toast.png` });

  // 2. popups (assistant + accueil)
  const p2 = await ctx.newPage();
  await p2.setViewportSize({ width: 400, height: 560 });
  await p2.goto(`chrome-extension://${id}/src/popup.html`);
  await p2.waitForTimeout(2000);
  await p2.screenshot({ path: `${OUT}/popup-key.png` });
  await ctx.close();
})().catch(e => { console.error(e.message); process.exit(1); });
