'use client';
import React, { useEffect, useRef } from 'react';
import {
  Plus, Scissors, Copy, ClipboardPaste, Trash2, ChevronUp, ChevronDown
} from 'lucide-react';

export interface ContextMenuAction {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean; // show divider BEFORE this item
  onClick: () => void;
}

interface Props {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export function GanttContextMenu({ x, y, actions, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position so menu never goes off-screen
  const [pos, setPos] = React.useState({ x, y });
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: x + rect.width > vw ? Math.max(0, vw - rect.width - 4) : x,
      y: y + rect.height > vh ? Math.max(0, vh - rect.height - 4) : y,
    });
  }, [x, y]);

  // Close on outside click or Escape
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const click = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', down);
    document.addEventListener('mousedown', click);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('mousedown', click);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] rounded-md border border-border bg-popover shadow-lg py-1"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {actions.map((action, i) => (
        <React.Fragment key={i}>
          {action.divider && <div className="my-1 border-t border-border" />}
          <button
            disabled={action.disabled}
            onClick={() => { if (!action.disabled) { action.onClick(); onClose(); } }}
            className={[
              'w-full flex items-center gap-3 px-3 py-1.5 text-sm text-left',
              action.disabled
                ? 'opacity-40 cursor-not-allowed'
                : action.danger
                  ? 'hover:bg-destructive/10 text-destructive'
                  : 'hover:bg-accent cursor-pointer',
            ].join(' ')}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground">
              {action.icon}
            </span>
            <span className="flex-1">{action.label}</span>
            {action.shortcut && (
              <span className="text-[10px] text-muted-foreground font-mono">{action.shortcut}</span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
