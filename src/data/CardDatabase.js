
const RarityRules = {
  BOSS: {
    maxSum: 37,
    maxAces: 2,
    maxDigit: 10,
    forcedDigits: [10, 10, 9, 8] // The peak digits
  },
  LEGENDARY: {
    maxSum: 30,
    maxAces: 1,
    maxDigit: 10
  },
  ELITE: {
    maxSum: 28,
    maxAces: 0,
    maxDigit: 8
  },
  EPIC: {
    maxSum: 26,
    maxAces: 0,
    maxDigit: 7
  },
  RARE: {
    maxSum: 24,
    maxAces: 0,
    maxDigit: 7
  },
  COMMON: {
    maxSum: 20,
    maxAces: 0,
    maxDigit: 6
  }
};

const COMMON_NAMES = ['Goblin', 'Rat', 'Zombie', 'Imp', 'Crow', 'Skeleton', 'Slime', 'Spider', 'Wraith', 'Ghoul', 'Bat', 'Wolf'];
const RARE_NAMES = ['Gargoyle', 'Harpy', 'Mimic', 'Centaur', 'Minotaur', 'Cyclops', 'Satyr', 'Succubus', 'Naga', 'Griffin'];
const EPIC_NAMES = ['Dragon', 'Hydra', 'Phoenix', 'Behemoth', 'Chimera', 'Vampire', 'Lich', 'Krakken', 'Colossus', 'Medusa'];
const LEGENDARY_NAMES = ['The Archangel', 'Void Reaper', 'Soul Eater', 'Ancient One', 'Star Caller', 'The First Knight', 'Dragon Lord', 'Titan'];
const BOSS_NAMES = ['Sephiroth', 'Kefka', 'Exdeath', 'Chaos', 'Omega', 'Shinryu', 'Cloud', 'Squall'];

function getRandomElement() {
  const elements = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑', null];
  return elements[Math.floor(Math.random() * elements.length)];
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function generateCard(rarity = 'COMMON', owner = 'player', overrideName = null) {
  const rules = RarityRules[rarity.toUpperCase()] || RarityRules.COMMON;
  let stats = [1, 1, 1, 1];
  let name = 'Unknown';

  if (rarity.toUpperCase() === 'BOSS') {
    stats = [...rules.forcedDigits];
    name = overrideName || BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
  } else {
    // Determine name pool
    if (rarity === 'COMMON') name = COMMON_NAMES[Math.floor(Math.random() * COMMON_NAMES.length)];
    else if (rarity === 'RARE' || rarity === 'EPIC') name = RARE_NAMES[Math.floor(Math.random() * RARE_NAMES.length)];
    else if (rarity === 'ELITE' || rarity === 'EPIC') name = EPIC_NAMES[Math.floor(Math.random() * EPIC_NAMES.length)];
    else if (rarity === 'LEGENDARY') name = LEGENDARY_NAMES[Math.floor(Math.random() * LEGENDARY_NAMES.length)];

    // Generate stats
    let currentSum = 0;
    let acesUsed = 0;
    
    // Fill stats one by one with constraints
    for (let i = 0; i < 4; i++) {
      let maxVal = rules.maxDigit;
      if (acesUsed >= rules.maxAces && maxVal === 10) maxVal = 9;
      
      // Heuristic to ensure we don't exceed maxSum
      let remainingSlots = 3 - i;
      let safeMax = Math.min(maxVal, rules.maxSum - currentSum - remainingSlots);
      
      let val = Math.floor(Math.random() * (safeMax - 1 + 1)) + 1;
      if (val === 10) acesUsed++;
      stats[i] = val;
      currentSum += val;
    }
  }

  shuffle(stats);
  const [top, right, bottom, left] = stats.map(s => s === 10 ? 'A' : s);
  
  let image = `/card_art_placeholder_1776406291061.png`;
  if (BOSS_NAMES.includes(name)) {
    image = `/assets/${name.toLowerCase()}.png`;
  }

  return {
    id: `${rarity.toLowerCase()}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    top,
    right,
    bottom,
    left,
    element: getRandomElement(),
    image, // Default or custom
    owner,
    rarity: rarity.toUpperCase()
  };
}

export function generateTestingDeck() {
  const deck = [];
  
  // Slot 1: Squall (Always Boss tier for testing)
  deck.push(generateCard('BOSS', 'player', 'Squall'));
  
  deck.push(generateCard('LEGENDARY', 'player'));
  deck.push(generateCard('ELITE', 'player'));
  deck.push(generateCard('RARE', 'player'));
  deck.push(generateCard('COMMON', 'player'));
  
  return deck;
}
