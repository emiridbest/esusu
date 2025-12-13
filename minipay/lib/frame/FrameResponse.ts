import { NextResponse } from 'next/server';
import { FrameMetadata, createFrameResponse } from './FrameMetadata';

export interface FrameResponseData {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export function createSuccessResponse(metadata: FrameMetadata, data?: any): Response {
  return createFrameResponse(metadata);
}

export function createErrorResponse(error: string, fallbackImage?: string): Response {
  const errorMetadata: FrameMetadata = {
    version: 'next',
    imageUrl: fallbackImage || `${process.env.NEXT_PUBLIC_URL}/api/og/error?message=${encodeURIComponent(error)}`,
    buttons: [
      {
        title: 'Try Again',
        action: 'post',
        target: '/api/frame/action'
      }
    ]
  };

  return createFrameResponse(errorMetadata);
}

export function createLoadingResponse(message: string = 'Processing...'): Response {
  const loadingMetadata: FrameMetadata = {
    version: 'next',
    imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/loading?message=${encodeURIComponent(message)}`,
    buttons: [
      {
        title: 'Refresh',
        action: 'post',
        target: '/api/frame/action'
      }
    ]
  };

  return createFrameResponse(loadingMetadata);
}

export function createRedirectResponse(url: string): Response {
  return NextResponse.redirect(url);
}

export function createJsonResponse(data: FrameResponseData): Response {
  return NextResponse.json(data);
}