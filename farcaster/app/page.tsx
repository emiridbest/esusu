"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  PhoneIcon,
  Smartphone,
  Zap,
  Gift,
  PiggyBank,
  User
} from 'lucide-react';
import {
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { UtilityProvider } from '../context/utilityProvider/UtilityContext';
import { ToastContainer } from 'react-toastify';
import { cn } from '../lib/utils';
import TransactionList from '@/components/TransactionList';

function Dashboard() {
  const router = useRouter();

  const features = [
    {
      title: "Save",
      description: "Save money in your MiniSafe",
      icon: PiggyBank,
      path: "/miniSafe",
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
    },
    {
      title: "Thrift",
      description: "Join thrift groups and save together",
      icon: UserGroupIcon,
      path: "/thrift",
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
    },
    {
      title: "Utility Bills",
      description: "Pay for data, airtime, and electricity",
      icon: Smartphone,
      path: "/utilityBills",
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
    },
    {
      title: "Freebies",
      description: "Earn rewards and claim freebies",
      icon: Gift,
      path: "/freebies",
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
    },
    {
      title: "AI Chat",
      description: "Ask AI for gas fees",
      icon: User,
      path: "/profile",
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-900/20"
    }
  ];

  return (
    <div className="container mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome to Esusu</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your finances and payments in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-none bg-white/50 backdrop-blur-sm dark:bg-neutral-800"
              onClick={() => router.push(feature.path)}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <Icon className={cn("w-6 h-6", feature.color)} />
                <div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Transaction History */}
      <div className="my-8">
        <TransactionList />
      </div>
    </div>
  );
}

const App: React.FC = () => {
  return (
    <UtilityProvider>
      <Dashboard />
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} closeOnClick pauseOnHover draggable />
    </UtilityProvider>
  );
}

export default App;
