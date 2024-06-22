import React, { useState, useCallback, useEffect } from 'react';
import router, { useRouter } from 'next/router';
import Image from "next/image";
import TransactionList from '../components/TransactionList';
import Balance from '@/components/Balance';
import Showcase from '@/components/Showcase';
import Hero from '@/components/Hero';
import Links from '@/components/Links';

export interface Campaign {
  [x: string]: any;
  name: string;
  description: string;
  contributionAmount: number;
  payoutInterval: number;
  lastPayoutBlock: number;
  totalContributions: number;
  userName: [string];
  id: number;
}

const Esusu: React.FC = () => {

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8 ">
      <Balance />
      <Hero />
      <Showcase />
      <Links />
      <TransactionList />
    </div>
  );
};

export default Esusu;
