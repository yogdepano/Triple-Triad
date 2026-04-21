import React, { useState, useEffect } from 'react';
import { loadSaveData, saveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { calculateBestMove } from '../engine/AILogic';
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const DraggableCard = ({ card, disabled }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
    disabled,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : 1 } : {};
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`tt-card ${card.owner} ${isDragging ? 'dragging' : ''}`}
      style={{ ...style, width: '100%', height: '100%' }}
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
    </div>
  );
};

const DroppableCell = ({ id, card, flashClass, element }) => {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !!card });
  return (
    <div ref={setNodeRef} className={`cell ${isOver && !card ? 'hover' : ''}`}>
      {!card && element && <div className="cell-element">{element}</div>}
      {card && (
        <div key={`${card.id}-${card.owner}`} className={`tt-card ${card.owner} on-board ${flashClass || ''}`}>
          <div className="card-bg" style={{ backgroundImage: `url(${card.image})` }} />
          {card.element && <div className="element-icon">{card.element}</div>}
          <div className="stats">
            <span className="t">{card.top}</span>
            <span className="l">{card.left}</span>
            <span className="r">{card.right}</span>
            <span className="b">{card.bottom}</span>
          </div>
          <div className="name-plate">{card.name}</div>
        </div>
      )}
    </div>
  );
};

const RewardPhase = ({ result, playerScore, opponentScore, onReset, board, playerHand, opponentHand, matchConfig, avatarFlippedBy, shields, act1Protection = false }) => {
  const [selections, setSelections] = useState([]);
  const [phaseState, setPhaseState] = useState('summary');
  // Compute all derived data once, stably, using useMemo
  const derived = React.useMemo(() => {
    if (result === 'draw') return null;
    const winner = result === 'win' ? 'player' : 'opponent';
    const loser = winner === 'player' ? 'opponent' : 'player';
    const loserPrefix = winner === 'player' ? 'o_' : 'p_';

    const flippedCards = board.filter(c => c && c.id.startsWith(loserPrefix) && c.owner === winner);
    const picksAllowed = flippedCards.length;

    const specialRule = matchConfig?.specialRule ?? null;
    const isEligible = specialRule != null && avatarFlippedBy[loser] === specialRule;
    const loserShields = shields[loser];
    const isVulnerable = isEligible && loserShields === 0;
    const shieldAbsorbs = isEligible && loserShields > 0;

    const loserBoardCards = board.filter(c => c && c.id.startsWith(loserPrefix));
    const loserUnplayed = loser === 'player' ? playerHand : opponentHand;
    let pool = [...loserBoardCards, ...loserUnplayed];

    if (!isVulnerable) pool = pool.filter(c => !c.isAvatar);

    const uniquePool = Array.from(new Map(pool.map(c => [c.id, c])).values());

    return { winner, loser, picksAllowed, isEligible, isVulnerable, shieldAbsorbs, loserShields, uniquePool };
  }, [result, board, playerHand, opponentHand, matchConfig, avatarFlippedBy, shields]);

  // Burn shield exactly once via effect, not during render
  useEffect(() => {
    if (!derived?.shieldAbsorbs) return;
    const data = loadSaveData();
    if (derived.loser === 'player') data.playerShields = Math.max(0, data.playerShields - 1);
    if (derived.loser === 'opponent') data.opponentShields = Math.max(0, data.opponentShields - 1);
    saveData(data);
  }, [derived?.shieldAbsorbs, derived?.loser]);

  const cfg = {
    win:  { label: 'VICTORY', cls: 'banner-win'  },
    lose: { label: 'DEFEAT',  cls: 'banner-lose' },
    draw: { label: 'DRAW',    cls: 'banner-draw' },
  }[result];

  if (result === 'draw') {
    return (
      <div className={`win-banner ${cfg.cls}`}>
        <div className="banner-title">{cfg.label}</div>
        <div className="banner-score">{playerScore} — {opponentScore}</div>
        <button className="banner-btn" onClick={onReset}>PLAY AGAIN</button>
      </div>
    );
  }

  if (!derived) return null;
  const { winner, loser, picksAllowed, isEligible, isVulnerable, shieldAbsorbs, uniquePool } = derived;

  // Build display pool — shuffle if vulnerable
  const displayPool = isVulnerable
    ? [...uniquePool].sort(() => Math.random() - 0.5)
    : [...uniquePool].sort((a, b) => a.id.localeCompare(b.id));

  const toggleSelection = (card) => {
    if (selections.find(s => s.id === card.id)) {
      setSelections(prev => prev.filter(s => s.id !== card.id));
    } else if (selections.length < picksAllowed) {
      setSelections(prev => [...prev, card]);
    }
  };

  const executeSave = (finalSelections) => {
    const data = loadSaveData();
    const pDeck = [...data.playerDeck];
    const oDeck = [...data.opponentDeck];
    finalSelections.forEach(sel => {
      if (loser === 'player') {
        const idx = pDeck.findIndex(c => c.name === sel.name);
        if (idx !== -1) { const [s] = pDeck.splice(idx, 1); oDeck.push(s); }
      } else {
        const idx = oDeck.findIndex(c => c.name === sel.name);
        if (idx !== -1) { const [s] = oDeck.splice(idx, 1); pDeck.push(s); }
      }
    });
    data.playerDeck = pDeck;
    data.opponentDeck = oDeck;
    saveData(data);
  };

  const confirmLoot = () => {
    executeSave(selections);
    setPhaseState('done');
  };

  const handleAITheft = () => {
    const stolenByAI = [...uniquePool].sort(() => Math.random() - 0.5).slice(0, Math.min(picksAllowed, uniquePool.length));
    executeSave(stolenByAI);
    setSelections(stolenByAI);
    setPhaseState('done');
  };

  if (phaseState === 'summary') {
    return (
      <div className="reward-phase">
        <div className="banner-title">{cfg.label}</div>
        <div style={{fontFamily:'Cinzel', fontSize:'1.2rem', margin:'10px 0'}}>Picks Earned: {picksAllowed}</div>
        {shieldAbsorbs && <div style={{color:'#f1c40f', margin:'10px'}}>⚔ A Shield was consumed to protect the Avatar!</div>}
        {isVulnerable && <div style={{color:'#e74c3c', fontWeight:'bold', fontSize:'1.5rem'}}>💀 AVATAR VULNERABLE!</div>}
        {picksAllowed > 0 ? (
          winner === 'player' ? (
            <button className="banner-btn" onClick={() => setPhaseState('selection')} style={{marginTop:'20px'}}>CLAIM LOOT</button>
          ) : act1Protection ? (
            // Act 1: player is protected — no card stripping on loss
            <button className="banner-btn" onClick={onReset} style={{marginTop:'20px'}}>TRY AGAIN</button>
          ) : (
            <button className="banner-btn" onClick={handleAITheft} style={{marginTop:'20px'}}>CONTINUE</button>
          )
        ) : (
          <button className="banner-btn" onClick={onReset} style={{marginTop:'20px'}}>END MATCH</button>
        )}
      </div>
    );
  }

  if (phaseState === 'selection') {
    const canConfirm = selections.length === picksAllowed || selections.length === uniquePool.length;
    return (
      <div className="reward-phase">
        <h2 style={{fontFamily:'Cinzel'}}>Select {picksAllowed} Card{picksAllowed !== 1 ? 's' : ''}</h2>
        <div style={{fontFamily:'Rajdhani', color:'rgba(255,255,255,0.4)', marginBottom:'10px'}}>
          {selections.length}/{picksAllowed} selected
        </div>
        <div className="loot-pool" style={{display:'flex', gap:'10px', margin:'10px 0', flexWrap:'wrap', justifyContent:'center'}}>
          {displayPool.map(c => {
            const isSelected = !!selections.find(s => s.id === c.id);
            return (
              <div key={c.id} onClick={() => toggleSelection(c)}
                style={{width:'80px', height:'100px', cursor:'pointer',
                  outline: isSelected ? '2px solid #00e6a0' : '2px solid transparent',
                  borderRadius:'8px', filter: isSelected ? 'brightness(1.2)' : 'none',
                  transition:'all 0.15s'}}>
                {isVulnerable ? (
                  <div className="tt-card hidden-card" style={{width:'100%', height:'100%'}}>?</div>
                ) : (
                  <div className="tt-card" style={{width:'100%', height:'100%'}}>
                    <div className="card-bg" style={{ backgroundImage: `url(${c.image})` }} />
                    <div className="stats" style={{fontSize:'0.8rem'}}>
                      <span className="t">{c.top}</span><span className="l">{c.left}</span>
                      <span className="r">{c.right}</span><span className="b">{c.bottom}</span>
                    </div>
                    <div className="name-plate" style={{fontSize:'0.6rem'}}>{c.name}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button className="banner-btn" onClick={confirmLoot} disabled={!canConfirm}
          style={{opacity: canConfirm ? 1 : 0.4, marginTop:'10px'}}>
          CONFIRM
        </button>
      </div>
    );
  }

  // done
  return (
    <div className="reward-phase">
      <h2 style={{fontFamily:'Cinzel'}}>{winner === 'player' ? 'Loot Claimed!' : 'The Enemy Stole Your Cards!'}</h2>
      <div style={{display:'flex', gap:'10px', justifyContent:'center', margin:'15px'}}>
        {selections.map(s => (
          <div key={s.id} className="tt-card" style={{width:'80px', height:'100px'}}>
            <div className="card-bg" style={{ backgroundImage: `url(${s.image})` }} />
            <div className="name-plate" style={{fontSize:'0.6rem'}}>{s.name}</div>
          </div>
        ))}
      </div>
      <button className="banner-btn" onClick={onReset} style={{marginTop:'20px'}}>FINISH</button>
    </div>
  );
};




export default function GameBoard({ matchConfig = { basicRules: ['basic'], specialRule: null, infectionRule: null }, onReset, enemyDeck = null, act1Protection = false }) {
  // Derive flat execution list from slots — used by engine and AI
  const activeRules = [...(matchConfig.basicRules || []), matchConfig.specialRule].filter(Boolean);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [playerHand, setPlayerHand] = useState([]);
  const [opponentHand, setOpponentHand] = useState([]);
  const [turn, setTurn] = useState('player');
  const [activeDrag, setActiveDrag] = useState(null);
  const [flashMap, setFlashMap] = useState({});
  const [gameResult, setGameResult] = useState(null);
  const [boardElements, setBoardElements] = useState(Array(9).fill(null));
  const [avatarFlippedBy, setAvatarFlippedBy] = useState({ player: null, opponent: null });
  const [shields, setShields] = useState({ player: 3, opponent: 3 });

  const initGame = (customPlayerHand = null, customOpponentHand = null) => {
    const data = loadSaveData();
    setBoard(Array(9).fill(null));
    setTurn('player');
    setFlashMap({});
    setGameResult(null);

    const isRandom = activeRules.includes('random');
    const shuffle = arr => [...arr].sort(() => 0.5 - Math.random());
    
    if (customPlayerHand && customOpponentHand) {
      setPlayerHand(customPlayerHand);
      setOpponentHand(customOpponentHand);
    } else if (enemyDeck) {
      // Adventure Mode: player picks their hand externally, enemy deck injected
      const oHand = enemyDeck.map((c, i) => ({ ...c, id: `adv_o_${i}_${Date.now()}`, owner: 'opponent' }));
      // Player hand: use whatever was passed in (from DeckPicker); fall back to save data
      const data = loadSaveData();
      const pRaw = data.playerDeck.filter(c => !c.isAvatar);
      const pHand = (isRandom ? [...pRaw].sort(() => 0.5 - Math.random()) : pRaw).slice(0, 5);
      setPlayerHand(pHand.map((c, i) => ({ ...c, id: `adv_p_${i}_${Date.now()}`, owner: 'player' })));
      setOpponentHand(oHand);
    } else {
      // Restore Avatars to respective owners for testing
      const allCards = [...data.playerDeck, ...data.opponentDeck];
      const pAvatar = allCards.find(c => c.isAvatar && c.name === 'Squall') || { name: 'Squall', top: 'A', right: 9, bottom: 6, left: 'A', element: '✨', isAvatar: true, image: '/card_art_placeholder_1776406291061.png' };
      const oAvatar = allCards.find(c => c.isAvatar && c.name === 'Sephiroth') || { name: 'Sephiroth', top: 'A', right: 'A', bottom: 9, left: 'A', element: '🌑', isAvatar: true, image: '/card_art_placeholder_1776406291061.png' };

      let pPool = data.playerDeck.filter(c => !c.isAvatar);
      let oPool = data.opponentDeck.filter(c => !c.isAvatar);

      const makeFallback = () => ({ name: 'Conscript', top: Math.floor(Math.random()*5)+1, right: Math.floor(Math.random()*5)+1, bottom: Math.floor(Math.random()*5)+1, left: Math.floor(Math.random()*5)+1, element: null, image: '/card_art_placeholder_1776406291061.png' });
      while (pPool.length < 4) pPool.push(pPool.length > 0 ? {...pPool[0]} : makeFallback());
      while (oPool.length < 4) oPool.push(oPool.length > 0 ? {...oPool[0]} : makeFallback());

      if (isRandom) {
        pPool = shuffle(pPool);
        oPool = shuffle(oPool);
      }

      // Always guarantee Avatar + 4 cards
      const pHand = [pAvatar, ...pPool.slice(0, 4)];
      const oHand = [oAvatar, ...oPool.slice(0, 4)];

      setPlayerHand(pHand.map((c, i) => ({ ...c, id: `p_${i}_${Date.now()}`, owner: 'player' })));
      setOpponentHand(oHand.map((c, i) => ({ ...c, id: `o_${i}_${Date.now()}`, owner: 'opponent' })));
    }
    
    setShields({ player: data.playerShields || 3, opponent: data.opponentShields || 3 });
    setAvatarFlippedBy({ player: null, opponent: null });

    const newElements = Array(9).fill(null);
    if (activeRules.includes('elemental')) {
      const elTypes = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑'];
      let numToPlace = Math.floor(Math.random() * 3) + 2; // 2-4
      while (numToPlace > 0) {
        const idx = Math.floor(Math.random() * 9);
        if (!newElements[idx]) {
          newElements[idx] = elTypes[Math.floor(Math.random() * elTypes.length)];
          numToPlace--;
        }
      }
    }
    setBoardElements(newElements);
  };

  useEffect(() => { initGame(); }, []);

  const checkWin = (b) => {
    if (b.some(c => c === null)) return null;
    const ps = b.filter(c => c?.owner === 'player').length;
    const os = b.filter(c => c?.owner === 'opponent').length;
    return ps > os ? 'win' : os > ps ? 'lose' : 'draw';
  };

  const executeMove = (card, position) => {
    const { newBoard, capturedBy } = placeCardOnBoard(board, card, position, 3, activeRules, boardElements);
    setBoard(newBoard);

    // Flash special captures
    const toFlash = {};
    const newAvatarFlippedBy = { ...avatarFlippedBy };

    Object.entries(capturedBy).forEach(([idx, rule]) => {
      if (['same', 'plus', 'equal', 'combo'].includes(rule)) toFlash[idx] = rule;
      if (newBoard[idx].isAvatar) {
        // If it was captured, it is now owned by `card.owner`, meaning it originally belonged to the other player.
        const originalOwner = newBoard[idx].owner === 'player' ? 'opponent' : 'player';
        newAvatarFlippedBy[originalOwner] = rule;
      }
    });
    setAvatarFlippedBy(newAvatarFlippedBy);

    if (Object.keys(toFlash).length) {
      setFlashMap(toFlash);
      setTimeout(() => setFlashMap({}), 750);
    }

    let newPlayerHand = playerHand;
    let newOpponentHand = opponentHand;

    if (card.owner === 'player') {
      newPlayerHand = playerHand.filter(c => c.id !== card.id);
      setPlayerHand(newPlayerHand);
    } else {
      newOpponentHand = opponentHand.filter(c => c.id !== card.id);
      setOpponentHand(newOpponentHand);
    }

    const result = checkWin(newBoard);

    if (result) {
      if (result === 'draw' && activeRules.includes('sudden_death')) {
        // Sudden Death: keep current possession and immediately restart
        const newPHand = [...newPlayerHand, ...newBoard.filter(c => c?.owner === 'player')].map((c, i) => ({...c, id: `sd_p_${i}_${Date.now()}`}));
        const newOHand = [...newOpponentHand, ...newBoard.filter(c => c?.owner === 'opponent')].map((c, i) => ({...c, id: `sd_o_${i}_${Date.now()}`}));
        
        setTimeout(() => initGame(newPHand, newOHand), 1500);
      } else {
        setGameResult(result);
      }
    } else {
      setTurn(t => t === 'player' ? 'opponent' : 'player');
    }
  };

  const handleDragStart = e => setActiveDrag(e.active.data.current?.card);
  const handleDragEnd = e => {
    setActiveDrag(null);
    if (gameResult || !e.over || !e.active.data.current?.card) return;
    const idx = parseInt(e.over.id.replace('cell-', ''), 10);
    if (!board[idx]) executeMove(e.active.data.current.card, idx);
  };

  useEffect(() => {
    if (gameResult || turn !== 'opponent' || !board.includes(null)) return;
    const t = setTimeout(() => {
      const move = calculateBestMove(board, opponentHand, 3, activeRules, boardElements);
      if (move) executeMove(move.card, move.index);
    }, 900);
    return () => clearTimeout(t);
  }, [turn, board, opponentHand, gameResult]);

  const playerScore   = board.filter(c => c?.owner === 'player').length;
  const opponentScore = board.filter(c => c?.owner === 'opponent').length;

  // Turn indicator text
  const turnLabel = gameResult ? '' : turn === 'player' ? 'Your Turn' : 'Opponent…';

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="spire-wrapper">

        {/* Win / Draw / Lose overlay */}
        {gameResult && (
          <RewardPhase 
            result={gameResult} 
            playerScore={playerScore} 
            opponentScore={opponentScore} 
            onReset={onReset} 
            board={board}
            playerHand={playerHand}
            opponentHand={opponentHand}
            matchConfig={matchConfig}
            avatarFlippedBy={avatarFlippedBy}
            shields={shields}
            act1Protection={act1Protection}
          />
        )}

        {/* ── Player Hand (left) ── */}
        <div className="game-row">
          {/* ─ Top UI: Shields ─ */}
          <div style={{position:'absolute', top:'10px', left:'20px', zIndex:10, fontFamily:'Cinzel', color:'rgba(255,255,255,0.7)'}}>
            P-Shields: {shields.player}/3
          </div>
          <div style={{position:'absolute', top:'10px', right:'20px', zIndex:10, fontFamily:'Cinzel', color:'rgba(255,255,255,0.7)'}}>
            O-Shields: {shields.opponent}/3
          </div>

          <div className="player-column">
            {playerHand.map(c => (
              <div key={c.id} className="hand-card-slot">
                <DraggableCard card={c} disabled={turn !== 'player' || !!gameResult} />
              </div>
            ))}
          </div>

          {/* ── Board + Score (center) ── */}
          <div className="board-area">
            <div className="score-row">
              <span className="score-player">{playerScore}</span>
              <span className="score-sep">—</span>
              <span className="score-opp">{opponentScore}</span>
              <span className="turn-label">{turnLabel}</span>
            </div>
            <div className="board grid-3x3">
              {board.map((c, i) => (
                <DroppableCell
                  key={`cell-${i}`}
                  id={`cell-${i}`}
                  card={c}
                  element={boardElements[i]}
                  flashClass={flashMap[i] ? `captured-${flashMap[i]}` : ''}
                />
              ))}
            </div>
          </div>

          {/* ── Opponent Hand (right) ── */}
          <div className="opponent-column">
            {opponentHand.map(c => (
              <div key={c.id} className="hand-card-slot">
                {activeRules.includes('open') || gameResult ? (
                  <div className="tt-card opponent" style={{ width: '100%', height: '100%' }}>
                    <div className="card-bg" style={{ backgroundImage: `url(${c.image})` }} />
                    {c.element && <div className="element-icon">{c.element}</div>}
                    <div className="stats">
                      <span className="t">{c.top}</span>
                      <span className="l">{c.left}</span>
                      <span className="r">{c.right}</span>
                      <span className="b">{c.bottom}</span>
                    </div>
                    <div className="name-plate">{c.name}</div>
                  </div>
                ) : (
                  <div className="tt-card opponent hidden-card" style={{ width: '100%', height: '100%' }}>?</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag ? (
            <div className={`tt-card ${activeDrag.owner}`} style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}>
              <div className="card-bg" style={{ backgroundImage: `url(${activeDrag.image})` }} />
              {activeDrag.element && <div className="element-icon">{activeDrag.element}</div>}
              <div className="stats">
                <span className="t">{activeDrag.top}</span>
                <span className="l">{activeDrag.left}</span>
                <span className="r">{activeDrag.right}</span>
                <span className="b">{activeDrag.bottom}</span>
              </div>
              <div className="name-plate">{activeDrag.name}</div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
