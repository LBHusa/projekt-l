'use client';

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

interface PixelAvatarProps {
  seed?: string;
  size?: number;
  className?: string;
}

export default function PixelAvatar({
  seed = 'wise-old-wizard-gandalf',
  size = 64,
  className = '',
}: PixelAvatarProps) {
  const avatarSvg = useMemo(() => {
    const avatar = createAvatar(pixelArt, {
      seed,
      size,
      // Customize to look like an old wise man
      // DiceBear pixelArt doesn't have direct beard/hat options,
      // but the seed will generate a consistent look
    });

    return avatar.toString();
  }, [seed, size]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: avatarSvg }}
    />
  );
}
