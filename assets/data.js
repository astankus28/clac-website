/**
 * CLAC Data Layer — Sanity CMS
 * Cleveland Lithuanian American Community — clacleveland.org
 *
 * Fetches content from Sanity's CDN API.
 * Call await CLAC.ready() before using any data methods.
 */

(function () {

  const PROJECT_ID = '64al1xou';
  const DATASET    = 'production';
  const API_VER    = '2024-01-01';
  const CDN        = `https://${PROJECT_ID}.apicdn.sanity.io/v${API_VER}/data/query/${DATASET}`;

  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function parseDate(str) {
    if (!str) return new Date(0);
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  async function query(groq) {
    const url = CDN + '?query=' + encodeURIComponent(groq);
    const res  = await fetch(url);
    if (!res.ok) throw new Error('Sanity query failed');
    const json = await res.json();
    return json.result;
  }

  let _events        = [];
  let _announcements = [];
  let _settings      = {};
  let _readyPromise  = null;

  const DEFAULT_SETTINGS = {
    heroHeadline: 'One Community. Many stories. Viena širdis.',
    heroSub: "Cleveland's Lithuanian-American community — preserving heritage, building connections, and celebrating culture together since 1951.",
    tickerText: 'Cleveland Lithuanian American Community · Est. 1951 · clacleveland.org',
    contactEmail: 'info@clacleveland.org',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61565856471983',
    instagramUrl: 'https://www.instagram.com/cleveland_lietuviu_bendruomene',
  };

  const CLAC = {

    ready() {
      if (_readyPromise) return _readyPromise;
      _readyPromise = Promise.all([
        query(`*[_type == "event"] | order(date asc) {
          "id": _id,
          title, titleLt, date, time, location, category,
          status, featured, description, coverColor,
          attendees, url, recap, tags,
          "coverImage": coverImage.asset->url
        }`),
        query(`*[_type == "announcement"] | order(date desc) {
          "id": _id,
          title, type, date, body, status
        }`),
        query(`*[_type == "settings"][0] {
          heroHeadline, heroSub, tickerText,
          contactEmail, facebookUrl, instagramUrl
        }`),
      ]).then(([evts, anns, setts]) => {
        _events        = evts  || [];
        _announcements = anns  || [];
        _settings      = Object.assign({}, DEFAULT_SETTINGS, setts || {});
      }).catch(e => {
        console.warn('CLAC: Sanity fetch failed, using defaults', e);
        _settings = DEFAULT_SETTINGS;
      });
      return _readyPromise;
    },

    formatDate(dateStr) {
      const d = parseDate(dateStr);
      return MONTHS_LONG[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    },

    formatDateShort(dateStr) {
      const d = parseDate(dateStr);
      return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate();
    },

    monthDay(dateStr) {
      const d = parseDate(dateStr);
      return { month: MONTHS_SHORT[d.getMonth()].toUpperCase(), day: String(d.getDate()) };
    },

    events: {
      all()      { return _events.slice(); },
      upcoming() {
        const today = new Date(); today.setHours(0,0,0,0);
        return _events.filter(e => parseDate(e.date) >= today).sort((a,b) => parseDate(a.date) - parseDate(b.date));
      },
      past() {
        const today = new Date(); today.setHours(0,0,0,0);
        return _events.filter(e => parseDate(e.date) < today).sort((a,b) => parseDate(b.date) - parseDate(a.date));
      },
      get(id) { return _events.find(e => e.id === id) || null; },
    },

    announcements: {
      all()       { return _announcements.slice(); },
      published() { return this.all().filter(a => a.status === 'published'); },
    },

    settings: {
      get() { return _settings; },
    },

  };

  window.CLAC = CLAC;

})();
