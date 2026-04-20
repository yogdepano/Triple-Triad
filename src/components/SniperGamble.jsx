import React, { useState, useEffect } from 'react';
import { consumeShield } from '../data/MockSaveData';

export default function SniperGamble({ winner, matchFlips, opponentDeck, playerDeck, onComplete }) {
  const [phase, setPhase] = useState('SHUFFLE'); // SHUFFLE, SHIELD_PROMPT, CONSOLATION, PITY
  const [pool, setPool] = useState([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);

  useEffect(() => {
    // Initialize pool
    const targetDeck = winner === 'player' ? opponentDeck : playerDeck;
    const poolSize = typeof matchFlips === 'number' && matchFlips > 0 ? matchFlips : 1; 
    
    // Pick 'poolSize' random cards from targetDeck to be in the pool
    // In a real app we'd properly shuffle, but for simple mock we'll just slice or random sort
    const shuffled = [...targetDeck].sort(() => 0.5 - Math.random());
    const selectedPool = shuffled.slice(0, Math.min(poolSize, targetDeck.length)).map(card => ({
      ...card,
      revealed: false,
      pity: false
    }));
    
    setPool(selectedPool);
  }, [winner, matchFlips, opponentDeck, playerDeck]);

  const handleCardPick = (index) => {
    if (phase !== 'SHUFFLE' && phase !== 'CONSOLATION') return;
    
    const pickedCard = pool[index];
    setSelectedCardIndex(index);
    
    if (phase === 'SHUFFLE') {
      if (pickedCard.isAvatar) {
        setPhase('SHIELD_PROMPT');
      } else {
        // Just a normal card picked. Move to Pity
        setPhase('PITY');
      }
    } else if (phase === 'CONSOLATION') {
      if (pickedCard.isAvatar) return; // Cannot pick avatar in consolation
      setPhase('PITY');
    }
  };

  const handleShieldResponse = (useShield) => {
    if (useShield) {
      const consumed = consumeShield();
      if (consumed) {
        alert("Shield used! Avatar transfer blocked.");
        setPhase('CONSOLATION');
        return;
      } else {
        alert("No shields remaining!");
        // Proceeds to take avatar
      }
    }
    setPhase('PITY');
  };

  useEffect(() => {
    if (phase === 'PITY') {
      const pityTimer = setTimeout(() => {
        onComplete();
      }, 3500);
      return () => clearTimeout(pityTimer);
    }
  }, [phase, onComplete]);

  return (
    <div className="gamble-overlay">
      <h2 className="gamble-title">Sniper Gamble</h2>
      
      {phase === 'SHIELD_PROMPT' && (
        <div className="gamble-prompt">
          <p>Avatar Steal Detected! Use 1/3 Shield to Block?</p>
          <button className="gamble-btn accept" onClick={() => handleShieldResponse(true)}>USE SHIELD</button>
          <button className="gamble-btn" onClick={() => handleShieldResponse(false)}>ACCEPT FATE</button>
        </div>
      )}

      {phase === 'CONSOLATION' && (
        <div style={{ color: 'var(--neon-green)', marginBottom: '1rem', fontSize: '1.2rem', textAlign: 'center' }}>
          Avatar blocked! Pick 1 remaining face-up card as your Consolation.
        </div>
      )}

      {phase === 'PITY' && (
        <div style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1rem', textAlign: 'center' }}>
          Selection confirmed. Closing gamble...
        </div>
      )}

      <div className="gamble-pool">
        {pool.map((card, idx) => {
          const isSelected = selectedCardIndex === idx;
          let uiState = 'face-down';
          
          if (phase === 'SHIELD_PROMPT' && isSelected) {
            uiState = card.isAvatar ? 'face-up avatar' : 'face-up';
          } else if (phase === 'CONSOLATION') {
            uiState = card.isAvatar ? 'face-up avatar pity' : (isSelected ? 'face-up' : 'face-up consolation-pick');
          } else if (phase === 'PITY') {
            uiState = isSelected ? (card.isAvatar && !pool.some(c=>c.pity) ? 'face-up avatar' : 'face-up') : 'face-up pity';
          }

          return (
            <div 
              key={idx} 
              className={`gamble-card ${uiState}`}
              onClick={() => handleCardPick(idx)}
            >
              {uiState.includes('face-up') ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.2rem', color: card.owner === 'player'? 'var(--neon-green)' : 'var(--neon-red)' }}>
                   {card.top}<br/>{card.left} {card.right}<br/>{card.bottom}
                  </span>
                  <span style={{ fontSize: '0.6rem', marginTop: '5px' }}>{card.name}</span>
                </div>
              ) : (
                <span style={{ color: 'var(--neon-green)', fontSize: '2rem' }}>?</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
