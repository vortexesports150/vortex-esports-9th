export interface CoHostPermissionDef {
  key: string;
  label: string;
  description: string;
  category: 'creation' | 'operations' | 'results' | 'finance' | 'brand';
  defaultEnabled: boolean;
}

export interface CoHostPermissionCategory {
  id: 'creation' | 'operations' | 'results' | 'finance' | 'brand';
  name: string;
  iconName: string;
  description: string;
}

export const CO_HOST_PERMISSION_CATEGORIES: CoHostPermissionCategory[] = [
  {
    id: 'creation',
    name: 'Match & Tournament Creation',
    iconName: 'PlusCircle',
    description: 'Permissions related to generating new tournaments, leagues, and duels'
  },
  {
    id: 'operations',
    name: 'Room & Live Operations',
    iconName: 'Key',
    description: 'Permissions for room credentials, live streams, and match status updates'
  },
  {
    id: 'results',
    name: 'Results & Anti-Cheat',
    iconName: 'Award',
    description: 'Permissions for setting winners, player stats, screenshots, and security checks'
  },
  {
    id: 'finance',
    name: 'Wallet & Financials',
    iconName: 'Wallet',
    description: 'Sensitive permissions for viewing host balances and transferring tokens'
  },
  {
    id: 'brand',
    name: 'Brand & Communication',
    iconName: 'Palette',
    description: 'Permissions for modifying host branding and responding in inbox'
  }
];

export const CO_HOST_PERMISSIONS: CoHostPermissionDef[] = [
  // Creation
  {
    key: 'create_tournaments',
    label: 'Create Tournaments',
    description: 'Allow creating and submitting new Solo & Squad Battle Royale Tournaments',
    category: 'creation',
    defaultEnabled: true
  },
  {
    key: 'create_leagues',
    label: 'Create Leagues',
    description: 'Allow generating competitive multi-week Leagues with custom brackets',
    category: 'creation',
    defaultEnabled: true
  },
  {
    key: 'create_lone_wolf',
    label: 'Create Lone Wolf Matches',
    description: 'Allow creating 1v1 and 2v2 Lone Wolf custom room matches',
    category: 'creation',
    defaultEnabled: true
  },

  // Operations
  {
    key: 'set_room_credentials',
    label: 'Set Room ID, Password & Live Stream',
    description: 'Allow entering Room ID, Passwords, and attaching YouTube Live links to matches',
    category: 'operations',
    defaultEnabled: true
  },
  {
    key: 'update_match_status',
    label: 'Update Match Status',
    description: 'Allow moving approved matches to "Ongoing" and starting games',
    category: 'operations',
    defaultEnabled: true
  },
  {
    key: 'delete_matches',
    label: 'Delete & Cancel Matches',
    description: 'Allow deleting or cancelling pending/rejected tournaments and leagues',
    category: 'operations',
    defaultEnabled: false
  },

  // Results
  {
    key: 'set_match_results',
    label: 'Set Match Results & Proofs',
    description: 'Allow inputting player kills, damage, Booyah winners, and uploading result screenshots',
    category: 'results',
    defaultEnabled: true
  },
  {
    key: 'verify_anti_cheat',
    label: 'Anti-Cheat Verification',
    description: 'Allow verifying squad anti-cheat compliance and updating integrity notes',
    category: 'results',
    defaultEnabled: true
  },

  // Finance (Sensitive)
  {
    key: 'view_host_wallet',
    label: 'View Host & League Wallets',
    description: 'Allow viewing host earnings, tournament deposits, entry fee ledgers, and transaction histories',
    category: 'finance',
    defaultEnabled: false
  },
  {
    key: 'transfer_wallet_tokens',
    label: 'Transfer Host Wallet Tokens',
    description: 'Allow transferring unlocked tokens from Host/League Wallets into personal accounts',
    category: 'finance',
    defaultEnabled: false
  },

  // Brand
  {
    key: 'edit_host_profile',
    label: 'Edit Host Brand & Themes',
    description: 'Allow changing the Host Organization Name, Cover Banner, and Theme Palette',
    category: 'brand',
    defaultEnabled: false
  },
  {
    key: 'host_messages_inbox',
    label: 'Host Messages & Inbox',
    description: 'Allow viewing incoming match issues, replying to player tickets, and contacting admins',
    category: 'brand',
    defaultEnabled: true
  }
];

/**
 * Returns default permission map for new Co-Hosts
 */
export function getDefaultCoHostPermissions(allEnabled = false): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  CO_HOST_PERMISSIONS.forEach(p => {
    perms[p.key] = allEnabled ? true : p.defaultEnabled;
  });
  return perms;
}

/**
 * Helper to check if a user has a specific co-host permission.
 * Main hosts (owners) always have ALL permissions.
 */
export function checkCoHostPermission(
  isMainHost: boolean,
  permissions: Record<string, boolean> | undefined | null,
  permissionKey: string,
  status?: string
): boolean {
  if (isMainHost) return true;
  if (status === 'suspended') return false;
  if (!permissions) return false;
  return Boolean(permissions[permissionKey]);
}
