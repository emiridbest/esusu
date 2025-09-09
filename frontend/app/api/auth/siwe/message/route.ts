import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    const chainId = searchParams.get('chainId') || '42220'; // default Celo mainnet
    const domain = searchParams.get('domain') || req.headers.get('host') || 'localhost';
    const uri = searchParams.get('uri') || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const nonce = randomBytes(8).toString('hex');

    const message = [
      `${domain} wants you to sign in with your Ethereum account:`,
      `${address}`,
      '',
      'Sign in with Ethereum to the Esusu app.',
      '',
      `URI: ${uri}`,
      `Version: 1`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');

    return NextResponse.json({ message, nonce, domain, uri, chainId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to build SIWE message' }, { status: 500 });
  }
}
