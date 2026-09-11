'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import TestDataModal from './TestDataModal';
import { useTestDataStudio } from './useTestDataStudio';

export default function DevTriggerButton() {
  const { isEnabled, isModalOpen, setIsModalOpen } = useTestDataStudio();

  // Global Keyboard Shortcut: Ctrl+Shift+D or Cmd+Shift+D
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, setIsModalOpen]);

  // If feature is disabled in Portfolio Settings, do not render trigger button or modal
  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        title="Test Data Studio (Ctrl+Shift+D)"
        className="fixed bottom-6 right-6 z-[9999] cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 group"
      >
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 border border-primary-foreground/20 hover:bg-primary/90 transition-colors">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-tight">Test Data Studio</span>
          <span className="text-[10px] font-semibold bg-primary-foreground/15 px-1.5 py-0.5 rounded text-primary-foreground">
            DEV
          </span>
        </div>
      </div>

      <TestDataModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
