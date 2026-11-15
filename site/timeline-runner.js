// timeline-runner.js: Scroll-synchronized Minecraft character runner for the Labyrinth 36-Hour Timeline.
// As the user scrolls through the schedule, the character sprints along the powered redstone rail,
// triggering particle sparks and activating milestone checkpoints.

export function initTimelineRunner(scheduleEl) {
  if (!scheduleEl) return;

  // Ensure runner trackway is mounted
  let track = scheduleEl.querySelector('.pv-runner-track');
  if (!track) {
    track = document.createElement('div');
    track.className = 'pv-runner-track';
    track.setAttribute('aria-hidden', 'true');
    track.innerHTML = `
      <div class="pv-rail-line">
        <div class="pv-rail-glow"></div>
      </div>
      <div class="pv-minecraft-character" id="pvRunner">
        <div class="mc-char-body">
          <div class="mc-head">
            <div class="mc-face"></div>
          </div>
          <div class="mc-torso">
            <div class="mc-gdg-logo"></div>
          </div>
          <div class="mc-arm mc-arm-left"></div>
          <div class="mc-arm mc-arm-right"></div>
          <div class="mc-leg mc-leg-left"></div>
          <div class="mc-leg mc-leg-right"></div>
        </div>
        <div class="mc-dust-emitter"></div>
      </div>
    `;
    scheduleEl.prepend(track);
  }

  const runner = track.querySelector('#pvRunner');
  const railGlow = track.querySelector('.pv-rail-glow');
  const items = [...scheduleEl.querySelectorAll('.schedule-item')];

  let lastScrollY = window.scrollY;
  let scrollTimeout = null;
  let isRunning = false;
  let currentDirection = 1;
  let runnerProgress = 0;
  let targetProgress = 0;
  let ticking = false;

  function setRunning(running, direction = 1) {
    currentDirection = direction;
    if (isRunning === running) return;
    isRunning = running;
    runner.classList.toggle('is-running', running);
    runner.classList.toggle('run-up', direction < 0);
  }

  function spawnParticles(x, y) {
    const emitter = runner.querySelector('.mc-dust-emitter');
    if (!emitter) return;
    const particle = document.createElement('span');
    particle.className = 'mc-particle';
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 16;
    particle.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    emitter.appendChild(particle);
    setTimeout(() => particle.remove(), 600);
  }

  function update() {
    ticking = false;
    const rect = scheduleEl.getBoundingClientRect();
    const windowH = window.innerHeight;

    // Start slightly before entering and complete near exit
    const startY = windowH * 0.75;
    const totalDist = rect.height;
    const currentDist = startY - rect.top;

    targetProgress = Math.max(0, Math.min(1, currentDist / totalDist));

    // Smooth lerp
    runnerProgress += (targetProgress - runnerProgress) * 0.18;

    // Map runner position along horizontal powered rail
    const trackW = Math.max(0, track.offsetWidth - runner.offsetWidth - 28);
    const leftPx = runnerProgress * trackW;
    runner.style.transform = `translate3d(${leftPx}px, 0, 0) scaleX(${currentDirection < 0 ? -1 : 1})`;

    if (railGlow) {
      railGlow.style.width = `${runnerProgress * 100}%`;
    }

    // Check milestones
    for (const item of items) {
      const itemRect = item.getBoundingClientRect();
      const reached = itemRect.top <= windowH * 0.65;
      if (reached && !item.classList.contains('milestone-reached')) {
        item.classList.add('milestone-reached');
        spawnParticles();
      } else if (!reached && item.classList.contains('milestone-reached')) {
        item.classList.remove('milestone-reached');
      }
    }

    // Keep animating if not settled
    if (Math.abs(targetProgress - runnerProgress) > 0.001) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function onScroll() {
    const currentY = window.scrollY;
    const diff = currentY - lastScrollY;
    const dir = diff >= 0 ? 1 : -1;
    lastScrollY = currentY;

    if (Math.abs(diff) > 1) {
      setRunning(true, dir);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setRunning(false);
      }, 140);
    }

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  requestAnimationFrame(update);
}
