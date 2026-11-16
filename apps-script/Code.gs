/**
 * Wedding RSVP backend — Google Apps Script bound to the "Wedding Website Backend" sheet.
 *
 * Tabs:
 *   Guests     code | guest_names (comma-separated) | plus_ones_allowed | room_id | notes (private) | night_before
 *              Put anything (e.g. "x") in night_before to invite that household to the night-before party.
 *   Events         event | title | when | location | details (+ *_es). One row per event (night_before / wedding /
 *                  morning_after); each is a section on the Details page. Only events a household is invited to are sent.
 *   Night Before   (older) field | value rows; only used if the Events tab has no night_before row.
 *   Guests.bridal_party   names from that household who are in the bridal party (comma-separated), or "all".
 *                  Those households also see Itinerary rows with for = bridal_party (e.g. hair & makeup).
 *   Itinerary      day | time | title | details | for | rsvp | event (+ *_es). "event" (night_before / wedding /
 *                  morning_after) groups rows onto their event page. "for" decides who sees a row
 *                  (everyone / night_before / room / bridal_party); only matching rows are sent to a household.
 *   Rooms.price    free text, e.g. "£180 per night".
 *   Guests.room_price  optional per-household override: blank = the suite's price, "free" = no charge,
 *                  anything else is shown instead (e.g. a share of a suite that several households use).
 *                  Several households can be given the same room_id; each answers for itself.
 *   Guests.language   "es" to show that household the site in Spanish (blank = English).
 *   Spanish text: any column ending in _es (e.g. Rooms.description_es, Menu.description_es) is used in place of
 *   the English column when the site is in Spanish. Night Before / Bridal Party have Spanish in columns C (and D).
 *   Rooms      room_id | name | description | nights | image
 *   Rooms.image    one or more photo links (or site paths), separated by commas or new lines. Google Drive
 *                  links work if the file is shared "Anyone with the link". Several photos show as a gallery.
 *   Menu       course | option | description | <one column per dietary requirement, e.g. Vegetarian | Gluten-free ...>
 *              Mark a dish "x" if it suits that requirement. Any other text (e.g. "on request") also counts as
 *              suitable and is shown to guests next to the dish. Guests only see dishes that suit everything they tick.
 *   Responses  written by this script, one row per person (re-submitting replaces that invite's rows)
 *
 * Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * After editing this file: Deploy → Manage deployments → edit → Version: New version (keeps the same URL).
 */

var SHEET_ID = '1iSff6rU6AE22U6UkYPWBx9CT-mmakGh4iSF3ndRP8QI';

// Who gets an email when someone RSVPs: set in the sheet's "Settings" tab (row "notify_emails",
// comma-separated). Kept in the sheet rather than here because this file is public on GitHub.
var FIXED_RESPONSE_COLS = ['updated_at', 'code', 'guest_name', 'is_plus_one', 'attending', 'diets'];
var TRAILING_RESPONSE_COLS = ['dietary_notes', 'room_accepted', 'message', 'night_before'];

function doGet(e) {
  try {
    var code = normaliseCode_(e && e.parameter && e.parameter.code);
    if (!code) return json_({ ok: false, error: 'missing_code' });
    var invite = findInvite_(code);
    if (!invite) return json_({ ok: false, error: 'not_found' });
    // Guests must give a surname from their invite (like an airline's "manage booking").
    // The household's language is still returned so the surname prompt can be shown in Spanish.
    var name = e.parameter.name || '';
    if (!nameMatches_(invite.guests, name)) {
      return json_({ ok: false, error: name ? 'name_mismatch' : 'name_required', lang: invite.lang });
    }
    var itinerary = readItinerary_(invite);
    return json_({
      ok: true,
      invite: publicInvite_(invite),
      menu: readMenu_(),
      existing: readExisting_(code),
      itinerary: itinerary,
      events: readEvents_(invite, itinerary)
    });
  } catch (err) {
    return json_({ ok: false, error: 'server_error', detail: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var body = JSON.parse(e.postData.contents);
    var code = normaliseCode_(body.code);
    var invite = code && findInvite_(code);
    if (!invite) return json_({ ok: false, error: 'not_found' });
    if (!nameMatches_(invite.guests, body.name)) return json_({ ok: false, error: 'name_mismatch' });

    var menu = readMenu_();
    var people = Array.isArray(body.people) ? body.people : [];
    var invited = invite.guests;
    var plusOnes = people.filter(function (p) { return p.is_plus_one; });

    // Validate: named guests must be on the invite; plus-ones within allowance.
    var named = people.filter(function (p) { return !p.is_plus_one; });
    for (var i = 0; i < named.length; i++) {
      if (invited.indexOf(named[i].guest_name) === -1) return json_({ ok: false, error: 'unknown_guest' });
    }
    if (plusOnes.length > invite.plusOnesAllowed) return json_({ ok: false, error: 'too_many_plus_ones' });

    var roomAccepted = invite.room ? (body.room_accepted === true ? 'yes' : body.room_accepted === false ? 'no' : '') : '';
    var sheet = ss_().getSheetByName('Responses');
    var header = ensureHeader_(sheet, menu.courses.map(function (c) { return c.name; }));
    var isUpdate = deleteRowsForCode_(sheet, header, code) > 0;

    var now = new Date();
    var rows = people.map(function (p) {
      var ticked = (Array.isArray(p.diets) ? p.diets : []);
      var diets = ticked.filter(function (d) { return menu.diets.indexOf(d) !== -1; }); // these filter dishes
      var hasOther = ticked.indexOf('Other') !== -1; // free-text requirement in dietary_notes
      var rec = {
        updated_at: now,
        code: code,
        guest_name: String(p.guest_name || '').slice(0, 100),
        is_plus_one: p.is_plus_one ? 'yes' : 'no',
        attending: p.attending ? 'yes' : 'no',
        diets: p.attending ? diets.concat(hasOther ? ['Other'] : []).join(', ') : '',
        dietary_notes: p.attending && hasOther ? String(p.dietary || '').slice(0, 500) : '',
        room_accepted: roomAccepted,
        message: String(body.message || '').slice(0, 2000),
        night_before: invite.nightBefore ? (p.night_before === true ? 'yes' : p.night_before === false ? 'no' : '') : ''
      };
      menu.courses.forEach(function (c) {
        var choice = p.attending && p.courses ? p.courses[c.name] : '';
        var valid = c.options.some(function (o) {
          return o.option === choice && diets.every(function (d) { return o.diets.hasOwnProperty(d); });
        });
        rec[c.name] = valid ? choice : '';
      });
      return header.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; });
    });
    if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, header.length).setValues(rows);
    SpreadsheetApp.flush();
    notify_(invite, header, rows, isUpdate, menu);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server_error', detail: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------- helpers ----------

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normaliseCode_(c) { return String(c || '').trim().toUpperCase(); }

function rows_(name) {
  var values = ss_().getSheetByName(name).getDataRange().getValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  return values.map(function (r) {
    var o = {};
    header.forEach(function (h, i) { o[h] = r[i]; });
    return o;
  });
}

function findInvite_(code) {
  var g = rows_('Guests').filter(function (r) { return normaliseCode_(r.code) === code; })[0];
  if (!g) return null;
  var room = null;
  var roomId = String(g.room_id || '').trim();
  if (roomId) {
    room = rows_('Rooms').filter(function (r) { return String(r.room_id).trim() === roomId; })[0] || null;
  }
  return {
    code: code,
    guests: String(g.guest_names).split(',').map(function (s) { return s.trim(); }).filter(String),
    plusOnesAllowed: Number(g.plus_ones_allowed) || 0,
    room: room,
    roomPrice: String(g.room_price || '').trim(),
    nightBefore: String(g.night_before || '').trim() !== '',
    lang: String(g.language || '').trim().toLowerCase().indexOf('es') === 0 ? 'es' : 'en',
    bridalParty: bridalNames_(String(g.bridal_party || ''), String(g.guest_names).split(',').map(function (s) { return s.trim(); }).filter(String))
  };
}

function publicInvite_(inv) {
  // Never return the private notes column.
  return {
    code: inv.code,
    guests: inv.guests,
    plusOnesAllowed: inv.plusOnesAllowed,
    lang: inv.lang,
    room: inv.room && roomForHousehold_(inv.room, inv.roomPrice),

    // Party details are only sent to invited households, so they never appear in the public page.
    nightBefore: inv.nightBefore ? readNightBefore_() : null
  };
}

/** All Rooms columns (name, description, nights, image, price, and any *_es translations) except room_id. */
function roomPublic_(room) {
  var out = {};
  Object.keys(room).forEach(function (k) { if (k && k !== 'room_id') out[k] = String(room[k] == null ? '' : room[k]); });
  return out;
}

/** The suite as this household sees it: their own price (or free) replaces the suite's price. */
function roomForHousehold_(room, override) {
  var out = roomPublic_(room);
  if (/^(free|0|£?0(\.00)?|none|n\/a)$/i.test(override)) {
    out.free = true; out.price = ''; out.price_es = '';
  } else if (override) {
    out.price = override; out.price_es = override;
  }
  return out;
}

function bridalNames_(cell, guests) {
  cell = cell.trim();
  if (!cell) return [];
  if (cell.toLowerCase() === 'all' || cell.toLowerCase() === 'x') return guests;
  return cell.split(',').map(function (s) { return s.trim(); }).filter(function (n) { return guests.indexOf(n) !== -1; });
}


/** Itinerary rows this household is invited to, in sheet order. */
function readItinerary_(invite) {
  var sheet = ss_().getSheetByName('Itinerary');
  if (!sheet) return [];
  var invitedTo = {
    everyone: true, '': true,
    night_before: invite.nightBefore,
    room: !!invite.room,
    bridal_party: invite.bridalParty.length > 0
  };
  // Display values, so times/dates Sheets has auto-converted come through as shown (not "Sat Dec 30 1899 …").
  var values = sheet.getDataRange().getDisplayValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  var rows = values.map(function (r) { var o = {}; header.forEach(function (h, i) { o[h] = r[i]; }); return o; });
  return rows
    .filter(function (r) { return String(r.title || '').trim() && invitedTo[String(r['for'] || '').trim().toLowerCase()]; })
    .map(function (r) {
      var out = {};
      ['day', 'time', 'title', 'details', 'rsvp', 'event', 'day_es', 'time_es', 'title_es', 'details_es'].forEach(function (k) {
        out[k] = String(r[k] == null ? '' : r[k]).trim();
      });
      return out;
    });
}

/** Rows of the Events tab, keyed by event id (display values, so nothing gets turned into a date). */
function eventRows_() {
  var sheet = ss_().getSheetByName('Events');
  if (!sheet) return {};
  var values = sheet.getDataRange().getDisplayValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  var out = {};
  values.forEach(function (r) {
    var o = {}; header.forEach(function (h, i) { o[h] = String(r[i] || '').trim(); });
    if (o.event) out[o.event.toLowerCase()] = o;
  });
  return out;
}

/** Events this household is invited to, in order: the wedding for everyone; the night before if invited;
 *  the morning after if they have morning-after itinerary rows (e.g. a room). */
function readEvents_(invite, itinerary) {
  var rows = eventRows_();
  var hasMorning = itinerary.some(function (r) { return r.event === 'morning_after'; });
  var ids = ['night_before', 'wedding', 'morning_after'].filter(function (id) {
    return id === 'wedding' || (id === 'night_before' && invite.nightBefore) || (id === 'morning_after' && hasMorning);
  });
  return ids.map(function (id) {
    var r = rows[id] || {};
    var out = { event: id };
    ['title', 'when', 'location', 'details', 'title_es', 'when_es', 'location_es', 'details_es'].forEach(function (k) { out[k] = r[k] || ''; });
    return out;
  });
}

function readNightBefore_() {
  // Prefer the Events tab; fall back to the older Night Before tab.
  var ev = eventRows_()['night_before'];
  if (ev) {
    return { title: ev.title, when: ev.when, where: ev.location, details: ev.details,
             title_es: ev.title_es, when_es: ev.when_es, where_es: ev.location_es, details_es: ev.details_es };
  }
  var out = {};
  var sheet = ss_().getSheetByName('Night Before');
  if (!sheet) return { title: 'Night-before party' };
  sheet.getDataRange().getValues().slice(1).forEach(function (r) {
    var k = String(r[0] || '').trim().toLowerCase();
    if (k) { out[k] = String(r[1] || ''); out[k + '_es'] = String(r[2] || ''); }
  });
  return out;
}

/** Menu: first three columns are course/option/description; every later column is a dietary requirement. */
function readMenu_() {
  var values = ss_().getSheetByName('Menu').getDataRange().getValues();
  var header = values.shift().map(function (h) { return String(h).trim(); });
  // Every column after description is a dietary requirement, except translations (ending in _es).
  var dietCols = [];
  for (var i = 3; i < header.length; i++) {
    if (header[i] && !/_es$/i.test(header[i])) dietCols.push({ idx: i, name: header[i] });
  }
  var descEs = header.indexOf('description_es');
  var optEs = header.indexOf('option_es');

  var courses = [];
  var byName = {};
  values.forEach(function (r) {
    var name = String(r[0] || '').trim();
    var option = String(r[1] || '').trim();
    if (!name || !option) return;
    var diets = {}; // diet name -> note ('' when simply marked "x")
    dietCols.forEach(function (d) {
      var cell = String(r[d.idx] || '').trim();
      if (cell) diets[d.name] = cell.toLowerCase() === 'x' ? '' : cell;
    });
    if (!byName[name]) { byName[name] = { name: name, options: [] }; courses.push(byName[name]); }
    byName[name].options.push({
      option: option,
      option_es: optEs > -1 ? String(r[optEs] || '').trim() : '',
      description: String(r[2] || ''),
      description_es: descEs > -1 ? String(r[descEs] || '') : '',
      diets: diets
    });
  });
  return { diets: dietCols.map(function (d) { return d.name; }), courses: courses };
}

function readExisting_(code) {
  return rows_('Responses')
    .filter(function (r) { return normaliseCode_(r.code) === code; })
    .map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { if (k !== 'updated_at') o[k] = r[k]; });
      return o;
    });
}

/** Make sure Responses has fixed columns + one column per course; returns header array. */
function ensureHeader_(sheet, courseNames) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); }).filter(String);
  var wanted = FIXED_RESPONSE_COLS.concat(courseNames, TRAILING_RESPONSE_COLS);
  var changed = false;
  wanted.forEach(function (w) { if (header.indexOf(w) === -1) { header.push(w); changed = true; } });
  if (changed || sheet.getLastColumn() === 0) sheet.getRange(1, 1, 1, header.length).setValues([header]);
  return header;
}

/** Removes this invite's previous answers; returns how many rows were removed (0 = first RSVP). */
function deleteRowsForCode_(sheet, header, code) {
  var col = header.indexOf('code') + 1;
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var codes = sheet.getRange(2, col, last - 1, 1).getValues();
  var removed = 0;
  for (var i = codes.length - 1; i >= 0; i--) {
    if (normaliseCode_(codes[i][0]) === code) { sheet.deleteRow(i + 2); removed++; }
  }
  return removed;
}

/** Email a summary of the RSVP. Never lets an email problem stop the RSVP being saved. */
function notify_(invite, header, rows, isUpdate, menu) {
  try {
    var to = setting_('notify_emails');
    if (!to) { console.warn('No notify_emails set in the Settings tab, so no RSVP email was sent.'); return; }
    var col = function (row, name) { var i = header.indexOf(name); return i > -1 ? String(row[i] || '') : ''; };
    var lines = rows.map(function (r) {
      var name = col(r, 'guest_name') + (col(r, 'is_plus_one') === 'yes' ? ' (plus-one)' : '');
      if (col(r, 'attending') !== 'yes') return '✗ ' + name + ': not attending';
      var meals = menu.courses.map(function (c) { return col(r, c.name); }).filter(String).join(', ');
      var extra = [col(r, 'diets'), col(r, 'dietary_notes')].filter(String).join(' – ');
      return '✓ ' + name + ': ' + (meals || 'no meal chosen') + (extra ? ' [' + extra + ']' : '');
    });
    if (invite.nightBefore) {
      lines.push('', 'Night before:');
      rows.forEach(function (r) { lines.push('  ' + col(r, 'guest_name') + ': ' + (col(r, 'night_before') || '–')); });
    }
    if (invite.room) lines.push('', 'Room (' + invite.room.name + '): ' + (col(rows[0] || [], 'room_accepted') || '–'));
    var message = rows.length ? col(rows[0], 'message') : '';
    if (message) lines.push('', 'Message: ' + message);
    lines.push('', 'Sheet: ' + ss_().getUrl());

    var coming = rows.filter(function (r) { return col(r, 'attending') === 'yes'; }).length;
    var subject = (isUpdate ? 'RSVP changed: ' : 'New RSVP: ') + invite.guests.join(' & ') +
                  ' (' + coming + ' of ' + rows.length + ' coming)';
    MailApp.sendEmail(to, subject, lines.join('\n'));
  } catch (err) {
    console.error('RSVP notification failed: ' + err);
  }
}

/** Reads a value from the Settings tab (column A = name, column B = value). */
function setting_(name) {
  var sheet = ss_().getSheetByName('Settings');
  if (!sheet) return '';
  var rows = sheet.getDataRange().getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === name) return String(rows[i][1] || '').trim();
  }
  return '';
}

/**
 * Run this once from the Apps Script editor to grant the email permission and check emails arrive.
 * Google's consent screen lets you tick permissions individually: make sure "Send email as you" is ticked.
 */
function testNotification() {
  // Re-shows the consent screen if the email permission hasn't been granted yet.
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, ['https://www.googleapis.com/auth/script.send_mail']);
  var invite = { guests: ['Test Guest'], nightBefore: false, room: null };
  var header = ['guest_name', 'is_plus_one', 'attending', 'Main', 'message'];
  notify_(invite, header, [['Test Guest', 'no', 'yes', 'Sticky Pulled Beef Shin', 'This is a test']], false, { courses: [{ name: 'Main' }] });
}


// ---------- Surname check ----------
// Deliberately forgiving: ignores case, accents and punctuation, accepts any surname in the household
// (e.g. either of a Spanish guest's two surnames), and allows small typos. It's there to stop a forwarded
// link being used by someone else, not to be a password.

function normName_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
function nameTokens_(s) {
  return normName_(s).split(/[^a-z]+/).filter(String);
}
/** Surnames for everyone on the invite: every word after the first name, plus the surname run together
 *  (so "Mac Donald" also matches "macdonald"). Guests listed with only one name use that name. */
function surnameTokens_(guests) {
  var out = [];
  guests.forEach(function (g) {
    var parts = nameTokens_(g);
    var surnames = parts.length > 1 ? parts.slice(1) : parts;
    out = out.concat(surnames);
    if (surnames.length > 1) out.push(surnames.join(''));
  });
  return out;
}
function editDistance_(a, b) {
  var prev = [], cur, i, j;
  for (j = 0; j <= b.length; j++) prev[j] = j;
  for (i = 1; i <= a.length; i++) {
    cur = [i];
    for (j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
function nameMatches_(guests, input) {
  var typed = nameTokens_(input);
  if (!typed.length) return false;
  typed.push(typed.join(''));
  var known = surnameTokens_(guests);
  return typed.some(function (t) {
    return known.some(function (k) {
      var allowed = k.length >= 8 ? 2 : k.length >= 4 ? 1 : 0; // typos allowed, scaled to name length
      return editDistance_(t, k) <= allowed;
    });
  });
}
