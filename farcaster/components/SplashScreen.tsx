"use client";

import { useEffect, useState } from 'react';
import { useFarcaster } from './FarcasterProvider';
import Image from 'next/image';

export default function SplashScreen() {
  const { isInMiniApp, isReady, hideSplashScreen } = useFarcaster();
  const [show, setShow] = useState(true);
  
  useEffect(() => {
    if (isReady && isInMiniApp) {
      // Add a small delay to make the transition smoother
      const timer = setTimeout(() => {
        hideSplashScreen();
        setShow(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else if (isReady && !isInMiniApp) {
      // Don't show splash screen if not in mini app
      setShow(false);
    }
  }, [isReady, isInMiniApp, hideSplashScreen]);
  
  if (!show || !isInMiniApp) return null;
  
  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ backgroundColor: '#f5f0ec' }}
    >
      <div className="w-32 h-32 relative mb-4">
        <Image 
          src="/esusu.png" 
          alt="Esusu Logo" 
          width={128}
          height={128}
          className="object-contain" 
        />
      </div>
      <h1 className="text-2xl font-bold text-center mb-2">Esusu</h1>
      <p className="text-gray-600">Buy mobile data with crypto</p>
    </div>
  );
}
