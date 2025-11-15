import { NextRequest } from 'next/server';

export interface FrameState {
  fid: string;
  username?: string;
  displayName?: string;
  currentPage: string;
  data: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

export interface FrameAction {
  type: string;
  payload: any;
  timestamp: number;
}

export class FrameStateManager {
  private static instance: FrameStateManager;
  private states: Map<string, FrameState> = new Map();
  private actions: Map<string, FrameAction[]> = new Map();

  private constructor() {}

  static getInstance(): FrameStateManager {
    if (!FrameStateManager.instance) {
      FrameStateManager.instance = new FrameStateManager();
    }
    return FrameStateManager.instance;
  }

  private generateSessionId(fid: string): string {
    return `${fid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createState(fid: string, username?: string, displayName?: string): FrameState {
    const sessionId = this.generateSessionId(fid);
    const state: FrameState = {
      fid,
      username,
      displayName,
      currentPage: 'home',
      data: {},
      timestamp: Date.now(),
      sessionId,
    };

    this.states.set(sessionId, state);
    this.actions.set(sessionId, []);
    
    return state;
  }

  getState(sessionId: string): FrameState | null {
    return this.states.get(sessionId) || null;
  }

  updateState(sessionId: string, updates: Partial<FrameState>): FrameState | null {
    const currentState = this.states.get(sessionId);
    if (!currentState) return null;

    const updatedState: FrameState = {
      ...currentState,
      ...updates,
      timestamp: Date.now(),
    };

    this.states.set(sessionId, updatedState);
    return updatedState;
  }

  addAction(sessionId: string, action: FrameAction): void {
    const actions = this.actions.get(sessionId) || [];
    actions.push(action);
    this.actions.set(sessionId, actions);
  }

  getActions(sessionId: string): FrameAction[] {
    return this.actions.get(sessionId) || [];
  }

  getStateFromRequest(request: NextRequest): FrameState | null {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const stateParam = searchParams.get('state');
    if (!stateParam) return null;

    try {
      const stateData = JSON.parse(stateParam);
      return this.getState(stateData.sessionId);
    } catch (error) {
      console.error('Error parsing state from request:', error);
      return null;
    }
  }

  createStateFromRequest(request: NextRequest): FrameState {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const fid = searchParams.get('fid') || 'unknown';
    const username = searchParams.get('username') || undefined;
    const displayName = searchParams.get('displayName') || undefined;

    return this.createState(fid, username, displayName);
  }

  updateStateFromRequest(request: NextRequest, updates: Partial<FrameState>): FrameState | null {
    const currentState = this.getStateFromRequest(request);
    if (!currentState) return null;

    return this.updateState(currentState.sessionId, updates);
  }

  addActionFromRequest(request: NextRequest, actionType: string, payload: any): void {
    const currentState = this.getStateFromRequest(request);
    if (!currentState) return;

    const action: FrameAction = {
      type: actionType,
      payload,
      timestamp: Date.now(),
    };

    this.addAction(currentState.sessionId, action);
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, state] of this.states.entries()) {
      if (now - state.timestamp > maxAge) {
        this.states.delete(sessionId);
        this.actions.delete(sessionId);
      }
    }
  }

  // Cleanup old states every hour
  startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }
}

export const frameStateManager = FrameStateManager.getInstance();

