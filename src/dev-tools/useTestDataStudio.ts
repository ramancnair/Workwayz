'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db-provider';
import { doc, onSnapshot, setDoc } from '@/lib/db-provider';

const STORAGE_KEY = 'pf_test_data_studio_enabled';
const SETTING_EVENT = 'test-data-studio-setting-changed';
const OPEN_MODAL_EVENT = 'open-test-data-studio';

export function useTestDataStudio() {
  const [isEnabled, setIsEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync with localStorage, window events, and Firestore
  useEffect(() => {
    // 1. Listen for cross-component and cross-tab custom events
    const handleSettingChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
        setIsEnabledState(customEvent.detail.enabled);
      }
    };

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    window.addEventListener(SETTING_EVENT, handleSettingChange);
    window.addEventListener(OPEN_MODAL_EVENT, handleOpenModal);

    // 2. Real-time Firestore sync
    let unsubscribe = () => {};
    if (db) {
      try {
        const settingsRef = doc(db, 'settings', 'main');
        unsubscribe = onSnapshot(
          settingsRef,
          (docSnap: any) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data && typeof data.testDataStudioEnabled === 'boolean') {
                setIsEnabledState(data.testDataStudioEnabled);
                localStorage.setItem(STORAGE_KEY, String(data.testDataStudioEnabled));
              }
            }
          },
          (err: any) => {
            console.warn('[useTestDataStudio] Firestore settings listener warning:', err);
          }
        );
      } catch (err) {
        console.warn('[useTestDataStudio] Failed to initialize Firestore listener:', err);
      }
    }

    return () => {
      window.removeEventListener(SETTING_EVENT, handleSettingChange);
      window.removeEventListener(OPEN_MODAL_EVENT, handleOpenModal);
      unsubscribe();
    };
  }, []);

  const setStudioEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(enabled));
      window.dispatchEvent(
        new CustomEvent(SETTING_EVENT, { detail: { enabled } })
      );
    }

    if (db) {
      try {
        const settingsRef = doc(db, 'settings', 'main');
        await setDoc(settingsRef, { testDataStudioEnabled: enabled }, { merge: true });
      } catch (err) {
        console.error('[useTestDataStudio] Failed to persist testDataStudioEnabled to Firestore:', err);
      }
    }
  }, []);

  const openStudio = useCallback(() => {
    setIsModalOpen(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT));
    }
  }, []);

  const closeStudio = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return {
    isEnabled,
    setStudioEnabled,
    isModalOpen,
    openStudio,
    closeStudio,
    setIsModalOpen,
  };
}

export function triggerOpenTestDataStudio() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT));
  }
}

