export function getCardValue(v) {
  return v === 'A' ? 10 : parseInt(v, 10);
}

export function placeCardOnBoard(board, card, position, gridWidth = 3) {
  const newBoard = [...board];
  newBoard[position] = card;
  const adjacentCards = [];

  const row = Math.floor(position / gridWidth);
  const col = position % gridWidth;

  if (row > 0 && newBoard[position - gridWidth]) adjacentCards.push({ index: position - gridWidth, ownVal: card.top, theirVal: newBoard[position - gridWidth].bottom, theirCard: newBoard[position - gridWidth] });
  if (col < gridWidth - 1 && newBoard[position + 1]) adjacentCards.push({ index: position + 1, ownVal: card.right, theirVal: newBoard[position + 1].left, theirCard: newBoard[position + 1] });
  if (row < gridWidth - 1 && newBoard[position + gridWidth]) adjacentCards.push({ index: position + gridWidth, ownVal: card.bottom, theirVal: newBoard[position + gridWidth].top, theirCard: newBoard[position + gridWidth] });
  if (col > 0 && newBoard[position - 1]) adjacentCards.push({ index: position - 1, ownVal: card.left, theirVal: newBoard[position - 1].right, theirCard: newBoard[position - 1] });

  const captures = [];

  adjacentCards.forEach(adj => {
    if (adj.theirCard.owner !== card.owner) {
      if (getCardValue(adj.ownVal) > getCardValue(adj.theirVal)) {
        captures.push(adj.index);
      }
    }
  });

  captures.forEach(idx => {
    newBoard[idx] = { ...newBoard[idx], owner: card.owner };
  });

  return { newBoard };
}
