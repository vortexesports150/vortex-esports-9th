import React from 'react';
import { 
  CheckCircle2, Square, CheckSquare, Shield, Check, X, 
  HelpCircle, Sparkles, Layers, Sliders, ShieldCheck 
} from 'lucide-react';
import { 
  SUPER_ADMIN_PERMISSIONS, 
  PERMISSION_CATEGORIES, 
  PermissionDefinition,
  getDefaultAllPermissions 
} from '../lib/superAdminPermissions';

interface AdminPermissionsMatrixProps {
  permissions: Record<string, boolean>;
  onChange?: (updated: Record<string, boolean>) => void;
  readOnly?: boolean;
  title?: string;
  subtitle?: string;
}

export const AdminPermissionsMatrix: React.FC<AdminPermissionsMatrixProps> = ({
  permissions,
  onChange,
  readOnly = false,
  title = "Super Admin Access & Permissions Matrix",
  subtitle = "Check or uncheck the accessibility modules granted to this Super Administrator."
}) => {
  const isInteractive = !readOnly && typeof onChange === 'function';

  const handleToggle = (key: string) => {
    if (!isInteractive) return;
    const currentVal = permissions[key] ?? true;
    onChange({
      ...permissions,
      [key]: !currentVal
    });
  };

  const handleSelectAll = (val: boolean) => {
    if (!isInteractive) return;
    onChange(getDefaultAllPermissions(val));
  };

  const handleToggleCategory = (catId: string, enableAll: boolean) => {
    if (!isInteractive) return;
    const catPerms = SUPER_ADMIN_PERMISSIONS.filter(p => p.category === catId);
    const updated = { ...permissions };
    catPerms.forEach(p => {
      updated[p.key] = enableAll;
    });
    onChange(updated);
  };

  const grantedCount = SUPER_ADMIN_PERMISSIONS.filter(p => permissions[p.key] ?? true).length;
  const totalCount = SUPER_ADMIN_PERMISSIONS.length;

  return (
    <div className="space-y-4 text-left font-sans">
      {/* Matrix Header Bar */}
      <div className="bg-[#040c1a] border border-cyan-500/25 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(6,182,212,0.08)]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                {title}
              </h5>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] font-black border border-cyan-500/30">
                {grantedCount} / {totalCount} Granted
              </span>
            </div>
            {subtitle && (
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Global Quick Action Buttons */}
        {isInteractive && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[10px] font-mono font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 px-2.5 py-1.5 rounded-lg border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Check className="w-3 h-3" />
              Select All
            </button>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[10px] font-mono font-bold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <X className="w-3 h-3" />
              Deselect All
            </button>
          </div>
        )}
      </div>

      {/* Category Groups */}
      <div className="space-y-4">
        {PERMISSION_CATEGORIES.map(category => {
          const categoryPermissions = SUPER_ADMIN_PERMISSIONS.filter(p => p.category === category.id);
          const catGrantedCount = categoryPermissions.filter(p => permissions[p.key] ?? true).length;
          const allCatGranted = catGrantedCount === categoryPermissions.length;

          return (
            <div 
              key={category.id}
              className="bg-[#030914]/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-cyan-300 uppercase tracking-wider font-mono">
                    {category.label}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    ({catGrantedCount}/{categoryPermissions.length})
                  </span>
                </div>

                {isInteractive && (
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(category.id, !allCatGranted)}
                    className="text-[9.5px] font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    {allCatGranted ? 'Deselect Category' : 'Select All in Category'}
                  </button>
                )}
              </div>

              {/* Checkbox List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {categoryPermissions.map((perm) => {
                  const isChecked = permissions[perm.key] ?? true;

                  return (
                    <div
                      key={perm.key}
                      onClick={() => isInteractive && handleToggle(perm.key)}
                      className={`p-2.5 rounded-xl border transition-all text-left flex items-start gap-3 select-none ${
                        isInteractive ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isChecked
                          ? 'bg-cyan-950/30 border-cyan-500/40 text-white shadow-[0_0_10px_rgba(6,182,212,0.06)]'
                          : 'bg-slate-950/40 border-white/5 text-slate-500 opacity-60 hover:opacity-90'
                      }`}
                    >
                      {/* Checkbox Indicator */}
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <div className="h-5 w-5 rounded-md bg-cyan-500 text-slate-950 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold font-sans truncate ${
                            isChecked ? 'text-white' : 'text-slate-400'
                          }`}>
                            {perm.label}
                          </span>
                          <span className={`text-[8.5px] font-mono uppercase px-1.5 py-0.5 rounded font-black ${
                            isChecked 
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                              : 'bg-slate-900 text-slate-600'
                          }`}>
                            {isChecked ? 'Allowed' : 'Locked'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans mt-0.5 leading-snug">
                          {perm.description}
                        </p>
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
};
