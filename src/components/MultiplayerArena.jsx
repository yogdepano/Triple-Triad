import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { loadSaveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const GRID          = 5;
const BOARD_SIZE    = GRID * GRID; // 25
const DECK_TOTAL    = 13;
const EL_TYPES      = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑'];
const SPECIAL_RULES = ['same', 'plus', 'equal'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateElements(rules) {
  const els = Array(BOARD_SIZE).fill(null);
  if (!rules.includes('elemental')) return els;
  let count = Math.floor(Math.random() * 5) + 4;
  while (count > 0) {
    const idx = Math.floor(Math.random() * BOARD_SIZE);
    if (!els[idx]) { els[idx] = EL_TYPES[Math.floor(Math.random() * EL_TYPES.length)]; count--; }
  }
  return els;
}

function evalResult(b, myOwner) {
  if (b.some(c => c === null)) return null;
  const mine   = b.filter(c => c?.owner === myOwner).length;
  const theirs = BOARD_SIZE - mine;
  if (mine > theirs) return 'win';
  if (theirs > mine) return 'lose';
  return 'draw';
}

function rulesArrayToConfig(rules) {
  const sp    = rules.find(r => SPECIAL_RULES.includes(r)) || null;
  const basic = rules.filter(r => !SPECIAL_RULES.includes(r)).slice(0, 2);
  while (basic.length < 2) basic.push(null);
  return { basicRules: basic, specialRule: sp, infectionRule: null };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const DraggableCard = ({ card, disabled }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
    disabled,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : 1 } : {};
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`tt-card player1 ${isDragging ? 'dragging' : ''}`}
      style={style}
    >
      <div className="card-bg" style={{ backgroundImage: `url(${card.image})` }} />
      {card.element && <div className="element-icon">{card.element}</div>}
      <div className="stats" style={{ fontSize: '30cqw' }}>
        <span className="t">{card.top}</span>
        <span className="l">{card.left}</span>
        <span className="r">{card.right}</span>
        <span className="b">{card.bottom}</span>
      </div>
      <div className="name-plate" style={{ fontSize: '20cqw' }}>{card.name}</div>
    </div>
  );
};

/**
 * BUG FIX #1 — perspective-aware coloring:
 * card.owner === myOwner → 'player1' (blue), else → 'opponent' (red)
 */
const DroppableCell = ({ id, card, flashClass, element, myOwner }) => {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !!card });
  const colorClass = card ? (card.owner === myOwner ? 'player1' : 'opponent') : '';
  return (
    <div ref={setNodeRef} className={`cell ${isOver && !card ? 'hover' : ''}`}>
      {!card && element && <div className="cell-element">{element}</div>}
      {card && (
        <div key={`${card.id}-${card.owner}`} className={`tt-card ${colorClass} on-board ${flashClass || ''}`}>
          <div className="card-bg" style={{ backgroundImage: `url(${card.image})` }} />
          {card.element && <div className="element-icon">{card.element}</div>}
          <div className="stats" style={{ fontSize: '30cqw' }}>
            <span className="t">{card.top}</span>
            <span className="l">{card.left}</span>
            <span className="r">{card.right}</span>
            <span className="b">{card.bottom}</span>
          </div>
          <div className="name-plate" style={{ fontSize: '20cqw' }}>{card.name}</div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MultiplayerArena({
  matchConfig = { basicRules: ['basic'], specialRule: null, infectionRule: null },
  setMatchConfig,
}) {
  const propsRules = [...(matchConfig.basicRules || []), matchConfig.specialRule].filter(Boolean);

  const [peerId,     setPeerId]     = useState('');
  const [targetId,   setTargetId]   = useState('');
  const [connection, setConnection] = useState(null);
  const [status,     setStatus]     = useState('lobby');

  const [board,             setBoard]             = useState(Array(BOARD_SIZE).fill(null));
  const [boardElements,     setBoardElements]     = useState(Array(BOARD_SIZE).fill(null));
  // BUG FIX #2 — all cards in hand from the start, no hidden deck
  const [myHand,            setMyHand]            = useState([]);
  const [opponentHandCount, setOpponentHandCount] = useState(DECK_TOTAL);
  const [isMyTurn,          setIsMyTurn]          = useState(false);
  const [role,              setRole]              = useState(null);
  const [activeDragCard,    setActiveDragCard]    = useState(null);
  const [flashMap,          setFlashMap]          = useState({});
  const [rulesLocked,       setRulesLocked]       = useState(false);
  const [arenaRules,        setArenaRules]        = useState(propsRules);
  const [gameResult,        setGameResult]        = useState(null);

  const peerInstance     = useRef(null);
  const roleRef          = useRef(null);
  const statusRef        = useRef(status);
  const arenaRulesRef    = useRef(propsRules);
  const boardElementsRef = useRef(Array(BOARD_SIZE).fill(null));

  // Sync statusRef
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Keep arenaRules synced to prop unless locked to host
  useEffect(() => {
    if (!rulesLocked) {
      setArenaRules(propsRules);
      arenaRulesRef.current = propsRules;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchConfig, rulesLocked]);

  // Cleanup peer on unmount
  useEffect(() => {
    return () => {
      if (peerInstance.current) {
        console.log('MultiplayerArena: Cleaning up peer instance');
        peerInstance.current.destroy();
      }
    };
  }, []);

  const cleanupExistingPeer = () => {
    if (peerInstance.current) {
      peerInstance.current.off('open');
      peerInstance.current.off('connection');
      peerInstance.current.off('error');
      peerInstance.current.destroy();
      peerInstance.current = null;
    }
  };

  const getMyOwner = r => r === 'host' ? 'player1' : 'player2';
  const myOwner    = getMyOwner(role);
  const theirOwner = role === 'host' ? 'player2' : 'player1';
  const myScore    = board.filter(c => c?.owner === myOwner).length;
  const theirScore = board.filter(c => c?.owner === theirOwner).length;

  // BUG FIX #2 — build full hand of DECK_TOTAL cards, no separate deck state
  const initLocalDeck = (r) => {
    const data     = loadSaveData();
    const baseDeck = r === 'host' ? data.playerDeck : data.opponentDeck;
    const owner    = getMyOwner(r);
    const fullHand = [];
    for (let i = 0; i < DECK_TOTAL; i++) {
      fullHand.push({ ...baseDeck[i % baseDeck.length], id: `${r}_${i}`, owner });
    }
    setMyHand(fullHand);              // all 13 visible at once
    setOpponentHandCount(DECK_TOTAL); // show 13 face-down cards for opponent
    setGameResult(null);
  };

  const handleConnection = (conn, r) => {
    roleRef.current = r;
    setRole(r);
    setConnection(conn);
    setStatus('connected');
    setIsMyTurn(r === 'host');
    initLocalDeck(r);

    if (r === 'host') {
      conn.on('open', () => {
        const elements = generateElements(arenaRulesRef.current);
        setBoardElements(elements);
        boardElementsRef.current = elements;
        conn.send({ type: 'HOST_RULES', rules: arenaRulesRef.current, boardElements: elements });
      });
    }

    conn.on('data', (data) => {
      if (data.type === 'HOST_RULES') {
        const rules = data.rules || [];
        if (setMatchConfig) setMatchConfig(rulesArrayToConfig(rules));
        setArenaRules(rules);
        arenaRulesRef.current = rules;
        setRulesLocked(true);
        if (data.boardElements) {
          setBoardElements(data.boardElements);
          boardElementsRef.current = data.boardElements;
        }

      } else if (data.type === 'MOVE') {
        if (data.rules) { setArenaRules(data.rules); arenaRulesRef.current = data.rules; }
        const toFlash = {};
        if (data.capturedBy) {
          Object.entries(data.capturedBy).forEach(([idx, rule]) => {
            if (['same', 'plus', 'equal', 'combo'].includes(rule)) toFlash[idx] = rule;
          });
        }
        if (Object.keys(toFlash).length > 0) {
          setFlashMap(toFlash);
          setTimeout(() => setFlashMap({}), 750);
        }
        setBoard(data.board);
        setOpponentHandCount(prev => Math.max(0, prev - 1));
        setIsMyTurn(true);
        const result = evalResult(data.board, getMyOwner(roleRef.current));
        if (result) setGameResult(result);

      } else if (data.type === 'RESET') {
        setBoard(Array(BOARD_SIZE).fill(null));
        if (data.boardElements) {
          setBoardElements(data.boardElements);
          boardElementsRef.current = data.boardElements;
        }
        initLocalDeck(roleRef.current);
        setIsMyTurn(roleRef.current === 'host');
        setFlashMap({});
        setGameResult(null);
      }
    });
  };

  const resetMatch = () => {
    const elements = role === 'host' ? generateElements(arenaRulesRef.current) : boardElementsRef.current;
    if (role === 'host') { setBoardElements(elements); boardElementsRef.current = elements; }
    setBoard(Array(BOARD_SIZE).fill(null));
    setFlashMap({});
    setGameResult(null);
    initLocalDeck(role);
    setIsMyTurn(role === 'host');
    if (connection) connection.send({ type: 'RESET', boardElements: elements });
  };

  const createRoom = () => {
    try {
      cleanupExistingPeer();
      setStatus('waiting');
      const peer = new Peer();
      peerInstance.current = peer;

      peer.on('open', id => setPeerId(id));
      peer.on('error', err => {
        console.error('MultiplayerArena: Peer error:', err);
        setStatus('lobby');
        alert('Peer error: ' + err.type);
      });
      peer.on('connection', conn => handleConnection(conn, 'host'));
    } catch (err) {
      console.error('MultiplayerArena: Error in createRoom:', err);
      setStatus('lobby');
    }
  };

  const joinRoom = () => {
    const tid = targetId?.trim();
    if (!tid) {
      alert('Please enter a host code.');
      return;
    }

    try {
      cleanupExistingPeer();
      setStatus('connecting');
      
      const peer = new Peer();
      peerInstance.current = peer;

      // Connection timeout
      const timeout = setTimeout(() => {
        if (statusRef.current === 'connecting') {
          console.error('MultiplayerArena: Join timeout');
          cleanupExistingPeer();
          setStatus('lobby');
          alert('Connection timed out. The host might be offline or the code is incorrect.');
        }
      }, 15000); // 15s timeout

      peer.on('open', () => {
        console.log('MultiplayerArena: Guest peer open, connecting to:', tid);
        const conn = peer.connect(tid);
        
        conn.on('open', () => {
          clearTimeout(timeout);
          handleConnection(conn, 'guest');
        });

        conn.on('error', err => {
          clearTimeout(timeout);
          console.error('MultiplayerArena: Guest conn error:', err);
          cleanupExistingPeer();
          setStatus('lobby');
          alert('Failed to connect to host. Check the code.');
        });
      });

      peer.on('error', err => {
        clearTimeout(timeout);
        console.error('MultiplayerArena: Guest peer error:', err);
        cleanupExistingPeer();
        setStatus('lobby');
        if (err.type === 'peer-not-found') {
          alert('Host not found. Check the code.');
        } else {
          alert('Could not initialize network. Try again.');
        }
      });
    } catch (err) {
      console.error('MultiplayerArena: Error in joinRoom:', err);
      setStatus('lobby');
    }
  };

  const cancelConnection = () => {
    cleanupExistingPeer();
    setStatus('lobby');
  };

  // BUG FIX #2 — no deck refill; just remove the played card from the full hand
  const executeMove = (placedCard, targetIndex) => {
    setMyHand(prev => prev.filter(c => c.id !== placedCard.id));

    const { newBoard, capturedBy } = placeCardOnBoard(
      board, placedCard, targetIndex, GRID, arenaRules, boardElementsRef.current
    );

    const toFlash = {};
    Object.entries(capturedBy).forEach(([idx, rule]) => {
      if (['same', 'plus', 'equal', 'combo'].includes(rule)) toFlash[idx] = rule;
    });
    if (Object.keys(toFlash).length > 0) {
      setFlashMap(toFlash);
      setTimeout(() => setFlashMap({}), 750);
    }

    setBoard(newBoard);
    setIsMyTurn(false);

    const result = evalResult(newBoard, myOwner);
    if (result) setGameResult(result);

    if (connection) {
      connection.send({
        type: 'MOVE',
        board: newBoard,
        capturedBy,
        rules: role === 'host' ? arenaRulesRef.current : undefined,
      });
    }
  };

  const handleDragStart = e => setActiveDragCard(e.active.data.current?.card);
  const handleDragEnd   = e => {
    setActiveDragCard(null);
    if (gameResult || !e.over || !e.active.data.current?.card || !isMyTurn) return;
    const idx = parseInt(e.over.id.replace('net-cell-', ''), 10);
    if (!isNaN(idx) && !board[idx]) executeMove(e.active.data.current.card, idx);
  };

  const resultCfg = {
    win:  { label: 'VICTORY', cls: 'banner-win'  },
    lose: { label: 'DEFEAT',  cls: 'banner-lose' },
    draw: { label: 'DRAW',    cls: 'banner-draw' },
  };

  // ════════════════════════════════════════════════════════════════
  // LOBBY
  // ════════════════════════════════════════════════════════════════
  if (status === 'lobby') {
    return (
      <div className="spire-wrapper" style={{ flexDirection: 'column', gap: '40px' }}>
        <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 3rem)', textShadow: '0 0 10px var(--player-color)' }}>
          MULTIPLAYER ARENA [5×5]
        </h1>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="mode-toggle-btn active" onClick={createRoom} style={{ padding: '14px 28px', fontSize: '1.1rem', cursor: 'pointer' }}>
            HOST MATCH
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Enter Host Code" value={targetId} onChange={e => setTargetId(e.target.value)}
              style={{ padding: '10px', background: 'transparent', color: 'white', border: '1px solid var(--player-color)', textAlign: 'center', fontFamily: 'Cinzel' }} />
            <button className="mode-toggle-btn active" onClick={joinRoom} style={{ padding: '10px', cursor: 'pointer' }}>
              JOIN MATCH
            </button>
          </div>
        </div>
        {rulesLocked && <div style={{ color: 'var(--player-color)', fontSize: '0.85rem' }}>Rules locked to host's selection</div>}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // WAITING
  // ════════════════════════════════════════════════════════════════
  if (status === 'waiting' || status === 'connecting') {
    return (
      <div className="spire-wrapper" style={{ flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ color: 'gray' }}>{status === 'waiting' ? 'Waiting for opponent...' : 'Connecting to host...'}</h2>
        {status === 'waiting' && (
          <div style={{ fontSize: '2rem', padding: '20px', border: '1px dashed var(--player-color)', borderRadius: '10px', letterSpacing: '4px' }}>
            {peerId || 'Generating...'}
          </div>
        )}
        <p>{status === 'waiting' ? 'Send this code to your opponent.' : 'Establishing secure link...'}</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Active rules will be sent to them on connect.</p>
        
        <button 
          className="mode-toggle-btn" 
          onClick={cancelConnection}
          style={{ marginTop: '20px', padding: '10px 20px', fontSize: '0.9rem', opacity: 0.7 }}
        >
          CANCEL
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ACTIVE GAME
  // ════════════════════════════════════════════════════════════════
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="raid-wrapper raid-horizontal-layout">

        {/* Game-over overlay */}
        {gameResult && (
          <div className={`win-banner ${resultCfg[gameResult].cls}`} style={{ zIndex: 200 }}>
            <div className="banner-title">{resultCfg[gameResult].label}</div>
            <div className="banner-score">{myScore} — {theirScore}</div>
            <button className="banner-btn" onClick={resetMatch}>REMATCH</button>
          </div>
        )}

        <button onClick={resetMatch} style={{ position: 'absolute', top: '15px', right: '20px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--player-color)', color: 'white', cursor: 'pointer', fontFamily: 'Cinzel', zIndex: 1000 }}>
          Reset
        </button>
        {rulesLocked && (
          <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'Cinzel', zIndex: 1000 }}>
            Rules synced from host
          </div>
        )}

        {/* ── Opponent Flank — 5-per-row face-down grid ── */}
        <div className="side-column boss-align" style={{ width: 'min(28vw, 320px)' }}>
          <div style={{ color: 'var(--opponent-color)', fontWeight: 'bold', fontSize: '1rem', marginBottom: '6px', textAlign: 'center', fontFamily: 'Cinzel' }}>
            {isMyTurn ? 'WAITING' : "OPP TURN"}
          </div>
          <div style={{ fontFamily: 'Cinzel', fontSize: '0.75rem', marginBottom: '8px', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            Cards: {opponentHandCount}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', width: '100%' }}>
            {Array(opponentHandCount).fill(0).map((_, i) => (
              <div key={i} style={{ aspectRatio: '2/3', position: 'relative' }}>
                <div className="tt-card opponent hidden-card" style={{ width: '100%', height: '100%' }}>?</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: board + score ── */}
        <div className="board-container raid-board-container">
          <div className="score-row" style={{ marginBottom: '8px' }}>
            <span className="score-player">{myScore}</span>
            <span className="score-sep">—</span>
            <span className="score-opp">{theirScore}</span>
            <span className="turn-label">{isMyTurn ? 'Your Turn' : 'Opponent…'}</span>
          </div>
          {/* BUG FIX #3 — grid-5x5 keeps aspect-ratio: 2/3 via CSS; no inline override */}
          <div className="board grid-5x5">
            {board.map((c, i) => (
              <DroppableCell
                key={`net-cell-${i}`}
                id={`net-cell-${i}`}
                card={c}
                element={boardElements[i]}
                flashClass={flashMap[i] ? `captured-${flashMap[i]}` : ''}
                myOwner={myOwner}
              />
            ))}
          </div>
        </div>

        {/* ── Player Flank — 5-per-row hand grid (5+5+3) ── */}
        <div className="side-column player-align" style={{ width: 'min(28vw, 320px)' }}>
          <div style={{ color: 'var(--player-color)', fontWeight: 'bold', fontSize: '1rem', marginBottom: '6px', textAlign: 'center', fontFamily: 'Cinzel' }}>
            {isMyTurn ? 'YOUR TURN' : 'PLEASE WAIT'}
          </div>
          <div style={{ fontFamily: 'Cinzel', fontSize: '0.75rem', marginBottom: '8px', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
            Hand: {myHand.length}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', width: '100%' }}>
            {myHand.map(c => (
              <div key={c.id} style={{ aspectRatio: '2/3', position: 'relative' }}>
                <DraggableCard card={c} disabled={!isMyTurn || !!gameResult} />
              </div>
            ))}
          </div>
        </div>

        {/* Drag ghost */}
        <DragOverlay dropAnimation={null}>
          {activeDragCard && (
            <div className="tt-card player1" style={{ width: 'clamp(42px, 5vw, 60px)', height: 'calc(clamp(42px, 5vw, 60px) * 1.5)' }}>
              <div className="card-bg" style={{ backgroundImage: `url(${activeDragCard.image})` }} />
              {activeDragCard.element && <div className="element-icon">{activeDragCard.element}</div>}
              <div className="stats" style={{ fontSize: '30cqw' }}>
                <span className="t">{activeDragCard.top}</span>
                <span className="l">{activeDragCard.left}</span>
                <span className="r">{activeDragCard.right}</span>
                <span className="b">{activeDragCard.bottom}</span>
              </div>
              <div className="name-plate" style={{ fontSize: '20cqw' }}>{activeDragCard.name}</div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
