export interface PermissionDefinition {
  key: string;
  viewKey: string;
  label: string;
  category: 'approvals' | 'management' | 'finance' | 'ads_sponsors' | 'rewards_system';
  categoryLabel: string;
  description: string;
  badge?: string;
}

export const PERMISSION_CATEGORIES = [
  { id: 'approvals', label: 'Approvals & Reviews', icon: 'CheckCircle2' },
  { id: 'management', label: 'User & Host Management', icon: 'Users' },
  { id: 'finance', label: 'Financial & Rates Config', icon: 'Coins' },
  { id: 'ads_sponsors', label: 'Ads & Sponsorships', icon: 'Megaphone' },
  { id: 'rewards_system', label: 'Rewards & Tools', icon: 'Trophy' }
] as const;

export const SUPER_ADMIN_PERMISSIONS: PermissionDefinition[] = [
  // 1. Approvals & Reviews
  {
    key: 'result_approval',
    viewKey: 'result-approval',
    label: 'Result Approval & Prize Dispatch',
    category: 'approvals',
    categoryLabel: 'Approvals & Reviews',
    description: 'Verify match results, approve scores, and dispatch prize tokens to tournament winners.'
  },
  {
    key: 'lone_wolf_review',
    viewKey: 'lone-wolf-review',
    label: 'Lone Wolf 1v1 Review',
    category: 'approvals',
    categoryLabel: 'Approvals & Reviews',
    description: 'Review 1v1 screenshots, investigate disputes, and award tokens for Lone Wolf matches.'
  },
  {
    key: 'pro_tournaments_admin',
    viewKey: 'pro-tournaments-admin',
    label: 'Pro Tournaments Manager',
    category: 'approvals',
    categoryLabel: 'Approvals & Reviews',
    description: 'Create, edit, approve, and manage official Pro Tournaments.'
  },
  {
    key: 'delete_hide_tournaments',
    viewKey: 'pro-tournaments-admin',
    label: 'Delete & Hide Tournaments/Matches',
    category: 'approvals',
    categoryLabel: 'Approvals & Reviews',
    description: 'Grant permission to delete or hide tournaments and matches.'
  },
  {
    key: 'pro_leagues_admin',
    viewKey: 'pro-leagues-admin',
    label: 'Pro Leagues Manager',
    category: 'approvals',
    categoryLabel: 'Approvals & Reviews',
    description: 'Monitor Pro Leagues, team standings, and manage championship league stages.'
  },
  {
    key: 'pulse_post_review',
    viewKey: 'pulse-post-review',
    label: 'Pulse Post Review',
    category: 'approvals',
    categoryLabel: 'Approvals & Reviews',
    description: 'Review pending posts submitted to Pulse Community, approve, or reject them.'
  },

  // 2. User & Host Management
  {
    key: 'account_recovery',
    viewKey: 'account-recovery',
    label: 'Account Recovery & Gmail Link',
    category: 'management',
    categoryLabel: 'User & Host Management',
    description: 'Search players by phone/UID and re-assign new login Gmail addresses for lost accounts.'
  },
  {
    key: 'pro_host_subscriptions',
    viewKey: 'pro-host-subscriptions',
    label: 'Pro Host Subscriptions',
    category: 'management',
    categoryLabel: 'User & Host Management',
    description: 'Review and approve monthly host verification and subscription payments.'
  },
  {
    key: 'suspended_hosts',
    viewKey: 'suspended-hosts',
    label: 'Suspended Hosts Manager',
    category: 'management',
    categoryLabel: 'User & Host Management',
    description: 'Manage suspended host penalties, review misconduct, and reinstate hosts.'
  },
  {
    key: 'players_count',
    viewKey: 'players-count',
    label: 'Players Count & Analytics',
    category: 'management',
    categoryLabel: 'User & Host Management',
    description: 'View registered player metrics, active counts, and platform growth analytics.'
  },

  // 3. Finance & Rates
  {
    key: 'rates_config',
    viewKey: 'rates',
    label: 'Token Conversion Rates',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'Change token exchange weights for Health, Stars, and Level-ups.'
  },
  {
    key: 'official_wallets',
    viewKey: 'wallets',
    label: 'Official Payment & System Wallets',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'Control access to view and manage System Wallets (Ads, Prizes, Campaign, Received, Profit Wallets, Giveaway Wallet) and official payment numbers in the Admin Panel.'
  },
  {
    key: 'top_balances',
    viewKey: 'top-balances',
    label: 'Top 20 User Balances',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'View the ranked leaderboard of top 20 users with the highest token balances across the platform.'
  },
  {
    key: 'platform_expenses',
    viewKey: 'platform-expenses',
    label: 'Platform Expenses Tracker',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'View, add, filter and manage platform marketing, server, and operational expense records.'
  },
  {
    key: 'add_giveaway_tokens',
    viewKey: 'wallets',
    label: 'Add Giveaway Tokens',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'Permission to add tokens to the YouTube Giveaway Wallet in the System Wallets panel.'
  },
  {
    key: 'league_percentage',
    viewKey: 'league-percentage',
    label: 'League Platform Percentage',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'Adjust platform revenue share and commission percentages on league matches.'
  },
  {
    key: 'lone_wolf_percentage',
    viewKey: 'lone-wolf-percentage',
    label: 'Lone Wolf Fee Percentage',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'Set hosting fee cuts and token deduction percentages for Lone Wolf 1v1.'
  },
  {
    key: 'absence_penalty',
    viewKey: 'absence-penalty',
    label: 'Absence Penalty Settings',
    category: 'finance',
    categoryLabel: 'Financial & Rates Config',
    description: 'Configure fines and penalties for players or hosts missing scheduled matches.'
  },

  // 4. Ads & Sponsors
  {
    key: 'headline_news',
    viewKey: 'headline-news',
    label: 'Profile Headline News Manager',
    category: 'ads_sponsors',
    categoryLabel: 'Ads & Sponsorships',
    description: 'Post and manage real-time announcement headlines with clickable WhatsApp contact number on the Profile screen.'
  },
  {
    key: 'user_campaign_ads',
    viewKey: 'user-campaign-ads',
    label: 'User Campaign Ads Approval',
    category: 'ads_sponsors',
    categoryLabel: 'Ads & Sponsorships',
    description: 'Review and approve/reject custom promotional banner campaigns submitted by users.'
  },
  {
    key: 'youtube_ads',
    viewKey: 'youtube-ads',
    label: 'YouTube Video Ads Manager',
    category: 'ads_sponsors',
    categoryLabel: 'Ads & Sponsorships',
    description: 'Add, remove, and manage official reward video ads from YouTube.'
  },
  {
    key: 'sponsors_admin',
    viewKey: 'upazila-sponsor-admin',
    label: 'Tournament & Upazila Sponsors',
    category: 'ads_sponsors',
    categoryLabel: 'Ads & Sponsorships',
    description: 'Assign sponsors, brand logos, and banners to Upazilas and Tournaments.'
  },

  // 5. Rewards & Tools
  {
    key: 'youtube_giveaway',
    viewKey: 'youtube-giveaway',
    label: 'YouTube Giveaway Dispatcher',
    category: 'rewards_system',
    categoryLabel: 'Rewards & Tools',
    description: 'Dispatch token giveaways to top YouTube commenters by PlayVear IDs and trigger reward claim pop-ups.'
  },
  {
    key: 'monthly_rewards',
    viewKey: 'monthly-rewards',
    label: 'Monthly Leaderboard Rewards',
    category: 'rewards_system',
    categoryLabel: 'Rewards & Tools',
    description: 'Distribute monthly leaderboard tokens and badges to top players.'
  },
  {
    key: 'storage_migration',
    viewKey: 'storage-migration',
    label: 'Storage & Database Migration Center',
    category: 'rewards_system',
    categoryLabel: 'Rewards & Tools',
    description: 'Run media migration, image compression, cloud optimization, and full DB backup (.ZIP) tools.'
  }
];

export const getDefaultAllPermissions = (defaultValue: boolean = true): Record<string, boolean> => {
  const perms: Record<string, boolean> = {};
  SUPER_ADMIN_PERMISSIONS.forEach(p => {
    perms[p.key] = defaultValue;
  });
  return perms;
};

/**
 * Checks whether a user has a specific permission.
 * - Master/Founder (vortexesports150@gmail.com) always has true for everything.
 * - Super admin checks their granted permissions map. If permissions map is missing/legacy, defaults to true.
 */
export const checkAdminPermission = (
  userEmail: string | undefined | null,
  userPermissions: Record<string, boolean> | undefined | null,
  permissionKey: string
): boolean => {
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (cleanEmail === 'vortexesports150@gmail.com') {
    return true; // System Founder / Owner has unrestricted access
  }

  if (!userPermissions) {
    return true; // Legacy fallback
  }

  return userPermissions[permissionKey] === true;
};
