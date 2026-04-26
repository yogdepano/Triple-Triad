import React, { useState, useEffect } from 'react';
import { loadSaveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { calculateBestMove } from '../engine/AILogic';
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const DraggableCard = ({ card, disabled }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
    disabled
  });
  
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : 1 } : {};
  
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`tt-card ${card.owner} ${isDragging ? 'dragging' : ''}`} style={style}>
      <div className="card-bg" style={{ backgroundImage: `url(${card.image})` }}></div>
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

const DroppableCell = ({ id, card }) => {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !!card });
  
  return (
    <div ref={setNodeRef} className={`cell ${isOver && !card ? 'hover' : ''}`}>
      {card ? (
        <div key={`${card.id}-${card.owner}`} className={`tt-card ${card.owner} on-board`}>
          <div className="card-bg" style={{ backgroundImage: `url(${card.image})` }}></div>
          <div className="stats">
            <span className="t">{card.top}</span>
            <span className="l">{card.left}</span>
            <span className="r">{card.right}</span>
            <span className="b">{card.bottom}</span>
          </div>
          <div className="name-plate">{card.name}</div>
        </div>
      ) : null}
    </div>
  );
};

export default function WorldBossRaid({ activeRules = ['basic'] }) {
  const [board, setBoard] = useState(Array(49).fill(null));
  const [rosterHands, setRosterHands] = useState(Array(10).fill([]));
  const [boss1Hand, setBoss1Hand] = useState([]);
  const [boss2Hand, setBoss2Hand] = useState([]);
  
  const [pairIndex, setPairIndex] = useState(0); 
  const TURN_CYCLE = ['boss1', 'activeA', 'boss2', 'activeB'];
  const [turnIndex, setTurnIndex] = useState(0);
  const currentTurn = TURN_CYCLE[turnIndex];
  
  const [activeDragCard, setActiveDragCard] = useState(null);

  useEffect(() => {
    resetGame();
  }, []);

  const resetGame = () => {
    const data = loadSaveData();
    setBoard(Array(49).fill(null));
    setTurnIndex(0);
    setPairIndex(0);

    const buildHand = (pool, size, prefix, owner) => {
      const avatars = pool.filter(c => c.isAvatar);
      const nonAvatars = pool.filter(c => !c.isAvatar);
      const hand = [];
      
      const uniqueAvatars = Array.from(new Set(avatars.map(a => a.name)))
        .map(name => avatars.find(a => a.name === name));
      
      uniqueAvatars.forEach((av, i) => {
        if (hand.length < size) {
          hand.push({ ...av, id: `${prefix}_av_${i}`, owner });
        }
      });

      if (nonAvatars.length > 0) {
        while (hand.length < size) {
          const card = nonAvatars[Math.floor(Math.random() * nonAvatars.length)];
          hand.push({ ...card, id: `${prefix}_${hand.length}`, owner });
        }
      } else {
        while (hand.length < size) {
          const card = pool[Math.floor(Math.random() * pool.length)];
          hand.push({ ...card, id: `${prefix}_${hand.length}`, owner });
        }
      }
      return hand.sort(() => Math.random() - 0.5);
    };

    const b1 = buildHand(data.opponentDeck, 25, 'b1', 'boss1');
    const b2 = buildHand(data.opponentDeck, 25, 'b2', 'boss2');
    
    const newRoster = Array(10).fill(null).map((_, pNum) => {
        return buildHand(data.playerDeck, 5, `p${pNum}`, `player_${pNum}`);
    });

    setBoss1Hand(b1);
    setBoss2Hand(b2);
    setRosterHands(newRoster);
  };


  const activeIndexA = pairIndex * 2;
  const activeIndexB = pairIndex * 2 + 1;
  const activeHandA = rosterHands[activeIndexA] || [];
  const activeHandB = rosterHands[activeIndexB] || [];

  const executeMove = (placedCard, targetIndex) => {
    const { newBoard } = placeCardOnBoard(board, placedCard, targetIndex, 7, activeRules);
    setBoard(newBoard);
    
    if (placedCard.owner.startsWith('player')) {
      setRosterHands(prev => {
         const up = [...prev];
         const index = parseInt(placedCard.owner.replace('player_', ''), 10);
         up[index] = up[index].filter(c => c.id !== placedCard.id);
         return up;
      });

      if (placedCard.owner === `player_${activeIndexB}`) {
         setPairIndex(prev => (prev + 1) % 5);
      }
    } else if (placedCard.owner === 'boss1') {
      setBoss1Hand(prev => prev.filter(c => c.id !== placedCard.id));
    } else if (placedCard.owner === 'boss2') {
      setBoss2Hand(prev => prev.filter(c => c.id !== placedCard.id));
    }

    setTurnIndex(prev => (prev + 1) % 4);
  };

  const handleDragStart = event => setActiveDragCard(event.active.data.current?.card);
  const handleDragEnd = event => {
    setActiveDragCard(null);
    if (event.over && event.active.data.current?.card) {
      const idx = parseInt(event.over.id.replace('raid-cell-', ''), 10);
      if (!board[idx]) {
        executeMove(event.active.data.current.card, idx);
      }
    }
  };

  useEffect(() => {
    const runBoss = (hand) => {
      const bestMove = calculateBestMove(board, hand, 7);
      if (bestMove) executeMove(bestMove.card, bestMove.index);
      else setTurnIndex(prev => (prev + 1) % 4);
    };

    if (currentTurn === 'boss1' && boss1Hand.length > 0) {
      const timer = setTimeout(() => runBoss(boss1Hand), 1200);
      return () => clearTimeout(timer);
    } else if (currentTurn === 'boss2' && boss2Hand.length > 0) {
      const timer = setTimeout(() => runBoss(boss2Hand), 1200);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, board, boss1Hand, boss2Hand]);

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="raid-wrapper" style={{ flexDirection: 'column' }}>
        <button onClick={resetGame} style={{ position: 'absolute', top: '15px', right: '20px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--player-color)', color: 'white', cursor: 'pointer', fontFamily: 'Cinzel', zIndex: 1000}}>Reset Run</button>

        {/* Main Area: Boss Decks + Board */}
        <div className="raid-top-row" style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Left Column: Boss Decks (Compact) */}
          <div className="side-column boss-align" style={{ width: '140px', minWidth: '140px' }}>
            <div className="slot-container" style={{ opacity: currentTurn === 'boss1' ? 1 : 0.5, alignItems:'center', display:'flex', flexDirection:'column' }}>
              <div style={{color:'var(--opponent-color)', fontWeight:'bold', fontSize: '0.7rem'}}>Boss 1 ({boss1Hand.length})</div>
              <div className="mini-hand" style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                 {boss1Hand.slice(0,4).map((c, i) => <div key={c.id} className="tt-card boss1 hidden-card" style={{ width: '40px', height: '60px', fontSize: '10px' }}>?</div>)}
              </div>
            </div>
            <div className="slot-container" style={{ opacity: currentTurn === 'boss2' ? 1 : 0.5, alignItems:'center', display:'flex', flexDirection:'column', marginTop: '15px' }}>
              <div style={{color:'var(--opponent-color)', fontWeight:'bold', fontSize: '0.7rem'}}>Boss 2 ({boss2Hand.length})</div>
              <div className="mini-hand" style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                 {boss2Hand.slice(0,4).map((c, i) => <div key={c.id} className="tt-card boss2 hidden-card" style={{ width: '40px', height: '60px', fontSize: '10px' }}>?</div>)}
              </div>
            </div>
          </div>

          {/* Center: Board */}
          <div className="board-container raid-board-container" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div className="board grid-7x7" style={{ height: 'calc(100vh - 240px)' }}>
              {board.map((c, i) => <DroppableCell key={`raid-cell-${i}`} id={`raid-cell-${i}`} card={c} />)}
            </div>
          </div>
        </div>

        {/* Bottom Area: Player Hands Truly Horizontal */}
        <div className="raid-bottom-row" style={{ display: 'flex', width: '100%', gap: '20px', justifyContent: 'center', padding: '10px 0', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div className="slot-container" style={{ opacity: currentTurn === 'activeA' ? 1 : 0.5, display:'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{color:'var(--player-color)', fontWeight:'bold', fontSize: '0.7rem', writingMode: 'vertical-lr', transform: 'rotate(180deg)'}}>P{activeIndexA + 1}</div>
            <div className="mini-hand" style={{ display: 'flex', gap: '6px' }}>
               {activeHandA.map(c => (
                 <div key={c.id} style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}>
                   <DraggableCard card={c} disabled={currentTurn !== 'activeA'} />
                 </div>
               ))}
            </div>
          </div>
          
          <div style={{ width: '2px', background: 'rgba(255,255,255,0.1)', height: '100%' }} />

          <div className="slot-container" style={{ opacity: currentTurn === 'activeB' ? 1 : 0.5, display:'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{color:'var(--player-color)', fontWeight:'bold', fontSize: '0.7rem', writingMode: 'vertical-lr', transform: 'rotate(180deg)'}}>P{activeIndexB + 1}</div>
            <div className="mini-hand" style={{ display: 'flex', gap: '6px' }}>
               {activeHandB.map(c => (
                 <div key={c.id} style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}>
                   <DraggableCard card={c} disabled={currentTurn !== 'activeB'} />
                 </div>
               ))}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragCard ? (
            <div className={`tt-card ${activeDragCard.owner}`} style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}>
              <div className="card-bg" style={{ backgroundImage: `url(${activeDragCard.image})` }}></div>
              <div className="stats">
                <span className="t">{activeDragCard.top}</span>
                <span className="l">{activeDragCard.left}</span>
                <span className="r">{activeDragCard.right}</span>
                <span className="b">{activeDragCard.bottom}</span>
              </div>
              <div className="name-plate">{activeDragCard.name}</div>
            </div>
          ) : null}
        </DragOverlay>

      </div>
    </DndContext>
  );
}
