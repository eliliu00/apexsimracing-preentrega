/* ═══════════════════════════════════════════════════════
   APEX SIM RACING — APEChain-inspired Interactive JS
   ═══════════════════════════════════════════════════════ */

'use strict';

/* ─── UTILS ─── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  initNoise();
  initGlobalParticleGrid();   // ← grilla global reactiva al cursor
  initCursor();
  initNavbar();
  initMobileMenu();
  initHeroCanvas();
  initHeroAnimations();
  initTelemetry();
  initCounters();
  initMagnetic();
  initScrollReveal();
  initDragScroll();
  initNewsletterForm();
  initReducedMotion();
});

/* ═══════════════════════════════════════════════════════
   NOISE OVERLAY — subtle film grain
═══════════════════════════════════════════════════════ */
function initNoise() {
  const canvas = $('#noiseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function drawNoise() {
    const w = canvas.width, h = canvas.height;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i] = data[i+1] = data[i+2] = v;
      data[i+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    frame++;
    // Refresh every 3 frames for performance
    if (frame % 3 === 0) requestAnimationFrame(drawNoise);
    else                  setTimeout(() => requestAnimationFrame(drawNoise), 50);
  }
  drawNoise();
}

/* ═══════════════════════════════════════════════════════
   GLOBAL PARTICLE GRID — fixed canvas behind all sections
   Dot grid reacts to cursor position anywhere on page
═══════════════════════════════════════════════════════ */
function initGlobalParticleGrid() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches) return; // skip on touch

  // Create fixed canvas behind everything
  const canvas = document.createElement('canvas');
  canvas.id = 'globalParticleCanvas';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
    opacity: 1;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  const COLS = 28, ROWS = 16;
  const GLOW_RADIUS = 260;
  let W, H, particles = [];
  let mouse = { x: -9999, y: -9999 };
  let scrollY = 0;
  let t = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildGrid();
  }

  function buildGrid() {
    particles = [];
    const gapX = W / (COLS - 1);
    const gapY = H / (ROWS - 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        particles.push({
          ox: c * gapX,
          oy: r * gapY,
          x:  c * gapX,
          y:  r * gapY,
          size: Math.random() > 0.88 ? 1.8 : 0.75,
          baseAlpha: 0.05 + Math.random() * 0.055,
        });
      }
    }
  }

  document.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.006;

    // Mouse glow halo
    if (mouse.x > 0) {
      const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, GLOW_RADIUS);
      mg.addColorStop(0, 'rgba(0,229,255,0.055)');
      mg.addColorStop(0.5, 'rgba(0,229,255,0.015)');
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, W, H);
    }

    // Update positions with wave + mouse attraction
    particles.forEach(p => {
      const dx = mouse.x - p.ox;
      const dy = mouse.y - p.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = Math.max(0, 1 - dist / GLOW_RADIUS);
      const wave = Math.sin(t + p.ox * 0.018 + p.oy * 0.012) * 1.8;

      p.x = p.ox + dx * force * 0.07 + wave * 0.25;
      p.y = p.oy + dy * force * 0.07 + wave * 0.25;
    });

    // Grid lines (horizontal)
    ctx.lineWidth = 0.5;
    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.028)';
      for (let c = 0; c < COLS; c++) {
        const p = particles[r * COLS + c];
        if (c === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Grid lines (vertical)
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.028)';
      for (let r = 0; r < ROWS; r++) {
        const p = particles[r * COLS + c];
        if (r === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Dots at intersections
    particles.forEach(p => {
      const dx   = mouse.x - p.ox;
      const dy   = mouse.y - p.oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const glow = Math.max(0, 1 - dist / GLOW_RADIUS);
      const alpha = p.baseAlpha + glow * 0.55;
      const radius = p.size + glow * 1.4;

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = glow > 0.25
        ? `rgba(0,229,255,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  draw();
}

/* ═══════════════════════════════════════════════════════
   CUSTOM CURSOR — large ring follows mouse with lag
═══════════════════════════════════════════════════════ */
function initCursor() {
  const ring = $('#cursor');
  const dot  = $('#cursorDot');
  if (!ring || !dot) return;

  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  }, { passive: true });

  // Hover states
  document.addEventListener('mouseover', e => {
    const t = e.target.closest('a, button, .magnetic, .program-card, .disc-card, .hw-brand, .emp-card, .s-row');
    if (t) ring.classList.add('hovering');
  });
  document.addEventListener('mouseout', e => {
    const t = e.target.closest('a, button, .magnetic, .program-card, .disc-card, .hw-brand, .emp-card, .s-row');
    if (t) ring.classList.remove('hovering');
  });
  document.addEventListener('mousedown', () => ring.classList.add('clicking'));
  document.addEventListener('mouseup',   () => ring.classList.remove('clicking'));

  // Animate ring with lerp
  function tick() {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tick);
  }
  tick();
}

/* ═══════════════════════════════════════════════════════
   NAVBAR — scroll transparency + shrink
═══════════════════════════════════════════════════════ */
function initNavbar() {
  const nav = $('#navbar');
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ═══════════════════════════════════════════════════════
   MOBILE MENU
═══════════════════════════════════════════════════════ */
function initMobileMenu() {
  const btn     = $('#burgerBtn');
  const overlay = $('#mobileOverlay');
  if (!btn || !overlay) return;

  btn.addEventListener('click', () => {
    const open = overlay.classList.toggle('open');
    btn.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  $$('a', overlay).forEach(a => a.addEventListener('click', () => {
    overlay.classList.remove('open');
    btn.classList.remove('open');
    document.body.style.overflow = '';
  }));
}

/* ═══════════════════════════════════════════════════════
   HERO CANVAS — particle grid + mouse-reactive glow
═══════════════════════════════════════════════════════ */
function initHeroCanvas() {
  const canvas = $('#heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], mouse = { x: -9999, y: -9999 };
  const ROWS = 18, COLS = 32, GLOW_RADIUS = 220;

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildGrid();
  }

  function buildGrid() {
    particles = [];
    const gapX = W / (COLS - 1);
    const gapY = H / (ROWS - 1);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        particles.push({
          x: c * gapX, y: r * gapY,
          ox: c * gapX, oy: r * gapY,
          vx: 0, vy: 0,
          size: Math.random() > 0.92 ? 1.5 : 0.7,
          baseAlpha: 0.06 + Math.random() * 0.06,
        });
      }
    }
  }

  document.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });

  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.008;

    // Subtle ambient light blobs
    const grad = ctx.createRadialGradient(W * 0.75, H * 0.4, 0, W * 0.75, H * 0.4, W * 0.5);
    grad.addColorStop(0, 'rgba(124,58,237,0.11)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const grad2 = ctx.createRadialGradient(W * 0.2, H * 0.7, 0, W * 0.2, H * 0.7, W * 0.35);
    grad2.addColorStop(0, 'rgba(0,229,255,0.03)');
    grad2.addColorStop(1, 'transparent');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, W, H);

    // Mouse glow
    if (mouse.x > 0) {
      const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, GLOW_RADIUS);
      mg.addColorStop(0, 'rgba(255,255,255,0.04)');
      mg.addColorStop(1, 'transparent');
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, W, H);
    }

    // Draw grid lines first (very faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 0.5;

    for (let r = 0; r < ROWS; r++) {
      ctx.beginPath();
      for (let c = 0; c < COLS; c++) {
        const p = particles[r * COLS + c];
        const dx = mouse.x - p.ox;
        const dy = mouse.y - p.oy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const force = Math.max(0, 1 - dist / GLOW_RADIUS);
        const wave = Math.sin(t + p.ox * 0.02 + p.oy * 0.015) * 2;

        p.x = p.ox + dx * force * 0.06 + wave * 0.3;
        p.y = p.oy + dy * force * 0.06 + wave * 0.3;

        if (c === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      for (let r = 0; r < ROWS; r++) {
        const p = particles[r * COLS + c];
        if (r === 0) ctx.moveTo(p.x, p.y);
        else         ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Draw dots at intersections
    particles.forEach(p => {
      const dx   = mouse.x - p.ox;
      const dy   = mouse.y - p.oy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const glow = Math.max(0, 1 - dist / GLOW_RADIUS);
      const alpha = p.baseAlpha + glow * 0.5;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + glow * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = glow > 0.3
        ? `rgba(0,229,255,${alpha})`
        : `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize();
  draw();
}

/* ═══════════════════════════════════════════════════════
   HERO ANIMATIONS — staggered title reveal on load
═══════════════════════════════════════════════════════ */
function initHeroAnimations() {
  const lines = $$('.title-line');
  lines.forEach((line, i) => {
    setTimeout(() => line.classList.add('visible'), 200 + i * 180);
  });
}

/* ═══════════════════════════════════════════════════════
   TELEMETRY HUD — animated canvas graph + delta flicker
═══════════════════════════════════════════════════════ */
function initTelemetry() {
  const teleCanvas = $('#teleCanvas');
  if (!teleCanvas) return;
  const ctx = teleCanvas.getContext('2d');
  const W = teleCanvas.width, H = teleCanvas.height;

  const channels = [
    { color: '#E040FB', points: [], phase: 0,    amp: 12, freq: 0.08 },
    { color: '#00E5FF', points: [], phase: 2.1,  amp: 9,  freq: 0.06 },
    { color: '#69F0AE', points: [], phase: 4.2,  amp: 7,  freq: 0.1  },
  ];

  // Pre-fill history
  for (let x = 0; x <= W; x++) {
    channels.forEach(ch => {
      ch.points.push(H/2 + Math.sin(x * ch.freq + ch.phase) * ch.amp);
    });
  }

  let t = 0;
  function drawTele() {
    ctx.clearRect(0, 0, W, H);
    t += 0.04;

    channels.forEach(ch => {
      ch.points.shift();
      ch.points.push(
        H/2 + Math.sin(t * ch.freq * 12 + ch.phase) * ch.amp
             + Math.sin(t * ch.freq * 7  + ch.phase * 1.3) * (ch.amp * 0.4)
      );

      ctx.beginPath();
      ctx.moveTo(0, ch.points[0]);
      for (let i = 1; i < ch.points.length; i++) {
        ctx.lineTo(i, ch.points[i]);
      }
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    requestAnimationFrame(drawTele);
  }
  drawTele();

  // Delta flicker
  const deltaEl = $('#deltaVal');
  if (deltaEl) {
    const base = -0.347;
    setInterval(() => {
      const jitter = (Math.random() - 0.5) * 0.006;
      deltaEl.textContent = '−' + Math.abs(base + jitter).toFixed(3);
    }, 80);
  }
}

/* ═══════════════════════════════════════════════════════
   COUNTERS — count-up animation triggered by IntersectionObserver
═══════════════════════════════════════════════════════ */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el  = entry.target;
      const end = parseInt(el.dataset.count, 10);
      const dur = 1400;
      const start = performance.now();

      function tick(now) {
        const p = Math.min(1, (now - start) / dur);
        // Ease-out expo
        const eased = 1 - Math.pow(2, -10 * p);
        el.textContent = Math.round(eased * end);
        if (p < 1) requestAnimationFrame(tick);
        else        el.textContent = end;
      }
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });

  els.forEach(el => io.observe(el));
}

/* ═══════════════════════════════════════════════════════
   MAGNETIC BUTTONS — elements that pull toward cursor
═══════════════════════════════════════════════════════ */
function initMagnetic() {
  const els = $$('.magnetic');
  const STRENGTH = 0.38;

  els.forEach(el => {
    let raf;
    let tx = 0, ty = 0;
    let cx = 0, cy = 0;

    el.addEventListener('mousemove', e => {
      const rect = el.getBoundingClientRect();
      cx = e.clientX - (rect.left + rect.width  / 2);
      cy = e.clientY - (rect.top  + rect.height / 2);
    });

    el.addEventListener('mouseenter', () => {
      function animate() {
        tx = lerp(tx, cx * STRENGTH, 0.14);
        ty = lerp(ty, cy * STRENGTH, 0.14);
        el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
        raf = requestAnimationFrame(animate);
      }
      animate();
    });

    el.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      cx = cy = 0;
      function resetAnim() {
        tx = lerp(tx, 0, 0.1);
        ty = lerp(ty, 0, 0.1);
        el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
        if (Math.abs(tx) > 0.05 || Math.abs(ty) > 0.05) {
          raf = requestAnimationFrame(resetAnim);
        } else {
          el.style.transform = '';
        }
      }
      resetAnim();
    });
  });
}

/* ═══════════════════════════════════════════════════════
   SCROLL REVEAL — staggered fade+slide triggered by IntersectionObserver
═══════════════════════════════════════════════════════ */
function initScrollReveal() {
  // Add base styles
  const style = document.createElement('style');
  style.textContent = `
    .sr { opacity: 0; transform: translateY(28px); transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1); }
    .sr.visible { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);

  const targets = $$(
    '.program-card, .disc-card, .hw-brand, .emp-card, ' +
    '.comp-standings, .comp-next, .comp-leagues, ' +
    '.s-row, .league-item, .noticia-small, ' +
    '.driver-card, .str-road, .stat-item'
  );

  targets.forEach(el => el.classList.add('sr'));

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el   = entry.target;
      const siblings = [...(el.parentElement?.children ?? [])].filter(c => c.classList.contains('sr'));
      const idx  = siblings.indexOf(el);
      setTimeout(() => el.classList.add('visible'), idx * 70);
      io.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => io.observe(el));
}

/* ═══════════════════════════════════════════════════════
   DISC SCROLL — cursor-driven auto-scroll (desktop)
                 native touch swipe (mobile)
═══════════════════════════════════════════════════════ */
function initDragScroll() {
  const section  = document.querySelector('.disc-section');
  const el       = $('#discScroll');
  const row      = el ? el.querySelector('.disc-cards-row') : null;
  if (!section || !el || !row) return;

  /* ── Skip on touch devices — CSS handles native scroll ── */
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch) {
    initTouchSwipe(el);
    return;
  }

  /* ── Desktop: cursor position → scrollLeft ── */

  // Target and current scroll, smoothly interpolated each frame
  let targetScroll  = 0;
  let currentScroll = 0;
  let isInSection   = false;   // only animate while cursor is over the section
  let rafId         = null;

  // Max scrollable distance
  function maxScroll() {
    return row.scrollWidth - el.clientWidth;
  }

  // Map cursor X (relative to section) to a scroll target
  function cursorToScroll(clientX) {
    const rect     = section.getBoundingClientRect();
    // Normalise to [0, 1] with a small dead-zone at the edges
    const MARGIN   = 0.08;   // 8% dead-zone on each side — title area stays calm
    const rawT     = (clientX - rect.left) / rect.width;
    const t        = clamp((rawT - MARGIN) / (1 - MARGIN * 2), 0, 1);
    return t * maxScroll();
  }

  // Animate loop — runs only while cursor is inside the section
  function tick() {
    currentScroll = lerp(currentScroll, targetScroll, 0.055);  // silky ease
    el.scrollLeft = currentScroll;

    // Keep looping while drifting or still inside
    if (isInSection || Math.abs(currentScroll - targetScroll) > 0.5) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function startTick() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  // Track cursor across the whole section (left panel + scroll area)
  section.addEventListener('mousemove', e => {
    targetScroll = cursorToScroll(e.clientX);
    startTick();
  }, { passive: true });

  section.addEventListener('mouseenter', () => {
    isInSection = true;
    startTick();
  });

  section.addEventListener('mouseleave', () => {
    isInSection = false;
    // Let the lerp coast to rest — tick will stop itself
  });

  // Sync on resize
  window.addEventListener('resize', () => {
    currentScroll = clamp(currentScroll, 0, maxScroll());
    targetScroll  = clamp(targetScroll,  0, maxScroll());
    el.scrollLeft = currentScroll;
  }, { passive: true });

  /* ── Subtle intro hint: drift right then back ── */
  setTimeout(() => {
    const max = maxScroll();
    targetScroll = max * 0.18;
    startTick();
    setTimeout(() => { targetScroll = 0; startTick(); }, 900);
  }, 1800);
}

/* ── Touch swipe for mobile ── */
function initTouchSwipe(el) {
  let startX = 0, startLeft = 0, velX = 0, lastX = 0, lastT = 0;
  let rafId  = null;

  el.addEventListener('touchstart', e => {
    startX    = e.touches[0].clientX;
    startLeft = el.scrollLeft;
    velX      = 0;
    lastX     = startX;
    lastT     = Date.now();
    cancelAnimationFrame(rafId);
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    const now  = Date.now();
    const x    = e.touches[0].clientX;
    const dt   = now - lastT || 1;
    velX       = (lastX - x) / dt;   // px/ms
    el.scrollLeft = startLeft + (startX - x);
    lastX = x;
    lastT = now;
  }, { passive: true });

  el.addEventListener('touchend', () => {
    // Momentum flick
    let momentum = velX * 120;   // project forward

    function coast() {
      if (Math.abs(momentum) < 0.5) return;
      el.scrollLeft += momentum;
      momentum *= 0.92;           // friction
      rafId = requestAnimationFrame(coast);
    }
    coast();
  }, { passive: true });
}

/* ═══════════════════════════════════════════════════════
   NEWSLETTER — form validation with visual feedback
═══════════════════════════════════════════════════════ */
function initNewsletterForm() {
  const input = $('#nlEmail');
  const btn   = $('#nlBtn');
  if (!input || !btn) return;

  btn.addEventListener('click', () => {
    const email = input.value.trim();

    if (!isEmail(email)) {
      input.style.borderColor = '#FF3D00';
      input.style.boxShadow   = '0 0 0 2px rgba(255,61,0,0.2)';
      input.focus();
      shakeEl(input);
      return;
    }

    // Success
    const span = btn.querySelector('span');
    const origText = span.textContent;
    span.textContent     = '¡LISTO! ✓';
    btn.style.background = '#1a472a';
    input.style.borderColor = '#69F0AE';
    input.style.boxShadow   = '0 0 0 2px rgba(105,240,174,0.2)';
    input.value = '';

    setTimeout(() => {
      span.textContent    = origText;
      btn.style.background = '';
      input.style.borderColor = '';
      input.style.boxShadow   = '';
    }, 3200);
  });

  input.addEventListener('input', () => {
    input.style.borderColor = '';
    input.style.boxShadow   = '';
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
}

function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function shakeEl(el) {
  el.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ], { duration: 320, easing: 'ease-in-out' });
}

/* ═══════════════════════════════════════════════════════
   REDUCED MOTION FALLBACK
═══════════════════════════════════════════════════════ */
function initReducedMotion() {
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Instantly show all animated elements
  $$('.title-line').forEach(el => el.classList.add('visible'));
  $$('.sr').forEach(el => el.classList.add('visible'));
}

/* ═══════════════════════════════════════════════════════
   SMOOTH ANCHOR SCROLL
═══════════════════════════════════════════════════════ */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
    window.scrollTo({ top: target.offsetTop - navH - 16, behavior: 'smooth' });
  });
});

const hwBrands = document.querySelectorAll('.hw-brand');

hwBrands.forEach(brand => {
  const inner = brand.querySelector('.hw-brand-inner');
  const img = inner ? inner.querySelector('img') : null;

  if (inner && img) {
    inner.addEventListener('mousemove', (e) => {
      const rect = inner.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      img.style.setProperty('--x', `${x}%`);
      img.style.setProperty('--y', `${y}%`);
    });

    inner.addEventListener('mouseleave', () => {
      img.style.setProperty('--x', '50%');
      img.style.setProperty('--y', '50%');
    });
  }
  
});

