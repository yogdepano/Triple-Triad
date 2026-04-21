import React, { useState, useRef, useEffect } from 'react';
import Peer from 'peerjs';
import { loadSaveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const GRID       = 3;
const BOARD_SIZE = 9;
const HAND_SIZE  = 5;
const EL_TYPES   = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑'];
const SPECIAL_RULES = ['same', 'plus', 'equal'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateElements(rules) {
  const els = Array(BOARD_SIZE).fill(null);
  if (!rules.includes('elemental')) return els;
  let count = Math.floor(Math.random() * 3) + 2; // 2–4 tiles
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
    id: `ca-card-${card.id}`,
    data: { card },
    disabled,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : 1 } : {};
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`tt-card player1 ${isDragging ? 'dragging' : ''}`}
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

/** Perspective-aware cell: card.owner === myOwner → blue, else → red */
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ClassicArena({
  matchConfig = { basicRules: ['basic'], specialRule: null, infectionRule: null },
  setMatchConfig,
}) {
  const propsRules = [...(matchConfig.basicRules || []), matchConfig.specialRule].filter(Boolean);

  const [peerId,     setPeerId]     = useState('');
  const [targetId,   setTargetId]   = useState('');
  const [connection, setConnection] = useState(null);
  const [status,     setStatus]     = useState('lobby');

  const [board,         setBoard]         = useState(Array(BOARD_SIZE).fill(null));
  const [boardElements, setBoardElements] = useState(Array(BOARD_SIZE).fill(null));
  const [myHand,        setMyHand]        = useState([]);
  const [opponentHand,  setOpponentHand]  = useState(Array(HAND_SIZE).fill({ id: 'h', name: '?' }));
  const [isMyTurn,      setIsMyTurn]      = useState(false);
  const [role,          setRole]          = useState(null);
  const [activeDrag,    setActiveDrag]    = useState(null);
  const [flashMap,      setFlashMap]      = useState({});
  const [rulesLocked,   setRulesLocked]   = useState(false);
  const [arenaRules,    setArenaRules]    = useState(propsRules);
  const [gameResult,    setGameResult]    = useState(null);

  const peerInstance     = useRef(null);
  const roleRef          = useRef(null);
  const arenaRulesRef    = useRef(propsRules);
  const boardElementsRef = useRef(Array(BOARD_SIZE).fill(null));

  // Keep arenaRules synced to prop unless locked to host
  useEffect(() => {
    if (!rulesLocked) {
      setArenaRules(propsRules);
      arenaRulesRef.current = propsRules;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchConfig, rulesLocked]);

  const getMyOwner = r => r === 'host' ? 'player1' : 'player2';
  const myOwner    = getMyOwner(role);
  const theirOwner = role === 'host' ? 'player2' : 'player1';
  const myScore    = board.filter(c => c?.owner === myOwner).length;
  const theirScore = board.filter(c => c?.owner === theirOwner).length;

  const initHands = (r) => {
    const data     = loadSaveData();
    const baseDeck = r === 'host' ? data.playerDeck : data.opponentDeck;
    const owner    = getMyOwner(r);
    const hand     = [];
    for (let i = 0; i < HAND_SIZE; i++) {
      hand.push({ ...baseDeck[i % baseDeck.length], id: `${r}_${i}`, owner });
    }
    setMyHand(hand);
    setOpponentHand(Array(HAND_SIZE).fill({
      id: 'hidden',
      owner: r === 'host' ? 'player2' : 'player1',
      name: '?',
    }));
    setGameResult(null);
  };

  // ── PeerJS bootstrap ──
  const handleConnection = (conn, r) => {
    roleRef.current = r;
    setRole(r);
    setConnection(conn);
    setStatus('connected');
    setIsMyTurn(r === 'host');
    initHands(r);

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
        // Remove one face-down card from opponent hand
        setOpponentHand(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
        setIsMyTurn(true);
        const result = evalResult(data.board, getMyOwner(roleRef.current));
        if (result) setGameResult(result);

      } else if (data.type === 'RESET') {
        setBoard(Array(BOARD_SIZE).fill(null));
        if (data.boardElements) {
          setBoardElements(data.boardElements);
          boardElementsRef.current = data.boardElements;
        }
        initHands(roleRef.current);
        setIsMyTurn(roleRef.current === 'host');
        setFlashMap({});
        setGameResult(null);
      }
    });
  };

  const createRoom = () => {
    setStatus('waiting');
    const peer = new Peer();
    peer.on('open', id => setPeerId(id));
    peer.on('connection', conn => handleConnection(conn, 'host'));
    peerInstance.current = peer;
  };

  const joinRoom = () => {
    const peer = new Peer();
    peer.on('open', () => {
      const conn = peer.connect(targetId);
      conn.on('open', () => handleConnection(conn, 'guest'));
    });
    peerInstance.current = peer;
  };

  const resetMatch = () => {
    const elements = role === 'host' ? generateElements(arenaRulesRef.current) : boardElementsRef.current;
    if (role === 'host') { setBoardElements(elements); boardElementsRef.current = elements; }
    setBoard(Array(BOARD_SIZE).fill(null));
    setFlashMap({});
    setGameResult(null);
    initHands(role);
    setIsMyTurn(role === 'host');
    if (connection) connection.send({ type: 'RESET', boardElements: elements });
  };

  // ── Move execution ──
  const executeMove = (card, position) => {
    setMyHand(prev => prev.filter(c => c.id !== card.id));

    const { newBoard, capturedBy } = placeCardOnBoard(
      board, card, position, GRID, arenaRules, boardElementsRef.current
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

  const handleDragStart = e => setActiveDrag(e.active.data.current?.card);
  const handleDragEnd   = e => {
    setActiveDrag(null);
    if (gameResult || !e.over || !e.active.data.current?.card || !isMyTurn) return;
    const idx = parseInt(e.over.id.replace('ca-cell-', ''), 10);
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
          CLASSIC ARENA [3×3]
        </h1>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="mode-toggle-btn active"
            onClick={createRoom}
            style={{ padding: '14px 28px', fontSize: '1.1rem', cursor: 'pointer' }}
          >
            HOST MATCH
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter Host Code"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              style={{ padding: '10px', background: 'transparent', color: 'white', border: '1px solid var(--player-color)', textAlign: 'center', fontFamily: 'Cinzel' }}
            />
            <button
              className="mode-toggle-btn active"
              onClick={joinRoom}
              style={{ padding: '10px', cursor: 'pointer' }}
            >
              JOIN MATCH
            </button>
          </div>
        </div>
        {rulesLocked && (
          <div style={{ color: 'var(--player-color)', fontSize: '0.85rem' }}>Rules locked to host's selection</div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // WAITING ROOM
  // ════════════════════════════════════════════════════════════════
  if (status === 'waiting') {
    return (
      <div className="spire-wrapper" style={{ flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ color: 'gray' }}>Waiting for opponent...</h2>
        <div style={{ fontSize: '2rem', padding: '20px', border: '1px dashed var(--player-color)', borderRadius: '10px', letterSpacing: '4px' }}>
          {peerId || 'Generating...'}
        </div>
        <p>Send this code to your opponent.</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Active rules will be synced on connect.</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ACTIVE GAME  — reuses the same .spire-wrapper / .game-row CSS
  // as GameBoard, so it's already mobile-responsive
  // ════════════════════════════════════════════════════════════════
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="spire-wrapper">

        {/* Win/Draw/Lose overlay */}
        {gameResult && (
          <div className={`win-banner ${resultCfg[gameResult].cls}`} style={{ zIndex: 200 }}>
            <div className="banner-title">{resultCfg[gameResult].label}</div>
            <div className="banner-score">{myScore} — {theirScore}</div>
            <button className="banner-btn" onClick={resetMatch}>REMATCH</button>
          </div>
        )}

        {/* Reset button */}
        <button
          onClick={resetMatch}
          style={{ position: 'absolute', top: '12px', right: '16px', padding: '6px 14px', background: 'transparent', border: '1px solid var(--player-color)', color: 'white', cursor: 'pointer', fontFamily: 'Cinzel', fontSize: '0.7rem', zIndex: 10 }}
        >
          Reset
        </button>

        {/* ── Three-column layout: opponent | board | player ── */}
        <div className="game-row">

          {/* Opponent hand — face down */}
          <div className="opponent-column">
            <div style={{ color: 'var(--opponent-color)', fontSize: '0.6rem', fontFamily: 'Cinzel', marginBottom: '6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {isMyTurn ? 'WAITING' : "OPP TURN"}
            </div>
            {opponentHand.map((_, i) => (
              <div key={i} className="hand-card-slot">
                <div className="tt-card opponent hidden-card" style={{ width: '100%', height: '100%' }}>?</div>
              </div>
            ))}
          </div>

          {/* Board + score */}
          <div className="board-area">
            <div className="score-row">
              <span className="score-player">{myScore}</span>
              <span className="score-sep">—</span>
              <span className="score-opp">{theirScore}</span>
              <span className="turn-label">{isMyTurn ? 'Your Turn' : 'Opponent…'}</span>
            </div>
            <div className="board grid-3x3">
              {board.map((c, i) => (
                <DroppableCell
                  key={`ca-cell-${i}`}
                  id={`ca-cell-${i}`}
                  card={c}
                  element={boardElements[i]}
                  flashClass={flashMap[i] ? `captured-${flashMap[i]}` : ''}
                  myOwner={myOwner}
                />
              ))}
            </div>
            {rulesLocked && (
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem', fontFamily: 'Cinzel', marginTop: '4px' }}>
                rules synced from host
              </div>
            )}
          </div>

          {/* Player hand */}
          <div className="player-column">
            <div style={{ color: 'var(--player-color)', fontSize: '0.6rem', fontFamily: 'Cinzel', marginBottom: '6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {isMyTurn ? 'YOUR TURN' : 'PLEASE WAIT'}
            </div>
            {myHand.map(c => (
              <div key={c.id} className="hand-card-slot">
                <DraggableCard card={c} disabled={!isMyTurn || !!gameResult} />
              </div>
            ))}
          </div>
        </div>

        {/* Drag ghost */}
        <DragOverlay dropAnimation={null}>
          {activeDrag && (
            <div className="tt-card player1" style={{ width: 'var(--card-w)', height: 'var(--card-h)' }}>
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
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
