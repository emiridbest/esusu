"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UsersIcon, CalendarIcon, BellIcon, SparklesIcon, ShieldIcon, InfoIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ThriftProvider } from '@/context/thrift/ThriftContext';
import { CreateCampaignDialog } from '@/components/thrift/CreateCampaignDialog';
import { CampaignList } from '@/components/thrift/CampaignList';
import { UserCampaigns } from '@/components/thrift/UserCampaigns';
import { cn } from '@/lib/utils';

const ThriftQuickAction = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) => (
  <Card
    className="cursor-pointer transition-all duration-300 hover:scale-[1.02] border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-neutral-800 backdrop-blur-md"
    onClick={onClick}
  >
    <CardContent className="p-5 flex items-center gap-4">
      <div className="rounded-full p-3 bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </CardContent>
  </Card>
);

const HOW_IT_WORKS = `Group Savings (Thrift) is a rotating savings model where members contribute a fixed amount each cycle, and one member receives the full pooled amount per round — until everyone has had their turn.

1. Create or join a group with people you trust.
2. Each member contributes a set amount every cycle.
3. Members take turns receiving the pooled funds.
4. Early contributors earn interest via Aave V3 on Celo.

The group continues until every member has received their payout. All funds are managed transparently on-chain.`;

const Thrift: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState("my-groups");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const scrollToTabs = () => {
    tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <ThriftProvider>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-2"
        >
          <ShieldIcon className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Group Savings
          </h1>
          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-1 text-gray-400 hover:text-primary transition-colors">
                <InfoIcon className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {HOW_IT_WORKS}
            </PopoverContent>
          </Popover>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center mb-3">
            <SparklesIcon className="h-4 w-4 text-primary mr-2" />
            <h2 className="text-base font-semibold dark:text-white/70">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 dark:text-white">
            <ThriftQuickAction
              icon={<UsersIcon className="h-5 w-5 text-primary" />}
              title="Create Group"
              description="Start a new savings group"
              onClick={() => setCreateDialogOpen(true)}
            />
            <ThriftQuickAction
              icon={<CalendarIcon className="h-5 w-5 text-primary" />}
              title="Join Group"
              description="Browse available groups"
              onClick={() => { setActiveTab("available-groups"); scrollToTabs(); }}
            />
            <ThriftQuickAction
              icon={<BellIcon className="h-5 w-5 text-primary" />}
              title="Manage Groups"
              description="View your active groups"
              onClick={() => { setActiveTab("my-groups"); scrollToTabs(); }}
            />
          </div>
        </motion.div>

        <CreateCampaignDialog isOpen={createDialogOpen} onOpenChange={setCreateDialogOpen} hideTrigger />

        {/* Tabbed Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          ref={tabsRef}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-groups">My Groups</TabsTrigger>
              <TabsTrigger value="available-groups">Available Groups</TabsTrigger>
            </TabsList>
            <TabsContent value="my-groups" className="mt-4">
              <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-neutral-800 backdrop-blur-md p-4">
                <UserCampaigns />
              </Card>
            </TabsContent>
            <TabsContent value="available-groups" className="mt-4">
              <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-neutral-800 backdrop-blur-md">
                <CardContent className="pt-6">
                  <CampaignList />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </ThriftProvider>
  );
};

export default Thrift;