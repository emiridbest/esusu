"use client";
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useThrift } from '@/context/thrift/ThriftContext';
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';

export default function JoinCampaignRedirect() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { loading } = useThrift();
  const dimensions = useMiniAppDimensions();
  
  useEffect(() => {
    if (loading) return;
    
    // Redirect to the campaign details page with join=true parameter
    if (id) {
      router.replace(`/thrift/${id}?join=true`);
    } else {
      // If no ID, redirect to the main thrift page
      router.replace('/thrift');
    }
  }, [id, router, loading]);

  return (
    <div
      className={`${dimensions.containerClass} mx-auto px-4 py-20 overflow-auto`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: dimensions.maxWidth,
      }}
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p>You are being redirected to join a thrift group</p>
      </div>
    </div>
  );
}