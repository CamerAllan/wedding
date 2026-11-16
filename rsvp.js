/** The dish name in the current language (answers are stored by the English name). */
function optionLabel(course, value) {
  const o = (course.options || []).find(o => o.option === value);
  return o ? (L(o, 'option') || value) : value;
}

// ---- RSVP form ----
// Steps: 1 Who's coming → 2 Meal choices (one card per attending person) → Night-before (if invited)
//        → Room (if offered) → Anything else. Step numbers come from CSS and skip hidden steps.
let state = null; // { invite, menu, existing }

const splitList = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const OTHER = 'Other';

// People are identified by an index: named guests first (0..n-1), then plus-ones (n..).
function people() {
  const n = state.invite.guests.length;
  return [
    ...state.invite.guests.map((name, i) => ({ idx: i, plus: false, name })),
    ...Array.from({ length: state.invite.plusOnesAllowed }, (_, k) => ({ idx: n + k, plus: true }))
  ];
}
const isPlusIdx = idx => idx >= state.invite.guests.length;

/** A plus-one only exists when "I'm bringing a guest" is ticked; plus-ones are always attending. */
function isActive(idx) { return !isPlusIdx(idx) || !!document.querySelector(`.po-toggle[data-idx="${idx}"]:checked`); }
function isAttending(idx) {
  if (isPlusIdx(idx)) return isActive(idx);
  return document.querySelector(`input[name="att${idx}"]:checked`)?.value === 'yes';
}
function personName(idx) {
  if (!isPlusIdx(idx)) return state.invite.guests[idx];
  return document.getElementById(`p${idx}-name`)?.value.trim() || t('yourGuest');
}
function mealCard(idx) { return document.querySelector(`.person[data-idx="${idx}"]`); }

// ---------- Step 1: who's coming ----------
function whoRows(byName, plusExisting) {
  return people().map(p => {
    if (!p.plus) {
      const att = byName[p.name]?.attending || '';
      return `<div class="who-row" data-idx="${p.idx}">
        <span class="who-name">${esc(p.name)}</span>
        <div class="choices att-choices">
          <label><input type="radio" class="att" name="att${p.idx}" value="yes" ${att==='yes'?'checked':''}> ${t('accepts')}</label>
          <label><input type="radio" class="att" name="att${p.idx}" value="no" ${att==='no'?'checked':''}> ${t('declines')}</label>
        </div></div>`;
    }
    const ex = plusExisting[p.idx - state.invite.guests.length];
    return `<div class="who-row" data-idx="${p.idx}">
      <div class="choices"><label><input type="checkbox" class="po-toggle" data-idx="${p.idx}" ${ex?'checked':''}> ${t('bringingGuest')}</label></div>
      <div class="po-name ${ex?'':'hidden'}">
        <label for="p${p.idx}-name">${t('guestName')}</label>
        <input type="text" id="p${p.idx}-name" class="pname" value="${esc(ex?.guest_name || '')}" maxlength="100">
      </div></div>`;
  }).join('');
}

// ---------- Step 2: meal choices ----------
function mealCardHtml(idx, existing) {
  const ticked = splitList(existing?.diets);
  const diets = [...(state.menu.diets || []), OTHER].map(d => `
      <label><input type="checkbox" class="pdiet-tick" value="${esc(d)}" ${ticked.includes(d)?'checked':''}> ${esc(term(d))}</label>`).join('');
  // Dish lists are filled in by refreshOptions() so they can be filtered by the ticked diets.
  const courses = state.menu.courses.map((c, ci) => `
    <fieldset class="course" data-ci="${ci}" data-course="${esc(c.name)}" data-initial="${esc(existing?.[c.name])}">
      <legend>${esc(term(c.name))}</legend>
      <div class="dishes"></div>
      <p class="muted none-fit hidden">${esc(t('noneFit', { course: term(c.name).toLowerCase() }))}</p>
    </fieldset>`).join('');
  return `
  <div class="card person hidden" data-idx="${idx}">
    <h3 class="card-title meal-name"></h3>
    <p class="card-label">${t('dietary')}</p>
    <div class="stack">${diets}</div>
    <div class="other-wrap ${ticked.includes(OTHER)?'':'hidden'}">
      <label for="p${idx}-diet">${t('tellUs')}</label>
      <input type="text" id="p${idx}-diet" class="pdiet" maxlength="500" value="${esc(existing?.dietary_notes)}">
    </div>
    ${courses}
  </div>`;
}

function tickedDiets(el) {
  return [...el.querySelectorAll('.pdiet-tick:checked')].map(c => c.value);
}

/** Rebuild each course's dish list to show only dishes that suit every ticked diet. */
function refreshOptions(el) {
  const ticked = tickedDiets(el);
  show(el.querySelector('.other-wrap'), ticked.includes(OTHER));
  const diets = ticked.filter(d => d !== OTHER); // "Other" is free text, so it doesn't filter dishes
  const idx = el.dataset.idx;
  el.querySelectorAll('.course').forEach(fs => {
    const course = state.menu.courses[fs.dataset.ci];
    const current = fs.querySelector('input:checked')?.value || fs.dataset.initial || '';
    fs.dataset.initial = '';
    const fits = course.options.filter(o => diets.every(d => o.diets && d in o.diets));
    const name = `p${idx}-c${fs.dataset.ci}`;
    fs.querySelector('.dishes').innerHTML = fits.map(o => {
      // e.g. "✓ Vegetarian · ✓ Gluten-free (on request)" for the diets this guest ticked
      const tags = diets.map(d => '✓ ' + esc(term(d)) + (o.diets[d] ? ' (' + esc(term(o.diets[d])) + ')' : '')).join(' · ');
      return `<label class="dish">
        <input type="radio" name="${name}" value="${esc(o.option)}" ${o.option === current ? 'checked' : ''}>
        <span><strong>${esc(L(o, 'option'))}</strong>
          ${L(o, 'description') ? `<span class="desc">${esc(L(o, 'description'))}</span>` : ''}
          ${tags ? `<span class="tags">${tags}</span>` : ''}</span>
      </label>`;
    }).join('');
    show(fs.querySelector('.none-fit'), fits.length === 0);
  });
}

/** Show a meal card for each person who's coming (and hide the step if nobody is). */
function syncPeople() {
  let anyone = false;
  people().forEach(p => {
    if (p.plus) show(document.querySelector(`.who-row[data-idx="${p.idx}"] .po-name`), isActive(p.idx));
    const card = mealCard(p.idx);
    const on = isAttending(p.idx);
    anyone = anyone || on;
    show(card, on);
    card.querySelector('.meal-name').textContent = personName(p.idx);
  });
  show($('step-meals'), anyone);
  syncNightBefore();
}

// ---------- Whole form ----------
function renderForm() {
  const { invite, existing } = state;
  const byName = Object.fromEntries(existing.filter(e => e.is_plus_one !== 'yes').map(e => [e.guest_name, e]));
  const plusExisting = existing.filter(e => e.is_plus_one === 'yes');
  const existingFor = p => p.plus ? plusExisting[p.idx - invite.guests.length] : byName[p.name];

  $('greeting').textContent = t('greeting', { names: listNames(invite.guests) });
  show($('greeting'), true);
  $('title-who').textContent = t('whosComing');
  $('title-meals').textContent = t('mealChoices');
  $('who').innerHTML = whoRows(byName, plusExisting);
  $('meals').innerHTML = people().map(p => mealCardHtml(p.idx, existingFor(p))).join('');

  // Night-before party (details only come back from the server for invited households)
  const nbEl = $('night-before');
  if (invite.nightBefore) {
    const n = invite.nightBefore;
    nbEl.innerHTML = `
      <h3 class="step-title">${esc(L(n, 'title') || t('nightBefore'))}</h3>
      <p class="step-intro">${esc(t('alsoInvitedShort'))}</p>
      <div class="card">
        ${L(n, 'details') ? `<p class="card-lead">${esc(L(n, 'details'))}</p>` : ''}
        ${factsHtml([[t('when'), esc(L(n, 'when'))], [t('where'), esc(L(n, 'where'))]], 'compact')}
        <p class="card-label">${t('nbQ')}</p>
        ${people().map(p => {
          const ex = existingFor(p);
          const v = (ex && ex.night_before) || '';
          return `<div class="nb-row" data-idx="${p.idx}">
            <span class="nb-name"></span>
            <span class="choices">
              <label><input type="radio" name="nb${p.idx}" value="yes" ${v==='yes'?'checked':''}> ${t('willBeThere')}</label>
              <label><input type="radio" name="nb${p.idx}" value="no" ${v==='no'?'checked':''}> ${t('cantMake')}</label>
            </span></div>`;
        }).join('')}
      </div>`;
    show(nbEl, true);
  } else {
    nbEl.innerHTML = '';
    show(nbEl, false);
  }

  // Room
  const roomEl = $('room');
  if (invite.room) {
    const r = invite.room;
    const acc = existing[0]?.room_accepted || '';
    roomEl.innerHTML = `
      <h3 class="step-title">${t('yourRoom')}</h3>
      <p class="step-intro">${esc(t('roomIntro'))}</p>
      <div class="card room">
        ${roomCardHtml(r)}
        <p class="card-label">${t('roomQ')}</p>
        <div class="choices">
          <label><input type="radio" name="room" value="yes" ${acc==='yes'?'checked':''}> ${t('yesPlease')}</label>
          <label><input type="radio" name="room" value="no" ${acc==='no'?'checked':''}> ${t('noThanks')}</label>
        </div>
      </div>`;
    show(roomEl, true);
  } else {
    roomEl.innerHTML = '';
    show(roomEl, false);
  }

  $('message').value = existing[0]?.message || '';
  document.querySelectorAll('.person').forEach(el => {
    el.querySelectorAll('.pdiet-tick').forEach(c => c.addEventListener('change', () => refreshOptions(el)));
    refreshOptions(el);
  });
  $('who').querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'text' ? 'input' : 'change', syncPeople));
  syncPeople();
  attempted = false;
  show($('form-notice'), false);
  show($('code-form'), false);
  show($('done'), false);
  show($('rsvp-form'), true);
}

/** Night-before rows: one per person on the invite, labelled with their name; plus-ones only when coming. */
function syncNightBefore() {
  document.querySelectorAll('.nb-row').forEach(row => {
    const idx = Number(row.dataset.idx);
    const on = isActive(idx);
    show(row, on);
    if (on) row.querySelector('.nb-name').textContent = personName(idx);
  });
}

let attempted = false;

/** Returns a list of { el, msg } for everything still missing, and marks those parts of the form. */
function validate() {
  const problems = [];
  const add = (el, msg) => problems.push({ el, msg });
  // Step 1 for everyone first, then step 2, so the list reads in the same order as the form.
  people().forEach(p => {
    if (!isActive(p.idx)) return;
    const row = document.querySelector(`.who-row[data-idx="${p.idx}"]`);
    if (p.plus && !document.getElementById(`p${p.idx}-name`).value.trim()) add(row.querySelector('.pname'), t('enterGuestName'));
    if (!p.plus && !row.querySelector('input.att:checked')) add(row, t('letUsKnow', { who: personName(p.idx) }));
  });
  people().forEach(p => {
    if (!isAttending(p.idx)) return;
    const who = personName(p.idx);
    const card = mealCard(p.idx);
    if (tickedDiets(card).includes(OTHER) && !card.querySelector('.pdiet').value.trim()) add(card.querySelector('.pdiet'), t('tellDiet', { who }));
    card.querySelectorAll('.course').forEach(fs => {
      if (fs.querySelector('.dish') && !fs.querySelector('input:checked')) add(fs, t('chooseCourse', { who, course: term(fs.dataset.course).toLowerCase() }));
    });
  });
  document.querySelectorAll('.nb-row').forEach(row => {
    if (row.classList.contains('hidden') || row.querySelector('input:checked')) return;
    add(row, t('nbQuestion', { who: row.querySelector('.nb-name').textContent, title: L(state.invite.nightBefore, 'title') || t('nightBefore') }));
  });
  if (state.invite.room && !document.querySelector('input[name=room]:checked')) add($('room').querySelector('.card'), t('roomQuestion', { room: L(state.invite.room, 'name') }));

  document.querySelectorAll('.invalid').forEach(x => x.classList.remove('invalid'));
  problems.forEach(p => p.el.classList.add('invalid'));
  const notice = $('form-notice');
  notice.innerHTML = problems.length ? `<strong>${t('needAnswer')}</strong><ul>${problems.map((p, i) => `<li><a href="#" data-i="${i}">${esc(p.msg)}</a></li>`).join('')}</ul>` : '';
  notice.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => {
    ev.preventDefault();
    problems[a.dataset.i].el.scrollIntoView({ behavior:'smooth', block:'center' });
  }));
  show(notice, problems.length > 0);
  return problems;
}

// Once they've tried to submit, keep the notice up to date as they fix things.
$('rsvp-form').addEventListener('input', () => { if (attempted) validate(); });
$('rsvp-form').addEventListener('change', () => { if (attempted) validate(); });

function listNames(names) {
  const first = names.map(n => n.split(' ')[0]);
  const and = getLang() === 'es' ? ' y ' : ' & ';
  return first.length <= 1 ? first.join('') : first.slice(0, -1).join(', ') + and + first.at(-1);
}

function collect() {
  const out = [];
  people().forEach(p => {
    if (!isActive(p.idx)) return; // plus-one not ticked
    const attending = isAttending(p.idx);
    const card = mealCard(p.idx);
    const diets = attending ? tickedDiets(card) : [];
    const nb = document.querySelector(`input[name="nb${p.idx}"]:checked`)?.value;
    const courses = {};
    card.querySelectorAll('.course').forEach(fs => courses[fs.dataset.course] = attending ? (fs.querySelector('input:checked')?.value || '') : '');
    out.push({
      guest_name: p.plus ? document.getElementById(`p${p.idx}-name`).value.trim() : p.name,
      is_plus_one: p.plus,
      attending,
      // raw answer ('' if not answered yet) so a language switch doesn't turn "no answer" into "declines"
      answer: p.plus ? 'yes' : (document.querySelector(`input[name="att${p.idx}"]:checked`)?.value || ''),
      courses,
      diets,
      dietary: diets.includes(OTHER) ? card.querySelector('.pdiet').value.trim() : '',
      night_before: nb === 'yes' ? true : nb === 'no' ? false : null
    });
  });
  const roomVal = document.querySelector('input[name=room]:checked')?.value;
  return {
    code: state.invite.code,
    people: out,
    room_accepted: roomVal === 'yes' ? true : roomVal === 'no' ? false : null,
    message: $('message').value.trim()
  };
}

function renderSummary(payload) {
  // Same pattern as the rest of the site: a name (serif) with its status, then label / value rows.
  const parts = payload.people.map(p => {
    const head = `<div class="sum-head"><h4 class="card-title">${esc(p.guest_name)}</h4>
      <span class="status ${p.attending ? 'yes' : 'no'}">${t(p.attending ? 'attending' : 'notAttending')}</span></div>`;
    if (!p.attending) return `<div class="sum-person">${head}</div>`;
    const diet = [...p.diets.filter(d => d !== OTHER).map(term), p.dietary].filter(Boolean).map(esc).join(', ');
    const rows = state.menu.courses.filter(c => p.courses[c.name]).map(c => [term(c.name), esc(optionLabel(c, p.courses[c.name]))]);
    if (diet) rows.push([t('dietShort'), diet]);
    return `<div class="sum-person">${head}${factsHtml(rows, 'compact')}</div>`;
  });
  parts.unshift(`<p class="card-label sum-section">${t('theWedding')}</p>`);   // a heading like the night-before and room ones
  if (state.invite.nightBefore) {
    const title = L(state.invite.nightBefore, 'title') || t('nightBefore');
    parts.push(`<div class="sum-person"><p class="card-label">${esc(title)}</p>${factsHtml(payload.people.map(p =>
      [p.guest_name, p.night_before === true ? t('willBeThere') : p.night_before === false ? t('cantMake') : '–']), 'compact people')}</div>`);
  }
  if (state.invite.room) {
    parts.push(`<div class="sum-person"><p class="card-label">${t('yourRoom')}</p>${factsHtml([[L(state.invite.room, 'name'),
      payload.room_accepted === true ? t('yesPlease') : payload.room_accepted === false ? t('noThanks') : '–']], 'compact people')}</div>`);
  }
  $('summary').innerHTML = parts.join('');
}

/** Show or hide the loading message (one steady message rather than a changing one). */
function setLoading(on) {
  show($('loading'), on);
  if (on) $('loading-text').textContent = t('loading1');
}

async function loadInvite(code, prefetched) {
  code = code.trim().toUpperCase();
  show($('code-error'), false);
  show($('code-form'), false);
  setLoading(true);
  try {
    const data = prefetched || await apiGet(code, getVerified()?.name);
    if (!data.ok && (data.error === 'name_mismatch' || data.error === 'name_required')) {
      // The remembered surname no longer matches (e.g. the guest list changed): ask again.
      clearVerified();
      location.reload();
      return;
    }
    if (!data.ok) {
      $('code-error').textContent = data.error === 'not_found' ? t('notFound') : t('wentWrong');
      show($('code-error'), true);
      show($('code-form'), true);
      return;
    }
    state = data;
    adoptInviteLang(data.invite);
    storeCode(code);
    cacheInvite(code, data);
    const url = new URL(location.href);
    url.searchParams.set('code', code);
    history.replaceState(null, '', url);
    // Already replied? Show what they told us, with a button to change it.
    if (data.existing && data.existing.length) showDone(fromExisting(data.existing), false);
    else renderForm();
  } catch (e) {
    $('code-error').textContent = t('unreachable');
    show($('code-error'), true);
    show($('code-form'), true);
  } finally {
    setLoading(false);
  }
}

$('code-form').addEventListener('submit', e => { e.preventDefault(); loadInvite($('code-input').value); });

$('rsvp-form').addEventListener('submit', async e => {
  e.preventDefault();
  attempted = true;
  if (validate().length) return;
  const payload = collect();
  const btn = $('submit-btn');
  btn.disabled = true; btn.textContent = t('sending');
  show($('submit-error'), false);
  try {
    const res = await apiPost(payload);
    if (!res.ok) throw new Error(res.error);
    state.existing = toExisting(payload);
    lastPayload = payload;
    cacheInvite(state.invite.code, state);
    showDone(payload, true);
    $('rsvp').scrollIntoView({ behavior:'smooth' });
  } catch (err) {
    $('submit-error').textContent = t('sendFailed');
    show($('submit-error'), true);
  } finally {
    btn.disabled = false; btn.textContent = t('send');
  }
});

$('edit-btn').addEventListener('click', renderForm);

/** Convert a submitted payload into the same shape as saved rows, so the form can be re-filled from it. */
function toExisting(payload) {
  const yn = v => v === true ? 'yes' : v === false ? 'no' : '';
  return payload.people.map(p => ({ ...p.courses, guest_name:p.guest_name, is_plus_one:p.is_plus_one?'yes':'no',
    attending: p.answer ?? (p.attending?'yes':'no'), diets:p.diets.join(', '), dietary_notes:p.dietary,
    room_accepted: yn(payload.room_accepted), message:payload.message, night_before: yn(p.night_before) }));
}
let lastPayload = null;
let doneIsNew = true;

function showDone(payload, isNew) {
  show($('reply-by'), false); // they've replied, so the deadline no longer matters
  show($('greeting'), false);
  lastPayload = payload;
  doneIsNew = isNew;
  renderSummary(payload);
  $('done-title').textContent = t(isNew ? 'doneNew' : 'doneExisting');
  show($('code-form'), false);
  show($('rsvp-form'), false);
  show($('done'), true);
}

/** Saved rows → the same shape the form submits, so the confirmation can be shown for an earlier RSVP. */
function fromExisting(existing) {
  const yn = v => v === 'yes' ? true : v === 'no' ? false : null;
  return {
    code: state.invite.code,
    people: existing.map(e => ({
      guest_name: e.guest_name,
      is_plus_one: e.is_plus_one === 'yes',
      attending: e.attending === 'yes',
      courses: Object.fromEntries(state.menu.courses.map(c => [c.name, e[c.name] || ''])),
      diets: splitList(e.diets),
      dietary: e.dietary_notes || '',
      night_before: yn(e.night_before)
    })),
    room_accepted: yn(existing[0]?.room_accepted),
    message: existing[0]?.message || ''
  };
}

// Switching language re-draws the form in place, keeping anything already filled in.
document.addEventListener('langchange', () => {
  if (!state) return;
  if (!$('rsvp-form').classList.contains('hidden')) {
    const wasAttempted = attempted;
    state.existing = toExisting(collect());
    renderForm();
    if (wasAttempted) { attempted = true; validate(); }
  } else if (!$('done').classList.contains('hidden') && lastPayload) {
    showDone(lastPayload, doneIsNew);
  }
});

// Load as soon as the guest is past the lock. If they've just unlocked on this page,
// reuse what the lock screen fetched rather than asking Google again.
if (isUnlocked()) loadInvite(getCode());
else document.addEventListener('inviteunlocked', e => loadInvite(getCode(), e.detail), { once: true });
