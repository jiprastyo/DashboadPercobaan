'use client';

import { useEffect } from 'react';

type PlatformLabel = 'apple' | 'android' | 'windows' | 'other';

function detectPlatform(): PlatformLabel {
  if (typeof navigator === 'undefined') {
    return 'other';
  }

  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();

  if (
    /iphone|ipad|ipod|macintosh|mac os x/.test(ua) ||
    /mac/.test(platform)
  ) {
    return 'apple';
  }

  if (/android/.test(ua)) {
    return 'android';
  }

  if (/win/.test(platform) || /windows/.test(ua)) {
    return 'windows';
  }

  return 'other';
}

export default function PlatformFontProvider() {
  useEffect(() => {
    document.documentElement.dataset.platform = detectPlatform();
  }, []);

  return null;
}
