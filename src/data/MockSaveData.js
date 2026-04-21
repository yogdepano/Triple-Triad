const DEFAULT_SAVE = {
  playerId: 'user_1',
  playerDeck: [
    { name: 'Goblin', top: 3, right: 2, bottom: 1, left: 4, element: null, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Skeleton', top: 1, right: 5, bottom: 2, left: 3, element: '🌑', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Orc', top: 4, right: 3, bottom: 4, left: 2, element: null, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Wraith', top: 2, right: 6, bottom: 1, left: 5, element: '✨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Demon', top: 5, right: 5, bottom: 5, left: 4, element: '🔥', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Warlord', top: 6, right: 2, bottom: 3, left: 6, element: null, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Ifrit', top: 8, right: 4, bottom: 2, left: 7, element: '🔥', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Shiva', top: 6, right: 7, bottom: 8, left: 4, element: '✨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Siren', top: 3, right: 8, bottom: 4, left: 6, element: '💧', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Squall', top: 'A', right: 9, bottom: 6, left: 'A', element: '✨', isAvatar: true, image: '/card_art_placeholder_1776406291061.png' }
  ],
  opponentDeck: [
    { name: 'Slime', top: 1, right: 1, bottom: 2, left: 1, element: '💧', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Zombie', top: 2, right: 2, bottom: 3, left: 1, element: '🌑', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Gargoyle', top: 5, right: 4, bottom: 1, left: 3, element: '🪨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Vampire', top: 6, right: 2, bottom: 4, left: 5, element: '🌑', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Dragon', top: 7, right: 6, bottom: 7, left: 5, element: '🔥', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Golem', top: 5, right: 6, bottom: 6, left: 5, element: '🪨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Sylph', top: 3, right: 5, bottom: 3, left: 7, element: '🌿', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Chimera', top: 7, right: 4, bottom: 5, left: 6, element: '🔥', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Minotaur', top: 7, right: 6, bottom: 2, left: 6, element: '🪨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Sephiroth', top: 'A', right: 'A', bottom: 9, left: 'A', element: '🌑', isAvatar: true, image: '/card_art_placeholder_1776406291061.png' }
  ],
  playerShields: 3,
  opponentShields: 3,
  lastShieldRegen: Date.now()
};
const SAVE_KEY = 'tt_save_data';

export function loadSaveData() {
  const data = localStorage.getItem(SAVE_KEY);
  let parsed = DEFAULT_SAVE;
  if (data) {
    parsed = { ...DEFAULT_SAVE, ...JSON.parse(data) };
  }
  
  // Daily shield regeneration (24h = 86400000ms)
  const now = Date.now();
  if (now - parsed.lastShieldRegen > 86400000) {
    parsed.playerShields = 3;
    parsed.opponentShields = 3;
    parsed.lastShieldRegen = now;
    saveData(parsed);
  }
  
  return parsed;
}

export function saveData(data) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
