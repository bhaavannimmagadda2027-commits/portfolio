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
  var tlPage = $('.page-timeline'), stops = $$('.stop', tlPage), tlLine = $('.tl-fallback line', tlPage), tlStop = -1, tlScrolled = 0, enterAtEnd = false, tlReady = false;
  function tlGeometry() {
    return tlPage.clientWidth < 700 ? { a: 0.03, b: 0.97, v0: 0.15, v1: 0.3, nodes: [0.1, 0.367, 0.633, 0.9] }
      : { a: 0.025, b: 0.945, v0: 0.14, v1: 0.5, nodes: [0.12, 0.345, 0.575, 0.81] };
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
    g.solo = tlPage.clientWidth < 700;
    g.logos = stops.map(function (s) { return $('img', s); });
    g.bodies = stops.map(function (s) { return $('.stop-body', s); });
    return hasSand && Sand.writeTimeline(g);
  }
  function tlMax() { return Math.max(1, tlPage.scrollHeight - tlPage.clientHeight); }
  function tlTop(k) { return k >= 3 ? tlMax() : Math.ceil(tlMax() * k / 4) + 2; }
  function tlUpdate() {
    if (!tlReady) return;
    var k = Math.min(3, Math.floor(tlPage.scrollTop / tlMax() * 4));
    if (tlPage.scrollTop >= tlMax() - 2) k = 3;
    if (k === tlStop) return;
    tlStop = k;
    stops.forEach(function (s, i) { s.classList.toggle('on', i <= k); s.classList.toggle('now', i === k); });
    if (hasSand) Sand.reveal(k);
  }
  tlPage.addEventListener('scroll', function () { tlScrolled = Date.now(); tlUpdate(); }, { passive: true });
  tlLayout();
  /* Grains need the final fonts and logos, so the first rain waits for them. */
  Promise.race([new Promise(function (ok) { setTimeout(ok, 2500); }), Promise.all([
    document.fonts.load('400 24px "Instrument Serif"'), document.fonts.load('500 11px "Geist Mono"'), document.fonts.load('400 14px "Geist"'), document.fonts.load('500 14px "Geist"')
  ].concat(stops.map(function (s) { return $('img', s).decode(); }))).catch(function () {})]).then(function () {
    tlReady = true;
    if (pages[current] !== tlPage) return;
    tlStop = -1;
    if (hasSand) { tlWrite(); Sand.to('timeline'); }
    tlUpdate();
  });

  /* PepsiCo chapter: five scroll steps on the Census map of the United States. */
  var usaPage = $('.page-usa'), usaStage = $('.usa-stage', usaPage), usaSvg = $('svg', usaPage), usaCopy = $$('.usa-copy p', usaPage);
  var usaLand = 0, usaStep = -1, usaData = null, usaImgs = [], usaDrawn = {}, SVGNS = 'http://www.w3.org/2000/svg';
  var USA_LOGOS = ['pepsico', 'coca-cola', 'dr-pepper', 'private-label'].map(function (n) { return 'assets/logos/original/' + n + '.png'; });
  /* Large logos on the first two steps: [brand, x, y, width, height]. */
  var USA_BIG = [[[0, 470, 292, 240, 270]], [[0, 470, 205, 180, 190], [1, 280, 410, 170, 84], [2, 470, 410, 165, 104], [3, 660, 410, 140, 90]]];
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function usaLogo(g, s) { svgEl('image', { href: USA_LOGOS[s[0]], x: s[1] - s[3] / 2, y: s[2] - s[4] / 2, width: s[3], height: s[4] }, g); }
  function usaBuild() {
    var b = usaData.box;
    usaSvg.setAttribute('viewBox', b.join(' '));
    svgEl('path', { class: 'usa-borders', d: usaData.borders }, usaSvg);
    svgEl('path', { class: 'usa-nation', d: usaData.nation }, usaSvg);
    USA_BIG.forEach(function (set, i) { var g = svgEl('g', { class: 'usa-g usa-big usa-s' + i }, usaSvg); set.forEach(function (s) { usaLogo(g, s); }); });
    ['a', 'b', 'd'].forEach(function (key, i) {
      var g = svgEl('g', { class: 'usa-g usa-s' + (i + 2) }, usaSvg);
      usaData.states.forEach(function (st) {
        if (st.row) {
          svgEl('line', { class: 'usa-lead', x1: st.x, y1: st.y, x2: st.row[0] - 2, y2: st.row[1] }, g);
          var label = svgEl('text', { class: 'usa-code', x: st.row[0], y: st.row[1] + 3.5 }, g); label.textContent = st.c;
        }
        st[key].forEach(function (s) { usaLogo(g, s); });
      });
    });
  }
  function usaDraw(step) {
    return function (line, mark, box) {
      var r = usaSvg.getBoundingClientRect(), b = usaData.box, k = Math.min(r.width / b[2], r.height / b[3]);
      var ox = r.left - box.left + (r.width - b[2] * k) / 2 - b[0] * k, oy = r.top - box.top + (r.height - b[3] * k) / 2 - b[1] * k;
      line.setTransform(k, 0, 0, k, ox, oy); mark.setTransform(k, 0, 0, k, ox, oy);
      line.lineJoin = 'round'; line.strokeStyle = '#F0C98A';
      if (step >= 2) { line.lineWidth = 1.2 / k; line.stroke(new Path2D(usaData.borders)); }
      line.lineWidth = 1.9 / k; line.stroke(new Path2D(usaData.nation));
      var list = step < 2 ? USA_BIG[step] : [];
      if (step >= 2) usaData.states.forEach(function (st) {
        st[['a', 'b', 'd'][step - 2]].forEach(function (s) { list.push(s); });
        if (st.row) { line.lineWidth = 0.7 / k; line.beginPath(); line.moveTo(st.x, st.y); line.lineTo(st.row[0] - 2, st.row[1]); line.stroke(); }
      });
      list.forEach(function (s) {
        var im = usaImgs[s[0]], f = Math.min(s[3] / im.naturalWidth, s[4] / im.naturalHeight), w = im.naturalWidth * f, h = im.naturalHeight * f;
        mark.drawImage(im, s[1] - w / 2, s[2] - h / 2, w, h);
      });
    };
  }
  function usaMax() { return Math.max(1, usaPage.scrollHeight - usaPage.clientHeight); }
  function usaTop(k) { return k >= 4 ? usaMax() : Math.ceil(usaMax() * k / 5) + 2; }
  function usaUpdate() {
    var k = Math.min(4, Math.floor(usaPage.scrollTop / usaMax() * 5));
    if (usaPage.scrollTop >= usaMax() - 2) k = 4;
    if (k === usaStep) return;
    usaStep = k;
    usaStage.classList.remove('landed');
    clearTimeout(usaLand);
    usaLand = setTimeout(function () { usaStage.classList.add('landed'); }, rains ? 2700 : 0);
    usaStage.dataset.step = k;
    usaCopy.forEach(function (c, i) { c.classList.toggle('on', i === k); });
    if (!usaData || !hasSand) return;
    var name = 'usa' + k;
    if (!usaDrawn[name]) usaDrawn[name] = Sand.writeForm(name, usaDraw(k));
    if (usaDrawn[name]) Sand.to(name);
  }
  usaPage.addEventListener('scroll', function () { tlScrolled = Date.now(); usaUpdate(); }, { passive: true });
  usaImgs = USA_LOGOS.map(function (src) { var im = new Image(); im.src = src; return im; });
  Promise.all([fetch('assets/map/us-states.json').then(function (x) { return x.json(); })].concat(usaImgs.map(function (im) { return im.decode(); }))).then(function (done) {
    usaData = done[0]; usaBuild();
    if (pages[current] === usaPage) { usaStep = -1; usaUpdate(); }
  }).catch(function () {});

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
    var isTl = pages[i] === tlPage, isUsa = pages[i] === usaPage;
    if (isTl) tlStop = -1;
    if (isUsa) usaStep = -1;
    pages[i].scrollTop = enterAtEnd && (isTl || isUsa) ? pages[i].scrollHeight : 0;
    enterAtEnd = false;
    dots.forEach(function (d, k) {
      d.classList.toggle('on', k === i);
      if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    $('#prev').disabled = i === 0;
    $('#next').disabled = i === pages.length - 1;
    if (hasSand && !isUsa && (!isTl || tlReady)) { if (isTl) tlWrite(); Sand.to(pages[i].dataset.form); }
    if (isTl) tlUpdate();
    if (isUsa) usaUpdate();
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
    if (pages[current] === usaPage && usaStep + d >= 0 && usaStep + d <= 4) {
      lastNav = now;
      usaPage.scrollTo({ top: usaTop(usaStep + d), behavior: rains ? 'smooth' : 'auto' });
      return;
    }
    var t = current + d;
    if (t < 0 || t >= pages.length) return;
    enterAtEnd = (pages[t] === tlPage || pages[t] === usaPage) && d < 0;
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
    if ((pages[current] === tlPage || pages[current] === usaPage) && Date.now() - tlScrolled < 320) return;
    if (atEdge(d)) step(d);
  }, { passive: true });

  var ty = null;
  story.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  story.addEventListener('touchend', function (e) {
    if (ty === null) return;
    var dy = ty - e.changedTouches[0].clientY, d = dy > 0 ? 1 : -1; ty = null;
    if (Math.abs(dy) > 56 && atEdge(d) && ((pages[current] !== tlPage && pages[current] !== usaPage) || Date.now() - tlScrolled > 320)) step(d);
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
        else if (pages[current] === tlPage && tlReady) { var k = tlStop; tlWrite(); Sand.to('timeline', true); Sand.reveal(k); }
        else tlLayout();
        usaDrawn = {};
        if (inStory && pages[current] === usaPage) { usaStep = -1; usaUpdate(); }
      }, 180);
    });
  }
  requestAnimationFrame(function () { root.classList.add('ready'); });
})();
