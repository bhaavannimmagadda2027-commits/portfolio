/* Landing, lens choice, page changes, case drawers and image viewer. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement, pages = $$('.page'), story = $('#story'), landing = $('#landing');
  var drawer = $('#drawer'), viewer = $('#viewer'), rail = $('#rail'), count = $('#count');
  var current = -1, inStory = false, lastNav = 0, lastFocus = null;

  var hasSand = false;
  try { hasSand = window.Sand && Sand.init($('#sand'), $('#labels')); } catch (e) { hasSand = false; }
  if (!hasSand) root.classList.add('no-sand');
  var rains = hasSand && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (rains) root.classList.add('land-waits');

  /* Rain sand onto every landing item. The sharp version fades in once the grains have landed. */
  function rainLanding(instant) {
    if (!hasSand) return;
    Sand.to(Sand.writeLanding(landing) ? 'landing' : 'dune', instant);
    if (rains && !instant) { root.classList.remove('land-rains'); void landing.offsetWidth; root.classList.add('land-rains'); }
  }

  /* Tower overlay: floor markers follow the zoom and appear as each stage lands. */
  var tower = $('.tower'), marks = $$('[data-at]', tower);
  if (hasSand) Sand.onTower(function (T, unit, lift) {
    tower.style.setProperty('--u', unit.toFixed(2) + 'px');
    tower.style.setProperty('--o', lift.toFixed(2) + 'px');
    marks.forEach(function (m) { m.classList.toggle('on', T >= +m.dataset.at); });
  });

  /* Timeline: reader scroll moves through four stops, and sand lands on each. */
  var tlPage = $('.page-timeline'), stops = $$('.stop', tlPage), tlLine = $('.tl-fallback line', tlPage), tlStop = -1, tlScrolled = 0, enterAtEnd = false;
  function tlGeometry() {
    return tlPage.clientWidth < 700 ? { a: 0.03, b: 0.97, v0: 0.15, v1: 0.3, nodes: [0.1, 0.367, 0.633, 0.9] }
      : { a: 0.025, b: 0.945, v0: 0.14, v1: 0.5, nodes: [0.12, 0.36, 0.6, 0.84] };
  }
  function tlLayout() {
    var g = tlGeometry();
    stops.forEach(function (s, i) {
      s.style.setProperty('--x', (g.nodes[i] * 100).toFixed(2) + '%');
      s.style.setProperty('--y', ((g.v0 + (g.v1 - g.v0) * (g.nodes[i] - g.a) / (g.b - g.a)) * 100).toFixed(2) + '%');
    });
    tlLine.setAttribute('x1', g.a); tlLine.setAttribute('x2', g.b); tlLine.setAttribute('y1', g.v0); tlLine.setAttribute('y2', g.v1);
    return g;
  }
  function tlWrite() {
    var g = tlLayout();
    g.logos = tlPage.clientWidth < 700 ? [] : stops.map(function (s) { return $('img', s); });
    return hasSand && Sand.writeTimeline(g);
  }
  function tlMax() { return Math.max(1, tlPage.scrollHeight - tlPage.clientHeight); }
  function tlTop(k) { return k >= 3 ? tlMax() : Math.ceil(tlMax() * k / 4) + 2; }
  function tlUpdate() {
    var k = Math.min(3, Math.floor(tlPage.scrollTop / tlMax() * 4));
    if (tlPage.scrollTop >= tlMax() - 2) k = 3;
    if (k === tlStop) return;
    tlStop = k;
    stops.forEach(function (s, i) { s.classList.toggle('on', i <= k); s.classList.toggle('now', i === k); });
    if (hasSand) Sand.reveal(k);
  }
  tlPage.addEventListener('scroll', function () { tlScrolled = Date.now(); tlUpdate(); }, { passive: true });
  tlLayout();

  pages.forEach(function (p, i) {
    $$('.r', p).forEach(function (el, k) { el.style.setProperty('--i', k); });
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', 'Go to ' + p.dataset.title);
    b.innerHTML = '<i></i><span></span>'; b.lastChild.textContent = p.dataset.title;
    b.addEventListener('click', function () { setHash(i); });
    rail.appendChild(b);
  });
  var dots = $$('button', rail);

  function setHash(i) { location.hash = 'strategy/' + (i + 1); }

  function showPage(i) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (i === current) return;
    current = i;
    pages.forEach(function (p, k) {
      p.classList.toggle('on', k === i);
      p.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      p.inert = k !== i;
    });
    var isTl = pages[i] === tlPage;
    if (isTl) tlStop = -1;
    pages[i].scrollTop = isTl && enterAtEnd ? tlMax() : 0;
    enterAtEnd = false;
    dots.forEach(function (d, k) {
      d.classList.toggle('on', k === i);
      if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    $('#prev').disabled = i === 0;
    $('#next').disabled = i === pages.length - 1;
    if (hasSand) { if (isTl) tlWrite(); Sand.to(pages[i].dataset.form); }
    if (isTl) tlUpdate();
  }

  function enterStory(i) {
    if (!inStory) {
      inStory = true;
      root.classList.add('is-story');
      landing.inert = true; story.inert = false;
      if (hasSand) setTimeout(function () { if (inStory) Sand.setLight(false); }, 380);
    }
    showPage(i);
  }
  function leaveStory() {
    if (!inStory) return;
    inStory = false; current = -1;
    closeDrawer();
    root.classList.remove('is-story');
    landing.inert = false; story.inert = true;
    if (hasSand) { Sand.setLight(true); rainLanding(); }
  }
  function route() {
    var m = /^#strategy(?:\/(\d+))?$/.exec(location.hash);
    if (m) enterStory((parseInt(m[1], 10) || 1) - 1); else leaveStory();
  }

  function step(d) {
    var now = Date.now();
    if (!inStory || drawer.classList.contains('open') || viewer.open || now - lastNav < 850) return;
    /* Inside the timeline, keys and arrows go stop by stop before leaving the page. */
    if (pages[current] === tlPage && tlStop + d >= 0 && tlStop + d <= 3) {
      lastNav = now;
      tlPage.scrollTo({ top: tlTop(tlStop + d), behavior: rains ? 'smooth' : 'auto' });
      return;
    }
    var t = current + d;
    if (t < 0 || t >= pages.length) return;
    enterAtEnd = pages[t] === tlPage && d < 0;
    lastNav = now; setHash(t);
  }
  function atEdge(d) {
    var p = pages[current];
    if (!p) return true;
    return d > 0 ? p.scrollTop + p.clientHeight >= p.scrollHeight - 2 : p.scrollTop <= 1;
  }

  addEventListener('wheel', function (e) {
    if (!inStory || Math.abs(e.deltaY) < 18) return;
    var d = e.deltaY > 0 ? 1 : -1;
    /* Let a timeline scroll finish before the same gesture can turn the page. */
    if (pages[current] === tlPage && Date.now() - tlScrolled < 320) return;
    if (atEdge(d)) step(d);
  }, { passive: true });

  var ty = null;
  story.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  story.addEventListener('touchend', function (e) {
    if (ty === null) return;
    var dy = ty - e.changedTouches[0].clientY, d = dy > 0 ? 1 : -1; ty = null;
    if (Math.abs(dy) > 56 && atEdge(d) && (pages[current] !== tlPage || Date.now() - tlScrolled > 320)) step(d);
  }, { passive: true });

  addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (drawer.classList.contains('open')) closeDrawer(); return; }
    if (!inStory || viewer.open || drawer.classList.contains('open')) return;
    if (/^(BUTTON|A)$/.test(document.activeElement.tagName) && e.key === ' ') return;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].indexOf(e.key) > -1) { e.preventDefault(); step(1); }
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].indexOf(e.key) > -1) { e.preventDefault(); step(-1); }
  });

  $('#prev').addEventListener('click', function () { lastNav = 0; step(-1); });
  $('#next').addEventListener('click', function () { lastNav = 0; step(1); });
  $('#enter').addEventListener('click', function () { setHash(0); });
  $('#home').addEventListener('click', function () { location.hash = ''; });

  /* Case drawer */
  function openDrawer(id, opener) {
    $$('.case', drawer).forEach(function (c) { c.hidden = c.id !== id; });
    lastFocus = opener;
    drawer.classList.add('open'); drawer.inert = false; story.inert = true;
    $('.drawer-body', drawer).scrollTop = 0;
    $('#drawer-close').focus();
  }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.inert = true;
    if (inStory) story.inert = false;
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-case]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(b.dataset.case, b); }); });
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-scrim').addEventListener('click', closeDrawer);

  /* Image viewer */
  var vImg = $('#viewer-img'), vCap = $('#viewer-cap');
  $$('[data-lb]').forEach(function (b) {
    b.addEventListener('click', function () {
      vImg.src = b.dataset.lb; vImg.alt = $('img', b).alt; vCap.textContent = b.dataset.cap || '';
      viewer.showModal();
    });
  });
  $('#viewer-close').addEventListener('click', function () { viewer.close(); });
  viewer.addEventListener('click', function (e) { if (e.target === viewer) viewer.close(); });

  story.inert = true; drawer.inert = true;
  addEventListener('hashchange', route);
  route();
  if (hasSand) {
    /* Wait for fonts and the photo so the grains match what they become. */
    var wait = new Promise(function (ok) { setTimeout(ok, 1800); }), photo = $('.l-photo img');
    var quiet = function (p) { return p.catch(function () {}); };
    var ready = Promise.all([quiet(document.fonts.load('100px "Instrument Serif"')), quiet(document.fonts.load('italic 100px "Instrument Serif"')),
      quiet(document.fonts.load('500 12px "Geist Mono"')), quiet(document.fonts.load('400 16px "Geist"')), quiet(photo.decode())]);
    Promise.race([ready, wait]).then(function () { if (!inStory) rainLanding(); else root.classList.add('land-rains'); });
    var resizeTimer = 0;
    addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!inStory) rainLanding(true);
        else if (pages[current] === tlPage) { var k = tlStop; tlWrite(); Sand.to('timeline', true); Sand.reveal(k); }
        else tlLayout();
      }, 180);
    });
  }
  requestAnimationFrame(function () { root.classList.add('ready'); });
})();
