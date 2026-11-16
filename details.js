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

// ---- The night before: a festive panel with hand-drawn party doodles ----
// Each doodle is drawn from points with a little seeded wobble, so the lines look sketched by hand.
let seedR = 11;
const rnd = () => (seedR = (seedR * 9301 + 49297) % 233280) / 233280;
const jit = (v, j) => v + (rnd() - .5) * 2 * j;
function wob(pts, j = .5, closed = false) {            // smooth Catmull-Rom path through jittered points
  const q = pts.map(([x, y]) => [jit(x, j), jit(y, j)]);
  const n = q.length, P = i => q[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1.map(v => v.toFixed(1))} ${c2.map(v => v.toFixed(1))} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return `<path d="${d}"/>`;
}
const arc = (cx, cy, rx, ry, a0, a1, n = 14) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const T = Math.PI * 2;

function discoBall() {
  const r = 30, cy = 52;
  let g = wob([[50, 0], [50.4, 11], [49.8, cy - r]], .3);                // the string from the top border
  g += wob(arc(50, 22 - 0, 3, 2, 0, T, 8), .2, true);                   // little cap
  g += wob(arc(50, cy, r, r, -1.4, -1.4 + T + .25, 28), .5);           // outline, overshooting like a pen stroke
  for (const y of [-21, -12, -3, 6, 15, 23]) {                          // latitude bands, bowed for roundness
    const w = Math.sqrt(r * r - y * y) - 1;
    g += wob(Array.from({ length: 7 }, (_, i) => { const x = -w + 2 * w * i / 6; return [50 + x, cy + y + 3.2 * (1 - (x / w) ** 2)]; }), .45);
  }
  for (const k of [-.8, -.45, 0, .45, .8]) {                            // longitude curves
    g += wob(arc(50, cy, r * k, r - 1, -Math.PI / 2, Math.PI / 2, 10), .45);
  }
  return { w: 100, h: 86, g };
}
function sparkle(s = 10) {
  const c = s * .16;
  return { w: s * 2 + 4, h: s * 2 + 4, g: wob([[0, -s], [c, -c], [s, 0], [c, c], [0, s], [-c, c], [-s, 0], [-c, -c]].map(([x, y]) => [x + s + 2, y + s + 2]), s * .04, true) };
}
function heart(sz = 14) {
  const pts = Array.from({ length: 22 }, (_, i) => { const t = -Math.PI + T * i / 21;
    return [sz + 1 + sz / 17 * 16 * Math.sin(t) ** 3, sz + 1 - sz / 17 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; });
  pts.push([pts[1][0] + 1.5, pts[1][1] - 1]);                            // pen carries on past the start
  return { w: sz * 2 + 2, h: sz * 2 + 4, g: wob(pts, .5) };
}
function notes() {
  let g = wob(arc(10, 42, 6, 4.5, 0, T + .3, 10), .4) + wob(arc(32, 37, 6, 4.5, 0, T + .3, 10), .4);
  g += wob([[15.5, 41], [15.8, 25], [15.6, 9]], .4) + wob([[37.5, 36], [37.6, 20], [37.4, 4]], .4);
  g += wob([[15.6, 9], [26, 6.5], [37.4, 4]], .4) + wob([[15.6, 14], [26, 11.5], [37.4, 9]], .4);
  return { w: 46, h: 50, g };
}
function glasses() {                                                     // two coupes, clinking
  const coupe = (cx, tilt) => {
    const R = ([x, y]) => { const c = Math.cos(tilt), s = Math.sin(tilt), dx = x - cx, dy = y - 60; return [cx + dx * c - dy * s, 60 + dx * s + dy * c]; };
    return `<g>${wob([[cx - 15, 22], [cx - 12, 31], [cx, 35], [cx + 12, 31], [cx + 15, 22]].map(R), .5)}${wob([[cx - 15.5, 22], [cx, 21.2], [cx + 15.5, 22]].map(R), .4)}`
      + wob([[cx - 12, 27], [cx, 28.5], [cx + 12, 27]].map(R), .5)
      + wob([[cx, 35], [cx + .3, 47], [cx, 58]].map(R), .4) + wob([[cx - 9, 60], [cx, 58.5], [cx + 9, 60]].map(R), .4) + '</g>';
  };
  const g = `<g class="g-left">${coupe(32, -.28)}</g><g class="g-right">${coupe(62, .28)}</g>`
    + `<g class="clink">${wob([[47, 9], [47.3, 3]], .3)}${wob([[40, 11], [37, 6]], .3)}${wob([[54, 11], [57, 6]], .3)}</g>`;
  return { w: 94, h: 64, g };
}
const doodle = (d, cls, x, y, sz) =>
  `<i class="doodle ${cls}" style="left:${x}%;top:${y}px;width:${sz}px"><svg viewBox="0 0 ${d.w.toFixed(0)} ${d.h.toFixed(0)}">${d.g}</svg></i>`;

function partyHead() {
  seedR = 11;
  const top = [
    doodle(discoBall(), 'disco', 50, -1, 140),
    doodle(glasses(), 'cheers', 18, 40, 110),
    doodle(notes(), 'notes', 81, 34, 48),
    doodle(sparkle(10), 'twinkle', 34, 34, 26),
    doodle(sparkle(7), 'twinkle t2', 66, 90, 18),
    doodle(sparkle(6), 'twinkle t3', 69, 26, 15)
  ];
  const sides = [                                                      // in the margins, clear of the text
    doodle(heart(14), 'side', 5, 230, 26), doodle(heart(11), 'side tilt', 8.5, 262, 21), doodle(heart(9), 'side', 3.6, 290, 17),
    doodle(sparkle(9), 'side twinkle', 95, 250, 20), doodle(notes(), 'side', 95.5, 420, 30),
    doodle(sparkle(7), 'side twinkle t2', 4.5, 470, 16), doodle(heart(10), 'side', 95, 560, 19)
  ];
  return `<div class="doodles" aria-hidden="true">${top.join('')}${sides.join('')}</div>
    <p class="party-tag">${t('partyTag')}</p>`;
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
