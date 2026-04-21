// ─── Seeded RNG (no external deps) ──────────────────────────────────────────
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ROWS      = 10;
const MIN_COLS  = 2;
const MAX_COLS  = 3;

// Row index → node type
// rows 0-6 = common, 7-8 = elite, 9 = boss
function typeForRow(row) {
  if (row === ROWS - 1) return 'boss';
  if (row >= ROWS - 3)  return 'elite';
  return 'common';
}

/**
 * Generate a non-crossing DAG map.
 *
 * Returns { nodes: { [id]: NodeDef }, startIds: string[], bossId: string }
 *
 * NodeDef shape:
 *   { id, row, col, colCount, x, type, connections: [id], completed, available }
 */
export function generateMap(seed = Date.now()) {
  const rng = seededRng(seed);

  // 1. Decide column count per row
  const colCounts = [];
  for (let r = 0; r < ROWS; r++) {
    if (r === ROWS - 1) { colCounts.push(1); continue; }
    colCounts.push(rng() < 0.5 ? MIN_COLS : MAX_COLS);
  }

  // 2. Build node objects
  const nodes = {};
  for (let r = 0; r < ROWS; r++) {
    const count = colCounts[r];
    for (let c = 0; c < count; c++) {
      const id = `n_${r}_${c}`;
      // Evenly spaced x positions between 0.15 and 0.85
      const x = count === 1 ? 0.5 : 0.15 + (c / (count - 1)) * 0.7;
      nodes[id] = {
        id,
        row:          r,
        col:          c,
        colCount:     count,
        x,
        type:         typeForRow(r),
        connections:  [],   // filled next step
        completed:    false,
        available:    r === 0,  // bottom row starts available
      };
    }
  }

  // 3. Build connections row-by-row (no crossing edges)
  for (let r = 0; r < ROWS - 1; r++) {
    const curCount  = colCounts[r];
    const nextCount = colCounts[r + 1];
    const curIds    = Array.from({ length: curCount  }, (_, c) => `n_${r}_${c}`);
    const nextIds   = Array.from({ length: nextCount }, (_, c) => `n_${r + 1}_${c}`);

    // Ensure every next-row node has at least one incoming edge
    const covered = new Set();

    curIds.forEach((cid, ci) => {
      // Map column index proportionally, add optional second target
      const target1 = Math.round((ci / (curCount - 1 || 1)) * (nextCount - 1));
      nodes[cid].connections.push(nextIds[target1]);
      covered.add(target1);

      // With 40% chance, also connect to an adjacent next-row node
      if (nextCount > 1 && rng() < 0.4) {
        const target2 = target1 < nextCount - 1 ? target1 + 1 : target1 - 1;
        if (!nodes[cid].connections.includes(nextIds[target2])) {
          nodes[cid].connections.push(nextIds[target2]);
          covered.add(target2);
        }
      }
    });

    // Guarantee every next-row node is reachable
    nextIds.forEach((nid, ni) => {
      if (!covered.has(ni)) {
        // Connect from the closest current-row node
        const closest = Math.round((ni / (nextCount - 1 || 1)) * (curCount - 1));
        if (!nodes[curIds[closest]].connections.includes(nid)) {
          nodes[curIds[closest]].connections.push(nid);
        }
      }
    });
  }

  const startIds = Array.from({ length: colCounts[0] }, (_, c) => `n_0_${c}`);
  const bossId   = `n_${ROWS - 1}_0`;

  return { nodes, startIds, bossId, seed };
}

/**
 * After a node is completed, mark it done and unlock connected nodes.
 * Returns a new nodes object (immutable update).
 */
export function completeNode(nodes, completedId) {
  const updated = { ...nodes, [completedId]: { ...nodes[completedId], completed: true } };
  nodes[completedId].connections.forEach(nextId => {
    if (updated[nextId]) {
      updated[nextId] = { ...updated[nextId], available: true };
    }
  });
  return updated;
}

export const TOTAL_ROWS = ROWS;
