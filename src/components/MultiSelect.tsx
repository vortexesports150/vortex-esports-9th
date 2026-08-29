import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export function MultiSelect({ options, selected, onChange, placeholder }: any) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((x: string) => x !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setOpen(!open)}
        className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white cursor-pointer flex justify-between items-center h-full"
      >
        <span className="truncate mr-2">
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-full min-w-[150px] bg-slate-800 border border-white/10 rounded shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {options.length === 0 ? (
             <div className="p-2 text-[10px] text-slate-500">No options</div>
          ) : (
            options.map((opt: string) => (
              <div 
                key={opt} 
                onClick={(e) => { e.stopPropagation(); toggleOption(opt); }}
                className="flex items-center gap-2 p-2 hover:bg-slate-700 cursor-pointer text-[10px] text-white"
              >
                <div className={`w-3 h-3 rounded flex items-center justify-center border shrink-0 ${selected.includes(opt) ? 'bg-cyan-600 border-cyan-600' : 'border-slate-500'}`}>
                  {selected.includes(opt) && <Check className="w-2 h-2 text-white" />}
                </div>
                <span className="truncate">{opt}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
