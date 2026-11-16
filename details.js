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

// ---- The night before: a festive panel with hand-drawn party doodles (img/party, recoloured to the site's ink) ----
const doodle = (name, cls, x, y, w) =>
  `<i class="doodle ${cls}" style="left:${x}%;top:${y}px;width:${w}px"><img src="img/party/${name}.svg" alt=""></i>`;
function partyHead() {
  const top = [
    doodle('disco', 'disco', 50, -22, 76),
    doodle('cheers', 'cheers', 18, 34, 104),
    doodle('notes', 'notes', 82, 42, 46),
    doodle('twinkle-1', 'twinkle', 36, 32, 16),
    doodle('twinkle-2', 'twinkle t2', 64, 84, 13),
    doodle('twinkle-1', 'twinkle t3', 69, 26, 11)
  ];
  const sides = [                                                      // in the margins, clear of the text
    doodle('heart-1', 'side', 5, 232, 30),
    doodle('sparkler', 'side', 95, 236, 42),
    doodle('popper', 'side', 4.6, 470, 34), doodle('note', 'side', 95, 540, 24)
  ];
  return `<div class="doodles" aria-hidden="true">${top.join('')}${sides.join('')}</div>`;
}

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
