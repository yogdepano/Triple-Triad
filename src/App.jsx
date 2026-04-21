import React, { useState } from 'react'
import GameBoard from './components/GameBoard'
import WorldBossRaid from './components/WorldBossRaid'
import MultiplayerArena from './components/MultiplayerArena'

const ALL_RULES = [
  { value: 'basic',       label: 'Basic' },
  { value: 'open',        label: 'Open' },
  { value: 'same',        label: 'Same' },
  { value: 'same_wall',   label: 'Wall' },
  { value: 'plus',        label: 'Plus' },
  { value: 'equal',       label: 'Equal' },
  { value: 'combo',       label: 'Combo' },
  { value: 'elemental',   label: 'Elemental' },
  { value: 'random',      label: 'Random' },
  { value: 'sudden_death',label: 'Sudden Death' },
];

function RuleDropdown({ id, value, label, exclude = [], onChange, disabled = false }) {
  const available = ALL_RULES.filter(r => !exclude.includes(r.value));
  return (
    <div className="rule-slot">
      <span className="slot-label">{label}</span>
      <select
        id={id}
        className="rule-select"
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        disabled={disabled}
      >
        <option value="">— None —</option>
        {available.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  );
}

function App() {
  const [currentMode, setCurrentMode] = useState('classic');
  const [gameKey, setGameKey] = useState(0);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [matchConfig, setMatchConfig] = useState({
    basicRules: ['basic', null],
    specialRule: null,
    infectionRule: null,
  });

  const setBasic1 = (rule) => {
    setMatchConfig(prev => {
      const b2 = prev.basicRules[1] === rule ? null : prev.basicRules[1];
      const sp = prev.specialRule === rule ? null : prev.specialRule;
      return { ...prev, basicRules: [rule, b2], specialRule: sp };
    });
  };

  const setBasic2 = (rule) => {
    setMatchConfig(prev => {
      const b1 = prev.basicRules[0] === rule ? null : prev.basicRules[0];
      const sp = prev.specialRule === rule ? null : prev.specialRule;
      return { ...prev, basicRules: [b1, rule], specialRule: sp };
    });
  };

  const setSpecial = (rule) => {
    setMatchConfig(prev => {
      const b1 = prev.basicRules[0] === rule ? null : prev.basicRules[0];
      const b2 = prev.basicRules[1] === rule ? null : prev.basicRules[1];
      return { ...prev, basicRules: [b1, b2], specialRule: rule };
    });
  };

  const handleReset = () => setGameKey(k => k + 1);
  const switchMode  = (mode) => { setCurrentMode(mode); setGameKey(k => k + 1); setRulesOpen(false); };

  const [b1, b2] = matchConfig.basicRules;
  const sp = matchConfig.specialRule;

  const rulesPanel = (
    <div className="rules-panel">
      <RuleDropdown id="basic-slot-1" label="Basic 1" value={b1} exclude={[b2, sp].filter(Boolean)} onChange={setBasic1} />
      <RuleDropdown id="basic-slot-2" label="Basic 2" value={b2} exclude={[b1, sp].filter(Boolean)} onChange={setBasic2} />
      <RuleDropdown id="special-slot" label="Special" value={sp}  exclude={[b1, b2].filter(Boolean)} onChange={setSpecial} />
      <RuleDropdown id="infection-slot" label="Infection" value={null} onChange={() => {}} disabled />
    </div>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        {/* Mode buttons — always visible */}
        <div className="mode-toggle">
          <button className={currentMode === 'classic'     ? 'active' : ''} onClick={() => switchMode('classic')}>3×3</button>
          <button className={currentMode === 'multiplayer' ? 'active' : ''} onClick={() => switchMode('multiplayer')}>5×5</button>
          <button className={currentMode === 'raid'        ? 'active' : ''} onClick={() => switchMode('raid')}>Raid</button>
        </div>

        {/* Rules panel — hidden on mobile, visible on desktop */}
        <div className="header-right desktop-rules">
          {rulesPanel}
          <button className="reset-btn" onClick={handleReset}>↺ Reset</button>
        </div>

        {/* Mobile: gear icon + reset */}
        <div className="header-right mobile-controls">
          <button className="reset-btn" onClick={handleReset}>↺</button>
          <button
            id="rules-toggle-btn"
            className={`rules-toggle-btn ${rulesOpen ? 'active' : ''}`}
            onClick={() => setRulesOpen(o => !o)}
            aria-label="Toggle rules"
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Mobile rules drawer — slides down below header */}
      {rulesOpen && (
        <div className="mobile-rules-drawer">
          {rulesPanel}
        </div>
      )}

      <main className="app-main">
        {currentMode === 'classic'     && <GameBoard      key={gameKey} matchConfig={{ ...matchConfig, basicRules: matchConfig.basicRules.filter(Boolean) }} onReset={handleReset} />}
        {currentMode === 'raid'        && <WorldBossRaid  key={gameKey} matchConfig={{ ...matchConfig, basicRules: matchConfig.basicRules.filter(Boolean) }} />}
        {currentMode === 'multiplayer' && <MultiplayerArena            matchConfig={{ ...matchConfig, basicRules: matchConfig.basicRules.filter(Boolean) }} setMatchConfig={setMatchConfig} />}
      </main>
    </div>
  );
}

export default App
