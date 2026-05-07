import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Auth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
    });
    if (error) console.error('Login error:', error.message);
  };

  const handleGuestLogin = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.error('Guest login error:', error.message);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error.message);
  };

  if (user) {
    const isGuest = user.is_anonymous;
    return (
      <div className="auth-status">
        <span className="user-name">
          {isGuest ? 'Guest Adventurer' : (user.user_metadata.full_name || user.email)}
        </span>
        <button onClick={handleLogout} className="auth-btn logout">Logout</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <button onClick={handleLogin} className="auth-btn login">
        GitHub
      </button>
      <button onClick={handleGuestLogin} className="auth-btn guest">
        Guest
      </button>
    </div>
  );
}
