'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { getPlayerPhotoUrl, getPlayerInitials } from '@/lib/avatar';

interface PlayerAvatarProps {
  name: string;
  size?: number;
  borderColor?: string;
  className?: string;
}

export default function PlayerAvatar({
  name,
  size = 56,
  borderColor = '#3B82F6',
  className = '',
}: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getPlayerPhotoUrl(name);

  if (photoUrl && !imgError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 shadow-md ${className}`}
        style={{
          width: size,
          height: size,
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 12px ${borderColor}55`,
        }}
      >
        <Image
          src={photoUrl}
          alt={name}
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>
    );
  }

  const initials = getPlayerInitials(name);
  const fontSize = Math.max(Math.round(size * 0.36), 11);

  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-black tracking-wider text-white shadow-md ${className}`}
      style={{
        width: size,
        height: size,
        border: `2px solid ${borderColor}`,
        background: 'linear-gradient(135deg, #0b1226, #1e293b)',
        fontSize: `${fontSize}px`,
        boxShadow: `0 0 10px ${borderColor}44`,
      }}
    >
      {initials}
    </div>
  );
}
