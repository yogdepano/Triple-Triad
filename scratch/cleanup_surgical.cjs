const fs = require('fs');
const path = 'src/index.css';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the line where @media (max-width: 600px) starts
const startIndex = lines.findIndex(line => line.includes('@media (max-width: 600px)'));
// Find the line where ADVENTURE MAP starts
const endIndex = lines.findIndex(line => line.includes('ADVENTURE MAP'));

if (startIndex !== -1 && endIndex !== -1) {
    // Delete everything from startIndex to just before ADVENTURE MAP
    lines.splice(startIndex - 2, endIndex - startIndex + 1);
}

// Ensure WIN / REWARD BANNER is present
if (!lines.some(l => l.includes('WIN / REWARD BANNER'))) {
    const bannerStyles = `
/* ═══════════════════════════════════════════════
   WIN / REWARD BANNER
═══════════════════════════════════════════════ */
.win-banner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  z-index: 200;
  background: rgba(5, 3, 10, 0.82);
  backdrop-filter: blur(6px);
  animation: banner-in 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes banner-in {
  from { opacity: 0; transform: scale(0.93); }
  to   { opacity: 1; transform: scale(1); }
}
.banner-title { font-family: 'Cinzel', serif; font-size: clamp(1.8rem, 5vw, 4.5rem); font-weight: 700; letter-spacing: 6px; }
.banner-win  .banner-title { color: var(--player-color);   text-shadow: 0 0 28px var(--player-color); }
.banner-lose .banner-title { color: var(--opponent-color); text-shadow: 0 0 28px var(--opponent-color); }
.banner-draw .banner-title { color: #c0a060;               text-shadow: 0 0 28px #c0a060; }
.banner-score { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: rgba(255,255,255,0.55); letter-spacing: 4px; }
.banner-btn {
  margin-top: 8px; padding: 9px 32px;
  font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 2.5px;
  background: transparent; color: #fff;
  border: 1px solid rgba(255,255,255,0.22); border-radius: 4px;
  cursor: pointer; transition: all 0.22s;
}
.banner-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.55); }

.reward-phase {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 200;
  padding: 20px;
  background: rgba(5, 3, 10, 0.88);
  backdrop-filter: blur(6px);
  animation: banner-in 0.32s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
`;
    // Insert after animations (tt-card.captured-combo)
    const animIndex = lines.findIndex(l => l.includes('.tt-card.captured-combo'));
    lines.splice(animIndex + 1, 0, bannerStyles);
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Cleanup surgical done');
