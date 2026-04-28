// ─── Seeded RNG (no external deps) ──────────────────────────────────────────
// Uses Math.imul() for true 32-bit integer multiplication so that large
// millisecond timestamps don't lose precision in JS floating-point arithmetic.
// The seed is first hashed through two mixing rounds so that seeds that differ
// by small amounts (e.g. consecutive Date.now() calls) produce very different
// starting states.
function seededRng(seed) {
  // Collapse the large timestamp into 32 bits via xor-shift mixing
  let s = seed ^ (seed / 0x100000000 | 0); // xor high bits into low bits
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b) | 0;
  s = Math.imul(s ^ (s >>> 16), 0xb5297a4d) | 0;
  s = s ^ (s >>> 16);
  if (s === 0) s = 1; // avoid all-zero state

  return () => {
    // LCG step using 32-bit integer arithmetic (no float precision loss)
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ROWS = 10;

// Row index → node type
function typeForRow(row) {
  if (row === ROWS - 1) return 'boss';
  if (row >= ROWS - 3)  return 'elite';
  return 'common';
}

/**
 * Place n nodes freely within the canvas row.
 *
 * Key idea: instead of spreading nodes across the full width, we:
 *   1. Pick random gaps between adjacent nodes (MIN_GAP … MAX_GAP).
 *   2. Pick a random anchor (start x) so the whole cluster can sit
 *      anywhere — left-heavy, right-heavy, center, etc.
 *
 * Positions are sorted ascending so topological (no-crossing) connections
 * between rows still hold visually.
 */
function randomXPositions(n, rng) {
  const MARGIN = 0.15; // Increased margin to bring nodes closer to the center

  if (n === 1) {
    // Single node: Always exactly in the center (bottleneck/boss)
    return [0.5];
  }

  // Create structured lanes instead of random scattered gaps.
  const step = (1 - 2 * MARGIN) / (n - 1);
  const positions = [];

  for (let i = 0; i < n; i++) {
    // Base position perfectly aligned to a lane
    let basePos = MARGIN + (i * step);
    
    // Add a small amount of random jitter (-3% to +3%) 
    // so it looks organic but maintains structure
    let jitter = (rng() * 0.06) - 0.03;
    
    positions.push(basePos + jitter);
  }

  return positions;
}

/**
 * Generate a non-crossing DAG map with fully randomised structure.
 *
 * Returns { nodes: { [id]: NodeDef }, startIds: string[], bossId: string }
 *
 * NodeDef shape:
 *   { id, row, col, colCount, x, y, type, connections: [id], completed, available }
 *
 * `x` and `y` are normalised [0,1] for canvas positioning.
 */
export function generateMap(seed = Date.now()) {
  const rng = seededRng(seed);

  // ── 1. Randomised vertical positions (order-statistics) ──────────────────
  // Generates ROWS-2 random values for interior rows, sorts them so ordering
  // is always preserved (row 0 at bottom, row ROWS-1 at top), then rescales
  // interior into (0.08 … 0.92) so there's breathing room at both ends.
  const interior = Array.from({ length: ROWS - 2 }, () => rng()).sort((a, b) => a - b);
  const rowY = [0, ...interior.map(v => 0.08 + v * 0.84), 1];

  // ── 2. Column counts per row ──────────────────────────────────────────────
  // Start row: 1, 2, or 3 nodes — equal chance so some runs start narrow.
  // Middle rows: weighted heavily toward 1 (bottleneck) so the silhouette
  //   varies wildly between runs — not always a wide pyramid/house.
  // Boss row: always 1.
  const colCounts = [];
  for (let r = 0; r < ROWS; r++) {
    if (r === ROWS - 1) { colCounts.push(1); continue; } // boss
    if (r === 0) {
      // Start row: 33% each for 1, 2, 3
      const v = rng();
      colCounts.push(v < 0.33 ? 1 : v < 0.66 ? 2 : 3);
      continue;
    }

    // Middle rows: 55% → 1 node (bottleneck), 35% → 2, 10% → 3
    const v = rng();
    if (v < 0.55)      colCounts.push(1);
    else if (v < 0.90) colCounts.push(2);
    else               colCounts.push(3);
  }

  // ── 3. Build node objects ─────────────────────────────────────────────────
  // x positions are fully random per row (not derived from column index),
  // so no two runs share the same lane structure.
  const nodes = {};
  for (let r = 0; r < ROWS; r++) {
    const count    = colCounts[r];
    const xPos     = randomXPositions(count, rng); // sorted ascending

    for (let c = 0; c < count; c++) {
      const id = `n_${r}_${c}`;
      nodes[id] = {
        id,
        row:         r,
        col:         c,
        colCount:    count,
        x:           xPos[c],   // truly random, not column-index formula
        y:           rowY[r],   // seeded random vertical position
        type:        typeForRow(r),
        connections: [],
        completed:   false,
        available:   r === 0,
      };
    }
  }

  // ── 4. Build connections row-by-row (no crossing edges) ───────────────────
  // Because xPos is sorted ascending, col-index-proportional connections
  // still guarantee no visual edge crossings.
  for (let r = 0; r < ROWS - 1; r++) {
    const curCount  = colCounts[r];
    const nextCount = colCounts[r + 1];
    const curIds    = Array.from({ length: curCount  }, (_, c) => `n_${r}_${c}`);
    const nextIds   = Array.from({ length: nextCount }, (_, c) => `n_${r + 1}_${c}`);

    const covered = new Set();

    curIds.forEach((cid, ci) => {
      const target1 = Math.round((ci / (curCount - 1 || 1)) * (nextCount - 1));
      nodes[cid].connections.push(nextIds[target1]);
      covered.add(target1);

      // 40% chance of an extra adjacent connection
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
