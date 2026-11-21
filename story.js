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
    pages[i].scrollTop = 0;
    dots.forEach(function (d, k) {
      d.classList.toggle('on', k === i);
      if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    $('#prev').disabled = i === 0;
    $('#next').disabled = i === pages.length - 1;
    if (hasSand) Sand.to(pages[i].dataset.form);
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
    var t = current + d;
    if (t < 0 || t >= pages.length) return;
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
    if (atEdge(d)) step(d);
  }, { passive: true });

  var ty = null;
  story.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  story.addEventListener('touchend', function (e) {
    if (ty === null) return;
    var dy = ty - e.changedTouches[0].clientY, d = dy > 0 ? 1 : -1; ty = null;
    if (Math.abs(dy) > 56 && atEdge(d)) step(d);
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
      resizeTimer = setTimeout(function () { if (!inStory) rainLanding(true); }, 180);
    });
  }
  requestAnimationFrame(function () { root.classList.add('ready'); });
})();
