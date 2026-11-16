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

// ---- Each event gets a framed panel topped with hand-drawn illustrations (img/party, recoloured to the site's ink) ----
// [file, position class, left %, top px, width px]. l / c / r and the twinkles a / b / c move a little on phones.
const DOODLES = {
  night_before: [['disco', 'c hang', 50, -22, 76], ['cheers', 'l', 18, 34, 104], ['notes', 'r', 82, 42, 46]],
  wedding: [['cake', 'c', 50, 18, 98], ['bouquet', 'l', 19, 24, 66], ['tower', 'r', 81, 24, 86]],
  morning_after: [['cloche', 'c', 50, 48, 118], ['vase', 'l', 20, 26, 58], ['strawberry', 'r', 80, 52, 46]]
};
const TWINKLES = [['twinkle-1', 'tw a', 36, 32, 16], ['twinkle-2', 'tw b', 64, 84, 13], ['twinkle-1', 'tw c', 69, 26, 11]];
const doodle = ([name, cls, x, y, w]) =>
  `<i class="doodle ${cls}" style="left:${x}%;top:${y}px;--w:${w}px"><img src="img/party/${name}.svg" alt=""></i>`;
const eventHead = id => DOODLES[id]
  ? `<div class="doodles" aria-hidden="true">${[...DOODLES[id], ...TWINKLES].map(doodle).join('')}</div>` : '';

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
    const framed = !!DOODLES[id];
    return `<section class="event-section${framed ? ' framed' : ''}" id="${id}">
      ${eventHead(id)}
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
