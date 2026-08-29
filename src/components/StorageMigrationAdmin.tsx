import React, { useState } from 'react';
import { 
  Database, 
  ArrowRightLeft, 
  HardDriveUpload, 
  Cloud, 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Layers, 
  Terminal,
  Zap,
  ArrowRight,
  ShieldCheck,
  Download,
  Upload,
  Archive,
  FileSpreadsheet
} from 'lucide-react';
import { 
  migrateFirestoreCollection, 
  migrateAllPictureCollections,
  transferUrlBatch, 
  transferUrlToImgBB, 
  transferUrlToFirebaseStorage, 
  MigrationLog,
  exportSingleCollectionJson
} from '../lib/storageMigration';
import { 
  exportFirestoreToZip, 
  restoreFirestoreFromZip, 
  BackupProgress, 
  KNOWN_COLLECTIONS 
} from '../lib/firestoreBackup';

interface CollectionPreset {
  id: string;
  name: string;
  collectionName: string;
  fieldName: string;
  description: string;
}

const COLLECTION_PRESETS: CollectionPreset[] = [
  { id: 'pulse-posts-all', name: 'Pulse Posts (Photos & Avatars)', collectionName: 'pulse_posts', fieldName: 'imageUrl,userPhoto', description: 'Pulse community post images and user avatar pictures' },
  { id: 'pulse-posts-image', name: 'Pulse Post Photos', collectionName: 'pulse_posts', fieldName: 'imageUrl', description: 'Pulse community attached photos and images' },
  { id: 'pulse-posts-author', name: 'Pulse Post User Avatars', collectionName: 'pulse_posts', fieldName: 'userPhoto', description: 'Pulse community author profile avatars' },
  { id: 'users-avatar', name: 'User Avatars & Photos', collectionName: 'users', fieldName: 'avatar,photoURL', description: 'Gamer profile avatar & profile photo URLs' },
  { id: 'squads-cover', name: 'Squad Covers & Logos', collectionName: 'squads', fieldName: 'coverUrl,logoUrl', description: 'Squad profile cover banners and team logos' },
  { id: 'teams-logo', name: 'Team Logos & Banners', collectionName: 'teams', fieldName: 'logoUrl,bannerUrl', description: 'Esports team brand logos & banner covers' },
  { id: 'freefire-tournaments', name: 'FreeFire Tournaments', collectionName: 'tournaments_freefire', fieldName: 'bannerUrl', description: 'Free Fire tournament banners & covers' },
  { id: 'pubg-tournaments', name: 'PUBG Tournaments', collectionName: 'tournaments_pubg', fieldName: 'bannerUrl', description: 'PUBG Mobile tournament banners & covers' },
  { id: 'ludo-tournaments', name: 'Ludo Tournaments', collectionName: 'tournaments_ludo', fieldName: 'bannerUrl', description: 'Ludo tournament banners & covers' },
  { id: 'tournaments-banner', name: 'Global Tournaments', collectionName: 'tournaments', fieldName: 'bannerUrl', description: 'Global tournament covers & headers' },
  { id: 'pro-leagues-banner', name: 'Pro Hosted Leagues', collectionName: 'pro_hosted_leagues', fieldName: 'bannerUrl', description: 'Pro league tournament banners' },
  { id: 'lone-wolf-screenshots', name: 'Lone Wolf Match Proofs', collectionName: 'lone_wolf_matches', fieldName: 'resultScreenshotUrl', description: '1v1 Lone Wolf end-screen result screenshots' },
  { id: 'match-screenshots', name: 'Match Proof Screenshots', collectionName: 'match_results', fieldName: 'screenshotUrl', description: 'Match end-screen proof photos' },
  { id: 'upazila-sponsors', name: 'Upazila Sponsor Logos', collectionName: 'upazila_sponsors', fieldName: 'logoUrl', description: 'District & Upazila sponsor brand logos' },
  { id: 'tournament-sponsors', name: 'Tournament Sponsor Logos', collectionName: 'tournament_sponsors', fieldName: 'logoUrl', description: 'Official tournament sponsor logos' },
  { id: 'campaign-ads', name: 'Ad Banners & Campaigns', collectionName: 'ads', fieldName: 'bannerUrl', description: 'Promotional banners and user ads' }
];

export const StorageMigrationAdmin: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'collections' | 'batch-urls' | 'single' | 'database-backup'>('collections');
  const [targetStorage, setTargetStorage] = useState<'imgbb' | 'firebase'>('imgbb');
  
  // Collections Mode States
  const [selectedPresetId, setSelectedPresetId] = useState<string>('pulse-posts-all');
  const [customCollection, setCustomCollection] = useState<string>('');
  const [customField, setCustomField] = useState<string>('');
  const [useCustomCol, setUseCustomCol] = useState<boolean>(false);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [stats, setStats] = useState<{ total: number; success: number; failed: number } | null>(null);

  // Batch URLs Mode States
  const [rawUrlList, setRawUrlList] = useState<string>('');
  const [batchResults, setBatchResults] = useState<{ originalUrl: string; newUrl: string; status: 'success' | 'failed'; error?: string }[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Single URL Mode States
  const [singleInputUrl, setSingleInputUrl] = useState<string>('');
  const [singleResultUrl, setSingleResultUrl] = useState<string>('');
  const [isProcessingSingle, setIsProcessingSingle] = useState<boolean>(false);
  const [singleError, setSingleError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Database Backup & Restore States
  const [backupProgress, setBackupProgress] = useState<BackupProgress | null>(null);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [restoreSummary, setRestoreSummary] = useState<string | null>(null);

  // Single Collection Export States
  const [selectedSingleExportCol, setSelectedSingleExportCol] = useState<string>('users');
  const [isExportingSingle, setIsExportingSingle] = useState<boolean>(false);

  // Download Single Collection JSON
  const handleDownloadSingleCollection = async () => {
    setIsExportingSingle(true);
    try {
      const jsonStr = await exportSingleCollectionJson(selectedSingleExportCol);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vortex_${selectedSingleExportCol}_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert(`Successfully downloaded backup of collection: ${selectedSingleExportCol}`);
    } catch (err: any) {
      alert(`Failed to download collection: ${err.message}`);
    } finally {
      setIsExportingSingle(false);
    }
  };

  // Download ZIP Backup
  const handleDownloadDatabaseBackup = async () => {
    setIsExporting(true);
    setBackupProgress({ status: 'backing_up', processedCount: 0, totalCollections: KNOWN_COLLECTIONS.length, message: 'Starting export...' });

    try {
      const zipBlob = await exportFirestoreToZip((progress) => {
        setBackupProgress(progress);
      });

      // Trigger automatic browser download
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vortex_firestore_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setBackupProgress({
        status: 'success',
        processedCount: KNOWN_COLLECTIONS.length,
        totalCollections: KNOWN_COLLECTIONS.length,
        message: 'Backup ZIP file created and download started!'
      });
    } catch (err: any) {
      setBackupProgress({
        status: 'error',
        processedCount: 0,
        totalCollections: KNOWN_COLLECTIONS.length,
        message: `Export failed: ${err.message}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Restore Database from ZIP
  const handleRestoreDatabase = async () => {
    if (!selectedRestoreFile) {
      alert('Please select a backup .ZIP file first.');
      return;
    }

    const confirmRestore = window.confirm(
      'WARNING: Restoring will overwrite existing Firestore text data with the records inside the backup file. Do you want to proceed?'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    setRestoreSummary(null);
    setBackupProgress({ status: 'restoring', processedCount: 0, totalCollections: 1, message: 'Reading ZIP file...' });

    try {
      const result = await restoreFirestoreFromZip(selectedRestoreFile, (progress) => {
        setBackupProgress(progress);
      });

      setRestoreSummary(
        `Database restore complete! ${result.restoredDocsCount} items updated across ${result.collectionsCount} collections.`
      );
    } catch (err: any) {
      setBackupProgress({
        status: 'error',
        processedCount: 0,
        totalCollections: 1,
        message: `Restore failed: ${err.message}`
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Run Collection Migration
  const handleStartCollectionMigration = async () => {
    let colName = '';
    let fName = '';

    if (useCustomCol) {
      if (!customCollection.trim() || !customField.trim()) {
        alert('Please enter both custom Collection Name and Field Name.');
        return;
      }
      colName = customCollection.trim();
      fName = customField.trim();
    } else {
      const preset = COLLECTION_PRESETS.find(p => p.id === selectedPresetId);
      if (!preset) return;
      colName = preset.collectionName;
      fName = preset.fieldName;
    }

    setIsMigrating(true);
    setLogs([]);
    setStats(null);

    try {
      const result = await migrateFirestoreCollection(
        colName,
        fName,
        targetStorage,
        (log) => {
          setLogs(prev => [log, ...prev]);
        }
      );

      setStats({
        total: result.totalProcessed,
        success: result.successCount,
        failed: result.failedCount
      });
    } catch (err: any) {
      setLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), type: 'error', message: `Migration failed: ${err.message}` },
        ...prev
      ]);
    } finally {
      setIsMigrating(false);
    }
  };

  // Run Full Auto-Migration for ALL Picture Collections (Pulse Posts + All Collections)
  const handleMigrateAllPictures = async () => {
    const confirmRun = window.confirm(
      `Start complete auto-migration of ALL picture collections (Pulse Posts, User Avatars, Squads, Teams, Tournaments, Lone Wolf, Sponsors, Ads) to ${targetStorage.toUpperCase()}?`
    );
    if (!confirmRun) return;

    setIsMigrating(true);
    setLogs([]);
    setStats(null);

    try {
      const result = await migrateAllPictureCollections(targetStorage, (log) => {
        setLogs(prev => [log, ...prev]);
      });

      setStats({
        total: result.totalProcessed,
        success: result.successCount,
        failed: result.failedCount
      });
    } catch (err: any) {
      setLogs(prev => [
        { timestamp: new Date().toLocaleTimeString(), type: 'error', message: `Full picture migration failed: ${err.message}` },
        ...prev
      ]);
    } finally {
      setIsMigrating(false);
    }
  };

  // Run Batch URL Transfer
  const handleProcessBatchUrls = async () => {
    const urls = rawUrlList.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) {
      alert('Please enter at least one image URL in the text area.');
      return;
    }

    setIsProcessingBatch(true);
    setBatchResults([]);
    setBatchProgress({ current: 0, total: urls.length });

    try {
      const res = await transferUrlBatch(
        urls,
        targetStorage,
        (index, total, itemResult) => {
          setBatchProgress({ current: index, total });
          setBatchResults(prev => [...prev, itemResult]);
        }
      );
      setBatchResults(res);
    } catch (err) {
      console.error("Batch processing error:", err);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Run Single URL Transfer
  const handleProcessSingleUrl = async () => {
    if (!singleInputUrl.trim()) {
      setSingleError('Please enter an image URL.');
      return;
    }

    setIsProcessingSingle(true);
    setSingleError('');
    setSingleResultUrl('');

    try {
      let resUrl = '';
      if (targetStorage === 'imgbb') {
        resUrl = await transferUrlToImgBB(singleInputUrl.trim());
      } else {
        resUrl = await transferUrlToFirebaseStorage(singleInputUrl.trim());
      }
      setSingleResultUrl(resUrl);
    } catch (err: any) {
      setSingleError(err.message || 'Failed to convert image URL.');
    } finally {
      setIsProcessingSingle(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-cyan-900/50 rounded-2xl p-4 sm:p-6 shadow-2xl text-white font-sans max-w-6xl mx-auto my-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-800/40 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-600 via-fuchsia-500 to-cyan-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-wide bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent uppercase">
                Storage Migration Center
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Bidirectional Transfer Engine: ImgBB ⇄ Firebase Cloud Storage
              </p>
            </div>
          </div>
        </div>

        {/* Target Storage Selector */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-cyan-900/60 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
            Target Destination:
          </span>
          <button
            onClick={() => setTargetStorage('imgbb')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              targetStorage === 'imgbb'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/40 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>ImgBB</span>
          </button>

          <button
            onClick={() => setTargetStorage('firebase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              targetStorage === 'firebase'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/40 ring-1 ring-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HardDriveUpload className="w-3.5 h-3.5" />
            <span>Firebase Storage</span>
          </button>
        </div>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveMode('collections')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'collections'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Firestore Collections</span>
        </button>

        <button
          onClick={() => setActiveMode('batch-urls')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'batch-urls'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Batch URL List Prompt</span>
        </button>

        <button
          onClick={() => setActiveMode('single')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'single'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Single Converter</span>
        </button>

        <button
          onClick={() => setActiveMode('database-backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeMode === 'database-backup'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/50 shadow-md'
              : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4 text-emerald-400" />
          <span>Full DB Backup (.ZIP)</span>
        </button>
      </div>

      {/* MODE 1: FIRESTORE COLLECTIONS MIGRATION */}
      {activeMode === 'collections' && (
        <div className="space-y-6">
          {/* Top Feature: Complete Auto-Migration for All Pictures */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-fuchsia-950/60 border border-cyan-500/40 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] font-black uppercase tracking-wider">
                  ALL-IN-ONE
                </span>
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Migrate ALL Picture Collections (Pulse Posts + Missing Photos)
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Automatically scans and migrates photos across <strong className="text-cyan-300">Pulse Posts</strong> (post images & author avatars), User Avatars, Squad Covers, Teams, Tournaments, Lone Wolf Screenshots, Sponsors, and Ad Banners to <strong className="text-white">{targetStorage.toUpperCase()}</strong>.
              </p>
            </div>

            <button
              onClick={handleMigrateAllPictures}
              disabled={isMigrating}
              className={`shrink-0 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
                isMigrating
                  ? 'bg-cyan-900/50 text-cyan-300 cursor-not-allowed animate-pulse'
                  : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/50 hover:scale-[1.02]'
              }`}
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Migrating All Pictures...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>Auto-Migrate All Pictures (Pulse + DB)</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Preset Selector */}
            <div className="md:col-span-2 space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Select Collection Preset
                </h3>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useCustomCol}
                    onChange={(e) => setUseCustomCol(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 bg-slate-900"
                  />
                  <span>Custom Collection</span>
                </label>
              </div>

              {!useCustomCol ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {COLLECTION_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPresetId === preset.id
                          ? 'bg-cyan-950/40 border-cyan-500 text-white ring-1 ring-cyan-500/30'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs">
                        <span className={selectedPresetId === preset.id ? 'text-cyan-300' : 'text-slate-300'}>
                          {preset.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                          {preset.collectionName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        Field: <code className="text-cyan-400">{preset.fieldName}</code> — {preset.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Firestore Collection Name</label>
                    <input
                      type="text"
                      placeholder="e.g. squads, tournaments"
                      value={customCollection}
                      onChange={(e) => setCustomCollection(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Image Field Name</label>
                    <input
                      type="text"
                      placeholder="e.g. coverUrl, logoUrl"
                      value={customField}
                      onChange={(e) => setCustomField(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right: Info & Launch Action */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Migration Strategy
                </h4>
                <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                  <p>
                    Targeting: <span className="font-bold text-white">{targetStorage === 'imgbb' ? 'ImgBB CDN' : 'Firebase Storage'}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Will scan all documents, convert non-matching URLs to {targetStorage.toUpperCase()}, and safely update Firestore references.
                  </p>
                </div>
              </div>

              {/* Stats Summary */}
              {stats && (
                <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase">Processed</div>
                    <div className="text-sm font-bold text-white">{stats.total}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-emerald-500 uppercase">Success</div>
                    <div className="text-sm font-bold text-emerald-400">{stats.success}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-red-500 uppercase">Failed</div>
                    <div className="text-sm font-bold text-red-400">{stats.failed}</div>
                  </div>
                </div>
              )}

              <button
                onClick={handleStartCollectionMigration}
                disabled={isMigrating}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  isMigrating
                    ? 'bg-cyan-900/50 text-cyan-300 cursor-not-allowed animate-pulse'
                    : 'bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white shadow-lg shadow-cyan-600/30'
                }`}
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Migrating Collection...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Start Collection Migration</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Console Output Log */}
          <div className="bg-slate-950 rounded-xl border border-cyan-900/40 p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Live Execution Logs ({logs.length})
              </span>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin scrollbar-thumb-cyan-900/50">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-6 italic text-[11px]">
                  No migration activity yet. Select a collection and click 'Start Collection Migration'.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 text-[10px] shrink-0">{log.timestamp}</span>
                    <span
                      className={`text-[11px] break-all ${
                        log.type === 'success'
                          ? 'text-emerald-400'
                          : log.type === 'error'
                          ? 'text-red-400 font-bold'
                          : log.type === 'warning'
                          ? 'text-amber-400'
                          : 'text-cyan-300'
                      }`}
                    >
                      {log.type === 'success' && '✓ '}
                      {log.type === 'error' && '✗ '}
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: BATCH URL LIST PROMPT */}
      {activeMode === 'batch-urls' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-cyan-400" />
                Batch Image URL Prompt List
              </h3>
              <p className="text-xs text-slate-400">
                Paste any list of image URLs (one per line). All URLs will be fetched and transferred to{' '}
                <strong className="text-cyan-300">{targetStorage.toUpperCase()}</strong>.
              </p>
            </div>

            <textarea
              rows={5}
              placeholder="https://firebasestorage.googleapis.com/...&#10;https://i.ibb.co/...&#10;https://images.unsplash.com/..."
              value={rawUrlList}
              onChange={(e) => setRawUrlList(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600"
            />

            <div className="flex items-center justify-between">
              {batchProgress ? (
                <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing: {batchProgress.current} / {batchProgress.total} URLs
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 font-mono">
                  {rawUrlList.split('\n').filter(u => u.trim()).length} URLs detected
                </span>
              )}

              <button
                onClick={handleProcessBatchUrls}
                disabled={isProcessingBatch}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Process Batch List</span>
              </button>
            </div>
          </div>

          {/* Batch Results Table */}
          {batchResults.length > 0 && (
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Batch Conversion Results ({batchResults.length})
              </h4>

              <div className="max-h-80 overflow-y-auto space-y-2">
                {batchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-slate-400 text-[10px] truncate">
                        Orig: <span className="text-slate-300">{item.originalUrl}</span>
                      </div>
                      <div className="text-cyan-300 text-[11px] font-bold truncate">
                        New: {item.newUrl}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'success' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                          SUCCESS
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 text-[10px] font-bold border border-red-800">
                          FAILED
                        </span>
                      )}

                      {item.status === 'success' && (
                        <button
                          onClick={() => copyToClipboard(item.newUrl)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                          title="Copy New URL"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 3: SINGLE CONVERTER */}
      {activeMode === 'single' && (
        <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-4 max-w-2xl mx-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              Single Image URL Converter
            </h3>
            <p className="text-xs text-slate-400">
              Enter any image URL to convert and upload directly to {targetStorage.toUpperCase()}.
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Paste Image URL..."
              value={singleInputUrl}
              onChange={(e) => setSingleInputUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            {singleError && (
              <p className="text-xs text-red-400 font-mono flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                {singleError}
              </p>
            )}
          </div>

          <button
            onClick={handleProcessSingleUrl}
            disabled={isProcessingSingle}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessingSingle ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Converting Image...</span>
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" />
                <span>Convert & Upload to {targetStorage.toUpperCase()}</span>
              </>
            )}
          </button>

          {singleResultUrl && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-500/50 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-cyan-300 font-bold">
                <span>Converted Output URL:</span>
                <button
                  onClick={() => copyToClipboard(singleResultUrl)}
                  className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>
              <input
                type="text"
                readOnly
                value={singleResultUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-emerald-400 font-mono select-all"
              />
            </div>
          )}
        </div>
      )}

      {/* MODE 4: FULL DATABASE BACKUP & RESTORE (.ZIP) */}
      {activeMode === 'database-backup' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Download / Export Section */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Export Full Backup (.ZIP)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Downloads all text collections as structured JSON files in a compressed ZIP archive.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1 font-mono">
                  <p className="font-bold text-emerald-400 text-[11px]">Included Collections:</p>
                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-400 pt-1 max-h-40 overflow-y-auto custom-scrollbar">
                    {KNOWN_COLLECTIONS.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {c}.json
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadDatabaseBackup}
                disabled={isExporting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating ZIP Backup...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Download Full DB Backup (.ZIP)</span>
                  </>
                )}
              </button>
            </div>

            {/* Single Collection Export Card */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Export Single Collection (.JSON)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Export and download a specific collection from Firestore directly as a JSON file.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Select Collection to Export:
                  </label>
                  <select
                    value={selectedSingleExportCol}
                    onChange={(e) => setSelectedSingleExportCol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                  >
                    {KNOWN_COLLECTIONS.map((col) => (
                      <option key={col} value={col} className="bg-slate-950 text-slate-200">
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span>
                    Great for downloading quick JSON summaries, testing datasets, or doing manual collection inspections.
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownloadSingleCollection}
                disabled={isExportingSingle}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExportingSingle ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Exporting {selectedSingleExportCol}...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download {selectedSingleExportCol}.json</span>
                  </>
                )}
              </button>
            </div>

            {/* Upload / Restore Section */}
            <div className="bg-slate-950/80 p-5 rounded-2xl border border-cyan-900/50 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Restore / Restart DB from Backup (.ZIP)
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Upload a previously downloaded backup ZIP file to restore corrupted or lost data.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Select Backup ZIP File:
                  </label>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSelectedRestoreFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                  />
                  {selectedRestoreFile && (
                    <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Selected: {selectedRestoreFile.name} ({(selectedRestoreFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Restoration Notice:</strong> Restoring will merge/overwrite documents in Firestore with the data from the backup ZIP.
                  </span>
                </div>
              </div>

              <button
                onClick={handleRestoreDatabase}
                disabled={isRestoring || !selectedRestoreFile}
                className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Restoring Firestore Database...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Restore Database From Backup</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Backup & Restore Live Status Banner */}
          {backupProgress && (
            <div className="p-4 bg-slate-950 rounded-xl border border-cyan-900/60 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-cyan-300 font-bold">
                <span className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Progress Status: {backupProgress.status.toUpperCase()}
                </span>
                <span>
                  {backupProgress.processedCount} / {backupProgress.totalCollections}
                </span>
              </div>
              <p className={`text-[11px] ${backupProgress.status === 'error' ? 'text-red-400 font-bold' : backupProgress.status === 'success' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                {backupProgress.message}
              </p>
            </div>
          )}

          {restoreSummary && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl font-mono text-xs text-emerald-300 flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{restoreSummary}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
