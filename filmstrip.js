// On wider screens, the FAQ photos run as a film strip down the full height of the questions,
// drifting slowly upwards in a loop (hover to pause). Phones keep the cross-fading slideshow.
(function () {
  var source = document.querySelector('.faq-photos');
  if (!source) return;
  var srcs = (source.dataset.photos || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  if (srcs.length < 2) return;

  var strip = document.createElement('div');
  strip.className = 'faq-strip';
  strip.setAttribute('aria-hidden', 'true');
  var track = document.createElement('div');
  track.className = 'strip-track';
  // Two copies of the photos, so the loop joins up seamlessly.
  srcs.concat(srcs).forEach(function (src, k) {
    var im = new Image();
    im.alt = ''; im.width = 772; im.height = 1038; im.decoding = 'async';
    if (k > 3) im.loading = 'lazy';
    im.src = src;
    var frame = document.createElement('span');   // the frame stays blue while the photo is black and white
    frame.appendChild(im);
    track.appendChild(frame);
  });
  strip.appendChild(track);
  source.parentNode.insertBefore(strip, source);

  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = window.matchMedia('(min-width: 900px)');
  if (still) return;   // reduced motion: the strip stays put and scrolls like a normal box (see style.css)
  var y = 0, last = 0, paused = false, SPEED = 32;   // pixels per second
  var v = SPEED;   // current speed: eases towards 0 when paused and back up to SPEED, so it never stops or starts with a jolt
  function place() {
    var loop = track.scrollHeight / 2 || 1;   // height of one copy of the photos
    y = ((y % loop) + loop) % loop;           // wrap both ways, so scrolling up loops too
    track.style.transform = 'translate3d(0,' + (-y).toFixed(2) + 'px,0)';
  }
  strip.addEventListener('mouseenter', function () { paused = true; });
  strip.addEventListener('mouseleave', function () { paused = false; });

  // Scroll it by hand: mouse wheel / trackpad while hovering, or drag it.
  strip.addEventListener('wheel', function (e) {
    if (!wide.matches) return;
    e.preventDefault();
    y += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    place();
  }, { passive: false });
  var dragY = null;
  strip.addEventListener('pointerdown', function (e) {
    if (!wide.matches) return;
    dragY = e.clientY; paused = true; strip.setPointerCapture(e.pointerId); strip.classList.add('dragging');
  });
  strip.addEventListener('pointermove', function (e) {
    if (dragY === null) return;
    y -= e.clientY - dragY; dragY = e.clientY; place();
  });
  function endDrag(e) {
    if (dragY === null) return;
    dragY = null; strip.classList.remove('dragging');
    if (e.pointerType !== 'mouse') paused = false;   // touch has no "mouseleave" to resume it
  }
  strip.addEventListener('pointerup', endDrag);
  strip.addEventListener('pointercancel', endDrag);

  function tick(now) {
    var dt = last ? Math.min((now - last) / 1000, .1) : 0;
    last = now;
    if (wide.matches && !document.hidden) {
      var target = paused ? 0 : SPEED;
      v += (target - v) * (1 - Math.exp(-dt / 0.45));   // about half a second to glide to a stop or back up to speed
      if (dragY === null && v > 0.05) { y += v * dt; place(); }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
