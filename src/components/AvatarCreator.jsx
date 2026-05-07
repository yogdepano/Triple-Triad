import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AvatarCreator({ onComplete }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ top: 1, right: 1, bottom: 1, left: 1 });
  const [powerStat, setPowerStat] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [animatingSides, setAnimatingSides] = useState([]);
  const [name, setName] = useState('');
  const [element, setElement] = useState(null);
  const [message, setMessage] = useState(null);
  const [previewImage, setPreviewImage] = useState('/assets/bubble_monster.png');
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        const meta = user.user_metadata;
        setName(meta?.full_name || meta?.user_name || (user.is_anonymous ? 'Guest Adventurer' : ''));
      }
    });
  }, []);

  const elements = ['💧', '🔥', '🌿', '🪨', '⚡', '✨', '🌑', null];

  const resetForge = () => {
    setStats({ top: 1, right: 1, bottom: 1, left: 1 });
    setPowerStat(null);
    setIsLocked(false);
    setIsRolling(false);
    setAnimatingSides([]);
    setMessage(null);
  };

  const handleSelection = (side) => {
    if (isLocked || isRolling) return;
    setPowerStat(side);
    setStats({ top: 1, right: 1, bottom: 1, left: 1, [side]: 5 });
  };

  const startRollSequence = async () => {
    if (!powerStat || isLocked || isRolling) return;
    
    setIsRolling(true);
    setIsLocked(true);
    const sides = ['top', 'right', 'bottom', 'left'];
    const remainingSides = sides.filter(s => s !== powerStat);
    
    // 1. Roll for the second '5'
    const randomSecondSide = remainingSides[Math.floor(Math.random() * remainingSides.length)];
    setAnimatingSides([randomSecondSide]);
    
    // Simulate rolling
    let rollCount = 0;
    const rollInterval = setInterval(() => {
      setStats(prev => ({ ...prev, [randomSecondSide]: Math.floor(Math.random() * 9) + 1 }));
      rollCount++;
      if (rollCount > 15) {
        clearInterval(rollInterval);
        setStats(prev => ({ ...prev, [randomSecondSide]: 5 }));
        
        // 2. Roll for the last two stats
        const lastTwoSides = remainingSides.filter(s => s !== randomSecondSide);
        setAnimatingSides(lastTwoSides);
        
        let lastRollCount = 0;
        const lastRollInterval = setInterval(() => {
          lastTwoSides.forEach(side => {
            setStats(prev => ({ ...prev, [side]: Math.floor(Math.random() * 5) + 1 }));
          });
          lastRollCount++;
          
          if (lastRollCount > 25) {
            clearInterval(lastRollInterval);
            // Final values
            const finalStats = { ...stats, [powerStat]: 5, [randomSecondSide]: 5 };
            lastTwoSides.forEach(side => {
              finalStats[side] = Math.floor(Math.random() * 5) + 1;
            });
            setStats(finalStats);
            setAnimatingSides([]);
            setIsRolling(false);
          }
        }, 60);
      }
    }, 60);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!isLocked || isRolling) {
      setMessage('Please confirm and finish rolling your stats!');
      return;
    }
    setLoading(true);
    setMessage('Forging your legacy...');

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          username: name || user.email,
          updated_at: new Date()
        });

      if (profileError) throw profileError;

      const { error: cardError } = await supabase
        .from('custom_cards')
        .insert({
          user_id: user.id,
          name: name,
          stats: [stats.top, stats.right, stats.bottom, stats.left],
          element: element,
          is_avatar: true,
          image_url: previewImage
        });

      if (cardError) throw cardError;

      setMessage('Avatar Forged Successfully!');
      setTimeout(() => onComplete(), 2000);
    } catch (err) {
      console.error(err);
      // If profiles fails but cardError doesn't, we might still have the card.
      // But usually both are needed for a clean profile.
      setMessage(`Forge Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [showFlash, setShowFlash] = useState(false);

  // Trigger flash when rolling ends
  useEffect(() => {
    if (isLocked && !isRolling && powerStat) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isRolling, isLocked, powerStat]);

  if (!user) return (
    <div className="creator-wrapper" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <h2 className="creator-title">The Grand Forge</h2>
      <p style={{ color:'var(--accent-color)', marginBottom:'20px', fontFamily:'Cinzel' }}>Please login to forge your legacy.</p>
      <div className="auth-fallback-hint">Identity is required for persistence.</div>
    </div>
  );

  return (
    <div className={`creator-wrapper ${showFlash ? 'forge-flash-active' : ''}`}>
      <div className="forge-background-glow" />
      <h2 className="creator-title">The Grand Forge</h2>
      
      <div className="creator-layout">
        {/* Left: Card Preview */}
        <div className="creator-preview">
          <div className={`tt-card player1 avatar-preview ${isRolling ? 'card-shaking' : ''} ${!isRolling && isLocked ? 'card-finalized' : ''}`}>
            <div className="card-image-underlay">
              <img src={previewImage} alt="Avatar" className="underlay-img" />
              <div className="underlay-scanline" />
            </div>
            <div className="card-frame-overlay" />
            
            {element && <div className="element-icon element-pop">{element}</div>}
            
            <div className="stats">
              <span className={`t ${powerStat === 'top' ? 'power' : ''} ${animatingSides.includes('top') ? 'rolling' : ''}`}>{stats.top}</span>
              <span className={`l ${powerStat === 'left' ? 'power' : ''} ${animatingSides.includes('left') ? 'rolling' : ''}`}>{stats.left}</span>
              <span className={`r ${powerStat === 'right' ? 'power' : ''} ${animatingSides.includes('right') ? 'rolling' : ''}`}>{stats.right}</span>
              <span className={`b ${powerStat === 'bottom' ? 'power' : ''} ${animatingSides.includes('bottom') ? 'rolling' : ''}`}>{stats.bottom}</span>
            </div>
            <div className="name-plate">{name || 'Nameless One'}</div>
            
            {isLocked && !isRolling && <div className="card-sparkle-overlay" />}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="creator-controls">
          <div className="control-group">
            <label className="forge-label">Avatar Identity</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Enter name..."
              className="creator-input"
              disabled={isLocked && !isRolling} 
            />
          </div>

          <div className="control-group">
            <label className="forge-label">Soul Affinity (Element)</label>
            <div className="element-picker">
              {elements.map((el, i) => (
                <button 
                  key={i} 
                  className={`el-btn ${element === el ? 'active' : ''} ${isRolling ? 'disabled' : ''}`}
                  onClick={() => setElement(el)}
                  disabled={isRolling}
                >
                  {el || 'None'}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="forge-label">Stat Focus (Pick one side to be 5)</label>
            <div className="stat-picker-grid">
              {['top', 'right', 'bottom', 'left'].map(side => (
                <button 
                  key={side}
                  className={`stat-btn ${powerStat === side ? 'active' : ''}`}
                  onClick={() => handleSelection(side)}
                  disabled={isLocked || isRolling}
                >
                  {side.toUpperCase()}
                </button>
              ))}
            </div>
            
            <div className="forge-actions">
              {!isLocked && powerStat && (
                <button className="confirm-btn roll-pulse" onClick={startRollSequence}>
                  🔥 CONFIRM & ROLL
                </button>
              )}
              {isLocked && !isRolling && (
                <button className="reset-btn-small" onClick={resetForge}>
                  🔄 RESET FORGE
                </button>
              )}
            </div>
          </div>

          <div className="control-group">
            <label className="forge-label">Visual Essence (Photo)</label>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <button 
              className="creator-input upload-btn"
              onClick={() => fileInputRef.current.click()}
              disabled={isRolling}
            >
              📷 UPLOAD PORTRAIT
            </button>
          </div>

          <button 
            className={`banner-btn save-btn ${!name || !isLocked || isRolling ? 'btn-disabled' : 'btn-ready'}`} 
            onClick={handleSave} 
            disabled={loading || !name || !isLocked || isRolling}
          >
            {loading ? 'FORGING...' : 'BAPTIZE AVATAR'}
          </button>
          
          {message && <div className={`creator-message ${message.includes('Error') ? 'error' : 'success'}`}>{message}</div>}
        </div>
      </div>
    </div>
  );
}
