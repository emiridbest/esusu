"use client";
import Engagement from '../../components/Engagement';
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';

export default function RewardsPage() {
  const dimensions = useMiniAppDimensions();

  return (
    <div
      className={`${dimensions.containerClass} mx-auto px-4 py-8 overflow-auto min-h-screen dark:from-gray-900 dark:to-gray-800`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
      }}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Earn from Esusu
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Get rewarded for using Esusu and help build a more equitable financial system.
        </p>
      </div>
      
      <Engagement />
    </div>
  );
}
