/* Hand-drawn scenes for the restaurant chapter. Each scene paints on a 960 x 640 canvas. */
(function () {
  var GOLD = '#F0C98A', CREAM = '#F4EEE3', AMBER = '#E08F3C', RED = '#C9472F', GREEN = '#7FB15C', DIM = '#A98F66', INK = '#0B0906';
  var SERIF = '"Instrument Serif", Georgia, serif', SANS = '"Geist", Arial, sans-serif', MONO = '"Geist Mono", monospace';

  function path(c, pts, col, w) {
    c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.strokeStyle = col; c.lineWidth = w || 2; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function box(c, x, y, w, h, col, lw, fill) {
    if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
    if (col) { c.strokeStyle = col; c.lineWidth = lw || 2; c.strokeRect(x, y, w, h); }
  }
  function text(c, s, x, y, font, col, align) {
    c.font = font; c.fillStyle = col; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic'; c.fillText(s, x, y);
  }
  function oval(c, x, y, rx, ry, col, lw, fill) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (col) { c.strokeStyle = col; c.lineWidth = lw || 2; c.stroke(); }
  }

  function plate(c, x, y, name, tones) {
    oval(c, x, y, 34, 11, CREAM, 2);
    for (var i = 0; i < 12; i++) {
      var a = i * 2.4, q = 3 + (i % 4) * 5;
      oval(c, x + Math.cos(a) * q * 1.3, y - 3 + Math.sin(a) * q * 0.34, 5, 3, null, 0, tones[i % tones.length]);
    }
    text(c, name, x, y + 30, '500 15px ' + SANS, CREAM, 'center');
  }
  function table(c, x) {
    [-1, 1].forEach(function (s) {
      var q = x + s * 58;
      path(c, [q - 15, 524, q + 15, 524], GOLD, 3);
      path(c, [q + s * 15, 524, q + s * 18, 480], GOLD, 3);
      path(c, [q - 12, 524, q - 15, 564], DIM, 2);
      path(c, [q + 12, 524, q + 15, 564], DIM, 2);
    });
    oval(c, x, 502, 42, 9, GOLD, 2.5, 'rgba(240,201,138,.28)');
    path(c, [x, 511, x, 560], GOLD, 3);
    path(c, [x - 18, 564, x + 18, 564], GOLD, 3);
  }
  function spit(c, x, spin) {
    path(c, [x, 256, x, 396], CREAM, 2);
    c.save(); c.beginPath(); c.moveTo(x - 34, 274); c.lineTo(x + 34, 274); c.lineTo(x + 18, 382); c.lineTo(x - 18, 382); c.closePath();
    c.fillStyle = '#A9572A'; c.fill(); c.clip();
    for (var i = -3; i < 12; i++) {
      var o = ((spin * 26) % 15) + i * 15 - 34;
      path(c, [x + o, 268, x + o + 20, 392], i % 2 ? AMBER : '#6F3518', 5);
    }
    c.restore();
  }
  function kebab(c, x, spin) {
    path(c, [x, 256, x, 396], CREAM, 2);
    for (var i = 0; i < 6; i++) {
      var y = 276 + i * 19, w = 20 + 5 * Math.sin(spin * 3 + i * 1.4);
      c.beginPath(); c.ellipse(x, y, w, 8, 0, 0, Math.PI * 2);
      c.fillStyle = i % 3 === 1 ? RED : i % 3 === 2 ? GREEN : '#9E5026'; c.fill();
    }
  }

  function shop(c, spin, door) {
    spin = spin || 0; door = door || 0;
    path(c, [20, 584, 940, 584], GOLD, 2.5);
    path(c, [20, 616, 170, 616], DIM, 3); path(c, [300, 616, 450, 616], DIM, 3); path(c, [580, 616, 730, 616], DIM, 3);
    path(c, [40, 476, 920, 476], DIM, 1.6);
    box(c, 80, 120, 700, 356, GOLD, 3);
    path(c, [66, 120, 794, 120], GOLD, 5);
    c.strokeStyle = GOLD; c.lineWidth = 2; c.strokeRect(222, 136, 416, 68);
    text(c, 'Shawarma Palace', 430, 186, '400 50px ' + SERIF, AMBER, 'center');

    [[100, 264], [496, 264]].forEach(function (a) {
      for (var i = 0; i < 11; i++) {
        var w = a[1] / 11, x = a[0] + i * w;
        c.beginPath(); c.moveTo(x, 216); c.lineTo(x + w, 216); c.lineTo(x + w, 240); c.quadraticCurveTo(x + w / 2, 252, x, 240); c.closePath();
        c.fillStyle = i % 2 ? CREAM : RED; c.fill();
      }
    });
    box(c, 106, 250, 252, 172, GOLD, 2.5); box(c, 502, 250, 252, 172, GOLD, 2.5);
    plate(c, 172, 286, 'Chicken Biryani', ['#D69A35', '#EFC15B', '#B5642A', '#F5E3AE']);
    plate(c, 292, 286, 'Paneer Tikka', ['#E8C98E', '#C75B2A', '#F2DFB8', '#7FB15C']);
    plate(c, 172, 366, 'Butter Chicken', ['#CF6A2B', '#E58B3D', '#F1C27D']);
    plate(c, 292, 366, 'Chicken 65', ['#C93A25', '#E05A32', '#7A2B18']);
    spit(c, 570, spin); kebab(c, 678, spin);
    text(c, 'Shawarma', 570, 414, '500 15px ' + SANS, CREAM, 'center');
    text(c, 'Kebabs', 678, 414, '500 15px ' + SANS, CREAM, 'center');

    /* Door, hinged on its left edge so it can swing open. */
    box(c, 376, 246, 108, 230, GOLD, 3, door ? 'rgba(224,143,60,' + (0.32 * door) + ')' : null);
    c.save(); c.translate(380, 250); c.transform(1 - 0.74 * door, -0.1 * door, 0, 1, 0, 0);
    box(c, 0, 0, 100, 226, CREAM, 2.5, INK);
    box(c, 13, 14, 74, 118, GOLD, 1.6);
    box(c, 18, 58, 64, 28, null, 0, GREEN);
    text(c, 'OPEN', 50, 79, '700 19px ' + SANS, INK, 'center');
    path(c, [50, 44, 22, 58], CREAM, 1.2); path(c, [50, 44, 78, 58], CREAM, 1.2);
    oval(c, 86, 150, 5, 5, GOLD, 2);
    box(c, 13, 164, 74, 48, GOLD, 1.4);
    c.restore();

    [170, 302, 560, 692].forEach(function (x) { table(c, x); });

    /* Street light, standing in front of the right side of the restaurant. */
    c.fillStyle = 'rgba(240,201,138,.13)';
    c.beginPath(); c.moveTo(630, 72); c.lineTo(668, 72); c.lineTo(760, 476); c.lineTo(530, 476); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(768, 590); c.lineTo(768, 62); c.quadraticCurveTo(766, 36, 736, 38); c.lineTo(664, 46);
    c.strokeStyle = CREAM; c.lineWidth = 6; c.lineCap = 'round'; c.stroke();
    path(c, [758, 590, 778, 590], CREAM, 7);
    c.beginPath(); c.moveTo(620, 58); c.quadraticCurveTo(650, 30, 680, 46); c.lineTo(672, 62); c.closePath();
    c.fillStyle = GOLD; c.fill();
    oval(c, 648, 66, 22, 6, null, 0, '#FFF0C4');
  }

  var DINE = [['Chicken Biryani', 38, 239], ['Butter Chicken', 31, 279], ['Paneer Tikka', 24, 219], ['Chicken 65', 18, 209], ['Mutton Biryani', 15, 329]];
  var APP = [['Chicken Biryani', 14, 239], ['Chicken 65', 13, 209], ['Butter Chicken', 11, 279], ['Mutton Biryani', 10, 329], ['Paneer Tikka', 6, 219]];
  function rupees(v) { return '₹' + v.toLocaleString('en-IN'); }
  function bills(c, x, title, rows) {
    text(c, title, x, 96, '400 29px ' + SERIF, GOLD);
    text(c, 'THIS WEEK', x + 268, 94, '500 11px ' + MONO, DIM, 'right');
    path(c, [x, 110, x + 268, 110], DIM, 1.2);
    var orders = 0, total = 0;
    rows.forEach(function (r, i) {
      var y = 140 + i * 33, bill = r[1] * r[2];
      orders += r[1]; total += bill;
      text(c, r[0], x, y, '500 15px ' + SANS, CREAM);
      text(c, r[1] + ' × ₹' + r[2], x + 196, y, '400 13px ' + SANS, GOLD, 'right');
      text(c, rupees(bill), x + 268, y, '600 15px ' + SANS, CREAM, 'right');
    });
    path(c, [x, 306, x + 268, 306], GOLD, 1.6);
    text(c, orders + ' orders', x, 342, '400 24px ' + SERIF, CREAM);
    text(c, rupees(total), x + 268, 342, '400 30px ' + SERIF, AMBER, 'right');
  }
  function counter(c) {
    c.fillStyle = '#100D09'; c.fillRect(184, 52, 592, 338);
    c.strokeStyle = GOLD; c.lineWidth = 4; c.strokeRect(168, 36, 624, 370);
    box(c, 184, 52, 592, 338, DIM, 1.4);
    path(c, [480, 62, 480, 380], GOLD, 1.6);
    bills(c, 198, 'Dine-in', DINE);
    bills(c, 494, 'Talabat delivery', APP);
    c.fillStyle = GOLD; c.fillRect(452, 406, 56, 34); c.fillRect(396, 440, 168, 8);
    path(c, [34, 450, 926, 450], GOLD, 4);
    path(c, [60, 450, 60, 640], DIM, 2); path(c, [900, 450, 900, 640], DIM, 2);
    /* Till on the counter. */
    box(c, 822, 372, 86, 78, GOLD, 2.5); box(c, 834, 384, 62, 24, DIM, 1.4);
    for (var i = 0; i < 6; i++) oval(c, 842 + (i % 3) * 23, 420 + Math.floor(i / 3) * 13, 4, 3, CREAM, 1.3);
    /* Order slips on a spike. */
    path(c, [108, 450, 108, 382], CREAM, 2);
    [440, 428, 416].forEach(function (y, k) { box(c, 82 + k * 3, y, 52, 7, GOLD, 1.3); });

    /* The owner, seen from behind, one hand on their head. */
    c.beginPath(); c.moveTo(356, 640); c.quadraticCurveTo(372, 556, 448, 544); c.lineTo(512, 544); c.quadraticCurveTo(590, 556, 604, 640); c.closePath();
    c.fillStyle = '#17120C'; c.fill(); c.strokeStyle = CREAM; c.lineWidth = 3; c.stroke();
    oval(c, 480, 506, 39, 43, CREAM, 3, '#17120C');
    c.beginPath(); c.arc(480, 500, 39, Math.PI, 0); c.fillStyle = '#3B2B1B'; c.fill();
    c.beginPath(); c.moveTo(574, 590); c.quadraticCurveTo(596, 516, 526, 480);
    c.strokeStyle = CREAM; c.lineWidth = 15; c.lineCap = 'round'; c.stroke();
    c.strokeStyle = '#17120C'; c.lineWidth = 9; c.stroke();
    oval(c, 522, 476, 11, 9, CREAM, 2.5, '#17120C');
    text(c, 'Which price?', 268, 548, 'italic 400 31px ' + SERIF, AMBER, 'center');
    text(c, 'Which promo?', 708, 548, 'italic 400 31px ' + SERIF, AMBER, 'center');
    text(c, '?', 320, 502, '400 42px ' + SERIF, GOLD, 'center');
    text(c, '?', 650, 502, '400 42px ' + SERIF, GOLD, 'center');
  }

  window.Scenes = { W: 960, H: 640, shop: shop, counter: counter };
})();
