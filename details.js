// ---- Details: one section per event this household is invited to ----
// Each section: title, when & where, free-text details (Events tab), then that event's timeline
// (Itinerary tab). Each event shows a map beside its details (unless it's at the wedding venue). Bridal party rows (Itinerary for = bridal_party)
// simply appear in the timelines of households with someone in the bridal party.

const MAP = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);

/** Event info from the sheet, or sensible defaults if the backend hasn't been updated yet. */
function eventsFor(data) {
  if (Array.isArray(data.events) && data.events.length) return data.events;
  const nb = data.invite.nightBefore || {};
  const defaults = {
    night_before: { title: nb.title, title_es: nb.title_es, when: nb.when, when_es: nb.when_es, location: nb.where, location_es: nb.where_es, details: nb.details, details_es: nb.details_es },
    wedding: { when: 'Saturday 12th June 2027', when_es: 'Sábado, 12 de junio de 2027', location: 'Rowallan Castle, Kilmaurs, Ayrshire KA3 2LP' },
    morning_after: { when: 'Sunday 13th June 2027', when_es: 'Domingo, 13 de junio de 2027', location: 'Rowallan Castle' }
  };
  return householdEvents(data).map(id => ({ event: id, ...defaults[id] }));
}


/** Split the free-text details into plain paragraphs and "Label: text" facts (e.g. "Dress code: …"). */
function splitDetails(text) {
  const paras = [], facts = [];
  String(text || '').split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/^([^:\[\]]{2,24}):\s*(.+)$/);
    // A one-phrase value ("casual.") reads better without a full stop.
    if (m) facts.push([m[1], (m[2].charAt(0).toUpperCase() + m[2].slice(1)).replace(/^([^.!?]*)\.$/, '$1')]);
    else paras.push(line);
  });
  return { paras, facts };
}

const factRow = (label, html) => `<div><dt>${esc(label)}</dt><dd>${html}</dd></div>`;
const mapEmbed = q => `<div class="event-map"><div class="map-frame"><iframe title="${esc(q)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
  src="https://www.google.com/maps?q=${encodeURIComponent(q)}&z=14&output=embed"></iframe></div></div>`;

// ---- The night before: a festive panel, clinking glasses and a little confetti ----
const CONFETTI = ['#91b7c4', '#2c4a56', '#d9b45a', '#c9dde4'];
function confettiSvg(seed) {
  let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  let out = '';
  for (let i = 0; i < 30; i++) {
    // Confetti sits in the panel's margins and along the top, clear of the text, glasses and map.
    const top = i < 10, side = i % 2;
    const x = top ? (side ? 60 + rnd() * 28 : 12 + rnd() * 28) : side ? 92 + rnd() * 6 : 1.5 + rnd() * 6;
    const y = top ? 2 + rnd() * 9 : 6 + rnd() * 88;
    const c = CONFETTI[i % CONFETTI.length], rot = Math.round(rnd() * 360), d = (rnd() * 4).toFixed(2);
    const shape = i % 3 === 0 ? `<circle cx="5" cy="5" r="2.2" fill="${c}"/>`
      : i % 3 === 1 ? `<rect x="3.5" y="1.5" width="3" height="7" fill="${c}"/>`
      : `<path d="M1 5 q2 -3 4 0 t4 0" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`;
    out += `<i class="bit ${top ? 'top' : 'side'}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;animation-delay:-${d}s"><svg viewBox="0 0 10 10" style="transform:rotate(${rot}deg)">${shape}</svg></i>`;
  }
  return `<div class="confetti" aria-hidden="true">${out}</div>`;
}
const glass = cls => `<g class="${cls}">
    <path class="fizz" d="M-8 -30 L8 -30 L6.5 -6 Q0 2 -6.5 -6 Z"/>
    <path d="M-8 -30 L8 -30 L6.5 -6 Q0 2 -6.5 -6 Z" fill="none"/>
    <path class="liquid" d="M-7.3 -20 L7.3 -20 L6.5 -6 Q0 2 -6.5 -6 Z"/>
    <circle class="bubble" cx="-2" cy="-10" r="1"/><circle class="bubble" cx="2.5" cy="-14" r=".8" style="animation-delay:-.7s"/>
    <circle class="bubble" cx="0" cy="-8" r=".7" style="animation-delay:-1.3s"/>
    <path d="M0 -2 V16 M-7 16 H7" fill="none"/>
  </g>`;
const partyHead = () => `${confettiSvg(7)}
  <div class="party-head" aria-hidden="true">
    <svg class="cheers" viewBox="-40 -48 80 70">
      ${glass('g-left')}${glass('g-right')}
      <g class="spark"><path d="M0 -44 V-38 M-6 -41 L-3.5 -37.5 M6 -41 L3.5 -37.5"/></g>
    </svg>
  </div>
  <p class="party-tag">${t('partyTag')}</p>`;

withInvite(data => {
  $('events').innerHTML = eventsFor(data).map(ev => {
    const id = ev.event;
    const title = L(ev, 'title') || eventTitle(id);
    const loc = L(ev, 'location');
    // Every event with a location gets a map, except one at the same place as the wedding (the morning after),
    // which would just repeat the wedding's map.
    const weddingLoc = (eventsFor(data).find(e => e.event === 'wedding') || {}).location || '';
    const samePlace = id !== 'wedding' && weddingLoc && String(ev.location || '').split(',')[0].trim().toLowerCase() === weddingLoc.split(',')[0].trim().toLowerCase();
    const withMap = !!loc && !samePlace;
    const { paras, facts } = splitDetails(L(ev, 'details'));
    const rows = rowsFor(data, id);
    const factRows = [
      L(ev, 'when') ? factRow(t('when'), esc(L(ev, 'when'))) : '',
      loc ? factRow(t('where'), esc(loc)) : '',
      ...facts.map(([k, v]) => factRow(k, esc(v)))
    ].join('');
    const text = `<div class="event-text">
        ${paras.map(p => `<p>${esc(p)}</p>`).join('')}
        ${factRows ? `<dl class="facts">${factRows}</dl>` : ''}
      </div>`;
    const party = id === 'night_before';
    return `<section class="event-section${party ? ' party' : ''}" id="${id}">
      ${party ? partyHead() : ''}
      <h2>${esc(title)}</h2>
      ${withMap ? `<div class="event-body">${text}${mapEmbed(loc)}</div>` : text}
      ${rows.length ? `<div class="event-timeline"><h3 class="timeline-title">${t('orderOfEvents')}</h3>${timelineHtml(rows, data, {
          badges: false,                                                 // no RSVP status on this page
          dayHeadings: spansDays(rows)                                   // otherwise the date is already in the facts
        })}</div>` : ''}
    </section>`;
  }).join('');
  // Jump to a section if the link asked for one (e.g. old event-page links).
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}, 'events');
