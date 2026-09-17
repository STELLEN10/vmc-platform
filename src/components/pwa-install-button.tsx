"use client";

import React, { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button onClick={install} className={`button button--primary ${className || ""}`}>
        Install App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button onClick={() => setShowIOSGuide(true)} className={`button button--light ${className || ""}`}>
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-ink">
              <h3 className="text-lg font-semibold mb-2">Install on iPhone / iPad</h3>
              <p className="text-sm mb-4">
                1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button onClick={() => setShowIOSGuide(false)} className="w-full button button--light border border-line">
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
