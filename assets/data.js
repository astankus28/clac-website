/**
 * CLAC Data Layer — Supabase v2
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
  let _quickLinks = [], _boardMembers = [];
  let _readyPromise = null;

  const DEFAULT_SETTINGS = {
    heroHeadline:   'One community. Many stories. One Cleveland.',
    heroHeadlineLt: 'Viena bendruomenė. Daug istorijų. Vienas Klivlandas.',
    heroSub:        'The heartbeat of Lithuanian culture in Northeast Ohio — celebrating our heritage, connecting generations, and building a living community here on the shores of Lake Erie.',
    heroSubLt:      'Lietuviškos kultūros širdis Šiaurės Rytų Ohajuje — švenčiame paveldą, jungiame kartas ir kuriame gyvą bendruomenę čia, prie Erijo ežero krantų.',
    tickerText:     'Cleveland Lithuanian American Community · Est. 1951 · clacleveland.org',
    stat1Num:       '70+', stat1Label: 'Years Active',
    stat2Num:       'E. 185th', stat2Label: 'Heritage Corridor',
    ab1Label:       'Who We Are',       ab1LabelLt:    'Kas Mes Esame',
    ab1Heading:     'Clevelando Lietuvių Bendruomenė', ab1HeadingLt: 'Clevelando Lietuvių Bendruomenė',
    ab1Body:        'We are the Cleveland chapter of the Lithuanian American Community, Inc. — a national nonprofit active since 1951.',
    ab1BodyLt:      'Mes esame JAV Lietuvių Bendruomenės Klivlando skyrius — nacionalinė ne pelno organizacija, veikianti nuo 1951 m.',
    ab2Label:       'What We Do',       ab2LabelLt:    'Ką Mes Darome',
    ab2Heading:     'Celebrating Culture & Building Connections', ab2HeadingLt: 'Švenčiame Kultūrą ir Kuriame Ryšius',
    ab2Body:        'We organize cultural events throughout the year — spring gatherings, summer picnics, Christmas Eve Kūčios, and appearances at One World Day.',
    ab2BodyLt:      'Ištisus metus organizuojame kultūrinius renginius — pavasario susibūrimus, vasaros pikniką, Kūčias ir dalyvavimą One World Day šventėje.',
    ab3Label:       'Get Involved',     ab3LabelLt:    'Prisijunkite',
    ab3Heading:     'Everyone with Lithuanian Roots is Welcome', ab3HeadingLt: 'Visi, turintys lietuviškų šaknų, yra laukiami',
    ab3Body:        'Whether you speak Lithuanian at home or are just discovering your heritage — you belong here.',
    ab3BodyLt:      'Nesvarbu, ar kalbate lietuviškai namuose, ar tik atrandate savo paveldą — čia jūsų vieta.',
    contactEmail:   'info@clacleveland.org',
    facebookUrl:    'https://www.facebook.com/profile.php?id=61565856471983',
    instagramUrl:   'https://www.instagram.com/cleveland_lietuviu_bendruomene',
  };

  function mapEvent(e) {
    return {
      id: e.id, title: e.title, titleLt: e.title_lt,
      date: e.date, time: e.time, endTime: e.end_time,
      location: e.location, address: e.address,
      category: e.category, status: e.status,
      featured: e.featured, published: e.published,
      coverColor: e.cover_color, coverPhoto: e.cover_photo || '',
      description: e.description,
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
        sb('quick_links', '?select=*&order=sort_order.asc'),
        sb('board_members', '?select=*&published=eq.true&order=sort_order.asc'),
      ]).then(([evts, anns, setts, qls, bms]) => {
        _events        = (evts  || []).map(mapEvent);
        _announcements = anns  || [];
        _quickLinks    = qls   || [];
        _boardMembers  = bms   || [];
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

    settings:     { get() { return _settings; } },
    quickLinks:   { all() { return _quickLinks.slice(); } },
    boardMembers: { all() { return _boardMembers.slice(); } },

  };

  window.CLAC = CLAC;
})();
