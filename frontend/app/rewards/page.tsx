"use client";
import Engagement from '@/components/Engagement';

export default function RewardsPage() {
  return (
    <div className="min-h-screen   dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8">
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
    </div>
  );
}
