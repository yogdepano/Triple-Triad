import React, { useState } from 'react'
import DesktopScaler from './components/DesktopScaler'
import GameBoard from './components/GameBoard'
import ClassicArena from './components/ClassicArena'
import WorldBossRaid from './components/WorldBossRaid'
import MultiplayerArena from './components/MultiplayerArena'
import AdventureMap from './components/AdventureMap'
import GameBoard5x5 from './components/GameBoard5x5'
import { RULE_DESCRIPTIONS } from './data/RuleDescriptions'

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
      {value && <div className="rule-desc">{RULE_DESCRIPTIONS[value]}</div>}
    </div>
  );
}

function App() {
  const [currentMode, setCurrentMode] = useState('classic');
  const [gameKey,     setGameKey]     = useState(0);
  const [initialRoom, setInitialRoom] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const mode = params.get('m');
    
    if (room) {
      setInitialRoom(room);
      if (mode === 'multiplayer') {
        setCurrentMode('multiplayer');
      } else {
        setCurrentMode('classic_online');
      }
      // Clean up URL without refreshing
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const [matchConfig, setMatchConfig] = useState({
    basicRules: ['basic', null],
    specialRule: null,
    infectionRule: null,
  });

  const setBasic1 = (rule) => {
    setMatchConfig(prev => {
      const b2 = prev.basicRules[1] === rule ? null : prev.basicRules[1];
      const sp = prev.specialRule   === rule ? null : prev.specialRule;
      return { ...prev, basicRules: [rule, b2], specialRule: sp };
    });
  };
  const setBasic2 = (rule) => {
    setMatchConfig(prev => {
      const b1 = prev.basicRules[0] === rule ? null : prev.basicRules[0];
      const sp = prev.specialRule   === rule ? null : prev.specialRule;
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
  const switchMode  = (mode) => { setCurrentMode(mode); setGameKey(k => k + 1); };

  const [b1, b2] = matchConfig.basicRules;
  const sp = matchConfig.specialRule;
  const cfg = { ...matchConfig, basicRules: matchConfig.basicRules.filter(Boolean) };

  const rulesDrawer = (
    <>
      {isDrawerOpen && <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} />}
      <div className={`rules-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>Match Settings</h3>
          <button className="close-btn" onClick={() => setIsDrawerOpen(false)}>×</button>
        </div>
        <div className="drawer-content">
          <RuleDropdown id="basic-slot-1"   label="Basic 1"   value={b1} exclude={[b2, sp].filter(Boolean)} onChange={setBasic1} />
          <RuleDropdown id="basic-slot-2"   label="Basic 2"   value={b2} exclude={[b1, sp].filter(Boolean)} onChange={setBasic2} />
          <RuleDropdown id="special-slot"   label="Special"   value={sp} exclude={[b1, b2].filter(Boolean)} onChange={setSpecial} />
          <RuleDropdown id="infection-slot" label="Infection" value={null} onChange={() => {}} disabled />
        </div>
      </div>
    </>
  );

  return (
    <DesktopScaler>
      <div className="app-shell">
        <header className="app-header floating">
          {/* Mode Dropdown */}
          <div className="mode-selector">
            <select className="mode-dropdown" value={currentMode} onChange={(e) => switchMode(e.target.value)}>
              <option value="classic">3×3 Classic</option>
              <option value="classic_5x5">5×5 vs AI</option>
              <option value="classic_online">3×3 ⚔ Online</option>
              <option value="multiplayer">5×5 Multiplayer</option>
              <option value="raid">World Boss Raid</option>
              <option value="adventure">⚔ Quest</option>
            </select>
          </div>

          {/* Floating Settings Button */}
          <div className="header-right">
            <button className="icon-btn settings-btn" onClick={() => setIsDrawerOpen(true)}>⚙️ Rules</button>
          </div>
        </header>

        {rulesDrawer}
        
        {/* FAB Reset Button */}
        <button className="fab reset-fab" onClick={handleReset} title="Reset Match">↺</button>

        <main className="app-main">
          {currentMode === 'classic'        && <GameBoard       key={gameKey} matchConfig={cfg} onReset={handleReset} />}
          {currentMode === 'classic_5x5'    && <GameBoard5x5    key={gameKey} matchConfig={cfg} onReset={handleReset} />}
          {currentMode === 'classic_online' && <ClassicArena               matchConfig={cfg} setMatchConfig={setMatchConfig} room={initialRoom} />}
          {currentMode === 'raid'           && <WorldBossRaid   key={gameKey} matchConfig={cfg} />}
          {currentMode === 'multiplayer'    && <MultiplayerArena            matchConfig={cfg} setMatchConfig={setMatchConfig} room={initialRoom} />}
          {currentMode === 'adventure'      && <AdventureMap />}
        </main>
      </div>
    </DesktopScaler>
  );
}

export default App
