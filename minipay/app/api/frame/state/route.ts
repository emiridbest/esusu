import { NextRequest, NextResponse } from 'next/server';
import { frameStateManager } from '@/lib/frame/FrameStateManager';
import { validateFrameRequest } from '@/lib/frame/FrameValidator';

export async function GET(request: NextRequest) {
  try {
    // Validate the frame request
    const validation = await validateFrameRequest(request);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Invalid frame request' }, { status: 400 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const state = frameStateManager.getState(sessionId);
    if (!state) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 });
    }

    return NextResponse.json({ state });
  } catch (error) {
    console.error('Error getting frame state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate the frame request
    const validation = await validateFrameRequest(request);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Invalid frame request' }, { status: 400 });
    }

    const body = await request.json();
    const { sessionId, updates } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const updatedState = frameStateManager.updateState(sessionId, updates);
    if (!updatedState) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 });
    }

    return NextResponse.json({ state: updatedState });
  } catch (error) {
    console.error('Error updating frame state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

