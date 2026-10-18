// ==UserScript==
// @name         AnyLinkBypass
// @namespace    https://github.com/SBeZ-Real/anylinkbypass
// @version      0.2.1
// @description  Load site-specific bypass modules from GitHub
// @match        *://*/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==

(() => {
  'use strict';

  const OWNER = 'SBeZ-Real';
  const REPO = 'anylinkbypass';
  const BRANCH = 'main';
  const MANIFEST = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/modules/manifest.json?t=${Date.now()}`;
  const host = location.hostname.toLowerCase();

  const request = url => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: 10000,
      onload: response => {
        if (response.status >= 200 && response.status < 300) resolve(response.responseText);
        else reject(new Error(String(response.status)));
      },
      ontimeout: () => reject(new Error('timeout')),
      onerror: () => reject(new Error('network'))
    });
  });

  const matches = entry => {
    if (!entry || !Array.isArray(entry.domains) || typeof entry.file !== 'string') return false;
    return entry.domains.some(domain => {
      const normalized = String(domain).toLowerCase().replace(/^\*\./, '');
      return host === normalized || host.endsWith('.' + normalized);
    });
  };

  const run = async () => {
    try {
      const manifest = JSON.parse(await request(MANIFEST));
      if (!manifest || !Array.isArray(manifest.modules)) return;
      const selected = manifest.modules.filter(matches);
      for (const entry of selected) {
        const path = entry.file.replace(/^\/+/, '');
        if (path.split('/').includes('..')) continue;
        const sourceUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path.split('/').map(encodeURIComponent).join('/')}?t=${Date.now()}`;
        const source = await request(sourceUrl);
        const moduleFactory = new Function('"use strict";return (' + source + '\n);');
        const moduleHandler = moduleFactory();
        if (typeof moduleHandler === 'function') {
          await moduleHandler({
            location,
            document,
            window,
            URL,
            URLSearchParams,
            fetch,
            GM_xmlhttpRequest
          });
        }
      }
    } catch (error) {
      console.warn('[AnyLinkBypass] Module loading failed:', error.message);
    }
  };

  run();
})();
