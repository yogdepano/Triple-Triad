import React, { useState, useEffect } from 'react';
import { loadSaveData } from '../data/MockSaveData';
import { generateCard } from '../data/CardDatabase';
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
  const [rosterHands, setRosterHands] = useState(Array(6).fill([]));
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

    // Generate Boss Decks (25 cards each, mostly Elite/Legendary)
    const b1 = Array.from({ length: 25 }, () => generateCard(Math.random() < 0.3 ? 'LEGENDARY' : 'ELITE', 'boss1'));
    const b2 = Array.from({ length: 25 }, () => generateCard(Math.random() < 0.3 ? 'LEGENDARY' : 'ELITE', 'boss2'));
    
    // Generate Player Roster (6 players, 5 cards each)
    const newRoster = Array(6).fill(null).map((_, pNum) => {
        return Array.from({ length: 5 }, () => generateCard(Math.random() < 0.4 ? 'ELITE' : 'RARE', `player_${pNum}`));
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
    const { newBoard, captureSequence } = placeCardOnBoard(board, placedCard, targetIndex, 7, activeRules);
    
    // 1. Place initial card
    const boardWithPlacedCard = [...board];
    boardWithPlacedCard[targetIndex] = { ...placedCard, owner: placedCard.owner };
    setBoard(boardWithPlacedCard);
    
    // 2. Remove from respective hand
    if (placedCard.owner.startsWith('player')) {
      setRosterHands(prev => {
         const up = [...prev];
         const index = parseInt(placedCard.owner.replace('player_', ''), 10);
         up[index] = up[index].filter(c => c.id !== placedCard.id);
         return up;
      });
    } else if (placedCard.owner === 'boss1') {
      setBoss1Hand(prev => prev.filter(c => c.id !== placedCard.id));
    } else if (placedCard.owner === 'boss2') {
      setBoss2Hand(prev => prev.filter(c => c.id !== placedCard.id));
    }

    // 3. Define finalization
    const finalize = (finalBoard) => {
      setBoard(finalBoard); 
      if (placedCard.owner === `player_${activeIndexB}`) {
         setPairIndex(prev => (prev + 1) % 3);
      }
      setTurnIndex(prev => (prev + 1) % 4);
    };

    // 4. Staggered captures
    if (captureSequence.length === 0) {
      setTimeout(() => finalize(newBoard), 400);
    } else {
      captureSequence.forEach((targetIdx, i) => {
        setTimeout(() => {
          setBoard(current => {
            const next = [...current];
            next[targetIdx] = { ...next[targetIdx], owner: placedCard.owner };
            return next;
          });
          if (i === captureSequence.length - 1) {
            setTimeout(() => finalize(newBoard), 500);
          }
        }, (i + 1) * 200); 
      });
    }
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
      <div className="raid-wrapper raid-horizontal-layout">
        <button onClick={resetGame} style={{ position: 'absolute', top: '15px', right: '20px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--player-color)', color: 'white', cursor: 'pointer', fontFamily: 'Cinzel', zIndex: 1000}}>Reset Run</button>
        
        {/* Left Column: 10-Player "Tag-Out" Rotation Active Slots */}
        <div className="side-column player-align" style={{ minWidth: 'fit-content', paddingRight: '40px' }}>
          <div className="slot-container" style={{ opacity: currentTurn === 'activeA' ? 1 : 0.5, alignItems:'center', display:'flex', flexDirection:'column' }}>
            <div style={{color:'var(--player-color)', fontWeight:'bold'}}>Player {activeIndexA + 1}</div>
            <div className="mini-hand" style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
               {activeHandA.map(c => <DraggableCard key={c.id} card={c} disabled={currentTurn !== 'activeA'} />)}
            </div>
          </div>
          <div className="slot-container" style={{ opacity: currentTurn === 'activeB' ? 1 : 0.5, alignItems:'center', display:'flex', flexDirection:'column' }}>
            <div style={{color:'var(--player-color)', fontWeight:'bold'}}>Player {activeIndexB + 1}</div>
            <div className="mini-hand" style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginTop: '10px' }}>
               {activeHandB.map(c => <DraggableCard key={c.id} card={c} disabled={currentTurn !== 'activeB'} />)}
            </div>
          </div>
        </div>

        {/* Center: Maximized 7x7 Grid Mat */}
        <div className="board-container raid-board-container">
          <div className="board grid-7x7">
            {board.map((c, i) => <DroppableCell key={`raid-cell-${i}`} id={`raid-cell-${i}`} card={c} />)}
          </div>
          
          <DragOverlay dropAnimation={null}>
            {activeDragCard ? (
              <div className={`tt-card ${activeDragCard.owner}`} style={{ width: '100%', height: '100%' }}>
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

        {/* Right Column: Boss Decks */}
        <div className="side-column boss-align">
          <div className="slot-container" style={{ opacity: currentTurn === 'boss1' ? 1 : 0.5, alignItems:'center', display:'flex', flexDirection:'column' }}>
            <div style={{color:'var(--opponent-color)', fontWeight:'bold'}}>Boss Deck 1 ({boss1Hand.length})</div>
            <div className="mini-hand boss-stack">
               {boss1Hand.slice(0,1).map(c => <div key={c.id} className="tt-card boss1 hidden-card">?</div>)}
            </div>
          </div>
          <div className="slot-container" style={{ opacity: currentTurn === 'boss2' ? 1 : 0.5, alignItems:'center', display:'flex', flexDirection:'column' }}>
            <div style={{color:'var(--opponent-color)', fontWeight:'bold'}}>Boss Deck 2 ({boss2Hand.length})</div>
            <div className="mini-hand boss-stack">
               {boss2Hand.slice(0,1).map(c => <div key={c.id} className="tt-card boss2 hidden-card">?</div>)}
            </div>
          </div>
        </div>

      </div>
    </DndContext>
  );
}
