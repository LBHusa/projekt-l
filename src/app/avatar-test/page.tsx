'use client';

import PixelAvatar from '@/components/character/PixelAvatar';

export default function AvatarTestPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        <h1 className="text-3xl font-bold text-white text-center">
          Pixel Avatar Test
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {/* Test different seeds */}
          {[
            'wise-old-wizard',
            'gandalf-the-grey',
            'old-man-staff',
            'wizard-hat',
            'sage-elder',
            'merlin',
          ].map((seed) => (
            <div
              key={seed}
              className="bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4"
            >
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-4 border-purple-500">
                <PixelAvatar seed={seed} size={128} />
              </div>
              <p className="text-sm text-gray-400 text-center">{seed}</p>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-4">Different Sizes</h2>
          <div className="flex items-end gap-8 justify-center">
            {[32, 64, 96, 128, 192].map((size) => (
              <div key={size} className="flex flex-col items-center gap-2">
                <div
                  className="rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center border-2 border-purple-500"
                  style={{ width: size, height: size }}
                >
                  <PixelAvatar seed="wise-old-wizard" size={size} />
                </div>
                <p className="text-xs text-gray-400">{size}px</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
