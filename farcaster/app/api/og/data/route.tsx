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

    // Farcaster requires a 1.91:1 aspect ratio (recommend 1200x630)
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
            backgroundColor: '#1a1a1a', // Black background
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
              backgroundColor: '#FFD700', // Gold/Yellow color
              borderRadius: '12px',
              marginRight: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'black',
              fontWeight: 'bold',
              fontSize: '24px'
            }}>
              ES
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#FFD700' }}>
              Esusu
            </h2>
          </div>

          <div
            style={{
              marginTop: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px',
              backgroundColor: '#1a1a1a', 
              borderRadius: '20px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.5)',
              width: '80%',
              maxWidth: '900px',
              border: '2px solid #FFD700', // Yellow border
            }}
          >
            <div style={{
              width: '140px',
              height: '140px',
              marginBottom: '30px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFD700', // Yellow background
              borderRadius: '50%',
            }}>
              {/* Esusu  logo */}
              <div style={{
                width: '100px',
                height: '100px',
                backgroundColor: '#FFD700', // Yellow circle
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img src={`${process.env.NEXT_PUBLIC_URL}/esusu.png`} alt="Esusu Logo" style={{ width: '70%', height: '70%' }} />
              </div>
            </div>

            <h1 style={{
              fontSize: '60px',
              fontWeight: 'bold',
              marginBottom: '16px',
              textAlign: 'center',
              color: '#FFD700' // Yellow text
            }}>
              {title}
            </h1>

            <p style={{
              fontSize: '32px',
              marginBottom: '40px',
              textAlign: 'center',
              color: '#FFFFFF' // White text
            }}>
              {subtitle}
            </p>

            <div style={{
              padding: '16px 32px',
              backgroundColor: '#FFD700', // Yellow button
              color: 'black',
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
            color: '#FFD700' // Yellow text
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
            backgroundColor: '#1a1a1a', // Black background
          }}
        >
          <div style={{
            width: '120px',
            height: '120px',
            margin: '0 0 30px 0',
            backgroundColor: '#FFD700', // Yellow circle
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ fontSize: '60px', fontWeight: 'bold', color: 'black' }}>ES</div>
          </div>

          <p style={{ fontSize: '32px', marginTop: '20px', color: 'white' }}>
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