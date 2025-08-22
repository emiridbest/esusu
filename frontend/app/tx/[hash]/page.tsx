"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type TxResponse = {
  success: boolean;
  transaction?: {
    transactionHash: string;
    walletAddress?: string;
    type?: string;
    subType?: string;
    amount?: number;
    token?: string;
    status?: 'pending' | 'confirmed' | 'failed' | 'completed';
    createdAt?: string;
    blockchainStatus?: {
      confirmed: boolean;
      confirmations: number;
      blockNumber?: number;
    };
  };
  error?: string;
};

export default function TransactionStatusPage() {
  const params = useParams();
  const hash = useMemo(() => {
    const val = params?.hash as string | string[] | undefined;
    return Array.isArray(val) ? val[0] : (val || '');
  }, [params]);
  const searchParams = useSearchParams();
  const typeHint = searchParams.get('type') || undefined;
  const [data, setData] = useState<TxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const explorerUrl = useMemo(() => `https://celoscan.io/tx/${hash}`, [hash]);

  useEffect(() => {
    if (!hash) return;
    let active = true;
    let timer: NodeJS.Timeout | null = null;

    const fetchTx = async () => {
      try {
        const res = await fetch(`/api/transactions/by-hash?hash=${hash}`, { cache: 'no-store' });
        const json: TxResponse = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(json.error || 'Failed to load transaction');
          setLoading(false);
          return;
        }
        setData(json);
        setLoading(false);

        const status = json.transaction?.status;
        if (status && status !== 'completed' && status !== 'failed') {
          timer = setTimeout(fetchTx, 3000);
        }
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Network error');
        setLoading(false);
      }
    };

    fetchTx();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [hash]);

  const status = data?.transaction?.status || 'pending';
  const subType = data?.transaction?.subType || typeHint || 'payment';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Payment Status</h1>
      <Card className="border rounded-xl">
        <CardContent className="p-6 space-y-4">
          {loading ? (
            <div className="text-gray-600">Loading transaction details...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : !data?.transaction ? (
            <div className="text-gray-600">Transaction not found.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Transaction</span>
                <code className="text-xs break-all">{data.transaction.transactionHash}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Type</span>
                <span className="text-sm font-medium capitalize">{subType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Amount</span>
                <span className="text-sm font-medium">{data.transaction.amount ?? '-'} {data.transaction.token ?? ''}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`text-sm font-semibold ${status === 'completed' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>
                  {status}
                </span>
              </div>
              {data.transaction.blockchainStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Confirmations</span>
                  <span className="text-sm">{data.transaction.blockchainStatus.confirmations}</span>
                </div>
              )}

              <div className="pt-4 flex gap-2">
                <Link href={explorerUrl} target="_blank">
                  <Button variant="outline">View on Explorer</Button>
                </Link>
                <Link href="/">
                  <Button>Back Home</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
