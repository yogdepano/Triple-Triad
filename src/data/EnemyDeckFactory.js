const CARD_ART = '/card_art_placeholder_1776406291061.png';
const ELEMENTS = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑', null];

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Name pools ──────────────────────────────────────────────────────────────
const COMMON_NAMES  = ['Goblin', 'Bat', 'Slime', 'Rat', 'Zombie', 'Skeleton', 'Crow', 'Leech', 'Imp', 'Ghoul', 'Wisp', 'Kobold'];
const ELITE_NAMES   = ['Gargoyle', 'Werewolf', 'Harpy', 'Vampire', 'Golem', 'Cyclops', 'Wyvern', 'Banshee', 'Chimera', 'Revenant'];
const BOSS_NAMES    = ['The Lich King', 'Dreadwyrm', 'Shadow Titan', 'Abyssal Overlord', 'The Fallen One'];

// ─── Card generators ─────────────────────────────────────────────────────────

/** Common enemy: stats 1–5 */
function makeCommonCard(index) {
  return {
    name:    pick(COMMON_NAMES),
    top:     rnd(1, 5),
    right:   rnd(1, 5),
    bottom:  rnd(1, 5),
    left:    rnd(1, 5),
    element: pick(ELEMENTS),
    image:   CARD_ART,
    id:      `common_${index}_${Date.now()}`,
    owner:   'opponent',
  };
}

/** Elite enemy: stats 3–7 */
function makeEliteCard(index) {
  return {
    name:    pick(ELITE_NAMES),
    top:     rnd(3, 7),
    right:   rnd(3, 7),
    bottom:  rnd(3, 7),
    left:    rnd(3, 7),
    element: pick(ELEMENTS),
    image:   CARD_ART,
    id:      `elite_${index}_${Date.now()}`,
    owner:   'opponent',
  };
}

/**
 * Boss signature card — stats 2–8, at most ONE value of 8.
 * Flagged isBossCard: true so AdventureEncounter can handle it specially.
 */
export function makeBossCard(bossName) {
  const stats  = [rnd(2, 8), rnd(2, 7), rnd(2, 7), rnd(2, 7)];
  // shuffle so the 8 (if present) lands on a random side
  stats.sort(() => 0.5 - Math.random());
  const [top, right, bottom, left] = stats;
  return {
    name:        bossName,
    top,
    right,
    bottom,
    left,
    element:     pick(['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑']),
    image:       CARD_ART,
    id:          `boss_${bossName.replace(/\s+/g, '_')}_${Date.now()}`,
    owner:       'opponent',
    isBossCard:  true,
  };
}

// ─── Deck builders ────────────────────────────────────────────────────────────

/** Build a 5-card opponent deck for a given node type. */
export function buildEnemyDeck(nodeType) {
  switch (nodeType) {
    case 'common':
      return Array.from({ length: 5 }, (_, i) => makeCommonCard(i));

    case 'elite':
      return Array.from({ length: 5 }, (_, i) => makeEliteCard(i));

    case 'boss': {
      const bossName = pick(BOSS_NAMES);
      const bossCard = makeBossCard(bossName);
      // Remaining 4 cards are strong elites (4–8 range)
      const support = Array.from({ length: 4 }, (_, i) => ({
        ...makeEliteCard(i),
        top:    rnd(4, 8),
        right:  rnd(4, 8),
        bottom: rnd(4, 8),
        left:   rnd(4, 8),
      }));
      return [bossCard, ...support];
    }

    default:
      return Array.from({ length: 5 }, (_, i) => makeCommonCard(i));
  }
}

/** Act 1 match config — Basic + Open for all, Equal added at boss */
export function buildMatchConfig(nodeType) {
  return {
    basicRules:   nodeType === 'boss' ? ['basic', 'open'] : ['basic', 'open'],
    specialRule:  nodeType === 'boss' ? 'equal' : null,
    infectionRule: null,
  };
}
