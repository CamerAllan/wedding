// ---- Events: shared by Home, the itinerary and the three event pages ----
// Itinerary rows come from the sheet (already filtered to what this household is invited to). Each row's
// "event" column puts it on an event page; each row's "rsvp" column decides its status icon.

const EVENTS = {
  night_before:  { page: 'night-before.html',  status: 'night_before', en: 'The night before',  es: 'La noche anterior' },
  wedding:       { page: 'wedding.html',       status: 'wedding',      en: 'The wedding',       es: 'La boda' },
  morning_after: { page: 'morning-after.html', status: 'room',         en: 'The morning after', es: 'La mañana siguiente' }
};
const EVENT_ORDER = ['night_before', 'wedding', 'morning_after'];
const eventTitle = id => EVENTS[id][getLang()];

/** Which event a row belongs to. Falls back to a guess if the sheet's "event" column isn't there yet. */
function eventOf(it) {
  if (EVENTS[it.event]) return it.event;
  if (it.rsvp === 'night_before') return 'night_before';
  if (/sunday|domingo/i.test((it.day || '') + ' ' + (it.day_es || ''))) return 'morning_after';
  return 'wedding';
}

/** The household's invite + itinerary, refetching if this browser's saved copy predates the itinerary. */
async function loadInviteData() {
  let data = await getInvite(getCode());
  if (data.ok && !Array.isArray(data.itinerary)) {
    data = await apiGet(getCode(), getVerified()?.name);
    if (data.ok) cacheInvite(getCode(), data);
  }
  return data;
}

/** Events this household is invited to, in order. */
function householdEvents(data) {
  const ids = new Set((data.itinerary || []).map(eventOf));
  ids.add('wedding');
  if (data.invite.nightBefore) ids.add('night_before');
  return EVENT_ORDER.filter(id => ids.has(id));
}
const rowsFor = (data, id) => (data.itinerary || []).filter(it => eventOf(it) === id);

/** This household's answer for one RSVP item: 'yes', 'no' or '' (not answered yet). */
function rsvpStatus(kind, existing) {
  if (!existing || !existing.length) return '';
  if (kind === 'room') return existing[0].room_accepted || '';
  const field = kind === 'night_before' ? 'night_before' : 'attending';
  const answers = existing.map(e => e[field]).filter(Boolean);
  if (answers.includes('yes')) return 'yes';
  return answers.length ? 'no' : '';
}

function statusBadge(kind, existing) {
  if (!kind) return '';
  const s = rsvpStatus(kind, existing);
  if (s === 'yes') return `<span class="status yes">${t('stYes')}</span>`;
  if (s === 'no') return `<span class="status no">${t('stNo')}</span>`;
  return `<a class="status todo" href="rsvp.html">${t('stTodo')}</a>`;
}

// If a cell ever arrives as a full date string ("Fri Jun 11 2027 19:00:00 GMT+0100 …"), show just the useful part.
function tidy(value, kind) {
  if (kind === 'time' && !/GMT/.test(value)) return to24h(value);
  if (!/\d{2}:\d{2}:\d{2} GMT/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d)) return value;
  const locale = getLang() === 'es' ? 'es-ES' : 'en-GB';
  if (kind === 'day') {
    if (getLang() === 'es') return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
    const n = d.getDate(), suf = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
    return `${d.toLocaleDateString('en-GB', { weekday: 'long' })} ${n}${suf} ${d.toLocaleDateString('en-GB', { month: 'long' })}`;
  }
  // Take the clock time as written (1899 dates carry odd historical time-zone offsets).
  const [, hh, mm] = value.match(/(\d{2}):(\d{2}):\d{2} GMT/);
  return `${hh}:${mm}`;
}
/** Times are shown on the 24-hour clock: "7:30pm" → "19:30", "9:30–10:30am" → "09:30–10:30". Other text is left alone. */
function to24h(value) {
  const s = String(value || '');
  const m = s.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(?:[–-]\s*(\d{1,2})(?::(\d{2}))?)?\s*(am|pm)\s*$/i);
  if (!m) return s;
  const conv = (h, mm, ap) => { h = Number(h) % 12 + (ap.toLowerCase() === 'pm' ? 12 : 0); return String(h).padStart(2, '0') + ':' + (mm || '00'); };
  return m[3] ? conv(m[1], m[2], m[5]) + '–' + conv(m[3], m[4], m[5]) : conv(m[1], m[2], m[5]);
}
const dayOf = it => tidy(L(it, 'day'), 'day');

/** Timeline for some itinerary rows, with a heading for each day. */
// Days compare loosely ("Friday 11 June" = "friday 11th june"), and a blank day continues the previous one.
const dayKey = d => String(d || '').toLowerCase().replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/\s+/g, ' ').trim();

/** One continuous timeline for some itinerary rows. Day labels (if wanted) sit inside it, so the line never breaks. */
function timelineHtml(items, data, { badges = true, skipStatus = '', dayHeadings = true } = {}) {
  let lastKey = null;
  const parts = [];
  items.forEach(it => {
    const day = dayOf(it), key = dayKey(day);
    if (dayHeadings && key && key !== lastKey) parts.push(`<li class="itin-day-row"><h3 class="itin-day">${esc(day)}</h3></li>`);
    if (key) lastKey = key;
    parts.push(`<li>
        <span class="time">${esc(tidy(L(it, 'time'), 'time'))}</span>
        <span class="itin-body">
          <span class="itin-title">${esc(L(it, 'title'))}</span>
          ${L(it, 'details') ? `<span class="desc">${esc(L(it, 'details'))}</span>` : ''}
          ${badges && it.rsvp !== skipStatus ? statusBadge(it.rsvp, data.existing) : ''}
        </span></li>`);
  });
  return `<ul class="timeline itin">${parts.join('')}</ul>`;
}
/** True if the rows cover more than one day (so day labels are worth showing). */
const spansDays = rows => new Set(rows.map(dayOf).map(dayKey).filter(Boolean)).size > 1;

/** Run render(data) once the guest is unlocked and their data has loaded, and again on language change. */
function withInvite(render, target) {
  let data = null;
  const draw = () => { if (data) render(data); };
  document.addEventListener('langchange', draw);
  whenUnlocked(async () => {
    try {
      data = await loadInviteData();
      if (!data.ok) { if (target) $(target).innerHTML = `<p>${t('wentWrong')}</p>`; data = null; return; }
      draw();
    } catch (e) { if (target) $(target).innerHTML = `<p>${t('unreachable')}</p>`; }
  });
  // A fresher copy arrived from the sheet (see getInvite): redraw with it.
  document.addEventListener('invitefresh', e => { if (e.detail && e.detail.ok) { data = e.detail; draw(); } });
}
