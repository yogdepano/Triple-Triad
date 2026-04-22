import React, { useState, useMemo } from 'react';
import { generateMap, completeNode, TOTAL_ROWS } from '../data/MapGenerator';
import { loadSaveData, saveData, resetAdventureRun, resetAllData } from '../data/MockSaveData';
import AdventureEncounter from './AdventureEncounter';

const NODE_ICONS = { common: '⚔', elite: '☠', boss: '👑' };
const NODE_LABELS = { common: 'Common', elite: 'Elite', boss: 'Boss' };

// Act 1 map rules shown to player
const MAP_RULES = ['Basic', 'Open'];
const BOSS_EXTRA_RULE = 'Equal';

// ─── Node component ──────────────────────────────────────────────────────────
function MapNode({ node, isSelected, onClick }) {
  const stateClass = node.completed
    ? 'node-completed'
    : node.available
    ? 'node-available'
    : 'node-locked';

  return (
    <div
      className={`map-node ${stateClass} node-${node.type} ${isSelected ? 'node-selected' : ''}`}
      onClick={() => node.available && onClick(node)}
      title={node.available ? `${NODE_LABELS[node.type]} — click to enter` : node.completed ? 'Completed' : 'Locked'}
    >
      <span className="node-icon">
        {node.completed ? '✓' : NODE_ICONS[node.type]}
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdventureMap() {
  const savedData = loadSaveData();

  // ── Run state ──
  const [runSeed,   setRunSeed]   = useState(savedData.adventureRun?.seed   ?? null);
  const [nodeStates,setNodeStates]= useState(savedData.adventureRun?.nodes  ?? {});
  const [selectedNode, setSelectedNode] = useState(null);  // node info panel
  const [activeNode,   setActiveNode]   = useState(null);  // currently fighting

  // ── Generate / load map ──
  const mapData = useMemo(() => {
    if (!runSeed) return null;
    return generateMap(runSeed);
  }, [runSeed]);

  // Merge DB node states over generated structure
  const nodes = useMemo(() => {
    if (!mapData) return {};
    const merged = { ...mapData.nodes };
    Object.entries(nodeStates).forEach(([id, st]) => {
      if (merged[id]) merged[id] = { ...merged[id], ...st };
    });
    return merged;
  }, [mapData, nodeStates]);

  // ── Start a new run (new map seed, keep cards) ──
  const startRun = () => {
    const seed = Date.now();
    const fresh = generateMap(seed);
    const initStates = {};
    fresh.startIds.forEach(id => { initStates[id] = { available: true }; });
    setRunSeed(seed);
    setNodeStates(initStates);
    setSelectedNode(null);
    const data = loadSaveData();
    saveData({
      ...data,
      adventureRun: { ...data.adventureRun, seed, nodes: initStates },
    });
  };

  // ── Reset current run only (back to ACT I splash, keep cards) ──
  const handleResetRun = () => {
    resetAdventureRun();
    setRunSeed(null);
    setNodeStates({});
    setSelectedNode(null);
    setActiveNode(null);
  };

  // ── Full factory reset (wipe cards + run, reload page) ──
  const handleResetAll = () => {
    if (!window.confirm('Reset EVERYTHING? Your card collection will return to defaults.')) return;
    resetAllData();
    window.location.reload();
  };

  // ── Mark node complete and unlock next row ──
  const markComplete = (nodeId) => {
    const updated = completeNode(nodes, nodeId);
    const newStates = {};
    Object.values(updated).forEach(n => {
      newStates[n.id] = { completed: n.completed, available: n.available };
    });
    setNodeStates(newStates);
    const data = loadSaveData();
    saveData({ ...data, adventureRun: { ...data.adventureRun, nodes: newStates } });
  };

  // ── Encounter callbacks ──
  const handleEncounterComplete = ({ nodeId }) => {
    markComplete(nodeId);
    setActiveNode(null);
    setSelectedNode(null);
  };
  const handleEncounterCancel = () => setActiveNode(null);

  // ── If in an encounter, render that instead ──
  if (activeNode) {
    return (
      <AdventureEncounter
        node={activeNode}
        onComplete={handleEncounterComplete}
        onCancel={handleEncounterCancel}
      />
    );
  }

  // ── No active run ──
  if (!runSeed || !mapData) {
    return (
      <div className="adv-wrapper">
        <div className="adv-no-run">
          <div className="adv-act-title">ACT I</div>
          <div className="adv-act-subtitle">The Lowlands</div>
          <p className="adv-act-desc">
            Venture into the wilderness to forge your card collection.
            Defeat enemies, claim their cards, and conquer the boss.
          </p>
          <div className="adv-map-rules">
            <span className="adv-rules-label">MAP RULES</span>
            {MAP_RULES.map(r => <span key={r} className="adv-rule-chip">{r}</span>)}
            <span className="adv-rule-chip boss-chip">Boss: {BOSS_EXTRA_RULE}</span>
          </div>
          <button className="adv-start-btn" onClick={startRun}>
            BEGIN ADVENTURE
          </button>
        </div>
      </div>
    );
  }

  // ── Render map ──
  const allNodes = Object.values(nodes);

  return (
    <div className="adv-wrapper">
      {/* Thin info bar — title + rules only, no buttons */}
      <div className="adv-header">
        <div className="adv-header-left">
          <span className="adv-act-badge">ACT I</span>
          <span className="adv-act-name">The Lowlands</span>
        </div>
        <div className="adv-map-rules">
          {MAP_RULES.map(r => <span key={r} className="adv-rule-chip">{r}</span>)}
          <span className="adv-rule-chip boss-chip">Boss: {BOSS_EXTRA_RULE}</span>
        </div>
      </div>

      {/* Map canvas */}
      <div className="adv-map-canvas">
        {/* Floating control buttons — always visible top-right */}
        <div className="adv-controls">
          <button className="adv-new-run-btn" onClick={startRun} title="Generate a new map (keeps cards)">↺ New Run</button>
          <button className="adv-reset-run-btn" onClick={handleResetRun} title="Back to ACT I screen">↩ Reset Run</button>
          <button className="adv-reset-all-btn" onClick={handleResetAll} title="Full factory reset">🗑 Reset All</button>
        </div>

        {/* SVG connector lines */}
        <svg className="adv-svg-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Object.values(nodes).map(n => (
            <React.Fragment key={n.id}>
              {n.connections.map(targetId => {
                const target = nodes[targetId];
                if (!target) return null;
                const x1 = n.x * 100;
                const y1 = (1 - n.y) * 78 + 6;
                const x2 = target.x * 100;
                const y2 = (1 - target.y) * 78 + 6;
                const isActive = n.completed || n.available;
                return (
                  <line
                    key={`${n.id}-${targetId}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className={`adv-path ${isActive ? 'path-active' : 'path-locked'}`}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </svg>

        {/* Nodes — each placed directly on the canvas via its x,y */}
        {allNodes.map(n => (
          <div
            key={n.id}
            style={{
              position: 'absolute',
              left: `${n.x * 100}%`,
              top:  `${(1 - n.y) * 78 + 6}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 1,
            }}
          >
            <MapNode
              node={n}
              isSelected={selectedNode?.id === n.id}
              onClick={setSelectedNode}
            />
          </div>
        ))}
      </div>


      {/* Node info panel */}
      {selectedNode && (
        <div className="adv-node-panel">
          <div className={`adv-node-panel-type type-${selectedNode.type}`}>
            {NODE_ICONS[selectedNode.type]} {NODE_LABELS[selectedNode.type].toUpperCase()}
          </div>
          <div className="adv-node-panel-rules">
            <span className="adv-rules-label">Rules:</span>
            {MAP_RULES.map(r => <span key={r} className="adv-rule-chip">{r}</span>)}
            {selectedNode.type === 'boss' && (
              <span className="adv-rule-chip boss-chip">{BOSS_EXTRA_RULE}</span>
            )}
          </div>
          {selectedNode.type === 'boss' && (
            <p className="adv-node-panel-hint">
              Defeat the boss. If Equal flips the boss card, you can claim it — one copy only.
            </p>
          )}
          <button
            className="adv-enter-btn"
            onClick={() => { setActiveNode(selectedNode); }}
          >
            ENTER NODE
          </button>
          <button
            className="banner-btn"
            onClick={() => setSelectedNode(null)}
            style={{ marginTop: '8px', opacity: 0.5 }}
          >
            CANCEL
          </button>
        </div>
      )}
    </div>
  );
}
