/**
 * CLAC Data Layer — Supabase
 * Cleveland Lithuanian American Community — clacleveland.org
 * Call await CLAC.ready() before using any data methods.
 */
(function () {

  const SB_URL = 'https://pipgdibeustnvbiayixg.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpcGdkaWJldXN0bnZiaWF5aXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMDczODMsImV4cCI6MjA5MDU4MzM4M30.dkzUwPGg4q3bF9MfjLmc0Huf69Y1sadXXojuA62005w';

  const HEADERS = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json',
  };

  async function sb(table, params = '') {
    const res = await fetch(`${SB_URL}/rest/v1/${table}${params}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`Supabase error on ${table}`);
    return res.json();
  }

  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function parseDate(str) {
    if (!str) return new Date(0);
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  let _events = [], _announcements = [], _settings = {};
  let _readyPromise = null;

  const DEFAULT_SETTINGS = {
    heroHeadline: 'One community. Many stories. One Cleveland.',
    heroSub: 'The heartbeat of Lithuanian culture in Northeast Ohio.',
    tickerText: 'Cleveland Lithuanian American Community · Est. 1951 · clacleveland.org',
    email: 'info@clacleveland.org',
    facebook: 'https://www.facebook.com/profile.php?id=61565856471983',
    instagram: 'https://www.instagram.com/cleveland_lietuviu_bendruomene',
  };

  // Map snake_case DB columns to camelCase
  function mapEvent(e) {
    return {
      id: e.id, title: e.title, titleLt: e.title_lt,
      date: e.date, time: e.time, endTime: e.end_time,
      location: e.location, address: e.address,
      category: e.category, status: e.status,
      featured: e.featured, published: e.published,
      coverColor: e.cover_color, coverPhoto: e.cover_photo || '', description: e.description,
      tags: e.tags || [], attendees: e.attendees,
      rsvpLink: e.rsvp_link, recap: e.recap,
      contactEmail: e.contact_email, photos: e.photos || [],
    };
  }

  const CLAC = {

    ready() {
      if (_readyPromise) return _readyPromise;
      _readyPromise = Promise.all([
        sb('events', '?select=*&published=eq.true&order=date.asc'),
        sb('announcements', '?select=*&published=eq.true&order=date.desc'),
        sb('settings', '?select=*'),
      ]).then(([evts, anns, setts]) => {
        _events        = (evts  || []).map(mapEvent);
        _announcements = anns  || [];
        const s = {};
        (setts || []).forEach(r => s[r.key] = r.value);
        _settings = Object.assign({}, DEFAULT_SETTINGS, s);
      }).catch(e => {
        console.warn('CLAC: data load failed', e);
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
        return _events.filter(e => parseDate(e.date) >= today).sort((a,b) => parseDate(a.date)-parseDate(b.date));
      },
      past() {
        const today = new Date(); today.setHours(0,0,0,0);
        return _events.filter(e => parseDate(e.date) < today).sort((a,b) => parseDate(b.date)-parseDate(a.date));
      },
      get(id) { return _events.find(e => e.id === id) || null; },
    },

    announcements: {
      all()       { return _announcements.slice(); },
      published() { return this.all().filter(a => a.published); },
    },

    settings: { get() { return _settings; } },

  };

  window.CLAC = CLAC;
})();
