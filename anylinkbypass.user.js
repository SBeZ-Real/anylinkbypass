// ==UserScript==
// @name         AnyLinkBypass
// @namespace    https://github.com/SBeZ-Real/anylinkbypass
// @version      0.1.0
// @description  Skip supported advertising redirect pages and open their destination
// @match        *://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const PARAMS = [
    'url',
    'target',
    'dest',
    'destination',
    'redirect',
    'redirect_url',
    'redirectUrl',
    'to',
    'out',
    'link',
    'continue',
    'continue_url',
    'return',
    'return_url',
    'r',
    'u'
  ];

  const decodeValue = value => {
    let result = String(value || '').trim();
    for (let i = 0; i < 3; i++) {
      try {
        const decoded = decodeURIComponent(result.replace(/\+/g, '%20'));
        if (decoded === result) break;
        result = decoded;
      } catch {
        break;
      }
    }
    return result;
  };

  const normalizeUrl = value => {
    const decoded = decodeValue(value);
    if (!decoded || decoded.length > 8192) return null;

    const candidates = [decoded];
    try {
      candidates.push(atob(decoded));
    } catch {}

    for (const candidate of candidates) {
      const text = candidate.trim();
      if (!/^https?:\/\//i.test(text)) continue;
      try {
        const url = new URL(text);
        if (url.protocol === 'http:' || url.protocol === 'https:') return url;
      } catch {}
    }

    return null;
  };

  const handlers = [
    {
      id: 'query-destination',
      match: url => PARAMS.some(key => url.searchParams.has(key)),
      resolve: url => {
        for (const key of PARAMS) {
          const value = url.searchParams.get(key);
          const destination = normalizeUrl(value);
          if (destination && destination.hostname !== url.hostname) return destination.href;
        }
        return null;
      }
    },
    {
      id: 'meta-refresh',
      match: () => true,
      resolve: () => {
        const meta = document.querySelector('meta[http-equiv="refresh" i]');
        if (!meta) return null;
        const match = meta.content.match(/url\s*=\s*['"]?([^'";]+)['"]?/i);
        if (!match) return null;
        const destination = normalizeUrl(new URL(match[1].trim(), location.href).href);
        return destination && destination.href !== location.href ? destination.href : null;
      }
    }
  ];

  const run = () => {
    const current = new URL(location.href);
    for (const handler of handlers) {
      try {
        if (!handler.match(current)) continue;
        const destination = handler.resolve(current);
        if (!destination || destination === location.href) continue;
        const parsed = new URL(destination);
        if (!['http:', 'https:'].includes(parsed.protocol)) continue;
        location.replace(parsed.href);
        return;
      } catch {}
    }
  };

  run();

  const observer = new MutationObserver(() => {
    const current = new URL(location.href);
    for (const handler of handlers.slice(1)) {
      try {
        const destination = handler.resolve(current);
        if (destination && destination !== location.href) {
          location.replace(destination);
          return;
        }
      } catch {}
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.documentElement) {
        observer.observe(document.documentElement, { childList: true, subtree: true });
      }
    }, { once: true });
  }
})();
