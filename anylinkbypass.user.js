// ==UserScript==
// @name         AnyLinkBypass
// @namespace    https://github.com/SBeZ-Real/anylinkbypass
// @version      0.3.0
// @description  Load selected shortlink modules from their original sources
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_download
// @grant        GM_notification
// @grant        GM_info
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

(() => {
  'use strict';

  const OWNER = 'SBeZ-Real';
  const REPO = 'anylinkbypass';
  const BRANCH = 'main';
  const MANIFEST_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/modules/manifest.json`;

  if (window.top !== window.self) return;

  const request = url => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: 20000,
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      onload: response => {
        if (response.status >= 200 && response.status < 300) resolve(response.responseText);
        else reject(new Error(`HTTP ${response.status}`));
      },
      ontimeout: () => reject(new Error('Timeout')),
      onerror: () => reject(new Error('Network error'))
    });
  });

  const host = location.hostname.toLowerCase();

  const matches = entry => {
    if (!entry || entry.enabled === false || !Array.isArray(entry.domains)) return false;
    if (typeof entry.sourceUrl !== 'string' || !entry.sourceUrl.startsWith('https://')) return false;
    const domainMatch = entry.domains.some(domain => {
      const normalized = String(domain).toLowerCase().replace(/^\*\./, '');
      return host === normalized || host.endsWith('.' + normalized);
    });
    if (!domainMatch) return false;
    if (Array.isArray(entry.paths) && !entry.paths.some(path => location.pathname.startsWith(String(path)))) return false;
    return true;
  };

  const executeOriginal = source => {
    const names = [
      'window', 'document', 'navigator', 'location', 'unsafeWindow', 'fetch',
      'GM_xmlhttpRequest', 'GM_setValue', 'GM_getValue', 'GM_deleteValue',
      'GM_listValues', 'GM_setClipboard', 'GM_addStyle', 'GM_registerMenuCommand',
      'GM_openInTab', 'GM_download', 'GM_notification', 'GM_info'
    ];
    const values = [
      window, document, navigator, location, unsafeWindow, fetch,
      GM_xmlhttpRequest, GM_setValue, GM_getValue, GM_deleteValue,
      GM_listValues, GM_setClipboard, GM_addStyle, GM_registerMenuCommand,
      GM_openInTab, GM_download, GM_notification, GM_info
    ];
    return new Function(...names, '"use strict";\n' + source)(...values);
  };

  const run = async () => {
    try {
      const manifest = JSON.parse(await request(`${MANIFEST_URL}?t=${Date.now()}`));
      if (!manifest || !Array.isArray(manifest.modules)) return;
      for (const entry of manifest.modules.filter(matches)) {
        try {
          const source = await request(entry.sourceUrl);
          executeOriginal(source);
          console.info('[AnyLinkBypass] Loaded:', entry.id);
        } catch (error) {
          console.warn('[AnyLinkBypass] Module failed:', entry.id, error.message);
        }
      }
    } catch (error) {
      console.warn('[AnyLinkBypass] Loader failed:', error.message);
    }
  };

  run();
})();
