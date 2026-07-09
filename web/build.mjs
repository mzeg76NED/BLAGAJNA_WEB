import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const repoDir = resolve(rootDir, '..');
const publicDir = resolve(rootDir, 'public');
const distDir = resolve(rootDir, 'dist');
const sourceHtmlDir = resolve(repoDir, 'src', 'html');

const views = [
  ['index.html', 'desktop-v2'],
  ['desktop-v2.html', 'desktop-v2'],
  ['desktop.html', 'desktop'],
  ['mobile.html', 'mobile'],
  ['select.html', 'index']
];

const printViews = [
  'print-cash-event',
  'print-daily-closing',
  'print-payment-order',
  'print-payment-request',
  'print-report',
  'print-shift-handover'
];

async function readSource(name) {
  return readFile(resolve(sourceHtmlDir, name + '.html'), 'utf8');
}

function rewriteAppsScriptExpressions(html) {
  return html
    .replace(/<base target="_top">\s*/g, '')
    .replace(/<\?=\s*ScriptApp\.getService\(\)\.getUrl\(\)\s*\?>/g, '')
    .replace(/<\?!=\s*include\('html\/([^']+)'\);\s*\?>/g, (_match, includeName) => {
      throw new Error('Unresolved include: ' + includeName);
    })
    .replace(/href="\?view=mobile"/g, 'href="/mobile.html"')
    .replace(/href="\?view=desktop"/g, 'href="/desktop.html"')
    .replace(/href="\?view=desktop-v2"/g, 'href="/desktop-v2.html"')
    .replace(/href="\?view=manifest"/g, 'href="/manifest.json"')
    .replace(/\(window\.BLAGAJNA_WEB_APP_URL\|\|''\)\+'\?view='/g, "'/' +");
}

async function renderTemplate(viewName) {
  let html = await readSource(viewName);
  html = html.replace(/<\?!=\s*include\('html\/([^']+)'\);\s*\?>/g, asyncPlaceholder);

  const includes = [];
  html = html.replace(/%%INCLUDE:([^%]+)%%/g, (_match, includeName) => {
    includes.push(includeName);
    return '%%INCLUDE_RESOLVED:' + includeName + '%%';
  });

  for (const includeName of includes) {
    let includeContent = await readSource(includeName);
    if (includeName === 'scripts' || includeName === 'scripts-v2') {
      includeContent = '<script src="/cloudflare-apps-script-adapter.js"></script>\n' + includeContent;
    }
    html = html.replace('%%INCLUDE_RESOLVED:' + includeName + '%%', includeContent);
  }

  return rewriteAppsScriptExpressions(html);
}

function asyncPlaceholder(_match, includeName) {
  return '%%INCLUDE:' + includeName + '%%';
}

async function renderPrintView(viewName) {
  const html = await renderTemplate(viewName);
  return html.replace(/href="\?view=desktop-v2"/g, 'href="/desktop-v2.html"');
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
await cp(publicDir, distDir, { recursive: true });

for (const [outputName, viewName] of views) {
  const html = await renderTemplate(viewName);
  await writeFile(resolve(distDir, outputName), html, 'utf8');
}

for (const viewName of printViews) {
  const html = await renderPrintView(viewName);
  await writeFile(resolve(distDir, viewName + '.html'), html, 'utf8');
}

console.log('Cloudflare Pages static build ready:', distDir);
