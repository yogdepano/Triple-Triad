import { placeCardOnBoard } from './BoardLogic';

export function calculateBestMove(board, aiHand, gridWidth = 3) {
  let bestScore = -Infinity;
  let bestMove = null;

  if (aiHand.length === 0) return null;

  const emptyIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) emptyIndices.push(i);
  }

  if (emptyIndices.length === 0) return null;

  for (let card of aiHand) {
    for (let index of emptyIndices) {
      const { newBoard } = placeCardOnBoard(board, card, index, gridWidth);
      let score = 0;
      newBoard.forEach(c => {
        if (c && c.owner === 'opponent') score++;
      });
      score += Math.random() * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestMove = { card, index };
      }
    }
  }

  return bestMove;
}
