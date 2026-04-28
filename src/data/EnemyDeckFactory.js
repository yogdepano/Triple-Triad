import { generateCard } from './CardDatabase';

/** Build a 5-card opponent deck for a given node type. */
export function buildEnemyDeck(nodeType) {
  switch (nodeType) {
    case 'common':
      return Array.from({ length: 5 }, () => generateCard('COMMON', 'opponent'));

    case 'elite':
      return Array.from({ length: 5 }, () => generateCard('ELITE', 'opponent'));

    case 'boss': {
      const bossCard = generateCard('BOSS', 'opponent');
      const support = Array.from({ length: 4 }, () => generateCard('LEGENDARY', 'opponent'));
      return [bossCard, ...support];
    }

    default:
      return Array.from({ length: 5 }, () => generateCard('COMMON', 'opponent'));
  }
}

/** Act 1 match config — Basic + Open for all, Equal added at boss */
export function buildMatchConfig(nodeType) {
  return {
    basicRules:   ['basic', 'open'],
    specialRule:  nodeType === 'boss' ? 'equal' : null,
    infectionRule: null,
  };
}
