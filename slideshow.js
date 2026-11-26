// Cross-fade through the photos listed in data-photos, 3 seconds each. Tap a photo to skip ahead;
// press and hold to pause on it (it carries on when you let go).
(function () {
  var wrap = document.querySelector('.slideshow');
  var srcs = (wrap.dataset.photos || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (srcs.length < 2) return;
  var first = wrap.querySelector('img');
  var imgs = [first].concat(srcs.slice(1).map(function (src) {
    var im = new Image(); im.className = 'hero slide'; im.dataset.src = src; im.alt = '';
    wrap.appendChild(im); return im;
  }));
  first.classList.add('slide', 'on');
  var i = 0, timer;
  function load(k) { var im = imgs[k % imgs.length]; if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } }
  // The outgoing photo stays fully visible underneath while the next one fades in on top of it,
  // so nothing behind the photos (like the frame) shows through mid-fade.
  var prevTimer;
  function show(n) {
    imgs.forEach(function (im) { im.classList.remove('prev'); });
    imgs[i].classList.remove('on'); imgs[i].classList.add('prev');
    var old = imgs[i];
    i = (n + imgs.length) % imgs.length;
    load(i); imgs[i].classList.add('on'); load(i + 1);   // fetch the next photo ahead of time
    clearTimeout(prevTimer);
    prevTimer = setTimeout(function () { old.classList.remove('prev'); }, 1300);
  }
  load(1);
  var PER_PHOTO = 3000;
  function start() { clearInterval(timer); timer = setInterval(function () { show(i + 1); }, PER_PHOTO); }
  function stop() { clearInterval(timer); }

  // Press and hold pauses; a quick tap skips to the next photo.
  var downAt = 0, held = false, holdTimer;
  wrap.addEventListener('pointerdown', function () {
    downAt = Date.now(); held = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () { held = true; stop(); wrap.classList.add('paused'); }, 250);
  });
  function release() {
    clearTimeout(holdTimer);
    if (held) { wrap.classList.remove('paused'); start(); }
  }
  wrap.addEventListener('pointerup', release);
  wrap.addEventListener('pointercancel', release);
  wrap.addEventListener('pointerleave', release);
  wrap.addEventListener('click', function () { if (held) { held = false; return; } show(i + 1); start(); });
  wrap.addEventListener('contextmenu', function (e) { e.preventDefault(); });   // no "save image" menu on a long press
  start();
})();
