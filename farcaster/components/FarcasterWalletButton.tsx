"use client";

import { Button } from "../components/ui/button";
import { useFarcaster } from "./FarcasterProvider";
import { useState } from "react";

interface FarcasterWalletButtonProps {
  onConnect: (provider: any, accounts: string[]) => void;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export default function FarcasterWalletButton({ 
  onConnect, 
  className = "", 
  variant = "default" 
}: FarcasterWalletButtonProps) {
  const { isInMiniApp, ethereum } = useFarcaster();
  const [isConnecting, setIsConnecting] = useState(false);
  
  const connectWallet = async () => {
    if (!isInMiniApp || !ethereum) return;
    
    try {
      setIsConnecting(true);
      
      // Request accounts
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      
      // Call the onConnect callback with the provider and accounts
      onConnect(ethereum, accounts);
    } catch (error) {
      console.error("Failed to connect Farcaster wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Only show this button in a Farcaster Mini App context with ethereum available
  if (!isInMiniApp || !ethereum) return null;
  
  return (
    <Button 
      onClick={connectWallet} 
      className={className}
      variant={variant}
      disabled={isConnecting}
    >
      {isConnecting ? "Connecting..." : "Use Farcaster Wallet"}
    </Button>
  );
}
