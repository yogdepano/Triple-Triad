import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { loadSaveData } from '../data/MockSaveData';
import { placeCardOnBoard } from '../engine/BoardLogic';
import { DndContext, useDraggable, useDroppable, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const GRID       = 5;
const BOARD_SIZE = GRID * GRID; // 25 cells
const HAND_SIZE  = 5;           // visible hand at any time
const DECK_TOTAL = 13;          // cards each player places total (host: 13, guest: 12)
const EL_TYPES   = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑'];
const SPECIAL_RULES = ['same', 'plus', 'equal'];

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateElements(rules) {
  const els = Array(BOARD_SIZE).fill(null);
  if (!rules.includes('elemental')) return els;
  let count = Math.floor(Math.random() * 5) + 4; // 4–8 tiles
  while (count > 0) {
    const idx = Math.floor(Math.random() * BOARD_SIZE);
    if (!els[idx]) { els[idx] = EL_TYPES[Math.floor(Math.random() * EL_TYPES.length)]; count--; }
  }
  return els;
}

/** Pure win check — no state dependency, safe in PeerJS callbacks */
function evalResult(b, myOwner) {
  if (b.some(c => c === null)) return null; // still in progress
  const mine   = b.filter(c => c?.owner === myOwner).length;
  const theirs = BOARD_SIZE - mine;
  if (mine > theirs) return 'win';
  if (theirs > mine) return 'lose';
  return 'draw';
}

/** Reconstruct a matchConfig-compatible object from a flat rules array */
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
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`tt-card ${card.owner} ${isDragging ? 'dragging' : ''}`}
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

const DroppableCell = ({ id, card, flashClass, element }) => {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !!card });
  return (
    <div ref={setNodeRef} className={`cell ${isOver && !card ? 'hover' : ''}`}>
      {!card && element && <div className="cell-element">{element}</div>}
      {card && (
        <div key={`${card.id}-${card.owner}`} className={`tt-card ${card.owner} on-board ${flashClass || ''}`}>
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
  // Derive flat rule list from matchConfig — kept in sync unless the host overrides
  const propsRules = [...(matchConfig.basicRules || []), matchConfig.specialRule].filter(Boolean);

  // ── PeerJS state ──
  const [peerId,     setPeerId]     = useState('');
  const [targetId,   setTargetId]   = useState('');
  const [connection, setConnection] = useState(null);
  const [status,     setStatus]     = useState('lobby'); // 'lobby' | 'waiting' | 'connected'

  // ── Game state ──
  const [board,              setBoard]              = useState(Array(BOARD_SIZE).fill(null));
  const [boardElements,      setBoardElements]      = useState(Array(BOARD_SIZE).fill(null));
  const [myHand,             setMyHand]             = useState([]);
  const [myDeck,             setMyDeck]             = useState([]);
  const [opponentHandCount,  setOpponentHandCount]  = useState(DECK_TOTAL);
  const [isMyTurn,           setIsMyTurn]           = useState(false);
  const [role,               setRole]               = useState(null);   // 'host' | 'guest'
  const [activeDragCard,     setActiveDragCard]     = useState(null);
  const [flashMap,           setFlashMap]           = useState({});
  const [rulesLocked,        setRulesLocked]        = useState(false);
  const [arenaRules,         setArenaRules]         = useState(propsRules);
  const [gameResult,         setGameResult]         = useState(null);   // 'win' | 'lose' | 'draw' | null

  // ── Stable refs for PeerJS callbacks ──
  const peerInstance     = useRef(null);
  const roleRef          = useRef(null);
  const arenaRulesRef    = useRef(propsRules);
  const boardElementsRef = useRef(Array(BOARD_SIZE).fill(null));

  // Keep arenaRules in sync with prop changes unless the guest is locked to host's rules
  useEffect(() => {
    if (!rulesLocked) {
      setArenaRules(propsRules);
      arenaRulesRef.current = propsRules;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchConfig, rulesLocked]);

  // ── Derived ──
  const getMyOwner    = r => r === 'host' ? 'player1' : 'player2';
  const myOwner       = getMyOwner(role);
  const theirOwner    = role === 'host' ? 'player2' : 'player1';
  const myScore       = board.filter(c => c?.owner === myOwner).length;
  const theirScore    = board.filter(c => c?.owner === theirOwner).length;

  // ── Deck init ──
  const initLocalDeck = (r) => {
    const data     = loadSaveData();
    const baseDeck = r === 'host' ? data.playerDeck : data.opponentDeck;
    const owner    = getMyOwner(r);
    const fullDeck = [];
    for (let i = 0; i < DECK_TOTAL; i++) {
      fullDeck.push({ ...baseDeck[i % baseDeck.length], id: `${r}_${i}`, owner });
    }
    setMyHand(fullDeck.slice(0, HAND_SIZE));
    setMyDeck(fullDeck.slice(HAND_SIZE));
    setOpponentHandCount(DECK_TOTAL);
    setGameResult(null);
  };

  // ── Connection bootstrap ──
  const handleConnection = (conn, r) => {
    roleRef.current = r;
    setRole(r);
    setConnection(conn);
    setStatus('connected');
    setIsMyTurn(r === 'host');
    initLocalDeck(r);

    // Host generates elemental layout and pushes rules on open
    if (r === 'host') {
      conn.on('open', () => {
        const elements = generateElements(arenaRulesRef.current);
        setBoardElements(elements);
        boardElementsRef.current = elements;
        conn.send({ type: 'HOST_RULES', rules: arenaRulesRef.current, boardElements: elements });
      });
    }

    conn.on('data', (data) => {
      // ── HOST_RULES: guest locks rules and receives element layout ──
      if (data.type === 'HOST_RULES') {
        const rules = data.rules || [];
        // Update App-level matchConfig so UI dropdowns reflect host's choice
        if (setMatchConfig) setMatchConfig(rulesArrayToConfig(rules));
        setArenaRules(rules);
        arenaRulesRef.current = rules;
        setRulesLocked(true);
        if (data.boardElements) {
          setBoardElements(data.boardElements);
          boardElementsRef.current = data.boardElements;
        }

      // ── MOVE: apply opponent's board state ──
      } else if (data.type === 'MOVE') {
        // Host re-broadcasts rules each move as source of truth
        if (data.rules) {
          setArenaRules(data.rules);
          arenaRulesRef.current = data.rules;
        }
        // Flash special captures
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
        // Check win condition
        const result = evalResult(data.board, getMyOwner(roleRef.current));
        if (result) setGameResult(result);

      // ── RESET: fresh board with new element layout ──
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

  // ── Room management ──
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
    // Host regenerates elements; guest will receive them via RESET message
    const elements = role === 'host' ? generateElements(arenaRulesRef.current) : boardElementsRef.current;
    if (role === 'host') {
      setBoardElements(elements);
      boardElementsRef.current = elements;
    }
    setBoard(Array(BOARD_SIZE).fill(null));
    setFlashMap({});
    setGameResult(null);
    initLocalDeck(role);
    setIsMyTurn(role === 'host');
    if (connection) connection.send({ type: 'RESET', boardElements: elements });
  };

  // ── Move execution ──
  const executeMove = (placedCard, targetIndex) => {
    // Refill hand from deck
    let nextCard = null;
    setMyDeck(prev => {
      const next = [...prev];
      nextCard = next.shift() || null;
      return next;
    });
    setMyHand(prev => {
      const h = prev.filter(c => c.id !== placedCard.id);
      if (nextCard) h.push(nextCard);
      return h;
    });

    const { newBoard, capturedBy } = placeCardOnBoard(
      board, placedCard, targetIndex, GRID, arenaRules, boardElementsRef.current
    );

    // Flash special-rule captures
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

    // Local win check
    const result = evalResult(newBoard, myOwner);
    if (result) setGameResult(result);

    if (connection) {
      connection.send({
        type: 'MOVE',
        board: newBoard,
        capturedBy,
        // Host re-broadcasts rules as source of truth each move
        rules: role === 'host' ? arenaRulesRef.current : undefined,
      });
    }
  };

  // ── Drag handlers ──
  const handleDragStart = e => setActiveDragCard(e.active.data.current?.card);
  const handleDragEnd   = e => {
    setActiveDragCard(null);
    if (gameResult || !e.over || !e.active.data.current?.card || !isMyTurn) return;
    const idx = parseInt(e.over.id.replace('net-cell-', ''), 10);
    if (!isNaN(idx) && !board[idx]) executeMove(e.active.data.current.card, idx);
  };

  // ── Result config ──
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
        <h1 style={{ fontSize: '3rem', textShadow: '0 0 10px var(--player-color)' }}>
          MULTIPLAYER ARENA [5×5]
        </h1>
        <div style={{ display: 'flex', gap: '30px' }}>
          <button
            className="mode-toggle-btn active"
            onClick={createRoom}
            style={{ padding: '15px 30px', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            HOST MATCH
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Enter Host Code"
              value={targetId}
              onChange={e => setTargetId(e.target.value)}
              style={{ padding: '10px', background: 'transparent', color: 'white', border: '1px solid var(--player-color)', textAlign: 'center' }}
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
          <div style={{ color: 'var(--player-color)', fontSize: '0.85rem' }}>
            Rules locked to host's selection
          </div>
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
        <div style={{ fontSize: '2rem', padding: '20px', border: '1px dashed var(--player-color)', borderRadius: '10px' }}>
          {peerId || 'Generating...'}
        </div>
        <p>Send this code to your opponent.</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
          Active rules will be sent to them on connect.
        </p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ACTIVE GAME
  // ════════════════════════════════════════════════════════════════
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      <div className="raid-wrapper raid-horizontal-layout">

        {/* ── Game-over overlay ── */}
        {gameResult && (
          <div className={`win-banner ${resultCfg[gameResult].cls}`} style={{ zIndex: 200 }}>
            <div className="banner-title">{resultCfg[gameResult].label}</div>
            <div className="banner-score">{myScore} — {theirScore}</div>
            <button className="banner-btn" onClick={resetMatch}>REMATCH</button>
          </div>
        )}

        {/* ── Header controls ── */}
        <button
          onClick={resetMatch}
          style={{ position: 'absolute', top: '15px', right: '20px', padding: '8px 16px', background: 'transparent', border: '1px solid var(--player-color)', color: 'white', cursor: 'pointer', fontFamily: 'Cinzel', zIndex: 1000 }}
        >
          Reset Match
        </button>
        {rulesLocked && (
          <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', fontFamily: 'Cinzel', zIndex: 1000 }}>
            Rules synced from host
          </div>
        )}

        {/* ── Opponent Flank ── */}
        <div className="side-column boss-align">
          <div className="slot-container" style={{ opacity: isMyTurn ? 0.5 : 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: 'var(--opponent-color)', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '12px' }}>
              {isMyTurn ? 'WAITING' : "OPP'S TURN"}
            </div>
            <div style={{ fontFamily: 'Cinzel', fontSize: '0.85rem', marginBottom: '10px', color: 'rgba(255,255,255,0.5)' }}>
              Cards left: {opponentHandCount}
            </div>
            <div className="mini-hand boss-stack">
              {Array(Math.min(opponentHandCount, HAND_SIZE)).fill(0).map((_, i) => (
                <div key={i} className="tt-card opponent hidden-card">?</div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Center: board + score ── */}
        <div className="board-container raid-board-container">
          {/* Live score */}
          <div className="score-row" style={{ marginBottom: '8px' }}>
            <span className="score-player">{myScore}</span>
            <span className="score-sep">—</span>
            <span className="score-opp">{theirScore}</span>
          </div>

          {/* 5×5 grid */}
          <div className="board grid-5x5">
            {board.map((c, i) => (
              <DroppableCell
                key={`net-cell-${i}`}
                id={`net-cell-${i}`}
                card={c}
                element={boardElements[i]}
                flashClass={flashMap[i] ? `captured-${flashMap[i]}` : ''}
              />
            ))}
          </div>
        </div>

        {/* ── Player Flank ── */}
        <div className="side-column player-align">
          <div className="slot-container" style={{ opacity: isMyTurn ? 1 : 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ color: 'var(--player-color)', fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '12px' }}>
              {isMyTurn ? 'YOUR TURN' : 'PLEASE WAIT'}
            </div>
            <div style={{ fontFamily: 'Cinzel', fontSize: '0.85rem', marginBottom: '10px', color: 'rgba(255,255,255,0.5)' }}>
              Deck remaining: {myDeck.length}
            </div>
            <div className="mini-hand player-stack">
              {myHand.map(c => (
                <DraggableCard key={c.id} card={c} disabled={!isMyTurn || !!gameResult} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Drag ghost ── */}
        <DragOverlay dropAnimation={null}>
          {activeDragCard && (
            <div className={`tt-card ${activeDragCard.owner}`} style={{ width: '100%', height: '100%' }}>
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
