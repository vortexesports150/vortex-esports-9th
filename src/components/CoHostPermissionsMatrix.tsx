import React from 'react';
import { 
  PlusCircle, 
  Key, 
  Award, 
  Wallet, 
  Palette, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  CheckSquare, 
  Square,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  CO_HOST_PERMISSIONS, 
  CO_HOST_PERMISSION_CATEGORIES, 
  CoHostPermissionDef 
} from '../lib/coHostPermissions';

interface CoHostPermissionsMatrixProps {
  permissions: Record<string, boolean>;
  onChange: (newPermissions: Record<string, boolean>) => void;
  disabled?: boolean;
  themeColorClass?: string;
  themeAccentBg?: string;
}

export function CoHostPermissionsMatrix({
  permissions,
  onChange,
  disabled = false,
  themeColorClass = 'text-cyan-400',
  themeAccentBg = 'bg-cyan-600'
}: CoHostPermissionsMatrixProps) {

  const handleToggle = (key: string) => {
    if (disabled) return;
    onChange({
      ...permissions,
      [key]: !permissions[key]
    });
  };

  const handleSelectAll = (enable: boolean) => {
    if (disabled) return;
    const updated: Record<string, boolean> = {};
    CO_HOST_PERMISSIONS.forEach(p => {
      updated[p.key] = enable;
    });
    onChange(updated);
  };

  const handleToggleCategory = (catId: string) => {
    if (disabled) return;
    const catPerms = CO_HOST_PERMISSIONS.filter(p => p.category === catId);
    const allEnabled = catPerms.every(p => Boolean(permissions[p.key]));
    const updated = { ...permissions };
    catPerms.forEach(p => {
      updated[p.key] = !allEnabled;
    });
    onChange(updated);
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'PlusCircle': return <PlusCircle className="w-4 h-4 text-cyan-400" />;
      case 'Key': return <Key className="w-4 h-4 text-amber-400" />;
      case 'Award': return <Award className="w-4 h-4 text-emerald-400" />;
      case 'Wallet': return <Wallet className="w-4 h-4 text-rose-400" />;
      case 'Palette': return <Palette className="w-4 h-4 text-purple-400" />;
      default: return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
    }
  };

  const totalPermissions = CO_HOST_PERMISSIONS.length;
  const enabledCount = CO_HOST_PERMISSIONS.filter(p => Boolean(permissions[p.key])).length;

  return (
    <div className="space-y-4 text-left font-sans">
      {/* Header with Quick Actions & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Co-Host Permissions Matrix
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              {enabledCount} / {totalPermissions} Enabled
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure granular access rights for this co-host
          </p>
        </div>

        {!disabled && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 rounded-lg text-[10.5px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-white/10 rounded-lg text-[10.5px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* Categories & Checkboxes */}
      <div className="space-y-3.5">
        {CO_HOST_PERMISSION_CATEGORIES.map(category => {
          const categoryPerms = CO_HOST_PERMISSIONS.filter(p => p.category === category.id);
          const catEnabledCount = categoryPerms.filter(p => Boolean(permissions[p.key])).length;
          const isAllCatEnabled = catEnabledCount === categoryPerms.length;

          return (
            <div 
              key={category.id}
              className="bg-slate-900/70 border border-white/5 rounded-2xl p-3.5 space-y-3 hover:border-white/10 transition-all"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-slate-950 rounded-xl border border-white/10 shrink-0">
                    {getCategoryIcon(category.iconName)}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider truncate flex items-center gap-2 font-mono">
                      {category.name}
                      <span className="text-[9px] font-normal text-slate-400">
                        ({catEnabledCount}/{categoryPerms.length})
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-400 truncate">{category.description}</p>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(category.id)}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 border ${
                      isAllCatEnabled 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {isAllCatEnabled ? 'Disable Cat' : 'Enable Cat'}
                  </button>
                )}
              </div>

              {/* Category Permissions List */}
              <div className="grid grid-cols-1 gap-2">
                {categoryPerms.map((perm: CoHostPermissionDef) => {
                  const isChecked = Boolean(permissions[perm.key]);

                  return (
                    <div
                      key={perm.key}
                      onClick={() => handleToggle(perm.key)}
                      className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-3 select-none ${
                        disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                      } ${
                        isChecked 
                          ? 'bg-cyan-950/30 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.08)]' 
                          : 'bg-slate-950/60 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                            {perm.label}
                          </span>
                          {perm.category === 'finance' && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              Sensitive
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-400 leading-snug">
                          {perm.description}
                        </p>
                      </div>

                      {/* Checkbox Visual */}
                      <div className="pt-0.5 shrink-0">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isChecked 
                            ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                            : 'bg-slate-900 border-slate-700 text-transparent'
                        }`}>
                          <Check className={`w-3.5 h-3.5 stroke-[3] ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
