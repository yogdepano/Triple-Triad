import { placeCardOnBoard } from './BoardLogic';

export function calculateBestMove(board, aiHand, gridWidth = 3, activeRules = ['basic'], boardElements = null) {
  let bestScore = -Infinity;
  let bestMove = null;

  if (aiHand.length === 0) return null;

  const emptyIndices = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) emptyIndices.push(i);
  }
  if (emptyIndices.length === 0) return null;

  const aiOwner = aiHand[0]?.owner;

  for (const card of aiHand) {
    for (const index of emptyIndices) {
      const { newBoard, capturedBy } = placeCardOnBoard(board, card, index, gridWidth, activeRules, boardElements);

      let score = 0;

      // Count owned cards after the move
      newBoard.forEach(c => {
        if (c && c.owner === aiOwner) score++;
      });

      // Bonus: reward special combos heavily since they flip multiple cards
      const specialCaptures = Object.values(capturedBy).filter(r => ['same', 'plus', 'equal', 'combo'].includes(r)).length;
      score += specialCaptures * 2;

      // Positional bonus: prefer center/corner on small grids (3x3)
      if (gridWidth === 3) {
        if (index === 4) score += 0.5; // center
        if ([0, 2, 6, 8].includes(index)) score += 0.3; // corners
      }

      // Tiebreak with small random noise
      score += Math.random() * 0.05;

      if (score > bestScore) {
        bestScore = score;
        bestMove = { card, index };
      }
    }
  }

  return bestMove;
}
