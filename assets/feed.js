/**
 * CLAC Community Feed
 * Fetches events from ltcle.org (via Cloudflare Worker proxy) and merges
 * them with local CLAC events into a unified community calendar.
 *
 * Sources:
 *   - CLAC events:   localStorage via CLAC.events (data.js)
 *   - ltcle.org:     /api/community-events (proxied by _worker.js)
 *   - St. Casimir:   scraped from saintcasimirparish.org (HTML parse fallback)
 *
 * Usage:
 *   await CommunityFeed.load()           — fetches all sources
 *   CommunityFeed.all()                  — merged, sorted, deduped events
 *   CommunityFeed.upcoming(n)            — next N events across all sources
 *   CommunityFeed.bySource('ltcle')      — filter by source
 */

const CommunityFeed = (() => {

  // ── CONFIG ──────────────────────────────────────────────────────────────
  // After deploying _worker.js, replace this with your actual worker URL
  // e.g. 'https://clac-feed.yourname.workers.dev' or just '/api/community-events'
  // if using Cloudflare Pages with _worker.js in repo root.
  const PROXY_URL = '/api/community-events';

  // Direct fallback — works if ltcle.org ever adds CORS headers themselves
  const LTCLE_DIRECT = 'https://ltcle.org/wp-json/tribe/events/v1/events';

  // Cache duration in ms (30 minutes)
  const CACHE_TTL = 30 * 60 * 1000;

  // Internal state
  let _cache     = null;
  let _cacheTime = 0;
  let _loading   = null;

  // ── SOURCE CONFIGS ───────────────────────────────────────────────────────
  const SOURCES = {
    clac: {
      name:  'CLAC',
      label: 'Cleveland Lithuanian American Community',
      url:   null,  // loaded from localStorage
      color: '#2d4a33',
      badge: '★ CLAC',
    },
    ltcle: {
      name:  'ltcle.org',
      label: 'Lithuanians of Cleveland',
      url:   PROXY_URL,
      color: '#1e2e3a',
      badge: 'ltcle.org',
    },
    stcasimir: {
      name:  'St. Casimir',
      label: 'St. Casimir Parish',
      url:   'https://www.saintcasimirparish.org/',
      color: '#3a2818',
      badge: 'St. Casimir',
    },
  };

  // ── NORMALIZE ────────────────────────────────────────────────────────────
  // Convert any source's event format into our unified shape

  function normalizeClac(e) {
    return {
      id:          `clac-${e.id}`,
      source:      'clac',
      sourceName:  SOURCES.clac.label,
      sourceBadge: SOURCES.clac.badge,
      sourceColor: SOURCES.clac.color,
      sourceUrl:   null,
      title:       e.title,
      date:        e.date,
      time:        e.time || '',
      endTime:     e.endTime || '',
      location:    e.location || '',
      address:     e.address || '',
      description: e.description ? e.description.split('\n')[0] : '',
      url:         `event.html?id=${e.id}`,
      category:    e.category || 'Community',
      coverColor:  e.coverColor || SOURCES.clac.color,
      isOwn:       true,
    };
  }

  function normalizeLtcle(e) {
    // Strip HTML from description
    const div  = document.createElement('div');
    div.innerHTML = e.description || e.excerpt || '';
    const desc = div.textContent.trim().slice(0, 200);

    const venue = e.venue ? `${e.venue.venue}${e.venue.city ? ', ' + e.venue.city : ''}` : '';

    return {
      id:          `ltcle-${e.id}`,
      source:      'ltcle',
      sourceName:  SOURCES.ltcle.label,
      sourceBadge: SOURCES.ltcle.badge,
      sourceColor: SOURCES.ltcle.color,
      sourceUrl:   'https://ltcle.org',
      title:       e.title,
      date:        e.start_date ? e.start_date.split(' ')[0] : '',
      time:        e.start_date ? formatTime(e.start_date) : '',
      endTime:     e.end_date   ? formatTime(e.end_date)   : '',
      location:    venue,
      address:     e.venue ? e.venue.address : '',
      description: desc,
      url:         e.url,
      category:    (e.categories && e.categories[0]) ? e.categories[0].name : 'Community',
      coverColor:  SOURCES.ltcle.color,
      isOwn:       false,
    };
  }

  // Simple HTML scrape parser for St. Casimir
  // Their site doesn't have a clean API so we pull what we can
  function parseStCasimir(html) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(html, 'text/html');
    const events = [];

    // Try common WordPress event patterns
    doc.querySelectorAll('.tribe-events-calendar-list__event, .tribe_events_cat, article.type-tribe_events').forEach(el => {
      const titleEl = el.querySelector('h2, h3, .tribe-event-url, a');
      const dateEl  = el.querySelector('time, .tribe-event-date-start, .tribe-events-schedule');
      if (!titleEl) return;

      events.push({
        id:          `stcasimir-${Math.random().toString(36).slice(2)}`,
        source:      'stcasimir',
        sourceName:  SOURCES.stcasimir.label,
        sourceBadge: SOURCES.stcasimir.badge,
        sourceColor: SOURCES.stcasimir.color,
        sourceUrl:   'https://www.saintcasimirparish.org',
        title:       titleEl.textContent.trim(),
        date:        dateEl ? (dateEl.getAttribute('datetime') || '').split('T')[0] : '',
        time:        '',
        endTime:     '',
        location:    'St. Casimir Parish, 18022 Neff Rd, Cleveland',
        address:     '18022 Neff Rd, Cleveland, OH 44119',
        description: '',
        url:         titleEl.href || 'https://www.saintcasimirparish.org',
        category:    'Religious',
        coverColor:  SOURCES.stcasimir.color,
        isOwn:       false,
      });
    });

    return events;
  }

  // ── FETCH FUNCTIONS ──────────────────────────────────────────────────────

  async function fetchClacEvents() {
    try {
      await CLAC.ready();
      return CLAC.events.upcoming().map(normalizeClac);
    } catch (e) {
      console.warn('CommunityFeed: CLAC events unavailable', e);
      return [];
    }
  }

  async function fetchLtcleEvents() {
    try {
      const today    = new Date().toISOString().split('T')[0];
      const url      = `${PROXY_URL}?per_page=30&start_date=${today}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data   = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];
      return events.map(normalizeLtcle);

    } catch (err) {
      console.warn('CommunityFeed: ltcle.org fetch failed —', err.message);
      return [];
    }
  }

  async function fetchStCasimirEvents() {
    // St. Casimir doesn't have an API — we try a CORS proxy approach
    // If it fails silently, that's fine — it's bonus content
    try {
      const url      = `${PROXY_URL}?source=stcasimir`;
      const response = await fetch(
        'https://www.saintcasimirparish.org/events/',
        { signal: AbortSignal.timeout(6000), mode: 'no-cors' }
      );
      // no-cors gives an opaque response — can't read it from browser
      // This source requires the Worker to handle it server-side
      return [];
    } catch (err) {
      return [];
    }
  }

  // ── DEDUPLICATE ──────────────────────────────────────────────────────────
  // Remove near-duplicate events (same title + date across sources)

  function dedupe(events) {
    const seen = new Map();
    return events.filter(e => {
      const key = `${normalizeTitle(e.title)}|${e.date}`;
      if (seen.has(key)) {
        // Prefer CLAC's own event record over external
        if (e.isOwn) seen.set(key, e);
        return false;
      }
      seen.set(key, e);
      return true;
    });
  }

  function normalizeTitle(t) {
    return t.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function sortByDate(events) {
    return [...events].sort((a, b) => {
      const da = new Date(a.date + (a.time ? ' ' + a.time : ''));
      const db = new Date(b.date + (b.time ? ' ' + b.time : ''));
      return da - db;
    });
  }

  function isFuture(e) {
    const d = new Date(e.date + 'T23:59:59');
    return d >= new Date();
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────

  async function load(force = false) {
    // Return cache if fresh
    if (!force && _cache && (Date.now() - _cacheTime) < CACHE_TTL) {
      return _cache;
    }
    // Prevent concurrent fetches
    if (_loading) return _loading;

    _loading = Promise.all([
      fetchClacEvents(),
      fetchLtcleEvents(),
      // fetchStCasimirEvents(), // re-enable when Worker handles it
    ]).then(([clac, ltcle]) => {
      const merged = dedupe(sortByDate([...clac, ...ltcle]));
      _cache     = merged;
      _cacheTime = Date.now();
      _loading   = null;
      return merged;
    });

    return _loading;
  }

  function all() {
    return _cache || [];
  }

  function upcoming(n = 10) {
    return sortByDate(all().filter(isFuture)).slice(0, n);
  }

  function bySource(source) {
    return all().filter(e => e.source === source);
  }

  function sources() {
    return SOURCES;
  }

  return { load, all, upcoming, bySource, sources, SOURCES };

})();
