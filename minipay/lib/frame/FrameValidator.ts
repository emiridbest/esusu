import { NextRequest } from 'next/server';

export interface FrameValidationResult {
  isValid: boolean;
  fid?: string;
  username?: string;
  displayName?: string;
  error?: string;
}

export async function validateFrameRequest(request: NextRequest): Promise<FrameValidationResult> {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Extract frame data from URL parameters
    const fid = searchParams.get('fid');
    const username = searchParams.get('username');
    const displayName = searchParams.get('displayName');
    
    // Basic validation - in production, you'd validate the signature
    if (!fid) {
      return {
        isValid: false,
        error: 'Missing FID parameter'
      };
    }

    // Validate FID format (should be numeric)
    if (!/^\d+$/.test(fid)) {
      return {
        isValid: false,
        error: 'Invalid FID format'
      };
    }

    return {
      isValid: true,
      fid,
      username: username || undefined,
      displayName: displayName || undefined
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid frame request format'
    };
  }
}

export function validateFrameState(state: any): boolean {
  if (!state || typeof state !== 'object') {
    return false;
  }

  // Add specific state validation rules here
  // For now, just check if it's a valid object
  return true;
}

export function sanitizeFrameInput(input: string): string {
  if (!input) return '';
  
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/script injection chars
    .substring(0, 1000) // Limit length
    .trim();
}