export interface SquadMember {
  email: string;
  displayName: string;
  isCaptain?: boolean;
}

export interface Squad {
  name: string;
  members: SquadMember[];
}

export interface UserProfile {
  lifetimeTeamCreated?: boolean;
  soloStats?: any;
  squadStats?: any;
  squadCsStats?: any;
  duoStats?: any;
  gmStats?: any;
  top48Stats?: any;
  stats?: any;
  userId: string;
  playvearId?: string;
  email: string;
  displayName: string;
  fullName?: string;
  name?: string;
  photoURL: string | null;
  brandName?: string;
  brandLogoUrl?: string;
  companyName?: string;
  permissions?: any;
  createdAt: string;
  updatedAt: string;
  role: 'user' | 'admin' | 'main_admin' | 'sub_admin';
  gameStats?: any;
  squad?: Squad;
  health?: number;
  stars?: number;
  level?: number;
  exp?: number;
  economyScore?: number;
  gamingUid?: string;
  gameName?: string;
  mobile?: string;
  country?: string;
  state?: string;
  city?: string;
  division?: string;
  district?: string;
  upazila?: string;
  tokens?: number;
  csWins?: number;
  matchesPlayed?: number;
  totalKills?: number;
  wins?: number;
  booyahs?: number;
  totalDamage?: number;
  proHostSubscription?: ProHostSubscription;
  isHostSuspended?: boolean;
  hostSuspensionReason?: string;
  hostSuspensionLeagueId?: string;
  hostSuspensionLeagueName?: string;
  hostSuspensionDurationLabel?: string;
  hostSuspensionUntil?: string | null;
  hostSuspensionIsLifetime?: boolean;
  hostSuspendedAt?: string;
}

export interface HostSuspensionRecord {
  id: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhone?: string;
  hostPhoto?: string;
  leagueId?: string;
  leagueName?: string;
  reason: string;
  durationLabel: string;
  suspendedAt: string;
  suspendedUntil?: string | null;
  isLifetime?: boolean;
  status: 'active' | 'unsuspended' | 'expired';
  suspendedBy?: string;
  unsuspendedAt?: string;
  unsuspendedBy?: string;
}

export interface TournamentPlayer {
  userId: string;
  displayName: string;
  photoURL: string | null;
  kills: number;
  joinedAt: string;
}

export interface Tournament {
  id: string;
  title: string;
  maxPlayers: number;
  perKill: number;
  booyahPrize: number;
  entryFee: number;
  map: string;
  time: string;
  playerEligibly: string;
  joinedCount: number;
  joinedPlayers: TournamentPlayer[];
  status: 'Open' | 'Ended';
  updatedAt: string;
}

export interface TeamMember {
  userId?: string;
  email: string;
  displayName: string;
  gameName?: string;
  gamingUid?: string;
  photoURL?: string | null;
  role: 'leader' | 'member';
  status: 'pending' | 'joined';
  joinedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  coverUrl?: string;
  leaderId: string;
  leaderEmail: string;
  leaderName: string;
  memberEmails: string[];
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

export interface TournamentSponsorAd {
  id?: string;
  slotIndex: number;
  status: 'empty' | 'pending' | 'active' | 'approved' | 'rejected' | 'paused' | 'expired';
  logoUrl?: string;
  targetUrl?: string;
  durationDays?: number;
  costTokens?: number;
  sponsorUid?: string;
  sponsorEmail?: string;
  sponsorName?: string;
  createdAt: any;
  approvedAt?: any;
  expiryAt?: any;
  endDate?: any;
}

export interface TournamentAdsHistory {
  id?: string;
  type: 'income' | 'refund';
  amount: number;
  userId: string;
  userName?: string;
  slotIndex?: number;
  monthKey: string;
  timestamp: any;
  details?: string;
}

export interface ProHostSubscription {
  type: 'none' | 'monthly' | 'yearly' | 'apex';
  expiresAt: string | null;
}

export interface WalletHistory {
  id?: string;
  userId: string;
  userName?: string;
  type: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
  description: string;
  leagueId?: string;
  leagueName?: string;
  createdAt: any;
}

export interface ProHostWalletHistory {
  id?: string;
  leagueId: string;
  hostId: string;
  type: 'income' | 'withdrawal';
  amount: number;
  balanceAfter: number;
  description: string;
  userEmail?: string;
  userName?: string;
  createdAt: any;
}

export interface ProHostedLeague {
  id: string;
  leagueNumber?: number | string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhotoUrl?: string;
  hostUpazila?: string;
  hostDistrict?: string;
  hostDivision?: string;
  brandName: string;
  leagueName: string;
  seasonNumber: string;
  logoUrl?: string;
  cardColor: string;
  
  // Anti-Doping compliance fields
  antiDopingCertificateUrl?: string;
  antiDopingStatus?: 'submitted' | 'missing' | 'verified' | 'flagged';
  antiDopingNote?: string;

  game: string;
  squadSize: number;
  
  entryFee: number;
  prizePool: number;
  championPrize: number;
  runnerUpPrize: number;
  top3Prizes: number[];
  topRank1Prize?: number;
  topRank2Prize?: number;
  topRank3Prize?: number;
  
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'ongoing' | 'completed' | 'cancelled';
  cancelledAt?: string;
  cancellationReason?: string;
  hostPenaltyDeducted?: number;
  squadRefundPerCap?: number;
  warned2Hour?: boolean;
  
  champion?: string;
  championTeam?: string;
  championCover?: string;
  championSquad?: any;
  runnerUp?: string;
  runnerUpTeam?: string;
  runnerUpCover?: string;
  runnerUpSquad?: any;
  topPlayers?: any[];
  topRank1Player?: any;
  topRank2Player?: any;
  topRank3Player?: any;
  
  coordinators?: string[];
  
  walletTokens: number;
  walletBalance: number;
  walletStatus: 'active' | 'locked';
  prizeDistributed?: boolean;
  profitDeducted?: number;
  profitPercentage?: number;
  
  sponsorAdPricePerDay: number;
  
  // Custom Sponsor Details (Sponsored By)
  sponsorName?: string;
  sponsorLogoUrl?: string;
  sponsorLinkUrl?: string;
  
  autoGenerateSchedule: boolean;
  scheduleType?: 'auto' | 'manual';
  openingMatchDate: string;
  openingMatchTime: string;
  semiFinalDate: string;
  semiFinalTime: string;
  semiFinal1Date?: string;
  semiFinal1Time?: string;
  semiFinal2Date?: string;
  semiFinal2Time?: string;
  finalDate: string;
  finalTime: string;
  preferredMatchTimeRange: string;
  breakDays?: string[];
  dailyMatchSlots?: string[];
  slotsPerDay?: number;
  matchGapMinutes?: number;
  daysBetweenOpeningAndSemiFinal?: number;
  autoGeneratedSchedule?: Array<{ matchNumber: number; matchName: string; date: string; time: string; slotIndex: number }>;
  manualSchedule?: Array<{ matchNumber: number; matchName?: string; date: string; time: string }>;
  
  locationRestrictionType?: 'all_bangladesh' | 'specific_division' | 'specific_district' | 'specific_upazila';
  allowedDivision?: string;
  allowedDistrict?: string;
  allowedUpazila?: string;
  representationRule?: 'any' | 'one_squad_per_upazila' | 'one_squad_per_district' | 'one_squad_per_division';
  
  // Access Type & Privacy (Access Code / Invite Only)
  accessType?: 'public' | 'code' | 'invite';
  accessCode?: string | null;
  invitedEmails?: string[];

  // Local / Regional Venue & Address Fields
  isLocalVenue?: boolean;
  localVenueName?: string | null;
  localUpazilaDistrict?: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface AdminMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  senderEmail: string;
  type: 'suspension_appeal' | 'general' | 'support' | 'match_issue';
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: any;
  updatedAt: any;
  replies: {
    senderId: string;
    senderName: string;
    message: string;
    createdAt: any;
    isAdmin: boolean;
  }[];
  sourceContext?: {
    type: 'host_panel' | 'match_card' | 'general';
    routeTab?: string;
    leagueId?: string;
    matchId?: string;
    hostId?: string;
  };
}

export interface ProHostSponsorAd {
  id: string;
  leagueId: string;
  sponsorUid: string;
  sponsorName: string;
  logoUrl: string;
  targetUrl: string;
  durationDays: number;
  costTokens: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CoHost {
  id: string;
  hostId: string;
  name: string;
  identifier: string; // Registered Gmail Address
  role: string;
  photoURL?: string;
  status?: 'active' | 'suspended';
  permissions?: Record<string, boolean>;
  createdAt?: any;
  updatedAt?: any;
}

export interface LoneWolfPlayer {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  gamingUid?: string;
  gameName?: string;
  slotNumber: 1 | 2; // 1 = TBD 1 (Left), 2 = TBD 2 (Right)
  joinedAt: string;
  roundsWon?: number;
}

export interface LoneWolfMatch {
  id: string;
  matchNumber?: number | string;
  title: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  hostPhotoUrl?: string | null;
  
  gameCategory: 'freefire';
  mode: '1v1';
  weaponRule?: string; // e.g. 'All Weapons' | 'Sniper Only' | 'Desert Eagle Only' | 'Shotgun Only' | 'No Gloo Wall'
  mapName?: string; // 'Iron Cage' | 'Bermuda' | 'Ice Ground' | 'Colosseum'
  roundsFormat?: string; // 'Best of 9 (First to 5)' | 'Best of 7 (First to 4)' | 'Best of 13 (First to 7)'
  
  entryFee: number;
  prizePool: number;
  depositPercentage: number; // 100%
  walletTokens: number; // 100% deposited tokens
  walletBalance?: number;
  walletStatus?: "locked" | "unlocked" | "claimed";
  profitDeducted?: number;
  
  player1?: LoneWolfPlayer | null; // TBD 1
  player2?: LoneWolfPlayer | null; // TBD 2
  joinedCount: number; // 0, 1, 2
  
  matchDate: string;
  matchTime: string;
  time?: string;
  
  // Privacy & Access
  accessType?: 'public' | 'code';
  accessCode?: string | null;
  
  // Local Venue
  isLocalVenue?: boolean;
  localVenueName?: string | null;
  localUpazilaDistrict?: string | null;
  
  // Sponsor
  hasSponsor?: boolean;
  sponsorType?: 'none' | 'name' | 'logo';
  sponsorName?: string | null;
  sponsorLogoUrl?: string | null;
  sponsorLinkUrl?: string | null;
  
  // Status: Registration / Ongoing (Live) / Completed / Cancelled / ResultUnderReview / ResultRejected
  status: 'Registration' | 'Ongoing' | 'Completed' | 'Cancelled' | 'ResultUnderReview' | 'ResultRejected';
  rejectedReason?: string;
  
  // Room credentials & Stream
  roomId?: string | null;
  roomPassword?: string | null;
  roomProvidedAt?: string | null;
  youtubeUrl?: string | null;
  youtubeLink?: string | null;
  
  // Match Result
  winnerSlot?: 1 | 2 | null;
  winnerId?: string | null;
  winnerName?: string | null;
  player1Score?: number;
  player2Score?: number;
  resultScreenshotUrl?: string | null;
  resultSubmittedBy?: string | null;
  resultSubmittedAt?: string | null;
  prizeDistributed?: boolean;
  prizeDistributedAt?: string | null;
  announcements?: any[];
  
  createdAt: any;
  updatedAt: any;
}
