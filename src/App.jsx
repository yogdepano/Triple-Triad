import React, { useState } from 'react'
import GameBoard from './components/GameBoard'
import WorldBossRaid from './components/WorldBossRaid'
import MultiplayerArena from './components/MultiplayerArena'

function App() {
  const [currentMode, setCurrentMode] = useState('multiplayer')

  return (
    <>
      <div className="mode-toggle">
        <button 
          className={currentMode === 'classic' ? 'active' : ''} 
          onClick={() => setCurrentMode('classic')}>
          Classic 3x3 PVP
        </button>
        <button 
          className={currentMode === 'multiplayer' ? 'active' : ''} 
          onClick={() => setCurrentMode('multiplayer')}>
          Multiplayer 5x5 Arena
        </button>
        <button 
          className={currentMode === 'raid' ? 'active' : ''} 
          onClick={() => setCurrentMode('raid')}>
          10-Player World Raid
        </button>
      </div>

      {currentMode === 'classic' && <GameBoard />}
      {currentMode === 'raid' && <WorldBossRaid />}
      {currentMode === 'multiplayer' && <MultiplayerArena />}
    </>
  )
}

export default App
