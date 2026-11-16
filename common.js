// ---- Config ----
// Paste the Apps Script web app URL here after deploying. Leave empty for demo mode (fake data, nothing saved).
const API_URL = 'https://script.google.com/macros/s/AKfycbxII2fMqqJvL2AdopDELxpDiKsVlPpToaQ1FRxQECj2EuPC5ixoFGMW-yBnzFzJsPFpjg/exec';

// ---- Demo data (used only when API_URL is empty) ----
const DEMO = {
  invites: {
    DEMO01: { code:'DEMO01', guests:['Alex Smith','Jamie Smith'], plusOnesAllowed:0,
      room:{ name:'The Garden Suite', description:'Ground-floor suite opening onto the walled garden.', nights:'Saturday 12th June (wedding night)', image:'rooms/mure-2.jpg, rooms/mure-1.jpg, rooms/mure-3.jpg', price:'£180',
             description_es:'Suite en la planta baja con acceso al jardín amurallado.', nights_es:'Sábado 12 de junio (noche de la boda)', price_es:'180 £' },
      nightBefore:{ title:'Night-before party', when:'Friday 11th June 2027, from 19:30', where:'Placeholder pub, Somewhere', details:'Casual drinks and food.',
                    title_es:'Fiesta de la noche anterior', when_es:'Viernes 11 de junio de 2027, a partir de las 19:30', where_es:'Pub provisional', details_es:'Copas y algo de comer.' } },
    DEMO02: { code:'DEMO02', guests:['Sam Jones'], plusOnesAllowed:1, room:null },
    DEMO03: { code:'DEMO03', lang:'es', guests:['Lucía García','Javier Ruiz'], plusOnesAllowed:0,
      room:{ name:'The Loft Room', description:'Cosy room in the eaves.', description_es:'Acogedora habitación abuhardillada.', nights:'Sat 12th June', nights_es:'Sábado 12 de junio', image:'rooms/loft.svg', price:'', price_es:'', free:true },
      nightBefore:{ title:'Night-before party', title_es:'Fiesta de la noche anterior', when:'Friday 11th June 2027, from 19:30', when_es:'Viernes 11 de junio de 2027, a partir de las 19:30', where:'Placeholder pub', where_es:'Pub provisional' } }
  },
  menu:{ diets:['Vegan','Vegetarian','Gluten-free'], courses:[
    { name:'Starter', options:[
      {option:'Scottish Salmon Three Ways',option_es:'Salmón escocés en tres versiones',description:'Heritage Beetroot',description_es:'Remolacha tradicional',diets:{'Gluten-free':'on request'}},
      {option:'Goats Cheese Arancini',option_es:'Arancini de queso de cabra',description:'Rocket & Red Onion | Beetroot',diets:{Vegetarian:'','Gluten-free':'on request'}}] },
    { name:'Main', options:[
      {option:'Sticky Pulled Beef Shin',option_es:'Jarrete de ternera desmenuzado y glaseado',description:'Beer Braised Shallot | Creamed Potato | Tender Stem | Beef Jus',diets:{'Gluten-free':''}},
      {option:'Chicken Balmoral Roulade',option_es:'Rollito de pollo Balmoral',description:'Creamed Potato | Glazed Carrot | Whisky Sauce',diets:{}}] },
    { name:'Dessert', options:[
      {option:'Rowallan Bakery Sticky Toffee Pudding',option_es:'Sticky toffee pudding de la panadería de Rowallan',description:'Vanilla Ice Cream | Toffee Sauce',description_es:'Helado de vainilla | Salsa de toffee',diets:{}},
      {option:'Blueberry Bakewell Tart',option_es:'Tarta Bakewell de arándanos',description:'Lavender Anglaise | Madagascan Vanilla Ice Cream',diets:{}}] }
  ]},
  saved:{},
  itinerary:[
    {day:'Friday 11th June',day_es:'Viernes 11 de junio',time:'19:30',time_es:'19:30',title:'Night-before party',title_es:'Fiesta de la noche anterior',for:'night_before',rsvp:'night_before'},
    {day:'Saturday 12th June',day_es:'Sábado 12 de junio',time:'09:00',time_es:'9:00',title:'Bridal party: hair & makeup',title_es:'Cortejo nupcial: peluquería y maquillaje',for:'bridal_party',rsvp:'',event:'wedding'},
    {day:'Saturday 12th June',day_es:'Sábado 12 de junio',time:'13:00',time_es:'13:00',title:'Guests arrive',title_es:'Llegada de los invitados',details:'Please park at the Glasshouse restaurant.',for:'everyone',rsvp:'wedding'},
    {day:'Saturday 12th June',day_es:'Sábado 12 de junio',time:'13:30',time_es:'13:30',title:'Ceremony',title_es:'Ceremonia',for:'everyone',rsvp:'wedding'},
    {day:'Saturday 12th June',day_es:'Sábado 12 de junio',time:'14:00',time_es:'14:00',title:'Drinks reception',title_es:'Cóctel de bienvenida',for:'everyone',rsvp:'wedding'},
    {day:'Saturday 12th June',day_es:'Sábado 12 de junio',time:'[time TBC]',time_es:'[hora por confirmar]',title:'Check in to your room',title_es:'Entrada en la habitación',for:'room',rsvp:'room'},
    {day:'Sunday 13th June',day_es:'Domingo 13 de junio',time:'09:30–10:30',time_es:'09:30–10:30',title:'Breakfast',title_es:'Desayuno',details:'Included with your room, served on the ground floor.',for:'room',rsvp:'room'}
  ]
};
DEMO.events = [
  { event:'night_before', title:'Night-before party', title_es:'Fiesta de la noche anterior', when:'Friday 11th June 2027, from 19:30', when_es:'Viernes 11 de junio de 2027, a partir de las 19:30', location:'Placeholder pub, Glasgow', details:'Casual drinks the night before.\nDress code: casual', details_es:'Unas copas informales la noche antes.\nVestimenta: informal' },
  { event:'wedding', title:'The wedding', title_es:'La boda', when:'Saturday 12th June 2027', when_es:'Sábado, 12 de junio de 2027', location:'Rowallan Castle, Kilmaurs, Ayrshire KA3 2LP', location_es:'Rowallan Castle, Kilmaurs, Ayrshire, Escocia KA3 2LP',
    details:'The whole day takes place at the castle, from the ceremony through to the ceilidh.\nDress code: cocktail attire. Highland dress is welcome!', details_es:'Todo el día se celebra en el castillo, desde la ceremonia hasta el ceilidh.\nVestimenta: cóctel. ¡El kilt es bienvenido!' },
  { event:'morning_after', title:'The morning after', title_es:'La mañana siguiente', when:'Sunday 13th June 2027', when_es:'Domingo, 13 de junio de 2027', location:'Rowallan Castle', details:'Dress code: casual', details_es:'Vestimenta: informal' }
];
function demoItinerary(inv) {
  const ok = { everyone:true, night_before:!!inv.nightBefore, room:!!inv.room, bridal_party:inv.code === 'DEMO01' };
  return DEMO.itinerary.filter(r => ok[r.for]);
}

async function apiGet(code, name) {
  if (!API_URL) {
    await new Promise(r => setTimeout(r, 300));
    const inv = DEMO.invites[code];
    if (!inv) return { ok:false, error:'not_found' };
    if (!nameMatches(inv.guests, name)) return { ok:false, error: name ? 'name_mismatch' : 'name_required', lang: inv.lang || 'en' };
    return { ok:true, invite:inv, menu:DEMO.menu, existing:DEMO.saved[code] || [], itinerary: demoItinerary(inv),
      events: DEMO.events.filter(e => e.event === 'wedding' || (e.event === 'night_before' && inv.nightBefore) || (e.event === 'morning_after' && inv.room)) };
  }
  const res = await fetch(API_URL + '?code=' + encodeURIComponent(code) + '&name=' + encodeURIComponent(name || ''));
  return res.json();
}

async function apiPost(payload) {
  payload = { ...payload, name: getVerified()?.name || '' };
  if (!API_URL) {
    await new Promise(r => setTimeout(r, 300));
    if (!nameMatches(DEMO.invites[payload.code].guests, payload.name)) return { ok:false, error:'name_mismatch' };
    DEMO.saved[payload.code] = payload.people.map(p => ({
      guest_name:p.guest_name, is_plus_one:p.is_plus_one?'yes':'no', attending:p.attending?'yes':'no',
      diets:p.diets.join(', '), dietary_notes:p.dietary, room_accepted: payload.room_accepted===true?'yes':payload.room_accepted===false?'no':'',
      message: payload.message, night_before: p.night_before===true?'yes':p.night_before===false?'no':'', ...p.courses }));
    return { ok:true };
  }
  // text/plain avoids a CORS preflight, which Apps Script can't answer.
  const res = await fetch(API_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body:JSON.stringify(payload) });
  return res.json();
}


const $ = id => document.getElementById(id);
const show = (el, on=true) => el.classList.toggle('hidden', !on);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ---- Remembered invite code (shared by all pages) ----
// Any page opened with ?code=XXXX remembers it, so the other pages can show that household's details.
const CODE_KEY = 'weddingInviteCode', VERIFIED_KEY = 'weddingVerified';
function storeCode(code) { try { localStorage.setItem(CODE_KEY, code); } catch (e) {} }
function getCode() {
  const fromUrl = new URLSearchParams(location.search).get('code');
  if (fromUrl) { storeCode(fromUrl.trim().toUpperCase()); return fromUrl.trim().toUpperCase(); }
  try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
}

// ---- Lock: the whole site needs an invite code + a surname from that invite ----
// Once passed, this browser remembers it ({ code, name }). The backend checks the surname too.
function getVerified() { try { return JSON.parse(localStorage.getItem(VERIFIED_KEY) || 'null'); } catch (e) { return null; } }
function setVerified(code, name) { try { localStorage.setItem(VERIFIED_KEY, JSON.stringify({ code, name })); } catch (e) {} }
function clearVerified() { try { localStorage.removeItem(VERIFIED_KEY); } catch (e) {} }
function isUnlocked() { const v = getVerified(); return !!v && v.code === getCode(); }
/** Run fn now if the site is unlocked, otherwise as soon as the guest gets past the lock. */
function whenUnlocked(fn) {
  if (isUnlocked()) fn();
  else document.addEventListener('inviteunlocked', () => fn(), { once: true });
}

// Same forgiving check as the backend (used in demo mode): case, accents and small typos don't matter,
// and any surname in the household works.
function nameTokens(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z]+/).filter(Boolean); }
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}
function nameMatches(guests, input) {
  const typed = nameTokens(input);
  if (!typed.length) return false;
  typed.push(typed.join(''));
  const known = [];
  guests.forEach(g => { const p = nameTokens(g); const s = p.length > 1 ? p.slice(1) : p; known.push(...s); if (s.length > 1) known.push(s.join('')); });
  return typed.some(t => known.some(k => editDistance(t, k) <= (k.length >= 8 ? 2 : k.length >= 4 ? 1 : 0)));
}

function showGate() {
  const code = getCode();
  const gate = document.createElement('div');
  gate.id = 'gate';
  gate.innerHTML = `
    <header><div class="castle"><canvas class="fireworks" aria-hidden="true"></canvas><img src="img/castle.png" alt="" width="1422" height="994"></div>
    <p class="formal"><span data-lang="en">We invite you to celebrate <span class="nowrap">the marriage of</span></span><span data-lang="es">Os invitamos a celebrar <span class="nowrap">el enlace de</span></span></p>
    <h1 class="names"><span class="first">Cameron</span><span class="last">Allan</span><span class="and"><span data-lang="en">and</span><span data-lang="es">y</span></span><span class="first">Annie</span><span class="last">MacConnachie</span></h1></header>
    <form class="card" id="gate-form" novalidate>
      <p style="margin-top:0">${code
        ? '<span data-lang="en">To see the website, please enter your surname.</span><span data-lang="es">Para ver la web, escribe tu apellido.</span>'
        : '<span data-lang="en">To see the website, please enter the invite code from your invitation and your surname.</span><span data-lang="es">Para ver la web, escribe el código de tu invitación y tu apellido.</span>'}</p>
      ${code ? '' : `<label for="gate-code"><span data-lang="en">Invite code</span><span data-lang="es">Código de invitación</span></label>
      <input type="text" id="gate-code" autocomplete="off" autocapitalize="characters">`}
      <label for="gate-name"><span data-lang="en">Surname</span><span data-lang="es">Apellido</span></label>
      <input type="text" id="gate-name" autocomplete="family-name">
      <div id="gate-error" class="error hidden"></div>
      <p style="margin-bottom:0"><button type="submit" id="gate-btn"><span data-lang="en">Continue</span><span data-lang="es">Continuar</span></button></p>
    </form>
    <div class="lang-switch"><a href="#" data-set-lang="es" data-lang="en" lang="es">Español</a><a href="#" data-set-lang="en" data-lang="es" lang="en">English</a></div>`;
  document.body.prepend(gate);
  startFireworks();
  gate.querySelectorAll('[data-set-lang]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); setLang(a.dataset.setLang, true); }));
  (code ? $('gate-name') : $('gate-code')).focus();

  $('gate-form').addEventListener('submit', async e => {
    e.preventDefault();
    const c = code || $('gate-code').value.trim().toUpperCase();
    const name = $('gate-name').value.trim();
    const err = msg => { $('gate-error').textContent = msg; show($('gate-error'), true); };
    if (!c) return err(t('gateNeedCode'));
    if (!name) return err(t('gateNeedName'));
    show($('gate-error'), false);
    const btn = $('gate-btn'), label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"><i></i><i></i><i></i></span>${esc(t('checking'))}`;
    try {
      const data = await apiGet(c, name);
      if (!data.ok) {
        if (data.lang) adoptInviteLang({ lang: data.lang });
        return err(data.error === 'not_found' ? t('notFound') : data.error === 'name_mismatch' ? t('gateWrongName') : t('wentWrong'));
      }
      storeCode(c);
      setVerified(c, name);
      cacheInvite(c, data);
      adoptInviteLang(data.invite);
      if (!new URLSearchParams(location.search).get('code')) {
        const u = new URL(location.href); u.searchParams.set('code', c); history.replaceState(null, '', u);
      }
      document.documentElement.classList.remove('locked');
      gate.remove();
      document.dispatchEvent(new CustomEvent('inviteunlocked', { detail: data }));
    } catch (e2) {
      err(t('unreachable'));
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.innerHTML = label; } // gone once unlocked
    }
  });

  // Find out the household's language (returned even before the surname is given) so the prompt can switch.
  if (code) apiGet(code, '').then(d => { if (d.lang) adoptInviteLang({ lang: d.lang }); }).catch(() => {});
}

// Cache the invite for this browser session so moving between pages doesn't wait on Google each time.
function cacheInvite(code, data) { try { sessionStorage.setItem('invite2:' + code, JSON.stringify(data)); } catch (e) {} }
const invitePromises = {};
const refreshed = {};
function getInvite(code) {
  // Saved copy: show it straight away, but also fetch the latest once per page and announce it if it changed,
  // so edits to the sheet show up on the next page load rather than only in a new browser session.
  let hit = null;
  try { hit = sessionStorage.getItem('invite2:' + code); } catch (e) {}
  if (hit) {
    if (!refreshed[code]) {
      refreshed[code] = true;
      apiGet(code, getVerified()?.name).then(fresh => {
        if (!fresh.ok) return;
        const json = JSON.stringify(fresh);
        if (json !== hit) { cacheInvite(code, fresh); document.dispatchEvent(new CustomEvent('invitefresh', { detail: fresh })); }
      }).catch(() => {});
    }
    return Promise.resolve(JSON.parse(hit));
  }
  if (!invitePromises[code]) {
    invitePromises[code] = apiGet(code, getVerified()?.name).then(data => { if (data.ok) cacheInvite(code, data); else delete invitePromises[code]; return data; },
                                              err => { delete invitePromises[code]; throw err; });
  }
  return invitePromises[code];
}

// Keep the code on nav links too, in case the browser blocks storage.
document.addEventListener('DOMContentLoaded', () => {
  const code = getCode();
  if (!code) return;
  document.querySelectorAll('.site-nav a, a[data-keep-code]').forEach(a => {
    const u = new URL(a.href, location.href);
    u.searchParams.set('code', code);
    a.href = u.pathname.split('/').pop() + u.search;
  });
});

// ---- Language (English / Spanish) ----
// Static page text is written twice, in <span data-lang="en"> and <span data-lang="es">, and CSS shows the right one
// based on <html lang>. Text built in JavaScript uses t('key'). Sheet text uses L(obj, 'field'), which picks the
// field_es column when the site is in Spanish and it has been filled in.
const LANG_KEY = 'weddingLang', LANG_MANUAL_KEY = 'weddingLangManual';
function getLang() { return document.documentElement.lang === 'es' ? 'es' : 'en'; }
function setLang(lang, manual) {
  document.documentElement.lang = lang;
  try { localStorage.setItem(LANG_KEY, lang); if (manual) localStorage.setItem(LANG_MANUAL_KEY, '1'); } catch (e) {}
  document.dispatchEvent(new Event('langchange'));
}
/** Switch to the household's language from the sheet, unless the visitor has picked one themselves. */
function adoptInviteLang(invite) {
  let manual = null;
  try { manual = localStorage.getItem(LANG_MANUAL_KEY); } catch (e) {}
  if (!manual && invite && invite.lang && invite.lang !== getLang()) setLang(invite.lang, false);
}
function L(obj, field) { return (obj && getLang() === 'es' && obj[field + '_es']) || (obj && obj[field]) || ''; }

// Names from the sheet's column headers (courses, dietary requirements). Unknown names are shown as written.
const TERMS_ES = { 'Starter':'Entrante', 'Main':'Plato principal', 'Dessert':'Postre', 'Vegan':'Vegano', 'Vegetarian':'Vegetariano',
                   'Gluten-free':'Sin gluten', 'Other':'Otro', 'on request':'bajo petición' };
function term(s) { return (getLang() === 'es' && TERMS_ES[s]) || s; }

const STR = {
  en: {
    when: 'When', where: 'Where',
    alsoForYou: 'Also for you',
    notInvitedNb: 'The night-before party isn’t part of your invitation, but we can’t wait to see you at the wedding!', backHome: '← Back to home', timings: 'Timings', nothingMorning: 'Nothing’s planned for you the morning after. Safe travels home!',
    stYes: 'Confirmed', stNo: 'Declined', stTodo: 'RSVP needed', itinEmpty: 'Your itinerary will appear here soon.', itinLegend: '✓ you’ve said yes · ✗ you’ve said no · ● tap to RSVP',
    roomFree: 'There’s no charge for your room. It’s on us!',
    checking: 'Checking…',
    gateNeedCode: 'Please enter your invite code.', gateNeedName: 'Please enter your surname.', gateWrongName: 'That surname doesn’t match this invitation. Please try again.',
    doneNew: 'Thank you, your RSVP is in.', doneExisting: 'Here’s your RSVP:',
    whosComing: 'Who’s coming', mealChoices: 'Meal choices', alsoInvitedShort: 'You’re also invited to the night before!',
    greeting: 'Hello {names}! Please let us know if you can make it.',
    guestName: 'Guest’s name', yourGuest: 'Your guest', accepts: 'Joyfully accepts', declines: 'Regretfully declines',
    dietary: 'Dietary requirements', tellUs: 'Please tell us your requirements',
    noneFit: 'None of our {course} options suit those requirements yet. We’ll speak to the venue and be in touch.',
    bringingGuest: 'I’m bringing a guest', alsoInvited: 'You’re also invited: {title}', nightBefore: 'Night-before party',
    willBeThere: 'Will be there', cantMake: 'Can’t make it',
    roomSaved: 'We’ve saved a room for you: {room}', yesPlease: 'Yes please', noThanks: 'No thanks',
    breakfast: 'Breakfast is included, served 09:30–10:30 on the ground floor.',
    needAnswer: 'A few things still need an answer:', enterGuestName: 'Please enter your guest’s name',
    letUsKnow: '{who}: please let us know if you can come', tellDiet: '{who}: please tell us your dietary requirements',
    chooseCourse: '{who}: please choose a {course}', nbQuestion: '{who}: will you be at the {title}?',
    roomQuestion: 'Please let us know if you’d like {room}',
    attending: 'Attending', notAttending: 'Not attending', willBeThereLc: 'will be there', cantMakeLc: 'can’t make it',
    loading1: 'Finding your invite…', loading2: 'Fetching the menu…', loading3: 'Nearly there…', loading4: 'Still going, thanks for your patience…',
    notFound: 'We couldn’t find that code. Please check your invitation, or get in touch.',
    wentWrong: 'Something went wrong. Please try again in a moment.', unreachable: 'Couldn’t reach the RSVP service. Please try again in a moment.',
    sending: 'Sending…', send: 'Send RSVP', sendFailed: 'Sorry, that didn’t send. Please try again.',
    yourRoom: 'Your room', accepted: 'You’ve accepted this room.', declined: 'You’ve declined this room.',
    changeAnswer: 'Change your answer', letUsKnowRoom: 'Let us know if you’d like it',
    roomNight: 'Night', roomPrice: 'Price', breakfastLabel: 'Breakfast', breakfastShort: 'Included, served 09:30–10:30 on the ground floor', checkoutLabel: 'Check-out', checkoutShort: 'By 11:00',
    roomFreeShort: 'No charge – it’s on us!', roomIntro: 'We’d love you to join us staying at the castle, so we’ve saved a room for you.',
    roomQ: 'Would you like it?', nbQ: 'Can you make it?', yourAnswer: 'Your answer', dietShort: 'Dietary', theWedding: 'The wedding', orderOfEvents: 'Order of events'
  },
  es: {
    when: 'Cuándo', where: 'Dónde',
    alsoForYou: 'También para vosotros',
    notInvitedNb: 'La fiesta de la noche anterior no forma parte de vuestra invitación, ¡pero tenemos muchas ganas de veros en la boda!', backHome: '← Volver al inicio', timings: 'Horario', nothingMorning: 'No hay nada previsto para vosotros la mañana siguiente. ¡Buen viaje de vuelta!',
    stYes: 'Confirmado', stNo: 'Rechazado', stTodo: 'Falta confirmar', itinEmpty: 'Vuestro itinerario aparecerá aquí pronto.', itinLegend: '✓ habéis dicho que sí · ✗ habéis dicho que no · ● pulsa para confirmar',
    roomFree: 'La habitación no tiene coste para vosotros. ¡Invitamos nosotros!',
    checking: 'Comprobando…',
    gateNeedCode: 'Escribe tu código de invitación.', gateNeedName: 'Escribe tu apellido.', gateWrongName: 'Ese apellido no coincide con esta invitación. Inténtalo de nuevo.',
    doneNew: '¡Gracias! Hemos recibido vuestra respuesta.', doneExisting: 'Esta es vuestra respuesta:',
    whosComing: '¿Quién viene?', mealChoices: 'Menú', alsoInvitedShort: '¡También estáis invitados a la noche anterior!',
    greeting: '¡Hola, {names}! Por favor, decidnos si podéis venir.',
    guestName: 'Nombre de tu acompañante', yourGuest: 'Tu acompañante', accepts: 'Sí, asistiré', declines: 'Lamentablemente, no podré asistir',
    dietary: 'Requisitos alimentarios', tellUs: 'Cuéntanos tus requisitos',
    noneFit: 'Por ahora ninguna opción de {course} se ajusta a estos requisitos. Hablaremos con el lugar y te diremos algo.',
    bringingGuest: 'Vendré con acompañante', alsoInvited: 'También estáis invitados: {title}', nightBefore: 'Fiesta de la noche anterior',
    willBeThere: 'Allí estaré', cantMake: 'No podré ir',
    roomSaved: 'Os hemos reservado una habitación: {room}', yesPlease: 'Sí, por favor', noThanks: 'No, gracias',
    breakfast: 'El desayuno está incluido y se sirve de 09:30 a 10:30 en la planta baja.',
    needAnswer: 'Aún faltan algunas respuestas:', enterGuestName: 'Escribe el nombre de tu acompañante',
    letUsKnow: '{who}: dinos si puedes venir', tellDiet: '{who}: cuéntanos tus requisitos alimentarios',
    chooseCourse: '{who}: elige un {course}', nbQuestion: '{who}: ¿vendrás a la {title}?',
    roomQuestion: 'Dinos si queréis la habitación {room}',
    attending: 'Asistirá', notAttending: 'No asistirá', willBeThereLc: 'allí estará', cantMakeLc: 'no podrá ir',
    loading1: 'Buscando tu invitación…', loading2: 'Cargando el menú…', loading3: 'Ya casi está…', loading4: 'Seguimos en ello, gracias por tu paciencia…',
    notFound: 'No encontramos ese código. Revisa tu invitación o ponte en contacto con nosotros.',
    wentWrong: 'Algo ha fallado. Inténtalo de nuevo en un momento.', unreachable: 'No hemos podido conectar con el servicio. Inténtalo de nuevo en un momento.',
    sending: 'Enviando…', send: 'Enviar respuesta', sendFailed: 'Lo sentimos, no se ha enviado. Inténtalo de nuevo.',
    yourRoom: 'Vuestra habitación', accepted: 'Habéis aceptado esta habitación.', declined: 'Habéis rechazado esta habitación.',
    changeAnswer: 'Cambiar la respuesta', letUsKnowRoom: 'Decidnos si la queréis',
    roomNight: 'Noche', roomPrice: 'Precio', breakfastLabel: 'Desayuno', breakfastShort: 'Incluido, se sirve de 09:30 a 10:30 en la planta baja', checkoutLabel: 'Salida', checkoutShort: 'Antes de las 11:00',
    roomFreeShort: 'Sin coste: ¡invitamos nosotros!', roomIntro: 'Nos encantaría que os quedarais con nosotros en el castillo, así que os hemos reservado una habitación.',
    roomQ: '¿La queréis?', nbQ: '¿Podéis venir?', yourAnswer: 'Vuestra respuesta', dietShort: 'Dieta', theWedding: 'La boda', orderOfEvents: 'Programa'
  }
};
function t(key, vars) {
  let str = (STR[getLang()] && STR[getLang()][key]) ?? STR.en[key] ?? key;
  Object.entries(vars || {}).forEach(([k, v]) => { str = str.replaceAll('{' + k + '}', v); });
  return str;
}

// Language links in the nav, and picking up the household's language from the sheet on any page.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-set-lang]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    setLang(a.dataset.setLang, true);
  }));
  if (!isUnlocked()) { document.documentElement.classList.add('locked'); showGate(); return; }
  document.documentElement.classList.remove('locked');
  getInvite(getCode()).then(d => { if (d.ok) adoptInviteLang(d.invite); }).catch(() => {});
});

// ---- Keep the header steady when moving between pages ----
// Every page has the same header, so when you follow a menu link we remember how far down you were
// (at most down to the menu itself) and open the next page at the same place, rather than jumping to the top.
(function () {
  var KEY = 'weddingNavScroll';
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('header a, .site-nav a');
    if (!a || a.target || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var nav = document.querySelector('.site-nav');
    var limit = nav ? nav.getBoundingClientRect().top + window.scrollY - 12 : 0;
    try { sessionStorage.setItem(KEY, String(Math.max(0, Math.min(window.scrollY, limit)))); } catch (err) {}
  });
  var y = null;
  try { y = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (err) {}
  if (y === null || location.hash) return;
  y = +y || 0;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  // Give the page room to scroll that far while its content is still loading.
  document.body.style.minHeight = (y + window.innerHeight) + 'px';
  window.scrollTo(0, y);
  setTimeout(function () { document.body.style.minHeight = ''; }, 2500);
})();

// ---- Fireworks over the castle ----
// Fine bursts of lines in the site's blues: a rocket rises from behind the roof, bursts into rays,
// and its sparks drift down and fade. Paused while off screen; a still drawing if motion is reduced.
function startFireworks() {
  document.querySelectorAll('canvas.fireworks:not([data-on])').forEach(cv => {
    cv.dataset.on = '1';
    const ctx = cv.getContext('2d');
    const COLOURS = ['#2c4a56', '#2c4a56', '#5f8a99', '#91b7c4'];
    const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, shows = [], visible = true, running = false, nextAt = 0;
    function size() {
      const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height; cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    const rnd = (a, b) => a + Math.random() * (b - a);
    // Simple physics, worked out from the time since launch (so nothing accumulates between frames).
    // Like real fireworks: sparks burst out evenly in every direction, air resistance stops them quickly,
    // then they sink slowly (heavy drag means a low falling speed), with only the faintest breeze.
    const DRAG = 3.2;                                       // per second
    function sparkAt(s, p, t) {                             // spark position t seconds after the burst
      const k = p.k, e = (1 - Math.exp(-k * t)) / k, fall = s.g / k, wind = s.wind / k;
      return [s.bx + (p.vx - wind) * e + wind * t, s.by + (p.vy - fall) * e + fall * t];
    }
    function launch(t, x, y) {
      const x0 = x ?? rnd(W * .24, W * .76), yt = y ?? rnd(H * .24, H * .46), y0 = H * .97;
      const rise = rnd(.8, 1.1), lean = rnd(-.04, .04) * W, h = y0 - yt, size = rnd(.11, .15) * W;
      const n = Math.round(rnd(16, 22)), rot = rnd(0, Math.PI * 2);
      shows.push({ t0: t, x0, y0, h, rise, lean, colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        bx: x0 + lean, by: yt, g: size * .9, wind: size * rnd(-.15, .15), life: rnd(1.9, 2.3),
        sparks: Array.from({ length: n }, (_, i) => {
          const a = rot + i / n * Math.PI * 2 + rnd(-.1, .1), k = DRAG * rnd(.8, 1.25), v = size * k * rnd(.85, 1.05);
          return { vx: Math.cos(a) * v, vy: Math.sin(a) * v, k };   // each spark meets slightly different air resistance
        }) });
    }
    function drawShow(s, now) {
      const age = (now - s.t0) / 1000;
      ctx.strokeStyle = ctx.fillStyle = s.colour; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (age < s.rise) {                                   // the rocket: climbs on a slight lean, slowing to a stop at the top
        const pos = u => { const q = Math.min(u, s.rise) / s.rise, up = 1 - Math.pow(1 - q, 2);
          return [s.x0 + s.lean * up, s.y0 - s.h * up]; };
        ctx.globalAlpha = .8; ctx.lineWidth = 1.2; ctx.beginPath();
        for (let k = 0; k <= 6; k++) { const [x, y] = pos(Math.max(0, age - .09 * (1 - k / 6))); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        return true;
      }
      const b = age - s.rise;                               // the burst
      if (b >= s.life) return false;
      ctx.globalAlpha = Math.max(0, 1 - Math.pow(b / s.life, 1.5));
      ctx.lineWidth = 1.1;
      const tail = Math.min(b, .12);                       // a fixed slice of time, so streaks shrink naturally as sparks slow
      s.sparks.forEach(p => {
        ctx.beginPath();
        for (let k = 0; k <= 5; k++) { const [x, y] = sparkAt(s, p, b - tail * (1 - k / 5)); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        const [x, y] = sparkAt(s, p, b);
        ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill();
      });
      return true;
    }
    function kick() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }
    function frame(t) {
      if (!visible || document.hidden) { running = false; return; }
      if (!W) size();
      if (t >= nextAt) { launch(t); if (Math.random() < .35) launch(t + rnd(150, 400)); nextAt = t + rnd(1100, 2300); }
      ctx.clearRect(0, 0, W, H);
      shows = shows.filter(s => t < s.t0 || drawShow(s, t));
      requestAnimationFrame(frame);
    }
    size();
    window.addEventListener('resize', () => { size(); if (still) drawStill(); });
    function drawStill() {
      ctx.clearRect(0, 0, W, H); shows = [];
      [[.3, .42], [.55, .3], [.76, .46]].forEach(([x, y]) => { launch(0, W * x, H * y); });
      shows.forEach(s => drawShow(s, s.t0 + (s.rise + .35) * 1000));
    }
    if (still) { drawStill(); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        const v = es[0].isIntersecting;
        visible = v; if (v) kick();
      }).observe(cv);
    }
    document.addEventListener('visibilitychange', kick);
    kick();
  });
}
startFireworks();

// ---- Shared building blocks, so information is laid out the same way everywhere ----
// A card title (serif), a lead paragraph, then label / value rows ("facts"), as on the Details page.
function factsHtml(rows, cls = '') {
  rows = rows.filter(r => r && r[1]);
  return rows.length ? `<dl class="facts ${cls}">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '';
}
/** Room photos from the Rooms tab's image cell: one or more links/paths, separated by commas or new lines.
    Google Drive share links are turned into direct image links (the file must be shared "Anyone with the link"). */
function roomPhotoUrls(r) {
  return String(r.image || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(u => {
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600` : u;
  });
}
function roomPhotosHtml(r) {
  const urls = roomPhotoUrls(r), alt = esc(L(r, 'name'));
  if (!urls.length) return '';
  if (urls.length === 1) return `<img src="${esc(urls[0])}" alt="${alt}">`;
  return `<div class="room-gallery">
    <div class="rg-track">${urls.map((u, i) => `<img src="${esc(u)}" alt="${alt} (${i + 1}/${urls.length})" loading="lazy">`).join('')}</div>
    <button type="button" class="rg-prev" aria-label="Previous photo">‹</button>
    <button type="button" class="rg-next" aria-label="Next photo">›</button>
    <div class="rg-dots">${urls.map((_, i) => `<span${i ? '' : ' class="on"'}></span>`).join('')}</div>
  </div>`;
}
// Gallery controls (works for any gallery drawn later): arrows scroll one photo; dots follow the scroll.
document.addEventListener('click', e => {
  const b = e.target.closest('.rg-prev, .rg-next'); if (!b) return;
  e.preventDefault();
  const tr = b.parentElement.querySelector('.rg-track');
  const w = tr.clientWidth, i = Math.round(tr.scrollLeft / w), n = tr.children.length;
  const next = b.classList.contains('rg-next') ? (i + 1) % n : (i - 1 + n) % n;
  tr.scrollTo({ left: next * w, behavior: 'smooth' });
});
document.addEventListener('scroll', e => {
  const tr = e.target; if (!tr.classList || !tr.classList.contains('rg-track')) return;
  const i = Math.round(tr.scrollLeft / tr.clientWidth);
  tr.parentElement.querySelectorAll('.rg-dots span').forEach((d, k) => d.classList.toggle('on', k === i));
}, true);

/** Prices typed as a bare number (e.g. 80 or 80.5) are shown in pounds: "£80" in English, "80 £" in Spanish.
    Anything else (e.g. "£180 per night") is shown as typed. */
function money(v) {
  const s = String(v || '').trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return s;
  const n = Number(s), txt = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return getLang() === 'es' ? txt.replace('.', ',') + ' £' : '£' + txt;
}

/** A room: photo(s), name, description, then night / price / breakfast rows. Values are escaped here. */
function roomCardHtml(r) {
  const price = r.free ? t('roomFreeShort') : money(L(r, 'price'));
  return `${roomPhotosHtml(r)}
    <h3 class="card-title">${esc(L(r, 'name'))}</h3>
    ${L(r, 'description') ? `<p class="card-lead">${esc(L(r, 'description'))}</p>` : ''}
    ${factsHtml([[t('roomNight'), esc(L(r, 'nights'))], [t('roomPrice'), esc(price)], [t('breakfastLabel'), esc(t('breakfastShort'))], [t('checkoutLabel'), esc(t('checkoutShort'))]], 'compact')}`;
}
