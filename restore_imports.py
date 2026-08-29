with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

imports = """import React, { useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Send, Sparkles, Trophy, Gamepad2, Users, Bell, Gift, 
  CheckCircle2, AlertCircle, Loader2, Calendar, Zap, Video, Link2, ExternalLink 
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadScreenshotToImgBB, compressImageToDataUrl } from '../lib/imgbb';
import { parseMediaUrl, MediaLinkInfo } from '../utils/mediaLinkHelper';
import { PulseMediaVideoCard } from './PulseMediaVideoCard';
import { extractYouTubeId, isYouTubeShorts, checkYouTubeVideoDuration } from '../utils/youtubeHelper';
"""

content = content.replace("import React, { useState, useEffect } from 'react';", imports)

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
