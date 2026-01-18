import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${process.env.NEXT_PUBLIC_URL}/farcaster.png`}
          alt="Esusu "
          width="1200"
          height="630"
          style={{
            width: '1200px',
            height: '630px'
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}