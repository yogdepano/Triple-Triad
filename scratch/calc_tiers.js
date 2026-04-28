
const cards = [];
for (let a = 1; a <= 10; a++) {
  for (let b = 1; b <= 10; b++) {
    for (let c = 1; c <= 10; c++) {
      for (let d = 1; d <= 10; d++) {
        const stats = [a, b, c, d];
        const sorted = [...stats].sort((x, y) => y - x);
        
        // Restriction: Higher than (10, 10, 9, 8)
        let higher = false;
        const target = [10, 10, 9, 8];
        for (let i = 0; i < 4; i++) {
          if (sorted[i] > target[i]) { higher = true; break; }
          if (sorted[i] < target[i]) { break; }
        }
        
        if (!higher) {
          cards.push({ stats, sorted });
        }
      }
    }
  }
}

// Sort all valid cards by their sorted tuple rank
cards.sort((a, b) => {
  for (let i = 0; i < 4; i++) {
    if (a.sorted[i] !== b.sorted[i]) return b.sorted[i] - a.sorted[i];
  }
  return 0;
});

console.log("Total valid cards:", cards.length);

const bossPerms = cards.filter(c => JSON.stringify(c.sorted) === JSON.stringify([10, 10, 9, 8]));
console.log("Boss cards (Perms of {10,10,9,8}):", bossPerms.length);

const others = cards.filter(c => JSON.stringify(c.sorted) !== JSON.stringify([10, 10, 9, 8]));

const distributions = {
  Legendary: 0.015,
  Elite: 0.03,
  Epic: 0.05,
  Rare: 0.10,
  Uncommon: 0.20,
};

let currentIdx = 0;
const results = { Boss: bossPerms.length };

for (const [tier, pct] of Object.entries(distributions)) {
  const count = Math.round(cards.length * pct);
  results[tier] = count;
}

const used = Object.values(results).reduce((a, b) => a + b, 0);
results.Common = cards.length - used;

console.log(JSON.stringify(results, null, 2));
