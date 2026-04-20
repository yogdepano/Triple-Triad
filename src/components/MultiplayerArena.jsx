import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { loadSaveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { DndContext, useDraggable, useDroppable, DragOverlay, closestCenter } from '@dnd-kit/core';
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
      <div className="stats" style={{fontSize: '30cqw'}}>
        <span className="t">{card.top}</span>
        <span className="l">{card.left}</span>
        <span className="r">{card.right}</span>
        <span className="b">{card.bottom}</span>
      </div>
      <div className="name-plate" style={{fontSize: '20cqw'}}>{card.name}</div>
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
          <div className="stats" style={{fontSize: '30cqw'}}>
            <span className="t">{card.top}</span>
            <span className="l">{card.left}</span>
            <span className="r">{card.right}</span>
            <span className="b">{card.bottom}</span>
          </div>
          <div className="name-plate" style={{fontSize: '20cqw'}}>{card.name}</div>
        </div>
      ) : null}
    </div>
  );
};

export default function MultiplayerArena() {
  const [peerId, setPeerId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState('lobby'); // lobby, waiting, connected
  
  const [board, setBoard] = useState(Array(25).fill(null));
  const [myHand, setMyHand] = useState([]);
  const [opponentHand, setOpponentHand] = useState(Array(5).fill({id: 'hidden', name: '?', image: ''}));
  const [myDeck, setMyDeck] = useState([]);
  
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [role, setRole] = useState(null);
  const [activeDragCard, setActiveDragCard] = useState(null);

  const peerInstance = useRef(null);

  const initLocalDeck = (r) => {
      const data = loadSaveData();
      const baseDeck = r === 'host' ? data.playerDeck : data.opponentDeck;
      const fullDeck = [];
      for(let i=0; i<13; i++) {
          fullDeck.push({...baseDeck[i % baseDeck.length], id: `${r}_${i}`, owner: r === 'host' ? 'player1' : 'player2'});
      }
      setMyHand(fullDeck.slice(0, 5));
      setMyDeck(fullDeck.slice(5));
      setOpponentHand(Array(5).fill({id: 'hidden', owner: r === 'host' ? 'player2' : 'player1', name: '?'}));
  };

  const handleConnection = (conn, r) => {
      setConnection(conn);
      setRole(r);
      setStatus('connected');
      setIsMyTurn(r === 'host');
      initLocalDeck(r);

      conn.on('data', (data) => {
          if (data.type === 'MOVE') {
              setBoard(data.board);
              setIsMyTurn(true);
              // Decrement visual opponent hand count
              setOpponentHand(prev => {
                  const arr = [...prev];
                  arr.pop();
                  return arr;
              });
          }
      });
  };

  const createRoom = () => {
      setStatus('waiting');
      const peer = new Peer();
      peer.on('open', (id) => setPeerId(id));
      peer.on('connection', (conn) => {
          handleConnection(conn, 'host');
      });
      peerInstance.current = peer;
  };

  const joinRoom = () => {
      const peer = new Peer();
      peer.on('open', () => {
          const conn = peer.connect(targetId);
          conn.on('open', () => {
              handleConnection(conn, 'guest');
          });
      });
      peerInstance.current = peer;
  };

  const executeMove = (placedCard, targetIndex) => {
      // Draw new card from deck
      let nextCard = null;
      setMyDeck(prev => {
          const next = [...prev];
          nextCard = next.shift();
          return next;
      });

      setMyHand(prev => {
          let h = prev.filter(c => c.id !== placedCard.id);
          if (nextCard) h.push(nextCard);
          return h;
      });

      const { newBoard } = placeCardOnBoard(board, placedCard, targetIndex, 5);
      setBoard(newBoard);
      setIsMyTurn(false);

      if (connection) {
          connection.send({ type: 'MOVE', board: newBoard });
      }
  };

  const handleDragStart = event => setActiveDragCard(event.active.data.current?.card);
  const handleDragEnd = event => {
      setActiveDragCard(null);
      if (event.over && event.active.data.current?.card && isMyTurn) {
          const idx = parseInt(event.over.id.replace('net-cell-', ''), 10);
          if (!board[idx]) {
            executeMove(event.active.data.current.card, idx);
          }
      }
  };

  if (status === 'lobby') {
      return (
          <div className="spire-wrapper" style={{flexDirection: 'column', gap: '40px'}}>
             <h1 style={{fontSize:'3rem', textShadow:'0 0 10px var(--player-color)'}}>MULTIPLAYER ARENA [5x5]</h1>
             <div style={{display:'flex', gap: '30px'}}>
                <button className="mode-toggle-btn active" onClick={createRoom} style={{padding:'15px 30px', fontSize:'1.2rem', cursor:'pointer'}}>HOST MATCH</button>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                   <input type="text" placeholder="Enter Host Code" value={targetId} onChange={e => setTargetId(e.target.value)} style={{padding:'10px', background:'transparent', color:'white', border:'1px solid var(--player-color)', textAlign:'center'}} />
                   <button className="mode-toggle-btn active" onClick={joinRoom} style={{padding:'10px', cursor:'pointer'}}>JOIN MATCH</button>
                </div>
             </div>
          </div>
      );
  }

  if (status === 'waiting') {
      return (
          <div className="spire-wrapper" style={{flexDirection: 'column', gap: '20px'}}>
              <h2 style={{color:'gray'}}>Waiting for opponent...</h2>
              <div style={{fontSize:'2rem', padding:'20px', border:'1px dashed var(--player-color)', borderRadius:'10px'}}>{peerId || 'Generating...'}</div>
              <p>Send this code to your opponent.</p>
          </div>
      );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="raid-wrapper raid-horizontal-layout">
        
        {/* Opponent Flank */}
        <div className="side-column boss-align">
          <div className="slot-container" style={{ opacity: isMyTurn ? 0.5 : 1, display:'flex', flexDirection:'column', alignItems:'center'}}>
            <div style={{color:'var(--opponent-color)', fontWeight:'bold', fontSize:'1.5rem', marginBottom:'20px'}}>{isMyTurn ? "WAITING FOR OPPONENT" : "OPPONENT'S TURN"}</div>
            <div className="mini-hand boss-stack">
               {opponentHand.map((c, i) => <div key={i} className="tt-card opponent hidden-card">?</div>)}
            </div>
          </div>
        </div>

        {/* Center: 5x5 Grid Mat */}
        <div className="board-container raid-board-container">
          <div className="board grid-5x5">
            {board.map((c, i) => <DroppableCell key={`net-cell-${i}`} id={`net-cell-${i}`} card={c} />)}
          </div>
          
          <DragOverlay dropAnimation={null}>
            {activeDragCard ? (
              <div className={`tt-card player1`} style={{ width: '100%', height: '100%' }}>
                <div className="card-bg" style={{ backgroundImage: `url(${activeDragCard.image})` }}></div>
                <div className="stats" style={{fontSize: '30cqw'}}>
                  <span className="t">{activeDragCard.top}</span>
                  <span className="l">{activeDragCard.left}</span>
                  <span className="r">{activeDragCard.right}</span>
                  <span className="b">{activeDragCard.bottom}</span>
                </div>
                <div className="name-plate" style={{fontSize: '20cqw'}}>{activeDragCard.name}</div>
              </div>
            ) : null}
          </DragOverlay>
        </div>

        {/* Player Flank */}
        <div className="side-column player-align">
          <div className="slot-container" style={{ opacity: isMyTurn ? 1 : 0.5, display:'flex', flexDirection:'column', alignItems:'center'}}>
            <div style={{color:'var(--player-color)', fontWeight:'bold', fontSize:'1.5rem', marginBottom:'20px'}}>{isMyTurn ? "YOUR TURN" : "PLEASE WAIT"}</div>
            <div style={{marginBottom:'10px'}}>Deck remaining: {myDeck.length}</div>
            <div className="mini-hand player-stack">
               {myHand.map(c => <DraggableCard key={c.id} card={c} disabled={!isMyTurn} />)}
            </div>
          </div>
        </div>

      </div>
    </DndContext>
  );
}
