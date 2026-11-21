/* Sand engine: grains and light streaks fall and settle into a form for each page. */
(function () {
  var TAU = Math.PI * 2;
  var AMBER = [0.86, 0.52, 0.18], GOLD = [0.96, 0.76, 0.46], RUST = [0.58, 0.27, 0.1],
      STEEL = [0.4, 0.62, 0.74], PALE = [0.93, 0.89, 0.8];
  var STEPS = 6, STAIR_X = 0.05, STAIR_W = 0.15, STAIR_V = 0.76, STAIR_RISE = 0.1;

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
    stairs: function (r) {
      /* A flat six-step staircase. Positions match the .step elements in the page. */
      var i = Math.floor(r() * STEPS), x = STAIR_X + STAIR_W * i, v = STAIR_V - STAIR_RISE * i, k = r(), u, y, c;
      if (k < 0.1) return { p: [(r() - 0.5) * 10, -2, 0], c: mix(RUST, GOLD, r()) };
      if (k < 0.6) {
        u = x + r() * STAIR_W; y = v + r() * r() * 0.007; c = mix(AMBER, GOLD, r());
      } else if (k < 0.74) {
        u = x + r() * 0.0025; y = v + r() * (i ? STAIR_RISE : 0.97 - v); c = mix(RUST, AMBER, r());
      } else {
        u = x + r() * STAIR_W; y = v + Math.pow(r(), 1.5) * (0.97 - v);
        c = mix(RUST, AMBER, r() * 0.5); c = [c[0] * 0.42, c[1] * 0.42, c[2] * 0.42];
      }
      return { p: [(u - 0.5) * 10, (1 - y) * 10, 0], c: c };
    }
  };
  /* Flat forms use screen-shaped coordinates. Rest is how much light streak stays once settled. */
  var REST = { name: 0, stairs: 0.35 }, FLAT_VP = [2.8, 0, 0, 0, 0, 2.8, 0, 0, 0, 0, 0, 0, 0, -14, 0, 14];

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
    'in float aEnd;in vec3 aA,aB,aCA,aCB;in vec4 aR;' +
    'uniform mat4 uVP;uniform vec2 uShift;uniform float uT,uClock,uPx,uLine,uLight,uRest;out vec4 vC;' +
    'void main(){' +
    'float ld=.55+aR.y*.55,st=ld*.8+aR.x*1.25,fd=.85+aR.z*.45;' +
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
    'gl_PointSize=clamp(uPx*(.75+aR.y*.8)/gl_Position.w,1.,3.6);' +
    'if(uLight>.5)c=c*.58;' +
    'vC=vec4(c,al);}';
  var FS = '#version 300 es\nprecision highp float;in vec4 vC;uniform float uLine,uLight;out vec4 o;' +
    'void main(){float k=1.;if(uLine<.5){vec2 d=gl_PointCoord-.5;k=1.-smoothstep(.22,.5,length(d));}' +
    'o=vec4(vC.rgb,vC.a*k*(uLine>.5?1.:(uLight>.5?.82:.62)));}';

  var gl, prog, U = {}, buf = {}, vao, n = 0, nLines = 0, cache = {};
  var A, B, CA, CB, R;
  var tStart = 0, canvas, light = true, reduce = false, raf = 0, shift = [0, 0], labelsEl, activeLabels = [], labelNodes = [];
  var quality = 1, dprCap = 1.75, lastFrame = 0, frameSum = 0, frameN = 0;
  var mouse = [0, 0], mouseS = [0, 0], vp = new Float32Array(16), dist = 12.5, flatMix = 0, flatGoal = 0, rest = 1;

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
    var r = rng(name.length * 7919 + name.charCodeAt(0) * 31), pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    var f = FORMS[name], i, s;
    for (i = 0; i < n; i++) {
      s = f(r);
      pos[i * 3] = s.p[0]; pos[i * 3 + 1] = s.p[1]; pos[i * 3 + 2] = s.p[2];
      var v = 0.72 + r() * 0.42;
      col[i * 3] = s.c[0] * v; col[i * 3 + 1] = s.c[1] * v; col[i * 3 + 2] = s.c[2] * v;
    }
    return (cache[name] = { pos: pos, col: col });
  }
  /* Where every grain is right now, so a page change can interrupt a fall cleanly. */
  function snapshot(T) {
    for (var i = 0; i < n; i++) {
      var j = i * 3, q = i * 4, ld = .55 + R[q + 1] * .55, st = ld * .8 + R[q] * 1.25, fd = .85 + R[q + 2] * .45;
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
  /* Draw fewer grains on slower machines so the page stays smooth. */
  function adapt(now) {
    var dt = now - lastFrame; lastFrame = now;
    if (dt > 250) return;
    frameSum += dt; frameN++;
    if (frameN < 36) return;
    var avg = frameSum / frameN; frameSum = 0; frameN = 0;
    if (avg > 26 && quality > 0.16) { quality = Math.max(0.16, quality * 0.68); dprCap = Math.max(1, dprCap * 0.82); }
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
    flatMix = reduce ? flatGoal : flatMix + (flatGoal - flatMix) * 0.09;
    if (Math.abs(flatGoal - flatMix) < 0.002) flatMix = flatGoal;
    for (var m = 0; m < 16; m++) vp[m] += (FLAT_VP[m] - vp[m]) * flatMix;

    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if (light) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    gl.uniformMatrix4fv(U.uVP, false, vp); gl.uniform2f(U.uShift, shift[0] * (1 - flatMix), shift[1] * (1 - flatMix));
    gl.uniform1f(U.uRest, rest);
    gl.uniform1f(U.uT, T); gl.uniform1f(U.uClock, clock); gl.uniform1f(U.uLight, light ? 1 : 0);
    gl.uniform1f(U.uPx, canvas.height / 330);
    gl.uniform1f(U.uLine, 1); gl.drawArraysInstanced(gl.LINES, 0, 2, Math.floor(nLines * quality * (light ? 0.3 : 1)));
    gl.uniform1f(U.uLine, 0); gl.drawArraysInstanced(gl.POINTS, 0, 1, Math.floor(n * quality));

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

  /* Sample the heading's real letter shapes so grains land exactly on the name. */
  function writeName(el) {
    if (!gl) return false;
    var box = canvas.getBoundingClientRect(), W = Math.ceil(box.width), H = Math.ceil(box.height);
    if (!W || !H) return false;
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var ctx = off.getContext('2d', { willReadFrequently: true }), tones = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), node;
    ctx.textBaseline = 'alphabetic';
    while ((node = walker.nextNode())) {
      var text = node.textContent.trim();
      if (!text) continue;
      var start = node.textContent.indexOf(text), range = document.createRange();
      range.setStart(node, start); range.setEnd(node, start + text.length);
      var rect = range.getBoundingClientRect(), st = getComputedStyle(node.parentElement);
      ctx.font = st.fontStyle + ' ' + st.fontWeight + ' ' + st.fontSize + ' ' + st.fontFamily;
      if ('letterSpacing' in ctx) ctx.letterSpacing = st.letterSpacing;
      var tone = st.color.match(/[\d.]+/g).slice(0, 3).map(function (v) { return Math.min(1, v / 255 / 0.58); });
      tones.push({ top: rect.top - box.top, bottom: rect.bottom - box.top, c: tone });
      ctx.fillStyle = '#000';
      ctx.fillText(text, rect.left - box.left, rect.top - box.top + ctx.measureText(text).fontBoundingBoxAscent);
    }
    var data = ctx.getImageData(0, 0, W, H).data, spots = [], x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 120) spots.push(x, y);
    if (!spots.length) return false;
    var r = rng(9173), pos = new Float32Array(n * 3), col = new Float32Array(n * 3), count = spots.length / 2;
    for (var i = 0; i < n; i++) {
      var j = i * 3, c, v = 0.78 + r() * 0.34;
      if (r() < 0.66) {
        var q = Math.floor(r() * count), px = spots[q * 2] + r(), py = spots[q * 2 + 1] + r();
        pos[j] = (px / W - 0.5) * 10; pos[j + 1] = (1 - py / H) * 10;
        c = tones[0].c;
        for (var t = 0; t < tones.length; t++) if (py >= tones[t].top && py <= tones[t].bottom) c = tones[t].c;
      } else {
        pos[j] = (r() - 0.5) * 10; pos[j + 1] = -2; c = mix(RUST, GOLD, r());
      }
      col[j] = c[0] * v; col[j + 1] = c[1] * v; col[j + 2] = c[2] * v;
    }
    cache.name = { pos: pos, col: col };
    return true;
  }

  function to(name, instant) {
    if (!gl) return;
    var now = performance.now() / 1000, T = now - tStart, f = build(name);
    snapshot(T);
    B.set(f.pos); CB.set(f.col);
    upload('aA', A); upload('aCA', CA); upload('aB', B); upload('aCB', CB);
    tStart = instant ? now - 9 : now;
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
    ['uVP', 'uShift', 'uT', 'uClock', 'uPx', 'uLine', 'uLight', 'uRest'].forEach(function (u) { U[u] = gl.getUniformLocation(prog, u); });
    var small = Math.min(innerWidth, innerHeight) < 620;
    n = small ? 24000 : 62000; nLines = small ? 3200 : 9500;
    A = new Float32Array(n * 3); B = new Float32Array(n * 3); CA = new Float32Array(n * 3); CB = new Float32Array(n * 3); R = new Float32Array(n * 4);
    var r = rng(4242), i;
    for (i = 0; i < n * 4; i++) R[i] = r();
    for (i = 0; i < n; i++) A[i * 3 + 1] = -20;
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    attr('aEnd', 1, new Float32Array([0, 1]), 0);
    attr('aA', 3, A, 1); attr('aB', 3, B, 1); attr('aCA', 3, CA, 1); attr('aCB', 3, CB, 1); attr('aR', 4, R, 1);
    tStart = performance.now() / 1000 - 9;
    addEventListener('pointermove', function (e) { mouse = [e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5]; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
    return true;
  }

  window.Sand = { init: init, to: to, writeName: writeName, setLight: function (v) { light = v; }, stats: function () { return { quality: quality, dpr: dprCap, grains: Math.floor(n * quality) }; } };
})();
