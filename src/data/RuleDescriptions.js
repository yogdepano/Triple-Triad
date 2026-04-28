export const RULE_DESCRIPTIONS = {
  basic: "Higher stats capture adjacent enemy cards with lower opposing stats.",
  open: "All cards in both players' hands are fully visible to everyone.",
  same: "If a placed card's stats exactly equal the stats of adjacent enemy cards on two or more sides, those enemy cards are captured.",
  same_wall: "Treats the outer edges of the board as 'A' (10) for the purpose of the 'Same' rule.",
  plus: "If the sum of a placed card's stats and adjacent enemy cards' stats are equal on two or more sides, those enemy cards are captured.",
  equal: "If a placed card's stat exactly equals a single adjacent enemy card's stat, it immediately captures it.",
  combo: "Cards captured by Same, Plus, or Equal can then capture their own adjacent enemy cards as if they were just placed.",
  elemental: "Placing a card on a matching elemental tile boosts its stats by +1. Mismatched tiles reduce its stats by -1.",
  random: "Your hand is drawn completely at random from your available deck.",
  sudden_death: "If a match ends in a draw, a new match immediately begins using the cards currently owned by each player."
};
