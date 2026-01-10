// Quick test of DiceBear pixel art avatar generation
import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

const seeds = [
  'wise-old-wizard',
  'gandalf-the-grey',
  'old-man-staff',
  'wizard-hat',
  'sage-elder',
  'merlin'
];

console.log('=== DiceBear Pixel Art Avatar Test ===\n');

seeds.forEach(seed => {
  const avatar = createAvatar(pixelArt, {
    seed,
    size: 64
  });

  const svg = avatar.toString();
  console.log(`Seed: ${seed}`);
  console.log(`SVG Length: ${svg.length} characters`);
  console.log(`First 100 chars: ${svg.substring(0, 100)}...`);
  console.log('---\n');
});

console.log('✅ All avatars generated successfully!');
