/* =========================================================
   Cosmic Ocean — animated background scene
   Sky: stars, nebula, shooting stars (moon and Saturn are drawn by app.js
   in a reserved spot in each page header, so they never sit under text)
   Sea: waves, moonlight, light rays, fish, manta ray, jellyfish,
        bubbles, seaweed, starfish and shells on the sand
   All shapes are drawn here as SVG/CSS (no images, works offline).
   ========================================================= */
(function () {
  'use strict';
  const root = document.getElementById('scene');
  if (!root) return;

  // Seeded random so the sky looks the same on every visit
  let seed = 20261026;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

  const stars = (n, maxY, alpha) => Array.from({length: n}, () =>
    `${(rnd() * 100).toFixed(2)}vw ${(rnd() * maxY).toFixed(2)}vh rgba(255,255,255,${(alpha + rnd() * (1 - alpha)).toFixed(2)})`).join(',');

  // Wave path repeated across 2 screen widths so it can slide forever
  const wave = (h, amp, period) => {
    let d = `M0 ${h}`;
    for (let x = 0; x < 2880; x += period) d += ` Q${x + period / 4} ${h - amp} ${x + period / 2} ${h} T${x + period} ${h}`;
    return d + ` V80 H0 Z`;
  };

  const fish = (cls, color) => `<svg class="fish ${cls}" viewBox="0 0 64 32" style="color:${color}">
      <path d="M14 16 C24 3 46 3 57 16 C46 29 24 29 14 16Z" fill="currentColor"/>
      <path d="M16 16 L2 5 Q6 16 2 27Z" fill="currentColor" opacity=".8"/>
      <path d="M32 7 Q38 1 44 6" fill="none" stroke="currentColor" stroke-width="2" opacity=".7"/>
      <path d="M40 9 Q36 16 40 23" fill="none" stroke="#05213a" stroke-width="1" opacity=".35"/>
      <circle cx="49" cy="13" r="2.2" fill="#05213a"/>
    </svg>`;

  const school = `<div class="school">${[[0, 0], [26, 14], [8, 26], [40, 4], [34, 30], [56, 18]]
    .map(([x, y]) => `<svg class="mini" style="left:${x}px;top:${y}px" viewBox="0 0 64 32"><path d="M14 16 C24 4 46 4 57 16 C46 28 24 28 14 16Z" fill="currentColor"/><path d="M16 16 L3 6 Q7 16 3 26Z" fill="currentColor"/><circle cx="49" cy="13" r="2.2" fill="#05213a"/></svg>`).join('')}</div>`;

  const jelly = cls => `<svg class="jelly ${cls}" viewBox="0 0 60 100">
      <path class="bell" d="M6 32 C6 12 18 4 30 4 C42 4 54 12 54 32 C48 35 42 33 37 36 C33 33 27 33 23 36 C18 33 12 35 6 32Z"/>
      <g class="tentacles" fill="none" stroke-linecap="round">
        <path d="M14 34 C10 48 18 58 12 76"/><path d="M24 36 C22 54 30 64 24 92"/>
        <path d="M36 36 C38 52 30 64 36 88"/><path d="M46 34 C50 48 42 60 48 74"/>
      </g>
    </svg>`;

  const starfish = (cls, color) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 9 : 21, a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push(`${(24 + r * Math.cos(a)).toFixed(1)},${(24 + r * Math.sin(a)).toFixed(1)}`);
    }
    return `<svg class="starfish ${cls}" viewBox="0 0 48 48"><polygon points="${pts.join(' ')}" fill="${color}" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>
      <g fill="#fff" opacity=".35"><circle cx="24" cy="24" r="2"/><circle cx="24" cy="12" r="1.2"/><circle cx="34" cy="21" r="1.2"/><circle cx="31" cy="33" r="1.2"/><circle cx="17" cy="33" r="1.2"/><circle cx="14" cy="21" r="1.2"/></g></svg>`;
  };

  const seaweed = cls => `<svg class="seaweed ${cls}" viewBox="0 0 60 140" preserveAspectRatio="xMidYMax meet">
      <path d="M20 140 C8 112 32 96 20 70 C10 46 28 30 22 6" />
      <path d="M36 140 C46 116 26 100 38 78 C48 58 34 44 40 24" />
    </svg>`;

  root.innerHTML = `
  <div class="sky">
    <div class="nebula"></div>
    <div class="stars st1" style="box-shadow:${stars(170, 54, 0.35)}"></div>
    <div class="stars st2" style="box-shadow:${stars(70, 52, 0.5)}"></div>
    <div class="stars st3" style="box-shadow:${stars(26, 48, 0.7)}"></div>
    <span class="shoot sh1"></span><span class="shoot sh2"></span><span class="shoot sh3"></span>
  </div>

  <div class="sea">
    <div class="moonpath"></div>
    <svg class="wave wv3" viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="${wave(30, 10, 480)}"/></svg>
    <svg class="wave wv2" viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="${wave(36, 12, 360)}"/></svg>
    <svg class="wave wv1" viewBox="0 0 2880 80" preserveAspectRatio="none"><path d="${wave(44, 9, 240)}"/></svg>
    <div class="rays"></div>

    <div class="swim s1">${fish('', '#9fd6f2')}</div>
    <div class="swim s2 left">${fish('', '#d6eefa')}</div>
    <div class="swim s3">${fish('', '#7cc0e6')}</div>
    <div class="swim s4 left">${school}</div>
    <div class="swim s5">${fish('', '#bfe3f5')}</div>

    <div class="manta-wrap"><svg class="manta" viewBox="0 0 200 124">
      <path d="M100 16 C111 16 119 26 123 38 C150 40 181 51 197 70 C171 66 146 68 128 77 C120 85 110 91 104 93 L101 122 L99 122 L96 93 C90 91 80 85 72 77 C54 68 29 66 3 70 C19 51 50 40 77 38 C81 26 89 16 100 16Z"/>
      <path d="M92 18 L88 8 M108 18 L112 8" stroke-width="4" stroke-linecap="round"/>
      <path class="spots" d="M84 50 Q100 58 116 50"/>
    </svg></div>

    <div class="drift d1">${jelly('j1')}</div>
    <div class="drift d2">${jelly('j2')}</div>
    <div class="drift d3">${jelly('j3')}</div>

    <div class="bubbles">${Array.from({length: 14}, (_, i) =>
      `<i style="left:${(4 + rnd() * 92).toFixed(1)}%;width:${(4 + rnd() * 9).toFixed(0)}px;height:auto;animation-duration:${(7 + rnd() * 8).toFixed(1)}s;animation-delay:-${(rnd() * 12).toFixed(1)}s"></i>`).join('')}</div>

    <div class="floor">
      ${seaweed('sw1')}${seaweed('sw2')}${seaweed('sw3')}${seaweed('sw4')}
      ${starfish('sf1', '#e8957a')}${starfish('sf2', '#f0b47a')}${starfish('sf3', '#d98aa0')}
      <svg class="shell" viewBox="0 0 40 32"><path d="M20 4 C8 4 2 16 4 26 L36 26 C38 16 32 4 20 4Z" fill="#e9dcc4"/><path d="M20 6 V26 M12 8 L9 26 M28 8 L31 26 M6 16 L5 26 M34 16 L35 26" stroke="#c9b69a" stroke-width="1.4"/><rect x="14" y="26" width="12" height="4" rx="2" fill="#d9c8ac"/></svg>
    </div>
  </div>`;
})();
