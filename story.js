/* Landing, chapter tracks, page changes, case drawers and image viewer. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement, pages = $$('.page'), story = $('#story'), landing = $('#landing');
  var drawer = $('#drawer'), viewer = $('#viewer'), rail = $('#rail'), count = $('#count');
  var current = -1, inStory = false, lastNav = 0, lastFocus = null;

  var hasSand = false;
  try { hasSand = window.Sand && Sand.init($('#sand'), $('#labels')); } catch (e) { hasSand = false; }
  if (!hasSand) root.classList.add('no-sand'); else Sand.setLight(false);
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
  var USA_LOGOS = ['pepsico', 'coca-cola', 'dr-pepper', 'private-label', 'celsius', 'celsius-mark'].map(function (n) { return 'assets/logos/original/' + n + '.png'; });
  /* Large logos on the first two steps: [brand, x, y, width, height]. */
  var USA_BIG = [[[0, 470, 292, 240, 270]], [[0, 470, 205, 180, 190], [1, 205, 410, 150, 72], [2, 375, 410, 150, 96], [4, 555, 410, 165, 60], [3, 725, 410, 115, 76]]];
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
    ['a', 'b'].forEach(function (key, i) {
      var g = svgEl('g', { class: 'usa-g usa-s' + (i + 2) }, usaSvg);
      usaData.accounts.forEach(function (city) { city[key].forEach(function (s) { usaLogo(g, s); }); });
    });
    /* Final map: every account is a city, with one leading brand each. */
    var cityLayer = svgEl('g', { class: 'usa-g usa-s4' }, usaSvg);
    usaData.cities.forEach(function (s) { usaLogo(cityLayer, s); });
  }
  function usaDraw(step) {
    return function (line, mark, box) {
      var r = usaSvg.getBoundingClientRect(), b = usaData.box, k = Math.min(r.width / b[2], r.height / b[3]);
      var ox = r.left - box.left + (r.width - b[2] * k) / 2 - b[0] * k, oy = r.top - box.top + (r.height - b[3] * k) / 2 - b[1] * k;
      line.setTransform(k, 0, 0, k, ox, oy); mark.setTransform(k, 0, 0, k, ox, oy);
      line.lineJoin = 'round'; line.strokeStyle = '#F0C98A';
      if (step >= 2) { line.lineWidth = 1.2 / k; line.stroke(new Path2D(usaData.borders)); }
      line.lineWidth = 1.9 / k; line.stroke(new Path2D(usaData.nation));
      var list = step < 2 ? USA_BIG[step] : step === 4 ? usaData.cities : [];
      if (step === 2 || step === 3) usaData.accounts.forEach(function (city) {
        city[['a', 'b'][step - 2]].forEach(function (s) { list.push(s); });
      });
      list.forEach(function (s) {
        var im = usaImgs[s[0]], f = Math.min(s[3] / im.naturalWidth, s[4] / im.naturalHeight), w = im.naturalWidth * f, h = im.naturalHeight * f;
        mark.drawImage(im, s[1] - w / 2, s[2] - h / 2, w, h);
      });
    };
  }
  function usaMax() { return Math.max(1, usaPage.scrollHeight - usaPage.clientHeight); }
  function usaTop(k) { return k >= 4 ? usaMax() : Math.ceil(usaMax() * k / 5) + 2; }
  /* Picture for each sentence. The PepsiCo-only map is retired; the last two sentences share the final map. */
  var USA_MAP = [1, 2, 3, 4, 4];
  /* Opening title: builds in four beats, holds for reading, then moves to its place at the top right. */
  var usaIntro = $('.usa-intro', usaPage), usaIntroOn = false, usaIntroTimers = [], usaIntroRun = 0;
  function usaIntroStop() {
    usaIntroTimers.forEach(clearTimeout); usaIntroTimers = [];
    usaIntroOn = false; usaPage.style.overflowY = '';
    usaStage.classList.remove('intro', 'moving');
    if (usaStep < 0) usaStage.classList.remove('final');
    var p = $('p', usaIntro), d = $('.mono', usaIntro);
    p.style.transform = p.style.transformOrigin = d.style.transform = '';
  }
  function usaIntroMove() {
    var p = $('p', usaIntro), d = $('.mono', usaIntro), role = $('.usa-role', usaStage), rb = $('b', role);
    var a = p.getBoundingClientRect(), r = rb.getBoundingClientRect(), dw = d.getBoundingClientRect().width;
    var right = getComputedStyle(role).textAlign === 'right';
    var s = parseFloat(getComputedStyle(rb).fontSize) / parseFloat(getComputedStyle($('b', p)).fontSize);
    usaIntroOn = false; usaPage.style.overflowY = '';
    usaStage.classList.add('moving');
    p.style.transformOrigin = right ? '100% 0' : '0 0';
    p.style.transform = 'translate(' + (right ? r.right - a.right : r.left - a.left) + 'px,' + (r.top - a.top) + 'px) scale(' + s + ')';
    if (right) d.style.transform = 'translateX(' + (a.width - dw) + 'px)';
    usaUpdate();
    usaIntroTimers.push(setTimeout(usaIntroStop, 950));
  }
  function usaIntroPlay() {
    usaIntroStop();
    usaIntroOn = true; usaPage.style.overflowY = 'hidden';
    usaStage.classList.remove('landed');
    usaCopy.forEach(function (c) { c.classList.remove('on', 'seen'); });
    void usaStage.offsetWidth;
    usaStage.classList.add('intro');
    /* Two full seconds to read, counted from the moment the last beat has landed. */
    var run = ++usaIntroRun;
    $('.b4', usaIntro).addEventListener('animationend', function () {
      if (run === usaIntroRun && usaIntroOn) usaIntroTimers.push(setTimeout(usaIntroMove, 2000));
    }, { once: true });
  }
  function usaUpdate() {
    if (usaIntroOn) return;
    var k = Math.min(4, Math.floor(usaPage.scrollTop / usaMax() * 5));
    if (usaPage.scrollTop >= usaMax() - 2) k = 4;
    if (k === usaStep) return;
    var layer = USA_MAP[k], same = usaStep >= 0 && USA_MAP[usaStep] === layer;
    usaStep = k;
    usaCopy.forEach(function (c, i) { c.classList.toggle('on', i === k); c.classList.toggle('seen', i <= k); });
    usaStage.classList.toggle('final', k === 4);
    if (same) return;
    usaStage.classList.remove('landed');
    clearTimeout(usaLand);
    usaLand = setTimeout(function () { usaStage.classList.add('landed'); }, rains ? 2700 : 0);
    usaStage.dataset.step = layer;
    if (!usaData || !hasSand) return;
    var name = 'usa' + layer;
    if (!usaDrawn[name]) usaDrawn[name] = Sand.writeForm(name, usaDraw(layer));
    if (usaDrawn[name]) Sand.to(name);
  }
  usaPage.addEventListener('scroll', function () { tlScrolled = Date.now(); usaUpdate(); }, { passive: true });
  usaImgs = USA_LOGOS.map(function (src) { var im = new Image(); im.src = src; return im; });
  Promise.all([fetch('assets/map/us-states.json').then(function (x) { return x.json(); })].concat(usaImgs.map(function (im) { return im.decode(); }))).then(function (done) {
    usaData = done[0]; usaBuild();
    if (pages[current] === usaPage) { usaStep = -1; usaUpdate(); }
  }).catch(function () {});

  /* MBA chapter: a title, then six scroll steps over three sand pictures. Text builds up. */
  var rgPage = $('.page-rest'), rgStage = $('.rg-stage', rgPage), rgCopy = $$('.rg-copy p', rgPage), rgCanvas = $('.rg-scene', rgPage), rgFrame = $('.rg-frame', rgPage);
  var RG_ART = [0, 1, 2, 2, 2, 2], rgStep = -1, rgLand = 0, rgDrawn = {}, rgTitleOn = false, rgTitleTimers = [];
  var rgBox = $('.rg-copy', rgPage), rgPhone = matchMedia('(max-width:860px)');
  var rgImgs = ['shawarma-palace', 'channel-screen', 'growth-planner'].map(function (n) {
    var im = new Image(); im.src = 'assets/projects/restaurant/' + n + '.webp'; return im;
  });
  /* Whole picture, centred, never stretched. */
  function rgPlace(c, im, W, H) {
    var s = Math.min(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
    c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
  }
  function rgPaint(layer) {
    if (layer > 1) return;
    var r = rgFrame.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (!w || !h) return;
    if (rgCanvas.width !== w || rgCanvas.height !== h) { rgCanvas.width = w; rgCanvas.height = h; }
    var c = rgCanvas.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    rgPlace(c, rgImgs[layer], w, h);
  }
  function rgDraw(layer) {
    return function (line, mark, box) {
      var r = rgFrame.getBoundingClientRect();
      [line, mark].forEach(function (c) {
        c.setTransform(1, 0, 0, 1, r.left - box.left, r.top - box.top);
        rgPlace(c, rgImgs[layer], r.width, r.height);
      });
    };
  }
  /* One text size for the whole chapter, so all six paragraphs fit and nothing shifts as they build up. */
  function rgFitCopy() {
    rgBox.style.removeProperty('--rg-size');
    if (rgPhone.matches || !rgBox.clientHeight) return;
    var s = parseFloat(getComputedStyle(rgCopy[0]).fontSize);
    while (s > 12 && rgBox.scrollHeight > rgBox.clientHeight) { s -= .25; rgBox.style.setProperty('--rg-size', s + 'px'); }
  }
  function rgMark(k) {
    rgCopy.forEach(function (c, i) {
      c.classList.toggle('on', i === k);
      c.classList.toggle('seen', i <= k);
    });
    /* Phones cannot hold all six at once: earlier text stays above and the newest comes into view. */
    var p = rgCopy[k], top = Math.max(0, Math.min(p.offsetTop, p.offsetTop + p.offsetHeight - rgBox.clientHeight));
    rgBox.scrollTo({ top: top, behavior: rains ? 'smooth' : 'auto' });
  }
  function rgShow(layer, k) {
    if (!rgImgs[layer].complete) {
      rgImgs[layer].addEventListener('load', function () { if (pages[current] === rgPage && rgStep === k) rgShow(layer, k); }, { once: true });
      return;
    }
    rgStage.classList.remove('landed');
    rgStage.dataset.art = layer;
    rgMark(k);
    rgPaint(layer);
    clearTimeout(rgLand);
    rgLand = setTimeout(function () { rgStage.classList.add('landed'); }, rains ? 2700 : 0);
    if (!hasSand) return;
    var name = 'rest' + layer;
    if (!rgDrawn[name]) rgDrawn[name] = Sand.writeForm(name, rgDraw(layer));
    if (rgDrawn[name]) Sand.to(name);
  }
  function rgUpdate() {
    if (rgTitleOn) return;
    var k = Math.min(5, Math.floor(rgPage.scrollTop / rgMax() * 6));
    if (rgPage.scrollTop >= rgMax() - 2) k = 5;
    if (k === rgStep) return;
    var was = rgStep, layer = RG_ART[k];
    rgStep = k;
    if (was >= 0 && RG_ART[was] === layer) { rgMark(k); return; }
    rgShow(layer, k);
  }
  function rgMax() { return Math.max(1, rgPage.scrollHeight - rgPage.clientHeight); }
  function rgTop(k) { return k >= 5 ? rgMax() : Math.ceil(rgMax() * k / 6) + 2; }
  function rgStop() {
    rgTitleTimers.forEach(clearTimeout); rgTitleTimers = [];
    clearTimeout(rgLand);
    rgTitleOn = false; rgPage.style.overflowY = '';
    rgStage.classList.remove('titled', 'title-out');
  }
  function rgTitle() {
    rgStop();
    rgTitleOn = true; rgPage.style.overflowY = 'hidden';
    rgStage.classList.remove('landed');
    rgCopy.forEach(function (c) { c.classList.remove('on', 'seen'); });
    void rgStage.offsetWidth;
    rgStage.classList.add('titled');
    /* Fades in, stays for three full seconds, then leaves as the first picture rains in. */
    rgTitleTimers.push(setTimeout(function () {
      rgTitleOn = false; rgPage.style.overflowY = '';
      rgStage.classList.add('title-out');
      rgUpdate();
      rgTitleTimers.push(setTimeout(function () { rgStage.classList.remove('titled', 'title-out'); }, 460));
    }, 3550));
  }
  rgPage.addEventListener('scroll', function () { tlScrolled = Date.now(); rgUpdate(); }, { passive: true });
  function isScrolly(p) { return p === tlPage || p === usaPage || p === rgPage; }

  /* Two parallel tracks. Each chapter sits on one, so the rail shows the crossings. */
  function trackOf(p) { return p.dataset.track === 'technical' ? 'technical' : 'strategy'; }
  var railHeads = ['strategy', 'technical'].map(function (name, k) {
    var head = document.createElement('b'), line = document.createElement('em');
    head.className = 'rail-head'; head.textContent = name; head.style.gridColumn = k + 1;
    line.className = 'rail-line'; line.style.gridColumn = k + 1; line.style.gridRow = '2 / ' + (pages.length + 2);
    rail.appendChild(head); rail.appendChild(line);
    return head;
  });
  pages.forEach(function (p, i) {
    $$('.r', p).forEach(function (el, k) { el.style.setProperty('--i', k); });
    var b = document.createElement('button'), lane = trackOf(p);
    b.type = 'button'; b.setAttribute('aria-label', 'Go to ' + p.dataset.title + ', ' + lane);
    b.style.gridColumn = lane === 'technical' ? 2 : 1; b.style.gridRow = i + 2;
    b.innerHTML = '<i></i><span></span>'; b.lastChild.textContent = p.dataset.title;
    b.addEventListener('click', function () { setHash(i); });
    rail.appendChild(b);
  });
  var dots = $$('button', rail);

  /* After a strategy chapter with a technical side, the reader chooses where to go. */
  var fork = $('#fork'), forkAt = 0, skipBack = {};
  function hasTech(i) { return !!pages[i + 1] && trackOf(pages[i]) === 'strategy' && trackOf(pages[i + 1]) === 'technical'; }
  function afterTech(i) { var t = i + 1; while (pages[t] && trackOf(pages[t]) === 'technical') t++; return Math.min(t, pages.length - 1); }
  function openFork() {
    $('#fork-done').textContent = pages[current].dataset.title;
    $('#fork-tech-name').textContent = pages[current + 1].dataset.title;
    $('#fork-skip-name').textContent = pages[afterTech(current)].dataset.title;
    fork.hidden = false; forkAt = Date.now();
    $('#fork-tech').focus({ preventScroll: true });
  }
  function closeFork() { fork.hidden = true; }
  $('#fork-tech').addEventListener('click', function () { var t = current + 1; closeFork(); delete skipBack[afterTech(current)]; setHash(t); });
  $('#fork-skip').addEventListener('click', function () { var from = current, t = afterTech(from); closeFork(); skipBack[t] = from; enterAtEnd = false; setHash(t); });

  function setHash(i) { location.hash = 'strategy/' + (i + 1); }

  function showPage(i) {
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (i === current) return;
    current = i;
    closeFork();
    usaIntroStop(); rgStop();
    pages.forEach(function (p, k) {
      p.classList.toggle('on', k === i);
      p.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      p.inert = k !== i;
    });
    var isTl = pages[i] === tlPage, isUsa = pages[i] === usaPage, isRg = pages[i] === rgPage;
    if (isTl) tlStop = -1;
    if (isUsa) usaStep = -1;
    if (isRg) { rgStep = -1; rgFitCopy(); }
    pages[i].scrollTop = enterAtEnd && (isTl || isUsa || isRg) ? pages[i].scrollHeight : 0;
    enterAtEnd = false;
    railHeads[0].classList.toggle('on', trackOf(pages[i]) === 'strategy');
    railHeads[1].classList.toggle('on', trackOf(pages[i]) === 'technical');
    dots.forEach(function (d, k) {
      d.classList.toggle('on', k === i);
      d.classList.toggle('done', k < i);
      if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(pages.length).padStart(2, '0');
    $('#prev').disabled = i === 0;
    $('#next').disabled = i === pages.length - 1;
    if (hasSand && !isUsa && !isRg && (!isTl || tlReady)) { if (isTl) tlWrite(); Sand.to(pages[i].dataset.form); }
    if (isTl) tlUpdate();
    if (isUsa) { if (rains && pages[i].scrollTop === 0) usaIntroPlay(); else usaUpdate(); }
    if (isRg) { if (rains && pages[i].scrollTop === 0) rgTitle(); else rgUpdate(); }
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
    closeFork();
    usaIntroStop(); rgStop();
    closeDrawer();
    root.classList.remove('is-story');
    landing.inert = false; story.inert = true;
    if (hasSand) rainLanding();
  }
  function route() {
    var m = /^#strategy(?:\/(\d+))?$/.exec(location.hash);
    if (m) enterStory((parseInt(m[1], 10) || 1) - 1); else leaveStory();
  }

  function step(d) {
    var now = Date.now();
    /* The choice is deliberate: scrolling down waits for a click, scrolling up goes back. */
    if (!fork.hidden) { if (d < 0 && now - forkAt > 450) closeFork(); return; }
    if (!inStory || drawer.classList.contains('open') || viewer.open || now - lastNav < 850) return;
    /* Inside the timeline, keys and arrows go stop by stop before leaving the page. */
    if (pages[current] === tlPage && tlStop + d >= 0 && tlStop + d <= 3) {
      lastNav = now;
      tlPage.scrollTo({ top: tlTop(tlStop + d), behavior: rains ? 'smooth' : 'auto' });
      return;
    }
    if (pages[current] === usaPage && usaIntroOn && d > 0) return;
    if (pages[current] === usaPage && usaStep + d >= 0 && usaStep + d <= 4) {
      lastNav = now;
      usaPage.scrollTo({ top: usaTop(usaStep + d), behavior: rains ? 'smooth' : 'auto' });
      return;
    }
    if (pages[current] === rgPage && rgTitleOn && d > 0) return;
    if (pages[current] === rgPage && rgStep + d >= 0 && rgStep + d <= 5) {
      lastNav = now;
      rgPage.scrollTo({ top: rgTop(rgStep + d), behavior: rains ? 'smooth' : 'auto' });
      return;
    }
    if (d > 0 && hasTech(current)) { lastNav = now; openFork(); return; }
    var t = current + d;
    if (d < 0 && skipBack[current] !== undefined) { t = skipBack[current]; delete skipBack[current]; }
    if (t < 0 || t >= pages.length) return;
    enterAtEnd = isScrolly(pages[t]) && d < 0;
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
    if (isScrolly(pages[current]) && Date.now() - tlScrolled < 320) return;
    if (atEdge(d)) step(d);
  }, { passive: true });

  var ty = null;
  story.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
  story.addEventListener('touchend', function (e) {
    if (ty === null) return;
    var dy = ty - e.changedTouches[0].clientY, d = dy > 0 ? 1 : -1; ty = null;
    if (Math.abs(dy) > 56 && atEdge(d) && (!isScrolly(pages[current]) || Date.now() - tlScrolled > 320)) step(d);
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
      quiet(document.fonts.load('500 12px "Geist Mono"')), quiet(document.fonts.load('400 16px "Geist"')), quiet(photo.decode())].concat($$('.proof img').map(function (im) { return quiet(im.decode()); })));
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
        rgDrawn = {};
        if (inStory && pages[current] === rgPage) { rgFitCopy(); rgStep = -1; rgUpdate(); }
      }, 180);
    });
  }
  requestAnimationFrame(function () { root.classList.add('ready'); });
})();
