import React, { useState } from 'react';
import GameBoard from './GameBoard';
import DeckPicker from './DeckPicker';
import { buildEnemyDeck, buildMatchConfig } from '../data/EnemyDeckFactory';
import { loadSaveData, saveData } from '../data/MockSaveData';

/**
 * Orchestrates a single adventure node encounter:
 *   DeckPicker → GameBoard (vs AI) → back to map
 *
 * Props:
 *   node        — the selected MapNode (type, id, etc.)
 *   onComplete  — called with { nodeId, wonCards, wonBossCard } after the match
 *   onCancel    — called when player backs out of DeckPicker without fighting
 */
export default function AdventureEncounter({ node, onComplete, onCancel }) {
  const [phase,   setPhase]   = useState('picking'); // 'picking' | 'fighting'
  const [pickedHand, setPickedHand] = useState(null);

  const matchConfig = buildMatchConfig(node.type);
  const enemyDeck   = React.useMemo(() => buildEnemyDeck(node.type), [node.id]);
  const isRandom    = matchConfig.basicRules.includes('random');

  // ── Phase 1: DeckPicker ──────────────────────────────────────────────────
  if (phase === 'picking') {
    return (
      <div className="encounter-overlay">
        <div className="encounter-rules-banner">
          <span className="encounter-rules-label">ACTIVE RULES</span>
          {[...matchConfig.basicRules, matchConfig.specialRule].filter(Boolean).map(r => (
            <span key={r} className={`rule-pill rule-${r} active`}>{r.replace('_', ' ').toUpperCase()}</span>
          ))}
        </div>

        {/* Enemy preview */}
        <div className="encounter-enemy-preview">
          <div className="encounter-enemy-type">
            {node.type === 'boss' ? '👑 BOSS ENCOUNTER' : node.type === 'elite' ? '💀 ELITE' : '👊 COMMON'}
          </div>
          {node.type === 'boss' && matchConfig.specialRule === 'equal' && (
            <div className="encounter-boss-hint">
              ⚠ The boss card can be stolen if <strong>Equal</strong> flips it!
            </div>
          )}
        </div>

        <DeckPicker
          isRandom={isRandom}
          onConfirm={(hand) => { setPickedHand(hand); setPhase('fighting'); }}
        />

        <button className="banner-btn" onClick={onCancel} style={{ marginTop: '12px', opacity: 0.5 }}>
          ← BACK TO MAP
        </button>
      </div>
    );
  }

  // ── Phase 2: GameBoard ───────────────────────────────────────────────────
  // We hook into onReset to detect match completion via save data diff
  const handleReset = () => {
    // Compare save data before/after to detect cards won
    const data = loadSaveData();

    // Detect if a boss card was newly added (boss card names are unique)
    const bossCard = enemyDeck.find(c => c.isBossCard);
    let wonBossCard = null;

    if (bossCard && node.type === 'boss') {
      const alreadyOwned = data.adventureRun?.bossCardsOwned?.includes(bossCard.name);
      const nowInDeck    = data.playerDeck?.some(c => c.name === bossCard.name);
      if (!alreadyOwned && nowInDeck) {
        wonBossCard = bossCard;
        // Record ownership
        const run = { ...(data.adventureRun || {}), bossCardsOwned: [...(data.adventureRun?.bossCardsOwned || []), bossCard.name] };
        saveData({ ...data, adventureRun: run });
      }
    }

    onComplete({ nodeId: node.id, wonBossCard });
  };

  return (
    <GameBoard
      matchConfig={matchConfig}
      onReset={handleReset}
      onRetry={() => setPhase('picking')}
      enemyDeck={enemyDeck}
      initialPlayerHand={pickedHand}
      act1Protection={true}
    />
  );
}
