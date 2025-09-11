import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('esusu_session')?.value;
    if (!sessionCookie) return NextResponse.json({ authenticated: false });

    const secret = process.env.NEXTAUTH_SECRET || process.env.SIWE_JWT_SECRET || 'dev_secret_change_me';
    try {
      const payload = jwt.verify(sessionCookie, secret) as any;
      if (!payload?.address) return NextResponse.json({ authenticated: false });
      return NextResponse.json({ authenticated: true, address: String(payload.address).toLowerCase() });
    } catch {
      return NextResponse.json({ authenticated: false });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to read session' }, { status: 500 });
  }
}
