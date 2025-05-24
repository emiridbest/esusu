"use client";

import { Button } from "../../components/ui/button";
import { ExternalLink } from "lucide-react";
import React from "react";



export default function ContactPage() {
  const telegramLink = "https://web.telegram.org/k/#-4669232349"; 
  
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-semibold mb-6 text-black/90 dark:text-white/80">Contact Us</h1>
        <p className="text-gray-600 mb-8">
          Need help? Join our Telegram group for quick customer support.
        </p>
        
        <Button 
          onClick={() => window.open(telegramLink, "_blank")}
          size="lg"
          className="bg-black/90 hover:bg-gray/90 flex items-center gap-2 "
        >
          <ExternalLink size={18} />
          Join Our Telegram Support Group
        </Button>
        
        <p className="mt-6 text-sm text-gray-500">
          Our team is available to assist you with any questions or concerns.
        </p>
      </div>
    </div>
  );
}