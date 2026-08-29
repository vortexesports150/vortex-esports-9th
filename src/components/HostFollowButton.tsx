import React, { useEffect, useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HostFollowButtonProps {
  hostId?: string;
  currentUserId?: string;
  className?: string;
  followType?: 'host' | 'game';
}

export const HostFollowButton: React.FC<HostFollowButtonProps> = ({
  hostId,
  currentUserId,
  className = '',
  followType = 'host'
}) => {
  const effectiveHostId = hostId || 'official_host';
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchingDocs, setMatchingDocs] = useState<string[]>([]);

  useEffect(() => {
    if (!effectiveHostId || !currentUserId) {
      setIsFollowing(false);
      setMatchingDocs([]);
      return;
    }

    // Query follows for the hostId to be highly flexible
    const followsRef = collection(db, 'user_follows');
    const q = query(
      followsRef,
      where('hostId', '==', effectiveHostId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        // Filter in memory to match both schemas: followerId OR userId
        const matches = snap.docs.filter(d => {
          const data = d.data();
          const matchesFollower = data.followerId === currentUserId || data.userId === currentUserId;
          const matchesType = data.targetType === followType || data.type === followType;
          return matchesFollower && matchesType;
        });

        setIsFollowing(matches.length > 0);
        setMatchingDocs(matches.map(d => d.id));
      },
      (err) => console.warn('Error listening follow status:', err)
    );

    return () => unsub();
  }, [effectiveHostId, currentUserId, followType]);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollowing) {
      // Unfollow is only available on the host's profile modal, not on cards!
      return;
    }
    if (!currentUserId) {
      alert('Please log in to follow!');
      return;
    }

    if (currentUserId === effectiveHostId) {
      alert('You cannot follow your own profile!');
      return;
    }

    setLoading(true);
    try {
      // Write BOTH schemas so both old legacy code and new PulseUserProfileModal.tsx are 100% satisfied!
      await addDoc(collection(db, 'user_follows'), {
        // Schema A (Pulse Feed & User Profile Modal)
        followerId: currentUserId,
        hostId: effectiveHostId,
        targetType: followType,
        targetName: 'Titan esports', // General fallback, matches UI
        
        // Schema B (Legacy HostFollowButton)
        userId: currentUserId,
        type: followType,
        
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to toggle follow:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleFollow}
      disabled={loading}
      className={`px-2 py-0.5 rounded-full font-mono font-extrabold uppercase tracking-wider text-[8px] flex items-center gap-1 transition-all shrink-0 ${
        isFollowing
          ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)] cursor-default select-none'
          : 'bg-slate-950/80 border border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.3)] cursor-pointer'
      } ${className}`}
      title={isFollowing ? 'following' : `Click to follow ${followType}`}
    >
      {loading ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin text-red-500" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          <span className="text-[8px] text-cyan-400 font-extrabold">following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-2.5 h-2.5 text-red-500 shrink-0" />
          <span className="text-[8px] text-red-500 font-extrabold">Follow</span>
        </>
      )}
    </button>
  );
};
