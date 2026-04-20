const DEFAULT_SAVE = {
  playerId: 'user_1',
  playerDeck: [
    { name: 'Goblin', top: 3, right: 2, bottom: 1, left: 4, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Skeleton', top: 1, right: 5, bottom: 2, left: 3, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Orc', top: 4, right: 3, bottom: 4, left: 2, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Wraith', top: 2, right: 6, bottom: 1, left: 5, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Demon', top: 5, right: 5, bottom: 5, left: 4, image: '/card_art_placeholder_1776406291061.png' }
  ],
  opponentDeck: [
    { name: 'Slime', top: 1, right: 1, bottom: 2, left: 1, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Zombie', top: 2, right: 2, bottom: 3, left: 1, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Gargoyle', top: 5, right: 4, bottom: 1, left: 3, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Vampire', top: 6, right: 2, bottom: 4, left: 5, image: '/card_art_placeholder_1776406291061.png' },
    { name: 'Dragon', top: 7, right: 6, bottom: 7, left: 5, image: '/card_art_placeholder_1776406291061.png' }
  ]
};
const SAVE_KEY = 'tt_save_data';

export function loadSaveData() {
  const data = localStorage.getItem(SAVE_KEY);
  if (data) {
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SAVE, ...parsed };
  }
  return DEFAULT_SAVE;
}

export function saveData(data) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
