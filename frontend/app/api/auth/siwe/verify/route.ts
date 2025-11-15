import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { address, message, signature } = await req.json();
    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing address, message, or signature' }, { status: 400 });
    }

    let recovered = '';
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (recovered.toLowerCase() !== String(address).toLowerCase()) {
      return NextResponse.json({ error: 'Signature address mismatch' }, { status: 401 });
    }

    // Very basic SIWE message validation (could be replaced with full siwe lib)
    if (!message.includes(address)) {
      return NextResponse.json({ error: 'Invalid SIWE message' }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET || process.env.SIWE_JWT_SECRET || 'dev_secret_change_me';
    const token = jwt.sign({ address: address.toLowerCase() }, secret, { expiresIn: '1d' });

    const res = NextResponse.json({ address: address.toLowerCase() });
    res.cookies.set('esusu_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to verify SIWE' }, { status: 500 });
  }
}
