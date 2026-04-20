import React, { useState, useEffect } from 'react';
import { loadSaveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { calculateBestMove } from '../engine/AILogic';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
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
        <div className={`tt-card ${card.owner} on-board`}>
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

export default function GameBoard() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [playerHand, setPlayerHand] = useState([]);
  const [opponentHand, setOpponentHand] = useState([]);
  const [turn, setTurn] = useState('player');
  const [activeDrag, setActiveDrag] = useState(null);

  useEffect(() => {
    const data = loadSaveData();
    // Use first 5 cards from data
    setPlayerHand(data.playerDeck.slice(0, 5).map((c, i) => ({ ...c, id: `p_${i}`, owner: 'player' })));
    setOpponentHand(data.opponentDeck.slice(0, 5).map((c, i) => ({ ...c, id: `o_${i}`, owner: 'opponent' })));
  }, []);

  const executeMove = (card, position) => {
    const { newBoard } = placeCardOnBoard(board, card, position);
    setBoard(newBoard);
    
    if(card.owner === 'player') setPlayerHand(p => p.filter(c => c.id !== card.id));
    else setOpponentHand(p => p.filter(c => c.id !== card.id));
    
    setTurn(t => t === 'player' ? 'opponent' : 'player');
  };

  const handleDragStart = event => setActiveDrag(event.active.data.current?.card);
  const handleDragEnd = event => {
    setActiveDrag(null);
    if(event.over && event.active.data.current?.card) {
      const idx = parseInt(event.over.id.replace('cell-', ''), 10);
      if(!board[idx]) {
        executeMove(event.active.data.current.card, idx);
      }
    }
  };

  useEffect(() => {
    if(turn === 'opponent' && board.includes(null)) {
      const timer = setTimeout(() => {
        const move = calculateBestMove(board, opponentHand);
        if(move) executeMove(move.card, move.index);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [turn, board, opponentHand]);

  return (
    <div className="spire-wrapper">
      
      {/* Player Hand / Left Side */}
      <div className="player-column">
        {playerHand.map(c => (
          <div key={c.id} style={{ width: '120px', height: '180px' }}>
             <DraggableCard card={c} disabled={turn !== 'player'} />
          </div>
        ))}
      </div>
      
      {/* 3x3 Battlefield / Center */}
      <div className="center-board">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="board grid-3x3">
            {board.map((c, i) => <DroppableCell key={`cell-${i}`} id={`cell-${i}`} card={c} />)}
          </div>
          
          <DragOverlay dropAnimation={null}>
            {activeDrag ? (
              <div className={`tt-card ${activeDrag.owner}`} style={{ width: '120px', height: '180px' }}>
                <div className="card-bg" style={{ backgroundImage: `url(${activeDrag.image})` }}></div>
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
        </DndContext>
      </div>

      {/* Opponent Hand / Right Side */}
      <div className="opponent-column">
        {opponentHand.map(c => (
          <div key={c.id} className="tt-card opponent hidden-card" style={{ width: '120px', height: '180px' }}>
            ?
          </div>
        ))}
      </div>

    </div>
  );
}
