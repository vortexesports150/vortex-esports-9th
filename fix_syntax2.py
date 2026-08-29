import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove from handleConfirmAutoSplitTrim down to removeSelectedVideo inclusive.
# Looking at the output, it goes from `const handleConfirmAutoSplitTrim` to right before `const handleTextChange =`
match = re.search(r"  const handleConfirmAutoSplitTrim =.*?  const handleTextChange = async", content, flags=re.DOTALL)
if match:
    content = content.replace(match.group(0), "  const handleTextChange = async")

# 2. Fix the handleSubmit function entirely
# We'll replace everything from `const handleSubmit = async (e: React.FormEvent)` down to `setPostText('');` (or similar cleanup)
# Actually, it's safer to just find `const handleSubmit = async (e: React.FormEvent) => {` 
# and the `// Save to Firestore` part.

submit_block_match = re.search(r"  const handleSubmit = async \(e: React.FormEvent\) => \{.*?(?=\n  return \()", content, flags=re.DOTALL)
if submit_block_match:
    new_submit_block = """  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !selectedImage && !attachedMediaLink && !selectedTournament && !selectedLeagueMatch && !selectedLoneWolfMatch) {
      alert("Please write something or attach a clip/photo/media/match!");
      return;
    }

    setIsSubmitting(true);
    setUploadStatusText('Preparing post...');
    try {
      let imageUrl = '';
      if (selectedImage) {
        setUploadStatusText('Uploading post picture...');
        imageUrl = await uploadScreenshotToImgBB(selectedImage, 'pulse_post_picture');
      }

      setUploadStatusText('Publishing post to feed...');
      
      const newPost: any = {
        userId: currentUserId,
        userName: currentUserProfile.gameName || currentUserProfile.inGameName || currentUserProfile.gamerTag || currentUserProfile.displayName || 'Anonymous Player',
        userPhoto: currentUserProfile.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserProfile.gameName || 'A')}&background=random`,
        userRole: currentUserProfile.role || 'player',
        text: postText.trim(),
        likes: [],
        commentsCount: 0,
        sharesCount: 0,
        views: 0,
        createdAt: serverTimestamp(),
      };

      if (category !== 'all') {
        newPost.category = category;
      }
      
      if (imageUrl) {
        newPost.imageUrl = imageUrl;
      }
      
      if (attachedMediaLink) {
        newPost.mediaLink = attachedMediaLink;
      }

      // Tagged Match Data
      if (selectedTournament) {
        newPost.taggedMatch = {
          type: 'tournament',
          id: selectedTournament.id,
          title: selectedTournament.title,
          prize: selectedTournament.prizePool,
          banner: selectedTournament.bannerUrl || null
        };
      } else if (selectedLeagueMatch) {
        newPost.taggedMatch = {
          type: 'league',
          id: selectedLeagueMatch.id,
          title: selectedLeagueMatch.matchTitle || 'League Match',
          player1: selectedLeagueMatch.player1?.gameName || selectedLeagueMatch.player1 || 'TBA',
          player2: selectedLeagueMatch.player2?.gameName || selectedLeagueMatch.player2 || 'TBA'
        };
      } else if (selectedLoneWolfMatch) {
        newPost.taggedMatch = {
          type: 'lone_wolf',
          id: selectedLoneWolfMatch.id,
          title: selectedLoneWolfMatch.title || `Lone Wolf #${selectedLoneWolfMatch.matchNumber}`,
          prize: selectedLoneWolfMatch.prizePool || 0,
          player1: selectedLoneWolfMatch.player1?.gameName || selectedLoneWolfMatch.player1 || 'TBA',
          player2: selectedLoneWolfMatch.player2?.gameName || selectedLoneWolfMatch.player2 || 'TBA'
        };
      }

      await addDoc(collection(db, 'pulse_posts'), newPost);
      
      if (onPostCreated) {
        onPostCreated();
      }
      
      setPostText('');
      setSelectedImage(null);
      setAttachedMediaLink(null);
      setYoutubeLink('');
      setCategory('all');
      setSelectedTournament(null);
      setSelectedLeagueMatch(null);
      setSelectedLoneWolfMatch(null);
      onClose();
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadStatusText('');
    }
  };
"""
    content = content.replace(submit_block_match.group(0), new_submit_block)

# Let's fix line 1574 (probably another syntax error near the bottom from UI)
# wait, line 1574 could be something from the overlays. Let's see later.
# For now write this.

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
