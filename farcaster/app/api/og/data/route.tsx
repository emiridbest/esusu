    //@ts-nocheck
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country');
    const operator = searchParams.get('operator');
    
    // Set appropriate cache control headers
    const headers = {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1 hour cache
    };
    
    // Generate dynamic title based on URL parameters
    let title = 'Buy Mobile Data Bundles';
    let subtitle = 'Top-up mobile data with crypto on the Celo blockchain';
    
    if (operator) {
      title = 'Select a Data Bundle';
      subtitle = 'Choose a data package for your mobile device';
    } else if (country) {
      title = 'Select a Mobile Operator';
      subtitle = 'Choose your provider for mobile data top-up';
    }
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
              width: '120px',
              height: '120px',
              marginBottom: '30px',
              position: 'relative',
            }}>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="4" fill="#3B82F6" />
                <path d="M6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12Z" stroke="white" strokeWidth="2" />
                <path d="M13 9L13 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 12L15 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            
            <h1 style={{ 
              fontSize: '60px', 
              fontWeight: 'bold', 
              marginBottom: '16px', 
              textAlign: 'center',
              color: '#1e3a8a'
            }}>
              {title}
            </h1>
            
            <p style={{ 
              fontSize: '32px', 
              marginBottom: '40px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              {subtitle}
            </p>
            
            <div style={{ 
              padding: '16px 32px', 
              backgroundColor: '#3B82F6', 
              color: 'white', 
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: 'bold',
            }}>
              Get Started
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
    console.error('Error generating data landing image:', error);
    
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
            Data Bundle Store
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
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  }
}