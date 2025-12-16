import { NextRequest } from 'next/server';
import { FrameState, frameStateManager } from './FrameStateManager';
import { BackendWallet, getBackendWallet } from '../backend/BackendWallet';
import { createSuccessResponse, createErrorResponse, createLoadingResponse } from './FrameResponse';
import { FrameMetadata } from './FrameMetadata';

export interface FrameActionContext {
  request: NextRequest;
  state: FrameState;
  backendWallet: BackendWallet;
}

export class FrameActionHandlers {
  private static instance: FrameActionHandlers;
  private handlers: Map<string, (context: FrameActionContext) => Promise<Response>> = new Map();

  private constructor() {
    this.registerDefaultHandlers();
  }

  static getInstance(): FrameActionHandlers {
    if (!FrameActionHandlers.instance) {
      FrameActionHandlers.instance = new FrameActionHandlers();
    }
    return FrameActionHandlers.instance;
  }

  private registerDefaultHandlers(): void {
    this.handlers.set('home', this.handleHome.bind(this));
    this.handlers.set('freebies', this.handleFreebies.bind(this));
    this.handlers.set('thrift', this.handleThrift.bind(this));
    this.handlers.set('savings', this.handleSavings.bind(this));
    this.handlers.set('utilities', this.handleUtilities.bind(this));
    this.handlers.set('claim', this.handleClaim.bind(this));
    this.handlers.set('exchange', this.handleExchange.bind(this));
    this.handlers.set('create_group', this.handleCreateGroup.bind(this));
    this.handlers.set('join_group', this.handleJoinGroup.bind(this));
    this.handlers.set('deposit', this.handleDeposit.bind(this));
    this.handlers.set('withdraw', this.handleWithdraw.bind(this));
    this.handlers.set('pay_bill', this.handlePayBill.bind(this));
    this.handlers.set('buy_airtime', this.handleBuyAirtime.bind(this));
    this.handlers.set('buy_data', this.handleBuyData.bind(this));
  }

  async handleAction(request: NextRequest): Promise<Response> {
    try {
      const url = new URL(request.url);
      const action = url.searchParams.get('action') || 'home';
      
      let state = frameStateManager.getStateFromRequest(request);
      if (!state) {
        state = frameStateManager.createStateFromRequest(request);
      }

      const backendWallet = getBackendWallet();
      const context: FrameActionContext = {
        request,
        state,
        backendWallet,
      };

      const handler = this.handlers.get(action);
      if (!handler) {
        return createErrorResponse(`Unknown action: ${action}`);
      }

      return await handler(context);
    } catch (error) {
      console.error('Error handling frame action:', error);
      return createErrorResponse('Internal server error');
    }
  }

  private async handleHome(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/home?fid=${state.fid}`,
      buttons: [
        { title: 'Freebies', action: 'post', target: '/api/frame/action?action=freebies' },
        { title: 'Thrift Groups', action: 'post', target: '/api/frame/action?action=thrift' },
        { title: 'Mini-Safe', action: 'post', target: '/api/frame/action?action=savings' },
        { title: 'Utilities', action: 'post', target: '/api/frame/action?action=utilities' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleFreebies(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/freebies?fid=${state.fid}`,
      buttons: [
        { title: 'Claim G$', action: 'post', target: '/api/frame/action?action=claim' },
        { title: 'Exchange G$', action: 'post', target: '/api/frame/action?action=exchange' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=home' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleThrift(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/thrift?fid=${state.fid}`,
      buttons: [
        { title: 'Create Group', action: 'post', target: '/api/frame/action?action=create_group' },
        { title: 'Join Group', action: 'post', target: '/api/frame/action?action=join_group' },
        { title: 'My Groups', action: 'post', target: '/api/frame/action?action=my_groups' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=home' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleSavings(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/savings?fid=${state.fid}`,
      buttons: [
        { title: 'Deposit', action: 'post', target: '/api/frame/action?action=deposit' },
        { title: 'Withdraw', action: 'post', target: '/api/frame/action?action=withdraw' },
        { title: 'Balance', action: 'post', target: '/api/frame/action?action=balance' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=home' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleUtilities(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/utilities?fid=${state.fid}`,
      buttons: [
        { title: 'Pay Bills', action: 'post', target: '/api/frame/action?action=pay_bill' },
        { title: 'Buy Airtime', action: 'post', target: '/api/frame/action?action=buy_airtime' },
        { title: 'Buy Data', action: 'post', target: '/api/frame/action?action=buy_data' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=home' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleClaim(context: FrameActionContext): Promise<Response> {
    const { state, backendWallet } = context;
    
    try {
      // Add claim action to state
      frameStateManager.addActionFromRequest(context.request, 'claim', { timestamp: Date.now() });
      
      // In a real implementation, you would:
      // 1. Check if user is eligible to claim
      // 2. Execute the claim transaction
      // 3. Update user's balance
      
      const metadata: FrameMetadata = {
        version: 'next',
        imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/claim-success?fid=${state.fid}`,
        buttons: [
          { title: 'Back to Freebies', action: 'post', target: '/api/frame/action?action=freebies' },
          { title: 'Home', action: 'post', target: '/api/frame/action?action=home' }
        ],
        state: { sessionId: state.sessionId }
      };

      return createSuccessResponse(metadata);
    } catch (error) {
      return createErrorResponse('Failed to claim G$ tokens');
    }
  }

  private async handleExchange(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/exchange?fid=${state.fid}`,
      input: { text: 'Enter amount to exchange' },
      buttons: [
        { title: 'Exchange', action: 'post', target: '/api/frame/action?action=process_exchange' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=freebies' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleCreateGroup(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/create-group?fid=${state.fid}`,
      input: { text: 'Enter group name' },
      buttons: [
        { title: 'Create', action: 'post', target: '/api/frame/action?action=process_create_group' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=thrift' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleJoinGroup(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/join-group?fid=${state.fid}`,
      input: { text: 'Enter group code' },
      buttons: [
        { title: 'Join', action: 'post', target: '/api/frame/action?action=process_join_group' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=thrift' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleDeposit(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/deposit?fid=${state.fid}`,
      input: { text: 'Enter amount to deposit' },
      buttons: [
        { title: 'Deposit', action: 'post', target: '/api/frame/action?action=process_deposit' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=savings' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleWithdraw(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/withdraw?fid=${state.fid}`,
      input: { text: 'Enter amount to withdraw' },
      buttons: [
        { title: 'Withdraw', action: 'post', target: '/api/frame/action?action=process_withdraw' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=savings' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handlePayBill(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/pay-bill?fid=${state.fid}`,
      input: { text: 'Enter bill amount' },
      buttons: [
        { title: 'Pay Bill', action: 'post', target: '/api/frame/action?action=process_pay_bill' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=utilities' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleBuyAirtime(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/buy-airtime?fid=${state.fid}`,
      input: { text: 'Enter phone number' },
      buttons: [
        { title: 'Buy Airtime', action: 'post', target: '/api/frame/action?action=process_buy_airtime' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=utilities' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }

  private async handleBuyData(context: FrameActionContext): Promise<Response> {
    const { state } = context;
    
    const metadata: FrameMetadata = {
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/api/og/buy-data?fid=${state.fid}`,
      input: { text: 'Enter phone number' },
      buttons: [
        { title: 'Buy Data', action: 'post', target: '/api/frame/action?action=process_buy_data' },
        { title: 'Back', action: 'post', target: '/api/frame/action?action=utilities' }
      ],
      state: { sessionId: state.sessionId }
    };

    return createSuccessResponse(metadata);
  }
}

export const frameActionHandlers = FrameActionHandlers.getInstance();

