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
  if (still) return;
  var y = 0, last = 0, paused = false, SPEED = 32;   // pixels per second
  strip.addEventListener('mouseenter', function () { paused = true; });
  strip.addEventListener('mouseleave', function () { paused = false; });
  function tick(now) {
    var dt = last ? Math.min((now - last) / 1000, .1) : 0;
    last = now;
    if (wide.matches && !paused && !document.hidden) {
      var loop = track.scrollHeight / 2;   // height of one copy of the photos
      y = (y + SPEED * dt) % (loop || 1);
      track.style.transform = 'translate3d(0,' + (-y).toFixed(2) + 'px,0)';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
