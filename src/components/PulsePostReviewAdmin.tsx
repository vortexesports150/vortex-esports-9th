import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ShieldCheck, X, Check, Activity, Search, Clock, Trash2 } from 'lucide-react';

interface PulsePostReviewAdminProps {
  onBack: () => void;
}

export const PulsePostReviewAdmin: React.FC<PulsePostReviewAdminProps> = ({ onBack }) => {
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const postsRef = collection(db, 'pulse_posts');
    const q = query(postsRef, where('status', '==', 'pending'));
    
    const unsub = onSnapshot(q, (snap) => {
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory since firestore requires composite index for where+orderBy
      posts.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setPendingPosts(posts);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleApprove = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'pulse_posts', postId), { 
        status: 'approved',
        approvedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
      alert('Error approving post');
    }
  };

  const handleReject = async (postId: string) => {
    try {
      await updateDoc(doc(db, 'pulse_posts', postId), { status: 'rejected' });
    } catch (e) {
      console.error(e);
      alert('Error rejecting post');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4 text-slate-300" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              Pulse Post Review
            </h2>
            <p className="text-xs text-slate-400">Approve or reject community posts.</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/30 rounded-lg">
          <span className="text-cyan-400 font-mono text-sm font-bold">{pendingPosts.length} Pending</span>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm animate-pulse">Loading pending posts...</div>
        ) : pendingPosts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
            <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-50" />
            <p className="text-slate-400 font-mono text-sm">All caught up! No posts to review.</p>
          </div>
        ) : (
          pendingPosts.map(post => (
            <div key={post.id} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row gap-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_cyan]"></div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <img src={post.userPhoto || 'https://via.placeholder.com/40'} alt="User" className="w-10 h-10 rounded-full border border-slate-600 object-cover" />
                  <div>
                    <h3 className="text-sm font-bold text-white">{post.userName}</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-300">{post.text}</p>
                </div>

                {post.imageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700">
                    <img src={post.imageUrl} alt="Post Attachment" className="w-full max-h-[300px] object-cover" />
                  </div>
                )}
              </div>

              <div className="flex flex-row md:flex-col gap-2 justify-center items-end shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                <button 
                  onClick={() => handleApprove(post.id)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">Approve</span>
                </button>
                <button 
                  onClick={() => handleReject(post.id)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">Reject</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
