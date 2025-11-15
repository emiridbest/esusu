import { NextRequest } from 'next/server';
import { frameActionHandlers } from '@/lib/frame/FrameActionHandlers';
import { validateFrameRequest } from '@/lib/frame/FrameValidator';

export async function POST(request: NextRequest) {
  try {
    // Validate the frame request
    const validation = await validateFrameRequest(request);
    if (!validation.isValid) {
      return new Response('Invalid frame request', { status: 400 });
    }

    // Handle the frame action
    return await frameActionHandlers.handleAction(request);
  } catch (error) {
    console.error('Error in frame action handler:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests (for initial frame load)
  return await POST(request);
}

