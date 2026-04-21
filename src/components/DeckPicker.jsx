import React, { useState } from 'react';
import { loadSaveData } from '../data/MockSaveData';

const MIN_CARDS = 5; // must pick exactly 5

export default function DeckPicker({ onConfirm, isRandom = false }) {
  const data       = loadSaveData();
  const collection = data.playerDeck || [];

  const [selected, setSelected] = useState([]);

  // If Random rule: auto-pick and immediately call onConfirm
  React.useEffect(() => {
    if (isRandom) {
      const shuffled = [...collection].sort(() => 0.5 - Math.random());
      onConfirm(shuffled.slice(0, MIN_CARDS));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRandom]);

  if (isRandom) return (
    <div className="spire-wrapper" style={{ flexDirection: 'column', gap: '16px' }}>
      <h2 style={{ fontFamily: 'Cinzel', color: 'var(--player-color)' }}>Random Rule Active</h2>
      <p style={{ fontFamily: 'Cinzel', opacity: 0.6 }}>Auto-selecting your hand…</p>
    </div>
  );

  const toggle = (card) => {
    const idx = selected.findIndex(s => s.name === card.name);
    if (idx !== -1) {
      setSelected(prev => prev.filter((_, i) => i !== idx));
    } else if (selected.length < MIN_CARDS) {
      setSelected(prev => [...prev, card]);
    }
  };

  return (
    <div className="deck-picker-wrapper">
      <div className="deck-picker-header">
        <h2 className="deck-picker-title">Choose Your Hand</h2>
        <span className="deck-picker-count">
          {selected.length} / {MIN_CARDS} selected
        </span>
      </div>

      <p className="deck-picker-hint">
        Pick exactly {MIN_CARDS} cards from your collection.
      </p>

      <div className="deck-picker-grid">
        {collection.map((card, i) => {
          const isSelected = selected.some(s => s.name === card.name);
          const isDisabled = !isSelected && selected.length >= MIN_CARDS;
          return (
            <div
              key={`${card.name}_${i}`}
              className={`deck-picker-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && toggle(card)}
            >
              <div className="card-bg" style={{ backgroundImage: `url(${card.image})` }} />
              {card.element && <div className="element-icon">{card.element}</div>}
              <div className="stats">
                <span className="t">{card.top}</span>
                <span className="l">{card.left}</span>
                <span className="r">{card.right}</span>
                <span className="b">{card.bottom}</span>
              </div>
              <div className="name-plate">{card.name}</div>
              {isSelected && (
                <div className="pick-badge">
                  {selected.findIndex(s => s.name === card.name) + 1}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="banner-btn deck-picker-confirm"
        disabled={selected.length < MIN_CARDS}
        onClick={() => selected.length === MIN_CARDS && onConfirm(selected)}
        style={{ opacity: selected.length < MIN_CARDS ? 0.4 : 1 }}
      >
        CONFIRM HAND
      </button>
    </div>
  );
}
