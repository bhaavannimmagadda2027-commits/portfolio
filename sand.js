/* Sand engine: grains and light streaks fall and settle into a form for each page. */
(function () {
  var TAU = Math.PI * 2;
  var AMBER = [0.86, 0.52, 0.18], GOLD = [0.96, 0.76, 0.46], RUST = [0.58, 0.27, 0.1],
      STEEL = [0.4, 0.62, 0.74], PALE = [0.93, 0.89, 0.8];
  /* The building is rebuilt from the dots of the reference image. Ground is y 3. */
  var GROUND = 3, FLOOR = 6.6 / 240, TOWER_K = 6.75 / 1090, BELOW_K = 2.75 / 364, GROUND_PX = 1126;
  var shown = -1, dots = null, cursor = { foot: 0, footEdge: 0, soil: 0, ground: 0, tower: 0, towerEdge: 0 }, towerWaiting = false;
  /* Mark dots at the end of a run, across and down, so the silhouette can be drawn more firmly. */
  function markEdges(all, axis, other) {
    var bins = {};
    all.forEach(function (a) { var k = Math.round(a[other] / 6); (bins[k] = bins[k] || []).push(a); });
    Object.keys(bins).forEach(function (k) {
      var run = bins[k].sort(function (a, b) { return a[axis] - b[axis]; });
      run.forEach(function (a, i) {
        if (!i || i === run.length - 1 || a[axis] - run[i - 1][axis] > 16 || run[i + 1][axis] - a[axis] > 16) a.edge = 1;
      });
    });
  }
  function prepareDots(u) {
    var r = rng(5150), d = { foot: [], footEdge: [], soil: [], ground: [], tower: [], towerEdge: [] }, solid = [], i;
    for (i = 0; i + 2 < u.length; i += 3) {
      var px = u[i], py = u[i + 1], v = Math.min(1.2, 0.6 + u[i + 2] / 320);
      var y = py <= GROUND_PX ? GROUND + (GROUND_PX - py) * TOWER_K : GROUND - (py - GROUND_PX) * BELOW_K;
      var dot = [(px - 512) * TOWER_K, y, v, 0];
      if (Math.abs(py - GROUND_PX) <= 2) d.ground.push(dot);
      else if (py > GROUND_PX && (px < 205 || px > 815)) d.soil.push(dot);
      else solid.push({ px: px, py: py, dot: dot, below: py > GROUND_PX, edge: 0 });
    }
    markEdges(solid, 'px', 'py'); markEdges(solid, 'py', 'px');
    solid.forEach(function (s) {
      s.dot[3] = s.edge;
      /* Future floors keep their outline but lose part of their interior. */
      if (!s.below && !s.edge && (s.dot[1] - GROUND) / FLOOR > 45 && r() < 0.46) return;
      d[(s.below ? 'foot' : 'tower') + (s.edge ? 'Edge' : '')].push(s.dot);
    });
    Object.keys(d).forEach(function (key) {
      for (var a = d[key].length - 1; a > 0; a--) { var b = Math.floor(r() * (a + 1)), s = d[key][a]; d[key][a] = d[key][b]; d[key][b] = s; }
    });
    return d;
  }
  function nextDot(key) { var list = dots[key]; return list[cursor[key]++ % list.length]; }
  function dim(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* Sample a point on the visible faces of a box, mostly on top. */
  function box(r, x, z, w, d, h, y0) {
    var f = r(), base = y0 || 0;
    if (f < 0.52) return [x + (r() - 0.5) * w, base + h, z + (r() - 0.5) * d];
    if (f < 0.76) return [x + (r() < 0.5 ? -w / 2 : w / 2), base + r() * h, z + (r() - 0.5) * d];
    return [x + (r() - 0.5) * w, base + r() * h, z + (r() < 0.5 ? -d / 2 : d / 2)];
  }

  var FORMS = {
    dune: function (r) {
      var x = (r() - 0.5) * 15, z = -3 + r() * 5.4;
      var y = Math.max(0, 0.72 + 0.5 * Math.sin(x * 0.52 + 1.1) + 0.26 * Math.sin(x * 1.25 + z * 0.8) - 0.16 * z);
      return { p: [x, y * (0.94 + r() * 0.06), z], c: mix(RUST, GOLD, Math.min(1, y / 1.5) * r()) };
    },
    heaps: function (r) {
      var k = r(), i = k < 0.46 ? 0 : k < 0.78 ? 1 : 2;
      var cx = [-2.65, 0.05, 2.6][i], R = [1.5, 1.2, 0.95][i], H = [2.1, 1.55, 1.15][i];
      var a = r() * TAU, q = Math.sqrt(r()) * R;
      var y = H * Math.pow(1 - q / R, 1.38) * (0.97 + r() * 0.03) + 0.035 * Math.sin(a * 7 + q * 5);y = Math.max(0, y);
      return { p: [cx + Math.cos(a) * q, y, Math.sin(a) * q], c: i === 2 ? mix(STEEL, PALE, r() * 0.4) : mix(i ? AMBER : RUST, GOLD, y / H) };
    },
    shift: function (r) {
      /* 100 cells of spend. 13 are lifted out and moved to the right. */
      var moved = r() < 0.34, s = 0.46;
      if (moved) {
        var m = Math.floor(r() * 13), col = m % 4, row = Math.floor(m / 4);
        var b = box(r, 2.15 + col * 0.52, -0.8 + row * 0.52, 0.42, 0.42, 1.25, 0);
        return { p: b, c: mix(AMBER, GOLD, b[1] / 1.25) };
      }
      var ix = Math.floor(r() * 10), iz = Math.floor(r() * 10);
      if (ix > 6 && iz < 2) ix = Math.floor(r() * 7);
      var c = box(r, -3 + ix * s, -2.05 + iz * s, 0.38, 0.38, 0.16, 0);
      return { p: c, c: mix(STEEL, RUST, r() * 0.45) };
    },
    surface: function (r) {
      /* 180 SKUs as a 15 x 12 field of columns. */
      var ix = Math.floor(r() * 15), iz = Math.floor(r() * 12), s = 0.46;
      var x = (ix - 7) * s, z = (iz - 5.5) * s;
      var h = 0.25 + 1.8 * Math.exp(-((x + 0.9) * (x + 0.9)) / 4.2) * (0.55 + 0.45 * Math.cos(z * 1.2)) + 0.18 * Math.sin(x * 2 + z);
      var b = box(r, x, z, 0.3, 0.3, Math.max(0.12, h), 0);
      return { p: b, c: mix(RUST, GOLD, Math.min(1, h / 1.9)) };
    },
    rto: function (r) {
      var k = r(), i = k < 0.43 ? 0 : k < 0.76 ? 1 : 2;
      var h = [3.2, 2.4, 1.6][i], x = [-2, 0, 2][i];
      var b = box(r, x, 0, 1.15, 1.15, h, 0);
      return { p: b, c: i === 0 ? mix(RUST, AMBER, r()) : i === 1 ? mix(STEEL, PALE, r() * 0.35) : mix(AMBER, GOLD, r()) };
    },
    hub: function (r) {
      /* One account, 42 couriers. */
      var i = Math.floor(r() * 42), a = i / 42 * TAU, R = 3.5, k = r();
      if (k < 0.2) {
        var aa = r() * TAU, q = Math.sqrt(r()) * 0.72;
        var y = 1.25 * Math.pow(r(), 0.5);
        return { p: [Math.cos(aa) * q, y, Math.sin(aa) * q], c: mix(AMBER, GOLD, r()) };
      }
      if (k < 0.58) {
        var t = 0.2 + r() * 0.8;
        return { p: [Math.cos(a) * R * t, 0.35 * (1 - t) + 0.02, Math.sin(a) * R * t], c: mix(AMBER, STEEL, t) };
      }
      var b = box(r, Math.cos(a) * R, Math.sin(a) * R, 0.2, 0.2, 0.34 + (i % 3) * 0.12, 0);
      return { p: b, c: mix(STEEL, PALE, r() * 0.5) };
    },
    decks: function (r) {
      /* 40 geographies, one deck each. */
      var ix = Math.floor(r() * 8), iz = Math.floor(r() * 5), l = Math.floor(r() * 5);
      var b = box(r, (ix - 3.5) * 0.92, (iz - 2) * 0.92, 0.66, 0.5, 0.04, l * 0.2 + 0.03);
      return { p: b, c: mix(l < 2 ? RUST : AMBER, l > 3 ? GOLD : STEEL, r() * 0.7) };
    },
    one: function (r) {
      /* 1 of 470. */
      if (r() < 0.3) {
        var a = r() * TAU, q = Math.sqrt(r()) * 0.17, h = r() * 4.1;
        return { p: [Math.cos(a) * q, h, Math.sin(a) * q], c: mix(AMBER, GOLD, h / 4.1) };
      }
      var i = 1 + Math.floor(r() * 469), rad = 0.17 * Math.sqrt(i), th = i * 2.39996;
      var j = r() * TAU, jr = r() * 0.055;
      return { p: [Math.cos(th) * rad + Math.cos(j) * jr, r() * 0.11, Math.sin(th) * rad + Math.sin(j) * jr], c: mix(STEEL, RUST, r() * 0.7) };
    },
    strata: function (r) {
      var x = (r() - 0.5) * 7.2, z = (r() - 0.5) * 3.2, k = r();
      var i = k < 0.28 ? 0 : k < 0.65 ? 1 : 2;
      var edge = function (b) { return b + 0.14 * Math.sin(x * 1.05 + b * 3) + 0.08 * Math.sin(z * 1.7 + x); };
      var lo = [0, edge(0.85), edge(1.95)][i], hi = [edge(0.85), edge(1.95), edge(3)][i];
      var front = r() < 0.55;
      var y = front ? lo + r() * (hi - lo) : hi;
      if (front) z = 1.6;
      return { p: [x, y, z], c: i === 0 ? mix(RUST, AMBER, r() * 0.6) : i === 1 ? mix(STEEL, PALE, r() * 0.3) : mix(AMBER, GOLD, r()) };
    },
    crest: function (r) {
      var x = (r() - 0.5) * 12, z = -2.6 + r() * 5;
      var y = Math.max(0, 1.5 * Math.exp(-((x - 0.2 - z * 0.45) * (x - 0.2 - z * 0.45)) / 3.6) + 0.14 * Math.sin(x * 2.2 + z));
      return { p: [x, y * (0.93 + r() * 0.07), z], c: mix(RUST, GOLD, Math.min(1, y / 1.3)) };
    },
    tower: function (r) {
      /* One timeline: foundation, ZS, PepsiCo, Masters' Union, stronger foundation, future floors. */
      var k = r(), o, f, c, d, tone;
      var foot = function () { return nextDot(r() < 0.34 ? 'footEdge' : 'foot'); };
      if (k < 0.05) return { p: [(r() - 0.5) * 12, -2, 0], c: mix(RUST, GOLD, r()), d: r() * 13 };
      if (k < 0.08) { o = nextDot('soil'); return { p: [o[0], o[1], 0], c: dim(mix(RUST, AMBER, r()), 0.3 * o[2]), d: o[1] / GROUND * 2.4 }; }
      if (k < 0.3) { o = foot(); return { p: [o[0], o[1], 0], c: dim(mix(AMBER, GOLD, r()), (o[3] ? 1.45 : 1) * o[2]), d: o[1] / GROUND * 2.4 }; }
      if (k < 0.46) { o = foot(); return { p: [o[0], o[1], 0], c: dim(mix(GOLD, PALE, r()), (o[3] ? 1.5 : 1.15) * o[2]), d: 8.6 + r() * 1.6 }; }
      if (k < 0.49) { o = nextDot('ground'); return { p: [o[0], o[1], 0], c: PALE, d: 2.8 + r() * 0.3 }; }
      o = nextDot(r() < 0.36 ? 'towerEdge' : 'tower'); f = (o[1] - GROUND) / FLOOR; tone = o[2] * (o[3] ? 1.35 : 0.95);
      if (f <= 25) { c = mix(AMBER, GOLD, r()); d = 3.4 + f / 25 * 1.8; }
      else if (f <= 40) { c = mix(GOLD, PALE, r() * 0.6); d = 5.6 + (f - 25) / 15 * 1.6; }
      else if (f <= 45) { c = PALE; d = 7.6 + (f - 40) / 5 * 0.7; }
      else { c = mix(GOLD, PALE, r()); tone = o[2] * (o[3] ? 0.6 : 0.42); d = 10.6 + (f - 45) / 200 * 4; }
      return { p: [o[0], o[1], 0], c: dim(c, tone), d: d };
    }
  };
  /* Flat forms use screen-shaped coordinates. Rest is how much light streak stays once settled. */
  var REST = { landing: 0, tower: 0, timeline: 0 }, flatVP = [2.8, 0, 0, 0, 0, 2.8, 0, 0, 0, 0, 0, 0, 0, -14, 0, 14];

  var LABELS = {
    heaps: [[-2.65, 2.2, 0, 'ZS'], [0.05, 1.65, 0, 'PepsiCo'], [2.6, 1.25, 0, 'RecoveryCo']],
    shift: [[-1.2, 0.5, 0, '87% stays'], [2.95, 1.75, -0.3, '13% moved']],
    surface: [[-0.9, 2.5, 0, '180 SKUs']],
    rto: [[-2, 3.55, 0, 'Before 40%'], [0, 2.75, 0, 'Industry ~30%'], [2, 1.95, 0, 'After 20%']],
    hub: [[0, 1.7, 0, '42 couriers, one account']],
    decks: [[0, 1.4, 0, '40 geographies, one deck each']],
    one: [[0, 4.4, 0, '1 of 470']],
    strata: [[-2.3, 0.45, 1.65, 'School'], [-2.3, 1.42, 1.65, 'NIT Rourkela'], [-2.3, 2.5, 1.65, 'Masters’ Union']]
  };

  var VS = '#version 300 es\nprecision highp float;' +
    'in float aEnd,aD;in vec3 aA,aB,aCA,aCB;in vec4 aR;' +
    'uniform mat4 uVP;uniform vec2 uShift;uniform float uT,uClock,uPx,uLine,uLight,uRest,uTint,uMin;out vec4 vC;' +
    'void main(){' +
    'float ld=.55+aR.y*.55,st=ld*.8+aR.x*1.25+aD,fd=.85+aR.z*.45;' +
    'float l=clamp(uT/ld,0.,1.),a=clamp((uT-st)/fd,0.,1.),H=6.5+aR.w*5.+(aB.y<-.5?14.:0.);' +
    'vec3 p,c;float al;' +
    'if(a<=0.){p=aA;p.y-=7.*l*l;al=1.-l;c=aCA;}' +
    'else{p=aB;p.y+=H*(1.-a*a);p.xz+=(aR.yz-.5)*.14*(1.-a);al=smoothstep(0.,.16,a);c=aCB;' +
    'if(a>=1.)p.y+=sin(uClock*.9+aR.x*6.283)*.006;}' +
    'if(uLine>.5){float s=0.;' +
    'if(a<=0.){p+=vec3(0.,aEnd*(.5+1.6*aR.w)*l,0.);s=.14;}' +
    'else if(a<1.){p.y+=aEnd*(1.1+3.4*aR.w)*(1.-a*.5);s=.34;}' +
    'else{float e=exp(-max(uT-st-fd,0.)*.85);' +
    'if(aR.y<.34){p.y+=aEnd*(4.+7.*aR.w)*(.55+.45*e);s=.042*uRest+.16*e;}' +
    'else if(aR.x<.42){float g=aEnd*(2.+7.*aR.z)*(aR.w<.5?-1.:1.);if(aR.z<.5)p.x+=g;else p.z+=g*.8;s=.03*uRest+.1*e;}' +
    'else s=0.;}' +
    'al*=s*(1.-aEnd*.96);if(uLight>.5)al*=.38;}' +
    'gl_Position=uVP*vec4(p,1.);gl_Position.xy+=uShift*gl_Position.w;' +
    'gl_PointSize=clamp(uPx*(.75+aR.y*.8)/gl_Position.w,uMin,3.6);' +
    'c*=uTint;' +
    'vC=vec4(c,al);}';
  var FS = '#version 300 es\nprecision highp float;in vec4 vC;uniform float uLine,uLight,uBright;out vec4 o;' +
    'void main(){float k=1.;if(uLine<.5){vec2 d=gl_PointCoord-.5;k=1.-smoothstep(.22,.5,length(d));}' +
    'o=vec4(vC.rgb,vC.a*k*(uLine>.5?1.:(uLight>.5?.82:uBright)));}';

  var gl, prog, U = {}, buf = {}, vao, n = 0, nLines = 0, cache = {};
  var A, B, CA, CB, R, D, form = '', hook = null;
  var tStart = 0, canvas, light = true, reduce = false, raf = 0, shift = [0, 0], labelsEl, activeLabels = [], labelNodes = [];
  var quality = 1, dprCap = 1.75, lastFrame = 0, frameSum = 0, frameN = 0, goodRuns = 0, holdUntil = 0;
  var mouse = [0, 0], mouseS = [0, 0], vp = new Float32Array(16), dist = 12.5, flatMix = 0, flatGoal = 0, rest = 1, lastClock = 0;

  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function attr(name, size, data, divisor) {
    var b = gl.createBuffer(), loc = gl.getAttribLocation(prog, name);
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(loc, divisor);
    buf[name] = b;
  }
  function build(name) {
    if (cache[name]) return cache[name];
    var r = rng(name.length * 7919 + name.charCodeAt(0) * 31), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), del = new Float32Array(n);
    var f = FORMS[name], i, s;
    for (i = 0; i < n; i++) {
      s = f(r);
      pos[i * 3] = s.p[0]; pos[i * 3 + 1] = s.p[1]; pos[i * 3 + 2] = s.p[2];
      var v = 0.72 + r() * 0.42;
      col[i * 3] = s.c[0] * v; col[i * 3 + 1] = s.c[1] * v; col[i * 3 + 2] = s.c[2] * v;
      /* Staged forms start each grain at its own time instead of the shared random start. */
      if (s.d !== undefined) del[i] = s.d + 0.5 + R[i * 4 + 3] * 0.35 - ((0.55 + R[i * 4 + 1] * 0.55) * 0.8 + R[i * 4] * 1.25);
    }
    return (cache[name] = { pos: pos, col: col, del: del });
  }
  /* Where every grain is right now, so a page change can interrupt a fall cleanly. */
  function snapshot(T) {
    for (var i = 0; i < n; i++) {
      var j = i * 3, q = i * 4, ld = .55 + R[q + 1] * .55, st = ld * .8 + R[q] * 1.25 + D[i], fd = .85 + R[q + 2] * .45;
      var l = Math.min(1, Math.max(0, T / ld)), a = Math.min(1, Math.max(0, (T - st) / fd));
      if (a <= 0) { A[j + 1] -= 7 * l * l; }
      else {
        A[j] = B[j]; A[j + 1] = B[j + 1] + (6.5 + R[q + 3] * 5 + (B[j + 1] < -0.5 ? 14 : 0)) * (1 - a * a); A[j + 2] = B[j + 2];
        CA[j] = CB[j]; CA[j + 1] = CB[j + 1]; CA[j + 2] = CB[j + 2];
      }
    }
  }
  function upload(name, data) { gl.bindBuffer(gl.ARRAY_BUFFER, buf[name]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, data); }

  function persp(fov, asp, nr, fr) {
    var f = 1 / Math.tan(fov / 2), d = nr - fr;
    return [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + nr) / d, -1, 0, 0, 2 * fr * nr / d, 0];
  }
  function lookAt(e, t) {
    var z = norm([e[0] - t[0], e[1] - t[1], e[2] - t[2]]), x = norm([z[2], 0, -z[0]]);
    var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -dot(x, e), -dot(y, e), -dot(z, e), 1];
  }
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function mul(a, b) {
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
      vp[i * 4 + j] = b[i * 4] * a[j] + b[i * 4 + 1] * a[j + 4] + b[i * 4 + 2] * a[j + 8] + b[i * 4 + 3] * a[j + 12];
    }
  }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap), w = canvas.clientWidth, h = canvas.clientHeight;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H); }
    var asp = w / Math.max(h, 1);
    dist = (asp > 1.1 ? 15.2 : 13.2) * Math.max(1, 1.2 / asp);
    if (light) shift = [0, -0.4];
    else if (w < 860) shift = [0, 0.52];
    else shift = [0.47, -0.06];
    return asp;
  }
  /* Keep motion smooth on slow machines: lower sharpness first, then grains, and recover when frames improve.
     Hidden or throttled tabs are ignored, and the shapes always keep enough grains to stay readable. */
  function minQuality() {
    var need = form === 'tower' ? 22000 : /^usa/.test(form) ? 30000 : form === 'landing' || form === 'timeline' ? 18000 : 9000;
    return Math.min(1, need / n);
  }
  function adapt(now) {
    var dt = now - lastFrame; lastFrame = now;
    if (document.hidden || dt > 120) { frameSum = 0; frameN = 0; return; }
    frameSum += dt; frameN++;
    if (frameN < 36) return;
    var avg = frameSum / frameN; frameSum = 0; frameN = 0;
    if (avg > 26) {
      if (dprCap > 1) dprCap = Math.max(1, dprCap * 0.82);
      else quality = Math.max(0.16, quality * 0.75);
      goodRuns = 0; holdUntil = now + 10000;
    } else if (avg < 18.5 && now > holdUntil && ++goodRuns >= 4) {
      goodRuns = 0;
      if (quality < 1) quality = Math.min(1, quality * 1.2);
      else dprCap = Math.min(1.75, dprCap * 1.12);
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    adapt(now);
    var clock = now / 1000, asp = resize();
    var T = reduce ? 99 : clock - tStart;
    mouseS[0] += (mouse[0] - mouseS[0]) * 0.04; mouseS[1] += (mouse[1] - mouseS[1]) * 0.04;
    var yaw = -0.42 + (reduce ? 0 : Math.sin(clock * 0.07) * 0.12) + mouseS[0] * 0.14;
    var pitch = 0.27 + mouseS[1] * 0.05;
    var eye = [Math.sin(yaw) * Math.cos(pitch) * dist, 1.2 + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist];
    mul(persp(0.62, asp, 0.1, 80), lookAt(eye, [0, 1.15, 0]));
    /* Ease between the 3D camera and the flat view used by the name and staircase. */
    var ease = 1 - Math.exp(-Math.min(0.25, Math.max(0, clock - lastClock)) * 5.7); lastClock = clock;
    flatMix = reduce ? flatGoal : flatMix + (flatGoal - flatMix) * ease;
    if (Math.abs(flatGoal - flatMix) < 0.002) flatMix = flatGoal;
    /* The tower keeps true proportions, starts close, then pulls back as it grows. */
    var goalX = 2.8, goalY = 2.8, goalO = -14, cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (form === 'tower') {
      var narrow = cw < 700, zEnd = narrow ? 0.82 : 1, lift = narrow ? 1.45 : 0;
      var z0 = narrow ? zEnd * 1.22 : Math.max(1.3, Math.min(1.7, (cw / 2 - 205) / (2.1 * ch / 10)));
      var zk = Math.min(1, Math.max(0, (T - 10.9) / 4.5)), zoom = z0 + (zEnd - z0) * zk * zk * (3 - 2 * zk);
      goalX = 2.8 * zoom / asp; goalY = 2.8 * zoom; goalO = 2.8 * lift - 14;
    }
    flatVP[0] = reduce ? goalX : flatVP[0] + (goalX - flatVP[0]) * ease;
    flatVP[5] = reduce ? goalY : flatVP[5] + (goalY - flatVP[5]) * ease;
    flatVP[13] = reduce ? goalO : flatVP[13] + (goalO - flatVP[13]) * ease;
    for (var m = 0; m < 16; m++) vp[m] += (flatVP[m] - vp[m]) * flatMix;
    if (form === 'tower' && hook) hook(T, flatVP[5] / 2.8 * ch / 10, (flatVP[13] + 14) / 2.8 * ch / 10);

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if (light) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    gl.uniformMatrix4fv(U.uVP, false, vp); gl.uniform2f(U.uShift, shift[0] * (1 - flatMix), shift[1] * (1 - flatMix));
    var crisp = form === 'tower' || form === 'timeline' || /^usa/.test(form);
    gl.uniform1f(U.uMin, crisp ? Math.max(1.35, canvas.height / canvas.clientHeight) : 1); gl.uniform1f(U.uBright, crisp ? 0.98 : 0.62);
    gl.uniform1f(U.uRest, rest); gl.uniform1f(U.uTint, form === 'landing' || !light ? 1 : 0.58);
    gl.uniform1f(U.uT, T); gl.uniform1f(U.uClock, clock); gl.uniform1f(U.uLight, light ? 1 : 0);
    gl.uniform1f(U.uPx, canvas.height / 330);
    gl.uniform1f(U.uLine, 1); gl.drawArraysInstanced(gl.LINES, 0, 2, Math.floor(nLines * quality * (light ? 0.3 : 1)));
    gl.uniform1f(U.uLine, 0); gl.drawArraysInstanced(gl.POINTS, 0, 1, Math.floor(n * Math.max(quality, minQuality())));

    var show = T > 2.1, W = canvas.clientWidth, H = canvas.clientHeight;
    for (var i = 0; i < labelNodes.length; i++) {
      var L = activeLabels[i], x = L[0], y = L[1], z = L[2];
      var cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      var cx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw + shift[0];
      var cy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw + shift[1];
      labelNodes[i].style.transform = 'translate(-50%,-100%) translate(' + ((cx + 1) * W / 2).toFixed(1) + 'px,' + ((1 - cy) * H / 2).toFixed(1) + 'px)';
      labelNodes[i].classList.toggle('on', show);
    }
  }

  /* Sample every landing item (words, photo, button) so grains land on its real shape and colour. */
  function writeLanding(el) {
    if (!gl) return false;
    var box = canvas.getBoundingClientRect(), W = Math.ceil(box.width), H = Math.ceil(box.height);
    if (!W || !H) return false;
    var make = function () { var o = document.createElement('canvas'); o.width = W; o.height = H; return o.getContext('2d', { willReadFrequently: true }); };
    var type = make(), solid = make(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node;
    el.querySelectorAll('img').forEach(function (im) {
      var b = im.getBoundingClientRect();
      if (!im.complete || !im.naturalWidth || !b.width) return;
      var s = Math.max(b.width / im.naturalWidth, b.height / im.naturalHeight), sw = b.width / s, sh = b.height / s;
      solid.drawImage(im, (im.naturalWidth - sw) * 0.5, (im.naturalHeight - sh) * 0.16, sw, sh, b.left - box.left, b.top - box.top, b.width, b.height);
    });
    el.querySelectorAll('button').forEach(function (bt) {
      var bg = getComputedStyle(bt).backgroundColor, b = bt.getBoundingClientRect();
      if (bg.indexOf('20, 17, 12') > -1) { solid.fillStyle = bg; solid.fillRect(b.left - box.left, b.top - box.top, b.width, b.height); }
    });
    type.textBaseline = 'alphabetic';
    while ((node = walker.nextNode())) {
      var st = getComputedStyle(node.parentElement), raw = node.textContent, re = /\S+/g, word;
      type.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      if ('letterSpacing' in type) type.letterSpacing = st.letterSpacing === 'normal' ? '0px' : st.letterSpacing;
      type.fillStyle = st.color;
      while ((word = re.exec(raw))) {
        var range = document.createRange();
        range.setStart(node, word.index); range.setEnd(node, word.index + word[0].length);
        var rect = range.getBoundingClientRect();
        if (!rect.width) continue;
        var text = st.textTransform === 'uppercase' ? word[0].toUpperCase() : word[0];
        type.fillText(text, rect.left - box.left, rect.top - box.top + type.measureText(text).fontBoundingBoxAscent);
      }
    }
    var td = type.getImageData(0, 0, W, H).data, sd = solid.getImageData(0, 0, W, H).data, ink = [], fill = [], x, y, p;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      p = (y * W + x) * 4;
      if (td[p + 3] > 110) ink.push(p); else if (sd[p + 3] > 110) fill.push(p);
    }
    if (!ink.length) return false;
    var r = rng(9173), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var j = i * 3, k = r(), v = 0.88 + r() * 0.2, list = k < 0.42 || !fill.length ? ink : fill, data = list === ink ? td : sd;
      if (k < 0.76) {
        var at = list[Math.floor(r() * list.length)], px = at / 4 % W, py = Math.floor(at / 4 / W);
        pos[j] = ((px + r()) / W - 0.5) * 10; pos[j + 1] = (1 - (py + r()) / H) * 10;
        col[j] = data[at] / 255 * v; col[j + 1] = data[at + 1] / 255 * v; col[j + 2] = data[at + 2] / 255 * v;
      } else {
        var c = dim(mix(RUST, GOLD, r()), 0.7);
        pos[j] = (r() - 0.5) * 10; pos[j + 1] = -2; col[j] = c[0]; col[j + 1] = c[1]; col[j + 2] = c[2];
      }
    }
    cache.landing = { pos: pos, col: col, del: new Float32Array(n) };
    return true;
  }

  /* A form drawn by the page: thin lines on one layer, logos on the other, sampled into grains. */
  function writeForm(name, draw) {
    if (!gl) return false;
    var box = canvas.getBoundingClientRect(), W = Math.ceil(box.width), H = Math.ceil(box.height);
    if (!W || !H) return false;
    var make = function () { var o = document.createElement('canvas'); o.width = W; o.height = H; return o.getContext('2d', { willReadFrequently: true }); };
    var lineC = make(), markC = make();
    draw(lineC, markC, box);
    var ld = lineC.getImageData(0, 0, W, H).data, md = markC.getImageData(0, 0, W, H).data, lines = [], marks = [], q;
    for (q = 3; q < ld.length; q += 4) { if (ld[q] > 60) lines.push(q - 3); if (md[q] > 120) marks.push(q - 3); }
    if (!lines.length) return false;
    var r = rng(6203), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var j = i * 3, k = r();
      if (k < 0.22) {
        var c = dim(mix(RUST, GOLD, r()), 0.7);
        pos[j] = (r() - 0.5) * 10; pos[j + 1] = -2; col[j] = c[0]; col[j + 1] = c[1]; col[j + 2] = c[2];
        continue;
      }
      var useMark = marks.length && k > 0.56, list = useMark ? marks : lines, data = useMark ? md : ld;
      var at = list[Math.floor(r() * list.length)], px = at / 4 % W, py = Math.floor(at / 4 / W), v = useMark ? 0.84 : 0.72;
      pos[j] = ((px + r()) / W - 0.5) * 10; pos[j + 1] = (1 - (py + r()) / H) * 10;
      col[j] = data[at] / 255 * v; col[j + 1] = data[at + 1] / 255 * v; col[j + 2] = data[at + 2] / 255 * v;
    }
    REST[name] = 0;
    cache[name] = { pos: pos, col: col, del: new Float32Array(n) };
    return true;
  }

  /* Timeline: one descending line in four stages. Each stage also rains onto its logo. */
  function writeTimeline(g) {
    if (!gl) return false;
    var box = canvas.getBoundingClientRect(), W = Math.ceil(box.width), H = Math.ceil(box.height);
    if (!W || !H) return false;
    var r = rng(7321), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), del = new Float32Array(n).fill(1e4);
    var stage = new Int8Array(n), prog = new Float32Array(n), marks = [], i;
    var lineV = function (u) { return g.v0 + (g.v1 - g.v0) * (u - g.a) / (g.b - g.a); };
    (g.logos || []).forEach(function (im, s) {
      if (!im || !im.complete || !im.naturalWidth) return;
      var b = im.getBoundingClientRect(), k = Math.min(b.width / im.naturalWidth, b.height / im.naturalHeight);
      var w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      var o = document.createElement('canvas'); o.width = w; o.height = h;
      var c = o.getContext('2d', { willReadFrequently: true }); c.drawImage(im, 0, 0, w, h);
      var d = c.getImageData(0, 0, w, h).data, list = [];
      for (var p = 0; p < d.length; p += 4) if (d[p + 3] > 120) list.push(p);
      if (list.length) marks[s] = { d: d, list: list, w: w, x: b.left - box.left + (b.width - w) / 2, y: b.top - box.top + (b.height - h) / 2 };
    });
    for (i = 0; i < n; i++) {
      var j = i * 3, k = r(), s, u, v, c;
      if (k < 0.34) {
        /* Passes through, so every step of the timeline arrives with a shower. */
        s = Math.floor(r() * 4); c = dim(mix(RUST, GOLD, r()), 0.7);
        pos[j] = (r() - 0.5) * 10; pos[j + 1] = -2; prog[i] = r();
      } else if (k < 0.72 || (k >= 0.8 && !marks.length)) {
        u = g.a + r() * (g.b - g.a); s = 0;
        while (s < 3 && u > (g.nodes[s] + g.nodes[s + 1]) / 2) s++;
        var from = s ? (g.nodes[s - 1] + g.nodes[s]) / 2 : g.a, till = s < 3 ? (g.nodes[s] + g.nodes[s + 1]) / 2 : g.b;
        var spread = r() < 0.86 ? 0.9 : 3.4;
        v = lineV(u) + (r() + r() + r() - 1.5) * spread / H;
        pos[j] = (u - 0.5) * 10; pos[j + 1] = (1 - v) * 10; prog[i] = (u - from) / (till - from);
        c = dim(mix(AMBER, GOLD, r()), 0.62);
      } else if (k < 0.8) {
        s = Math.floor(r() * 4); var a = r() * TAU, q = Math.sqrt(r()) * 11;
        u = g.nodes[s]; v = lineV(u);
        pos[j] = (u + Math.cos(a) * q / W - 0.5) * 10; pos[j + 1] = (1 - v - Math.sin(a) * q / H) * 10; prog[i] = 0.6 + r() * 0.4;
        c = dim(mix(GOLD, PALE, r()), 0.8);
      } else {
        s = Math.floor(r() * 4);
        while (!marks[s]) s = (s + 1) % 4;
        var m = marks[s], at = m.list[Math.floor(r() * m.list.length)], px = at / 4 % m.w, py = Math.floor(at / 4 / m.w);
        pos[j] = ((m.x + px + r()) / W - 0.5) * 10; pos[j + 1] = (1 - (m.y + py + r()) / H) * 10; prog[i] = 0.4 + r() * 0.6;
        c = [m.d[at] / 255 * 0.72, m.d[at + 1] / 255 * 0.72, m.d[at + 2] / 255 * 0.72];
      }
      stage[i] = s; col[j] = c[0]; col[j + 1] = c[1]; col[j + 2] = c[2];
    }
    cache.timeline = { pos: pos, col: col, del: del, stage: stage, prog: prog };
    return true;
  }
  /* Lets stages up to k land. Stages after k leave again when the reader scrolls back. */
  function reveal(k) {
    var f = cache.timeline;
    if (form !== 'timeline' || !f || k === shown) return;
    var T = performance.now() / 1000 - tStart;
    for (var i = 0; i < n; i++) {
      var s = f.stage[i], q = i * 4;
      if (s > k) D[i] = 1e4;
      else if (s > shown) D[i] = reduce ? -5 : T + f.prog[i] * 0.85 + R[q + 3] * 0.45 - ((0.55 + R[q + 1] * 0.55) * 0.8 + R[q] * 1.25);
    }
    shown = k; upload('aD', D);
  }

  function to(name, instant) {
    if (!gl) return;
    if (name === 'tower' && !dots) { towerWaiting = true; return; }
    towerWaiting = false;
    var now = performance.now() / 1000, T = now - tStart, f = build(name);
    snapshot(T);
    B.set(f.pos); CB.set(f.col); D.set(f.del); shown = -1;
    upload('aA', A); upload('aCA', CA); upload('aB', B); upload('aCB', CB); upload('aD', D);
    tStart = instant ? now - 30 : now;
    form = name;
    flatGoal = name in REST ? 1 : 0;
    rest = name in REST ? REST[name] : 1;
    labelsEl.textContent = ''; labelNodes = [];
    activeLabels = LABELS[name] || [];
    activeLabels.forEach(function (l) {
      var s = document.createElement('span'); s.textContent = l[3]; labelsEl.appendChild(s); labelNodes.push(s);
    });
  }

  function init(c, labelHost) {
    canvas = c; labelsEl = labelHost;
    reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    gl = c.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'high-performance' });
    if (!gl) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    ['uVP', 'uShift', 'uT', 'uClock', 'uPx', 'uLine', 'uLight', 'uRest', 'uTint', 'uMin', 'uBright'].forEach(function (u) { U[u] = gl.getUniformLocation(prog, u); });
    var small = Math.min(innerWidth, innerHeight) < 620;
    n = small ? 24000 : 62000; nLines = small ? 3200 : 9500;
    A = new Float32Array(n * 3); B = new Float32Array(n * 3); CA = new Float32Array(n * 3); CB = new Float32Array(n * 3); R = new Float32Array(n * 4); D = new Float32Array(n);
    var r = rng(4242), i;
    for (i = 0; i < n * 4; i++) R[i] = r();
    for (i = 0; i < n; i++) A[i * 3 + 1] = -20;
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    attr('aEnd', 1, new Float32Array([0, 1]), 0);
    attr('aA', 3, A, 1); attr('aB', 3, B, 1); attr('aCA', 3, CA, 1); attr('aCB', 3, CB, 1); attr('aR', 4, R, 1); attr('aD', 1, D, 1);
    tStart = performance.now() / 1000 - 9;
    addEventListener('pointermove', function (e) { mouse = [e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5]; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame);
    });
    fetch('assets/tower-points.bin').then(function (x) { if (!x.ok) throw new Error('tower'); return x.arrayBuffer(); }).then(function (b) {
      dots = prepareDots(new Uint16Array(b));
      if (towerWaiting) to('tower');
    }).catch(function () {});
    raf = requestAnimationFrame(frame);
    return true;
  }

  window.Sand = { init: init, to: to, writeLanding: writeLanding, writeTimeline: writeTimeline, writeForm: writeForm, reveal: reveal, onTower: function (fn) { hook = fn; }, setLight: function (v) { light = v; }, stats: function () { return { quality: quality, dpr: dprCap, grains: Math.floor(n * Math.max(quality, minQuality())) }; } };
})();
