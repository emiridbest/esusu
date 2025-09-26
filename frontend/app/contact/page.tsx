"use client";
import { Headphones } from "lucide-react";
import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";

export default function ContactPage() {
  const telegramLink = "https://t.me/+kYeSswiKgB9lMjZk";
  
  return (
        <div className="container py-8 bg-gradient-to-br min-h-screen">
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader 
              onClick={() => window.open(telegramLink, "_blank")}  
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black rounded-t-lg cursor-pointer hover:from-yellow-300 hover:to-yellow-400 transition-all duration-300"
            >
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Headphones className="w-10 h-10 text-black" />
                Contact us on Telegram
              </CardTitle>
              <CardDescription className="flex items-center text-black/90 dark:text-black/90">
                🕐 Response within 5 minutes
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}