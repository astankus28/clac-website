/**
 * CLAC Data Layer
 * Cleveland Lithuanian American Community — clacleveland.org
 *
 * Provides the global CLAC object used by all pages.
 * Data is stored in localStorage so the dashboard can write
 * and the public pages can read.
 *
 * Namespaces:
 *   CLAC.events          — event CRUD + queries
 *   CLAC.announcements   — announcement CRUD + queries
 *   CLAC.settings        — site-wide settings
 *   CLAC.auth            — simple dashboard auth state
 *   CLAC.formatDate()    — "April 12, 2025"
 *   CLAC.formatDateShort() — "Apr 12"
 *   CLAC.monthDay()      — { month: "APR", day: "12" }
 */

(function () {

  /* ── SEED DATA ──────────────────────────────────────────────────────────── */
  // Shown until real content is entered via the dashboard.
  // Dates use ISO format: "YYYY-MM-DD"

  const SEED_EVENTS = [
    {
      id: 'evt-001',
      title: 'Užgavėnės — Shrove Tuesday Celebration',
      titleLt: 'Užgavėnių šventė',
      date: '2026-03-03',
      time: '5:00 PM',
      location: 'Lithuanian Club, Cleveland',
      category: 'Cultural',
      description: 'Join us for the traditional Lithuanian Shrove Tuesday celebration with blynai, music, and the burning of Morė to chase away winter.\n\nAll are welcome. Bring the family!',
      coverColor: '#2d4a33',
      attendees: 80,
      status: 'past',
      featured: true,
      url: '',
      recap: 'A wonderful evening celebrating the end of winter with the whole community.',
      photos: [],
      tags: ['traditional', 'family', 'food'],
    },
    {
      id: 'evt-002',
      title: 'Annual Spring Dinner & Dance',
      titleLt: 'Pavasario vakaronė',
      date: '2026-05-10',
      time: '6:00 PM',
      location: 'Lithuanian Club, E. 185th St, Cleveland',
      category: 'Social',
      description: 'Our beloved annual dinner and dance returns. Enjoy traditional Lithuanian cuisine, live music, and an evening with the community.\n\nTickets available at the door or in advance from board members.',
      coverColor: '#3d2e1a',
      attendees: null,
      status: 'upcoming',
      featured: true,
      url: '',
      recap: '',
      photos: [],
      tags: ['dinner', 'dance', 'music', 'annual'],
    },
    {
      id: 'evt-003',
      title: 'Lithuanian Language Class — Summer Session',
      titleLt: 'Lietuvių kalbos kursai',
      date: '2026-06-07',
      time: '10:00 AM',
      location: 'St. George Church, Cleveland',
      category: 'Education',
      description: 'Summer session Lithuanian language classes for all ages. Beginner and intermediate levels available.\n\nContact us to register.',
      coverColor: '#1e2e3a',
      attendees: null,
      status: 'upcoming',
      featured: false,
      url: '',
      recap: '',
      photos: [],
      tags: ['language', 'education', 'children'],
    },
    {
      id: 'evt-004',
      title: 'Joninės — Midsummer Night',
      titleLt: 'Joninių šventė',
      date: '2026-06-21',
      time: '7:00 PM',
      location: 'Lithuanian Cultural Garden, Cleveland',
      category: 'Cultural',
      description: 'Celebrate the summer solstice at the Lithuanian Cultural Garden. Traditional songs, flower wreaths, and a bonfire.',
      coverColor: '#2e3a1e',
      attendees: null,
      status: 'upcoming',
      featured: false,
      url: '',
      recap: '',
      photos: [],
      tags: ['traditional', 'midsummer', 'outdoor'],
    },
  ];

  const SEED_ANNOUNCEMENTS = [
    {
      id: 'ann-001',
      type: 'Membership',
      title: '2026 Membership Renewal Now Open',
      body: 'Annual membership renewal is open for 2026. Please contact a board member or reach us at info@clacleveland.org to renew or join.',
      date: '2026-01-15',
      status: 'published',
    },
    {
      id: 'ann-002',
      type: 'Community',
      title: 'CLAC Now on Instagram',
      body: 'Follow us @cleveland_lietuviu_bendruomene for photos, event updates, and community news.',
      date: '2026-02-01',
      status: 'published',
    },
    {
      id: 'ann-003',
      type: 'News',
      title: 'New Website Launched',
      body: 'Welcome to the new CLAC website. Events, news, and community resources are now available online. More features coming soon.',
      date: '2026-03-01',
      status: 'published',
    },
  ];

  const SEED_SETTINGS = {
    heroHeadline: 'One Community. Many stories. Viena širdis.',
    heroSub: 'Cleveland\'s Lithuanian-American community — preserving heritage, building connections, and celebrating culture together since 1951.',
    tickerText: 'Cleveland Lithuanian American Community · Est. 1951 · clacleveland.org',
    siteName: 'Cleveland Lithuanian American Community',
    contactEmail: 'info@clacleveland.org',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61565856471983',
    instagramUrl: 'https://www.instagram.com/cleveland_lietuviu_bendruomene',
  };

  /* ── STORAGE HELPERS ────────────────────────────────────────────────────── */

  function load(key, seed) {
    try {
      const raw = localStorage.getItem('clac_' + key);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // First run — persist seed so dashboard can edit it
    save(key, seed);
    return seed;
  }

  function save(key, data) {
    try {
      localStorage.setItem('clac_' + key, JSON.stringify(data));
    } catch (e) {
      console.warn('CLAC: localStorage write failed', e);
    }
    return data;
  }

  /* ── DATE UTILITIES ─────────────────────────────────────────────────────── */

  const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Parse "YYYY-MM-DD" without timezone shift
  function parseDate(str) {
    if (!str) return new Date(0);
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /* ── PUBLIC API ─────────────────────────────────────────────────────────── */

  const CLAC = {

    /* ── FORMAT HELPERS ── */

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
      return {
        month: MONTHS_SHORT[d.getMonth()].toUpperCase(),
        day:   String(d.getDate()),
      };
    },

    /* ── EVENTS ── */

    events: {
      _data: null,

      _get() {
        if (!this._data) this._data = load('events', SEED_EVENTS);
        return this._data;
      },

      all() {
        return this._get().slice().sort((a, b) => parseDate(a.date) - parseDate(b.date));
      },

      upcoming() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return this._get()
          .filter(e => parseDate(e.date) >= today)
          .sort((a, b) => parseDate(a.date) - parseDate(b.date));
      },

      past() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return this._get()
          .filter(e => parseDate(e.date) < today)
          .sort((a, b) => parseDate(b.date) - parseDate(a.date)); // newest first
      },

      get(id) {
        return this._get().find(e => e.id === id) || null;
      },

      save(event) {
        const data = this._get();
        if (!event.id) event.id = 'evt-' + Date.now();
        const idx = data.findIndex(e => e.id === event.id);
        if (idx >= 0) data[idx] = event;
        else data.push(event);
        this._data = save('events', data);
        return event;
      },

      delete(id) {
        this._data = save('events', this._get().filter(e => e.id !== id));
      },

      slugify(title) {
        return 'evt-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
      },
    },

    /* ── ANNOUNCEMENTS ── */

    announcements: {
      _data: null,

      _get() {
        if (!this._data) this._data = load('announcements', SEED_ANNOUNCEMENTS);
        return this._data;
      },

      all() {
        return this._get().slice().sort((a, b) => parseDate(b.date) - parseDate(a.date));
      },

      published() {
        return this.all().filter(a => a.status === 'published');
      },

      save(ann) {
        const data = this._get();
        if (!ann.id) ann.id = 'ann-' + Date.now();
        const idx = data.findIndex(a => a.id === ann.id);
        if (idx >= 0) data[idx] = ann;
        else data.push(ann);
        this._data = save('announcements', data);
        return ann;
      },

      delete(id) {
        this._data = save('announcements', this._get().filter(a => a.id !== id));
      },
    },

    /* ── SETTINGS ── */

    settings: {
      _data: null,

      get() {
        if (!this._data) this._data = load('settings', SEED_SETTINGS);
        return this._data;
      },

      save(updates) {
        this._data = save('settings', Object.assign(this.get(), updates));
        return this._data;
      },
    },

    /* ── AUTH ── */

    auth: {
      // Simple flag — dashboard sets this on login.
      // Not a security mechanism; the dashboard is admin-only by convention.
      current() {
        try {
          return JSON.parse(sessionStorage.getItem('clac_user') || 'null');
        } catch (e) { return null; }
      },

      login(user) {
        sessionStorage.setItem('clac_user', JSON.stringify(user));
      },

      logout() {
        sessionStorage.removeItem('clac_user');
        window.location.href = 'index.html';
      },
    },

  };

  window.CLAC = CLAC;

})();
