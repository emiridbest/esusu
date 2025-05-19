//@ts-nocheck
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getTransactionStatus } from '../../../../services/utility/api';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const txId = searchParams.get('txId');
    
    if (!txId) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f0ec',
            }}
          >
            <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>
              Transaction Not Found
            </h1>
            <p style={{ fontSize: '32px', marginTop: '20px' }}>
              No transaction ID was provided
            </p>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
    
    // Get transaction details
    const txData = await getTransactionStatus(parseInt(txId));
    const tx = txData.transaction || txData;
    
    if (!tx) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '1200px',
              height: '630px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f0ec',
            }}
          >
            <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>
              Transaction Not Found
            </h1>
            <p style={{ fontSize: '32px', marginTop: '20px' }}>
              We could not find details for transaction #{txId}
            </p>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
    }
    
    // Set cache control headers (1 day cache for completed transactions)
    const headers = tx.status === 'PENDING' 
      ? { 'Cache-Control': 'public, max-age=60, s-maxage=60' } // 1 minute for pending transactions
      : { 'Cache-Control': 'public, immutable, max-age=86400, s-maxage=86400' }; // 1 day for completed transactions
    
    const statusColor = tx.status === 'SUCCESSFUL' ? '#16a34a' : 
                       tx.status === 'PENDING' ? '#ca8a04' : '#dc2626';
    
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f0ec',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div style={{ 
              width: '60px', 
              height: '60px', 
              backgroundColor: '#3B82F6', 
              borderRadius: '12px',
              marginRight: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '24px'
            }}>
              DB
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
              Data Bundle Store
            </h2>
          </div>

          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              backgroundColor: 'white',
              borderRadius: '20px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              width: '80%',
              maxWidth: '900px',
            }}
          >
            <div style={{
              backgroundColor: tx.status === 'SUCCESSFUL' ? '#dcfce7' : 
                              tx.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                {tx.status === 'SUCCESSFUL' ? (
                  <path d="M5 13l4 4L19 7" stroke={statusColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                ) : tx.status === 'PENDING' ? (
                  <circle cx="12" cy="12" r="7.5" stroke={statusColor} strokeWidth="3" />
                ) : (
                  <path d="M6 18L18 6M6 6l12 12" stroke={statusColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
            
            <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>
              {tx.status === 'SUCCESSFUL' ? 'Data Purchase Successful!' : 
               tx.status === 'PENDING' ? 'Data Purchase Pending' : 'Data Purchase Failed'}
            </h1>
            
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>
              Recipient: {tx.recipientPhone}
            </div>
            
            <div style={{ 
              fontSize: '64px', 
              fontWeight: 'bold', 
              marginTop: '20px',
              marginBottom: '20px',
              color: '#3B82F6'
            }}>
              {tx.amount} USD
            </div>
            
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>
              {tx.operatorName}
            </div>
            
            <div style={{
              fontSize: '20px',
              color: '#666'
            }}>
              Transaction ID: {tx.transactionId}
            </div>
            
            <div style={{ 
              padding: '16px 32px', 
              backgroundColor: '#3B82F6', 
              color: 'white', 
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: 'bold',
              marginTop: '32px'
            }}>
              Buy Data Bundle
            </div>
          </div>
          
          <p style={{ 
            position: 'absolute', 
            bottom: '20px', 
            fontSize: '20px', 
            color: '#666' 
          }}>
            Powered by Esusu on the Celo Blockchain
          </p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers,
      }
    );
  } catch (error) {
    console.error('Error generating transaction image:', error);
    
    // Return a fallback image with minimal caching
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f0ec',
          }}
        >
          <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>
            Data Bundle Transaction
          </h1>
          <p style={{ fontSize: '32px', marginTop: '20px' }}>
            Buy mobile data bundles with crypto
          </p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}