export function getCardEffectiveValue(v, modifier = 0) {
  let val = v === 'A' ? 10 : parseInt(v, 10);
  val += modifier;
  if (val < 1) val = 1;
  return val;
}

export function placeCardOnBoard(board, card, position, gridWidth = 3, activeRules = ['basic'], boardElements = null) {
  const newBoard = [...board];
  newBoard[position] = { ...card, owner: card.owner };

  const capturedBy = {};
  const captureSequence = [];
  const comboQueue = [];

  const getModifier = (c, pos) => {
    if (!activeRules.includes('elemental') || !boardElements || !boardElements[pos] || !c) return 0;
    return c.element === boardElements[pos] ? 1 : -1;
  };
  const ownMod = getModifier(card, position);

  const getAdjacents = (c, pos) => {
    const adj = [];
    const row = Math.floor(pos / gridWidth);
    const col = pos % gridWidth;
    const gridHeight = Math.floor(board.length / gridWidth);
    const mod = getModifier(c, pos);

    // Actual adjacents
    if (row > 0 && newBoard[pos - gridWidth]) adj.push({ dir: 'top', index: pos - gridWidth, ownVal: getCardEffectiveValue(c.top, mod), theirVal: getCardEffectiveValue(newBoard[pos - gridWidth].bottom, getModifier(newBoard[pos - gridWidth], pos - gridWidth)), theirCard: newBoard[pos - gridWidth] });
    if (col < gridWidth - 1 && newBoard[pos + 1]) adj.push({ dir: 'right', index: pos + 1, ownVal: getCardEffectiveValue(c.right, mod), theirVal: getCardEffectiveValue(newBoard[pos + 1].left, getModifier(newBoard[pos + 1], pos + 1)), theirCard: newBoard[pos + 1] });
    if (row < gridHeight - 1 && newBoard[pos + gridWidth]) adj.push({ dir: 'bottom', index: pos + gridWidth, ownVal: getCardEffectiveValue(c.bottom, mod), theirVal: getCardEffectiveValue(newBoard[pos + gridWidth].top, getModifier(newBoard[pos + gridWidth], pos + gridWidth)), theirCard: newBoard[pos + gridWidth] });
    if (col > 0 && newBoard[pos - 1]) adj.push({ dir: 'left', index: pos - 1, ownVal: getCardEffectiveValue(c.left, mod), theirVal: getCardEffectiveValue(newBoard[pos - 1].right, getModifier(newBoard[pos - 1], pos - 1)), theirCard: newBoard[pos - 1] });

    // Virtual walls
    if (activeRules.includes('same_wall') || activeRules.includes('same')) {
      if (row === 0) adj.push({ dir: 'wall_top', index: -1, ownVal: getCardEffectiveValue(c.top, mod), theirVal: 10, theirCard: { owner: 'wall' } });
      if (col === gridWidth - 1) adj.push({ dir: 'wall_right', index: -1, ownVal: getCardEffectiveValue(c.right, mod), theirVal: 10, theirCard: { owner: 'wall' } });
      if (row === gridHeight - 1) adj.push({ dir: 'wall_bottom', index: -1, ownVal: getCardEffectiveValue(c.bottom, mod), theirVal: 10, theirCard: { owner: 'wall' } });
      if (col === 0) adj.push({ dir: 'wall_left', index: -1, ownVal: getCardEffectiveValue(c.left, mod), theirVal: 10, theirCard: { owner: 'wall' } });
    }
    return adj;
  };

  const adjacentCards = getAdjacents(card, position);

  // --- EQUAL Rule ---
  if (activeRules.includes('equal')) {
    adjacentCards.forEach(adj => {
      if (adj.index >= 0 && adj.theirCard.owner !== card.owner && adj.theirCard.owner !== 'wall' && adj.ownVal === adj.theirVal) {
        if (!capturedBy[adj.index]) {
          capturedBy[adj.index] = 'equal';
          captureSequence.push(adj.index);
          comboQueue.push(adj.index);
        }
      }
    });
  }

  // --- SAME & SAME WALL Rule ---
  if (activeRules.includes('same') || activeRules.includes('same_wall')) {
    const sameFlips = [];
    adjacentCards.forEach(adj => {
      if (adj.ownVal === adj.theirVal) {
        // Wall matches only count if same_wall is active
        if (adj.index === -1 && !activeRules.includes('same_wall')) return;
        sameFlips.push(adj.index);
      }
    });
    // Requires SAME to be active to actually flip, otherwise it just counts but does nothing
    if (activeRules.includes('same') && sameFlips.length >= 2) {
      sameFlips.forEach(idx => {
        if (idx >= 0 && newBoard[idx].owner !== card.owner) {
          if (!capturedBy[idx]) {
            capturedBy[idx] = 'same';
            captureSequence.push(idx);
            comboQueue.push(idx);
          }
        }
      });
    }
  }

  // --- PLUS Rule ---
  if (activeRules.includes('plus')) {
    const sumMap = {};
    adjacentCards.forEach(adj => {
      const sum = adj.ownVal + adj.theirVal;
      if (!sumMap[sum]) sumMap[sum] = [];
      sumMap[sum].push(adj.index);
    });
    Object.values(sumMap).forEach(indices => {
      if (indices.length >= 2) {
        indices.forEach(idx => {
          if (idx >= 0 && newBoard[idx].owner !== card.owner && newBoard[idx].owner !== 'wall') {
            if (!capturedBy[idx]) { 
              capturedBy[idx] = 'plus'; 
              captureSequence.push(idx);
              comboQueue.push(idx); 
            }
          }
        });
      }
    });
  }

  // --- BASIC Rule ---
  if (activeRules.includes('basic')) {
    adjacentCards.forEach(adj => {
      if (adj.index >= 0 && adj.theirCard.owner !== card.owner && adj.theirCard.owner !== 'wall' && adj.ownVal > adj.theirVal) {
        if (!capturedBy[adj.index]) {
          capturedBy[adj.index] = 'basic';
          captureSequence.push(adj.index);
        }
      }
    });
  }

  // Execute initial captures in newBoard
  captureSequence.forEach(idx => {
    newBoard[idx] = { ...newBoard[idx], owner: card.owner };
  });

  // --- COMBO Rule ---
  if (activeRules.includes('combo')) {
    while (comboQueue.length > 0) {
      const comboOriginIdx = comboQueue.shift();
      const comboCard = newBoard[comboOriginIdx];
      const comboAdjacents = getAdjacents(comboCard, comboOriginIdx);
      
      comboAdjacents.forEach(adj => {
        if (adj.index >= 0 && adj.theirCard.owner !== card.owner && adj.theirCard.owner !== 'wall' && adj.ownVal > adj.theirVal) {
          if (!capturedBy[adj.index]) {
            capturedBy[adj.index] = 'combo';
            captureSequence.push(adj.index);
            comboQueue.push(adj.index);
            newBoard[adj.index] = { ...newBoard[adj.index], owner: card.owner };
          }
        }
      });
    }
  }

  return { newBoard, capturedBy, captureSequence };
}
