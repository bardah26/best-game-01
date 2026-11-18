// screens.js — the title, pause, win and lose screens. Drawn on the
// same canvas as the game so screenshots show the whole loop: a start
// screen, play, and a win or loss screen with its restart.

export function drawTitle(ctx, w, h, best, time) {
  // Dim the cavern behind the title so the text reads.
  ctx.fillStyle = 'rgba(4, 4, 14, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  // Eyebrow.
  ctx.fillStyle = '#9db4ff';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('A  F I R E F L Y ’ S   D A W N   R U N', w / 2, h * 0.2);
  // Title.
  const glowPulse = 0.75 + Math.sin(time * 2) * 0.15;
  ctx.save();
  ctx.shadowColor = `rgba(255, 190, 90, ${glowPulse.toFixed(3)})`;
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '800 84px system-ui, sans-serif';
  ctx.fillText('EMBERLIGHT', w / 2, h * 0.2 + 88);
  ctx.restore();
  // The pitch, in three short lines.
  ctx.fillStyle = '#e8ecff';
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillText('You are Ember, the last firefly of the Hollow.', w / 2, h * 0.2 + 138);
  ctx.fillText('Your glow is your life. Feed it with embers,', w / 2, h * 0.2 + 166);
  ctx.fillText('dodge the shadow wisps, and reach the Dawn Gate.', w / 2, h * 0.2 + 194);
  // Controls.
  ctx.fillStyle = 'rgba(232, 236, 255, 0.85)';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('Move  —  Arrow keys / WASD / hold the mouse', w / 2, h * 0.2 + 244);
  ctx.fillText('Pulse (shatter wisps, costs light)  —  Space', w / 2, h * 0.2 + 268);
  ctx.fillText('Pause — P      Mute — M      Restart — R', w / 2, h * 0.2 + 292);
  // Start prompt, gently pulsing.
  const blink = 0.65 + Math.sin(time * 4) * 0.35;
  ctx.fillStyle = `rgba(255, 226, 150, ${blink.toFixed(3)})`;
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('Press ENTER or click to fly', w / 2, h * 0.2 + 344);
  if (best > 0) {
    ctx.fillStyle = 'rgba(255, 233, 168, 0.8)';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText(`Best score: ${best}`, w / 2, h * 0.2 + 376);
  }
}

export function drawPause(ctx, w, h) {
  ctx.fillStyle = 'rgba(4, 4, 14, 0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '800 46px system-ui, sans-serif';
  ctx.fillText('PAUSED', w / 2, h / 2 - 10);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('Press P to keep flying — R to restart', w / 2, h / 2 + 28);
}

export function drawEnd(ctx, w, h, stats, won) {
  // stats: { score, embers, distanceM, timeSec, best, isBest }
  ctx.fillStyle = won ? 'rgba(20, 14, 4, 0.55)' : 'rgba(4, 4, 14, 0.62)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffe9a8' : '#d8c8ff';
  ctx.font = '800 58px system-ui, sans-serif';
  ctx.fillText(won ? 'DAWN REACHED!' : 'THE LIGHT FADES…', w / 2, h * 0.3);
  ctx.fillStyle = '#e8ecff';
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillText(
    won
      ? 'Ember slips through the Dawn Gate — the Hollow wakes.'
      : 'Ember’s glow goes out, but the Hollow remembers her light.',
    w / 2,
    h * 0.3 + 40,
  );
  // Stats panel.
  const pw = 460;
  const ph = 190;
  const px = (w - pw) / 2;
  const py = h * 0.3 + 72;
  ctx.fillStyle = 'rgba(6, 6, 18, 0.6)';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 226, 150, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const rows = [
    ['Score', String(stats.score)],
    ['Embers gathered', String(stats.embers)],
    ['Distance flown', `${Math.floor(stats.distanceM)}m of 1200m`],
    ['Time', `${Math.floor(stats.timeSec / 60)}:${String(Math.floor(stats.timeSec % 60)).padStart(2, '0')}`],
    ['Best', String(stats.best)],
  ];
  ctx.font = '600 17px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = py + 34 + i * 30;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232, 236, 255, 0.75)';
    ctx.fillText(label, px + 26, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(value, px + pw - 26, y);
  });
  if (stats.isBest) {
    ctx.fillStyle = '#ffb347';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ NEW BEST SCORE ★', w / 2, py + ph + 34);
  }
  const blink = 0.65 + Math.sin(stats.timeSec * 4) * 0.35;
  ctx.fillStyle = `rgba(255, 226, 150, ${blink.toFixed(3)})`;
  ctx.font = '800 21px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Press R or click to fly again', w / 2, py + ph + 72);
}
