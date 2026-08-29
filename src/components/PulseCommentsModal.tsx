import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Heart, 
  Trash2, 
  Flag, 
  AlertTriangle, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  Reply,
  CornerDownRight
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc, 
  serverTimestamp, 
  increment,
  setDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { validateProfanityFilter } from '../utils/profanityFilter';

interface PulseComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userRole?: string;
  text: string;
  createdAt: any;
  likes: string[];
  parentId?: string | null;
}

interface PulseCommentsModalProps {
  postId: string;
  currentUserId: string;
  currentUserProfile: any;
  allUsersMap?: Record<string, any>;
  onClose: () => void;
}

export const PulseCommentsModal: React.FC<PulseCommentsModalProps> = ({
  postId,
  currentUserId,
  currentUserProfile,
  allUsersMap = {},
  onClose,
}) => {
  const [comments, setComments] = useState<PulseComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<PulseComment | null>(null);
  const [warningError, setWarningError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postStatus, setPostStatus] = useState<string>('approved');
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [commentToReport, setCommentToReport] = useState<PulseComment | null>(null);
  const [showReportSuccess, setShowReportSuccess] = useState<boolean>(false);
  const [postAuthorId, setPostAuthorId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState<string>('');

  const isUserAdminOrSuperAdmin = () => {
    if (!currentUserProfile) return false;
    const role = (currentUserProfile.role || '').toLowerCase().trim();
    const email = (currentUserProfile.email || '').toLowerCase().trim();
    return (
      email === 'vortexesports150@gmail.com' ||
      role === 'admin' ||
      role === 'main_admin' ||
      role === 'super_admin' ||
      role === 'sub_admin'
    );
  };

  // Real-time listener for parent post status
  useEffect(() => {
    if (!postId) return;
    const postRef = doc(db, 'pulse_posts', postId);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setPostStatus(d.status || 'approved');
        setPostAuthorId(d.userId || null);
        setPostTitle(d.text || '');
      }
    });
    return () => unsubscribe();
  }, [postId]);

  // Real-time listener for comments of this post
  useEffect(() => {
    if (!postId) return;
    const commentsRef = collection(db, 'pulse_posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PulseComment[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          postId,
          userId: d.userId || '',
          userName: d.userName || 'Gamer',
          userPhoto: d.userPhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop',
          userRole: d.userRole || '',
          text: d.text || '',
          createdAt: d.createdAt,
          likes: d.likes || [],
          parentId: d.parentId || null,
        };
      });
      setComments(list);
    }, (err) => {
      console.error("Error listening to comments:", err);
    });

    return () => unsubscribe();
  }, [postId]);

  // Submit comment with Rule-Based Profanity Filter
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarningError(null);

    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    if (!currentUserId) {
      alert("Please log in to comment!");
      return;
    }

    if (postStatus !== 'approved') {
      alert("This post has not been approved by an administrator yet and cannot be commented on.");
      return;
    }

    // Rule-Based Moderation Check
    const filterResult = validateProfanityFilter(trimmed);
    if (!filterResult.isValid) {
      setWarningError(filterResult.errorMessage || 'Your comment contains inappropriate language. Please edit your comment and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const commentsRef = collection(db, 'pulse_posts', postId, 'comments');
      await addDoc(commentsRef, {
        postId,
        userId: currentUserId,
        userName: currentUserProfile?.displayName || 'Vortex Gamer',
        userPhoto: currentUserProfile?.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop',
        userRole: currentUserProfile?.role || 'player',
        text: trimmed,
        createdAt: serverTimestamp(),
        likes: [],
        parentId: replyingTo ? replyingTo.id : null,
      });

      // Update post comment count
      const postRef = doc(db, 'pulse_posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(1),
      });

      // Send in-app notification to the post creator (poster) if it's someone else (and we are not replying to a specific comment, or maybe we do both)
      // Actually, if replying, send to the comment author. We can also send to post author, or just comment author. Let's send to comment author.
      if (replyingTo && replyingTo.userId && replyingTo.userId !== currentUserId) {
        try {
          const notifRef = doc(collection(db, 'users', replyingTo.userId, 'notifications'));
          const truncatedComment = replyingTo.text.trim().length > 30 
            ? `${replyingTo.text.trim().substring(0, 30)}...` 
            : replyingTo.text.trim();
          await setDoc(notifRef, {
            title: 'New Reply',
            message: `${currentUserProfile?.displayName || 'Vortex Gamer'} replied to your comment: "${truncatedComment}"`,
            type: 'comment_reply',
            postId: postId,
            read: false,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.warn('Could not send comment reply notification:', notifErr);
        }
      } else if (postAuthorId && postAuthorId !== currentUserId) {
        // If not replying, or if replying to own comment, notify the post author
        try {
          const notifRef = doc(collection(db, 'users', postAuthorId, 'notifications'));
          const truncatedTitle = postTitle.trim().length > 30 
            ? `${postTitle.trim().substring(0, 30)}...` 
            : postTitle.trim();
          await setDoc(notifRef, {
            title: 'New Comment',
            message: `${currentUserProfile?.displayName || 'Vortex Gamer'} commented on your post: "${truncatedTitle}"`,
            type: 'post_comment',
            postId: postId,
            read: false,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.warn('Could not send comment notification:', notifErr);
        }
      }

      setNewCommentText('');
      setReplyingTo(null);
      setWarningError(null);
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Like on Comment
  const handleToggleLikeComment = async (commentId: string, currentLikes: string[]) => {
    if (!currentUserId) return;
    if (postStatus !== 'approved') {
      alert("Cannot like comments on unapproved posts.");
      return;
    }
    try {
      const commentRef = doc(db, 'pulse_posts', postId, 'comments', commentId);
      const isLiked = currentLikes.includes(currentUserId);
      if (isLiked) {
        await updateDoc(commentRef, {
          likes: arrayRemove(currentUserId),
        });
      } else {
        await updateDoc(commentRef, {
          likes: arrayUnion(currentUserId),
        });
      }
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  // Delete Comment Trigger
  const handleDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId);
  };

  const executeDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      const commentRef = doc(db, 'pulse_posts', postId, 'comments', commentToDelete);
      await deleteDoc(commentRef);

      const postRef = doc(db, 'pulse_posts', postId);
      await updateDoc(postRef, {
        commentCount: increment(-1),
      });
      setCommentToDelete(null);
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  // Report Comment Trigger
  const handleReportComment = (comment: PulseComment) => {
    setCommentToReport(comment);
  };

  const executeReportComment = async () => {
    if (!commentToReport) return;
    try {
      const reportsRef = collection(db, 'pulse_reports');
      await addDoc(reportsRef, {
        type: 'comment',
        postId,
        commentId: commentToReport.id,
        reportedText: commentToReport.text,
        reportedUser: commentToReport.userName,
        reportedUserId: commentToReport.userId,
        reporterUserId: currentUserId,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setCommentToReport(null);
      setShowReportSuccess(true);
      setTimeout(() => {
        setShowReportSuccess(false);
      }, 4000);
    } catch (err) {
      console.error("Error reporting comment:", err);
    }
  };

  // Organize root comments vs replies
  const rootComments = comments.filter((c) => !c.parentId);

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div 
        className="w-full sm:max-w-lg bg-[#050814] border-t sm:border border-cyan-500/30 sm:rounded-3xl rounded-t-3xl h-[85vh] sm:h-[650px] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>Comments</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {comments.length}
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner if Rule-Based Filter triggers */}
        {warningError && (
          <div className="mx-4 mt-3 p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs font-sans animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-200">Moderation Alert</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{warningError}</p>
            </div>
            <button 
              onClick={() => setWarningError(null)}
              className="text-rose-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <MessageSquare className="w-10 h-10 mb-2 text-cyan-500/30 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">No comments yet</p>
              <p className="text-[11px] text-slate-500 mt-1">Be the first gamer to leave a comment!</p>
            </div>
          ) : (
            rootComments.map((comment) => {
              const replies = comments.filter((c) => c.parentId === comment.id);
              const isLiked = comment.likes.includes(currentUserId);
              const resolvedCommentPhoto = (comment.userId === currentUserId && currentUserProfile?.photoURL)
                ? currentUserProfile.photoURL
                : (allUsersMap?.[comment.userId]?.photoURL || allUsersMap?.[comment.userId]?.brandLogoUrl || comment.userPhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop');

              return (
                <div key={comment.id} className="space-y-2">
                  {/* Root Comment Box */}
                  <div className="bg-slate-900/60 border border-white/5 hover:border-cyan-500/20 p-3.5 rounded-2xl space-y-2 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={resolvedCommentPhoto} 
                          alt="" 
                          className="w-7 h-7 rounded-full object-cover border border-cyan-500/40" 
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-200 font-sans">
                              {comment.userName}
                            </span>
                            {(comment.userRole === 'pro_host' || comment.userRole === 'main_admin') && (
                              <span className="bg-cyan-500/20 text-cyan-400 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase font-mono flex items-center gap-0.5 border border-cyan-500/30">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>Host</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Menu (Delete / Report) */}
                      <div className="flex items-center gap-1">
                        {comment.userId === currentUserId || isUserAdminOrSuperAdmin() ? (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReportComment(comment)}
                            className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                            title="Report comment"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text */}
                    <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap pl-9">
                      {comment.text}
                    </p>

                    {/* Comment Footer (Like & Reply) */}
                    <div className="flex items-center gap-4 pl-9 pt-1 text-[11px] font-bold text-slate-400">
                      <button
                        onClick={() => handleToggleLikeComment(comment.id, comment.likes)}
                        className={`flex items-center gap-1 transition-colors ${
                          isLiked ? 'text-pink-500' : 'hover:text-pink-400'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-pink-500' : ''}`} />
                        <span>{comment.likes.length > 0 ? comment.likes.length : ''} Like</span>
                      </button>

                      <button
                        onClick={() => setReplyingTo(comment)}
                        className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>

                  {/* Replies List */}
                  {replies.length > 0 && (
                    <div className="pl-6 space-y-2 border-l-2 border-cyan-500/20 ml-4">
                      {replies.map((reply) => {
                        const isReplyLiked = reply.likes.includes(currentUserId);
                        const resolvedReplyPhoto = (reply.userId === currentUserId && currentUserProfile?.photoURL)
                          ? currentUserProfile.photoURL
                          : (allUsersMap?.[reply.userId]?.photoURL || allUsersMap?.[reply.userId]?.brandLogoUrl || reply.userPhoto || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop');
                        return (
                          <div 
                            key={reply.id} 
                            className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CornerDownRight className="w-3 h-3 text-cyan-400" />
                                <img 
                                  src={resolvedReplyPhoto} 
                                  alt="" 
                                  className="w-5 h-5 rounded-full object-cover border border-cyan-500/30" 
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[11px] font-bold text-slate-300">
                                  {reply.userName}
                                </span>
                              </div>
                              {(reply.userId === currentUserId || isUserAdminOrSuperAdmin()) && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 pl-5">
                              {reply.text}
                            </p>
                            <div className="pl-5 pt-0.5">
                              <button
                                onClick={() => handleToggleLikeComment(reply.id, reply.likes)}
                                className={`flex items-center gap-1 text-[10px] font-bold ${
                                  isReplyLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-400'
                                }`}
                              >
                                <Heart className={`w-3 h-3 ${isReplyLiked ? 'fill-pink-500' : ''}`} />
                                <span>{reply.likes.length > 0 ? reply.likes.length : ''} Like</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="px-4 py-1.5 bg-cyan-950/80 border-t border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Reply className="w-3.5 h-3.5" />
              <span>Replying to <b>@{replyingTo.userName}</b></span>
            </span>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-cyan-400 hover:text-white font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Input Bar */}
        {postStatus !== 'approved' ? (
          <div className="p-4 bg-slate-950 border-t border-rose-500/20 text-center text-rose-400 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <span>⚠️</span> Comments are locked on pending/unapproved posts.
          </div>
        ) : (
          <form onSubmit={handleSubmitComment} className="p-3 bg-slate-950 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => {
                  setNewCommentText(e.target.value);
                  if (warningError) setWarningError(null);
                }}
                placeholder={replyingTo ? `Reply to ${replyingTo.userName}...` : "Write a comment..."}
                className="flex-1 bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-slate-500 font-sans"
                maxLength={300}
              />
              <button
                type="submit"
                disabled={isSubmitting || !newCommentText.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* CUSTOM CONFIRM DELETE MODAL */}
        {commentToDelete && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-[120] animate-fadeIn">
            <div className="bg-[#0c142c] border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Delete Comment?</h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                This action is permanent and cannot be undone. Are you sure you want to remove this comment?
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setCommentToDelete(null)}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteComment}
                  className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM CONFIRM REPORT MODAL */}
        {commentToReport && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-[120] animate-fadeIn">
            <div className="bg-[#0c142c] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Report Comment?</h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Do you want to report this comment for community guidelines violation? It will be sent to admin review.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setCommentToReport(null)}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeReportComment}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM SUCCESS TOAST */}
        {showReportSuccess && (
          <div className="absolute top-4 left-4 right-4 bg-emerald-500/15 border border-emerald-500/35 p-3 rounded-xl flex items-center gap-2.5 z-[130] animate-slideIn shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <span className="text-emerald-400">✅</span>
            <p className="text-[11px] text-emerald-200 font-sans leading-snug">
              Thank you! The report has been sent to admin moderation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
