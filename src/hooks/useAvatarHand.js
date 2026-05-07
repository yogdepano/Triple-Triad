import { useState, useEffect } from 'react';
import { supabase, getUserAvatar } from '../lib/supabaseClient';

export function useAvatarHand() {
  const [avatarCard, setAvatarCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAvatar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const avatar = await getUserAvatar(user.id);
        if (avatar) {
          setAvatarCard({
            ...avatar,
            top: avatar.stats[0],
            right: avatar.stats[1],
            bottom: avatar.stats[2],
            left: avatar.stats[3],
            image: avatar.image_url,
            isAvatar: true,
            owner: 'player'
          });
        }
      }
      setLoading(false);
    }
    fetchAvatar();
  }, []);

  const injectAvatar = (hand) => {
    if (!avatarCard || !hand || hand.length === 0) return hand;
    const newHand = [...hand];
    // Always put avatar at index 0 or replace a specific card
    newHand[0] = { ...avatarCard, id: `p_avatar_${Date.now()}` };
    return newHand;
  };

  return { avatarCard, injectAvatar, loading };
}
