import { generateTestingDeck } from './CardDatabase';

const DEFAULT_SAVE = {
  version: 2,
  playerId: 'user_1',
  playerDeck: generateTestingDeck(),
  opponentDeck: [
    { name: 'Slime',     top: 1, right: 1, bottom: 2, left: 1, element: '💧', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Zombie',    top: 2, right: 2, bottom: 3, left: 1, element: '🌑', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Gargoyle',  top: 5, right: 4, bottom: 1, left: 3, element: '🪨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Vampire',   top: 6, right: 2, bottom: 4, left: 5, element: '🌑', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Dragon',    top: 7, right: 6, bottom: 7, left: 5, element: '🔥', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Golem',     top: 5, right: 6, bottom: 6, left: 5, element: '🪨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Sylph',     top: 3, right: 5, bottom: 3, left: 7, element: '🌿', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Chimera',   top: 7, right: 4, bottom: 5, left: 6, element: '🔥', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Minotaur',  top: 7, right: 6, bottom: 2, left: 6, element: '🪨', image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Sephiroth', top: 'A', right: 'A', bottom: 9, left: 'A', element: '🌑', isAvatar: true, image: '/card_art_placeholder_1776406291061.png' }
  ],
  playerShields:    3,
  opponentShields:  3,
  lastShieldRegen:  Date.now(),

  // ── Adventure Mode state ────────────────────────────────────────────────────
  adventureRun: {
    seed:           null,      // null = no active run. Set on run start.
    act:            1,
    nodes:          {},        // { [nodeId]: { completed, available, cooldownUntil } }
    bossCardsOwned: [],        // list of boss card names player already owns (1-copy limit)
    energyStub:     10,        // stubbed — not enforced yet
  }
};
const SAVE_KEY = 'tt_save_data';

export function loadSaveData() {
  const data = localStorage.getItem(SAVE_KEY);
  let parsed = DEFAULT_SAVE;
  if (data) {
    parsed = { ...DEFAULT_SAVE, ...JSON.parse(data) };
    if (parsed.version !== 2) {
      console.warn("Old save data schema detected. Resetting save data.");
      parsed = DEFAULT_SAVE;
      saveData(parsed);
    }
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

/** Reset only the adventure run — keeps the player's card collection intact. */
export function resetAdventureRun() {
  const data = loadSaveData();
  saveData({
    ...data,
    adventureRun: {
      seed:           null,
      act:            1,
      nodes:          {},
      bossCardsOwned: [],
      energyStub:     10,
    },
  });
}

/** Full factory reset — wipes cards AND adventure run back to defaults. For testing only. */
export function resetAllData() {
  localStorage.removeItem(SAVE_KEY);
}
