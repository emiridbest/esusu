"use client";
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useThrift } from '@/context/thrift/ThriftContext';

export default function JoinCampaignRedirect() {
  const { id } = useParams();
  const router = useRouter();
  const { loading } = useThrift();
  
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
    <div className="container mx-auto px-4 py-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p>You are being redirected to join a thrift group</p>
      </div>
    </div>
  );
}