/**
 * Farcaster Webhook Handler
 * Receives notifications from Farcaster for app events
 */

import { NextRequest, NextResponse } from 'next/server';
import { FIDMappingService } from '@/lib/frame/fidMapping';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Handle Farcaster webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const eventType = body.type;
    const fid = body.fid;
    
    console.log('Farcaster webhook event:', eventType, fid);
    
    switch (eventType) {
      case 'app_installed':
        await handleAppInstall(fid, body.data);
        break;
        
      case 'app_uninstalled':
        await handleAppUninstall(fid, body.data);
        break;
        
      case 'notification_sent':
        await handleNotificationSent(fid, body.data);
        break;
        
      default:
        console.log('Unknown webhook event type:', eventType);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleAppInstall(fid: number, data: any) {
  try {
    console.log(`User ${fid} installed Esusu app`);
  } catch (error) {
    console.error('Error handling app install:', error);
  }
}

async function handleAppUninstall(fid: number, data: any) {
  try {
    console.log(`User ${fid} uninstalled Esusu app`);
  } catch (error) {
    console.error('Error handling app uninstall:', error);
  }
}

async function handleNotificationSent(fid: number, data: any) {
  try {
    console.log(`Notification sent to user ${fid}`);
  } catch (error) {
    console.error('Error handling notification sent:', error);
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', service: 'esusu-farcaster-webhook' });
}
