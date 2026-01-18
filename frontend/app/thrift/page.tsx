"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UsersIcon, CalendarIcon, BellIcon, PlusIcon, SparklesIcon, ArrowRightIcon, ShieldIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThriftProvider, useThrift } from '@/context/thrift/ThriftContext';
import { CreateCampaignDialog } from '@/components/thrift/CreateCampaignDialog';
import { CampaignList } from '@/components/thrift/CampaignList';
import { UserCampaigns } from '@/components/thrift/UserCampaigns';
import { useActiveAccount } from 'thirdweb/react';
import { cn } from '@/lib/utils';

// Component that watches for account changes and refreshes thrift groups
// Component disabled - using context's built-in listeners instead
// This was causing duplicate refreshes and flickering
const ThriftWithAccountWatch: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Just render children - context handles everything
  return <>{children}</>;
};

// Quick action component for thrift features
const ThriftQuickAction = ({
  icon,
  title,
  description,
  href,
  variant = "default",
  ...props
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "outline";
  onClick?: () => void;
} & React.ComponentProps<typeof Card>) => {
  const router = useRouter();

  const handleClick = () => {
    if (href !== "#" && href) {
      router.push(href);
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-[1.02] border-gray-100 dark:border-gray-700",
        variant === "outline" ? "bg-white/50 dark:bg-gray-800/50 backdrop-blur-md" : "bg-primary/5"
      )}
      onClick={props.onClick || handleClick}
      {...props}
    >
      <CardContent className="p-6 flex flex-row items-center gap-4">
        <div className={cn(
          "rounded-full p-3 flex items-center justify-center",
          variant === "outline" ? "bg-primary/10" : "bg-white dark:bg-gray-800"
        )}>
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-base">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        <div className="ml-auto">
          <ArrowRightIcon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
};

const Thrift: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState("my-groups");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const scrollToTabs = () => {
    if (tabsRef.current) {
      tabsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <ThriftProvider>
      <ThriftWithAccountWatch>
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <ShieldIcon className="mr-3 h-8 w-8 text-primary" />
              Groups Savings
            </h1>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
              Join or create savings groups with friends and family. Pool your resources together and take turns receiving the collected funds.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <CreateCampaignDialog />

            <Button
              variant="outline"
              onClick={() => router.push('/miniSafe')}
              className="rounded-lg bg-black text-white hover:bg-primary/90 transition duration-200 dark:bg-white dark:text-black dark:hover:bg-primary/90"
            >
              Try Simple Savings
            </Button>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="my-6"
          >
            <div className="flex items-center mb-4">
              <SparklesIcon className="h-5 w-5 text-primary mr-2" />
              <h2 className="text-xl font-semibold dark:text-white/70">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 dark:text-white">
              <ThriftQuickAction
                icon={<UsersIcon className="h-6 w-6 text-primary" />}
                title="Create Thrift Group"
                description="Start a new savings group"
                href="#"
                variant="outline"
                onClick={() => setCreateDialogOpen(true)}
              />
              <ThriftQuickAction
                icon={<CalendarIcon className="h-6 w-6 text-primary" />}
                title="Join Group"
                description="Find and join existing groups"
                href="#"
                variant="outline"
                onClick={() => {
                  setActiveTab("available-groups");
                  scrollToTabs();
                }}
              />
              <ThriftQuickAction
                icon={<BellIcon className="h-6 w-6 text-primary" />}
                title="Manage Groups"
                description="View your active groups"
                href="#"
                variant="outline"
                onClick={() => {
                  setActiveTab("my-groups");
                  scrollToTabs();
                }}
              />
            </div>
            <CreateCampaignDialog isOpen={createDialogOpen} onOpenChange={setCreateDialogOpen} />
          </motion.div>

          {/* Tabbed Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <div ref={tabsRef}>
              <Tabs defaultValue="my-groups" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="my-groups">My Groups</TabsTrigger>
                  <TabsTrigger value="available-groups">Available Groups</TabsTrigger>
                </TabsList>
                <TabsContent value="my-groups" className="mt-4">
                  <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
                    <CardContent className="pt-6">
                      <UserCampaigns />
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="available-groups" className="mt-4">
                  <Card className="border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md">
                    <CardContent className="pt-6">
                      <CampaignList />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>

          {/* How It Works Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10"
          >
            <Card className="bg-gradient-to-r from-primary/20 to-purple-500/20 backdrop-blur-md border-none overflow-hidden">
              <CardContent className="p-6 sm:p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold mb-2">How Thrift Groups Work</h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                    Save money together with friends and family through our blockchain-powered thrift system
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <UsersIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-medium text-lg mb-2">Create & Join</h4>
                    <p className="text-gray-600 dark:text-gray-400">Start a group or join existing ones with friends and family</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-medium text-lg mb-2">Regular Contributions</h4>
                    <p className="text-gray-600 dark:text-gray-400">Make consistent payments into your group pool on schedule</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <BellIcon className="h-8 w-8 text-primary" />
                    </div>
                    <h4 className="font-medium text-lg mb-2">Take Turns</h4>
                    <p className="text-gray-600 dark:text-gray-400">Each member receives the full pool amount in rotation</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-white/20 flex justify-center">
                <div className="flex items-center text-white/80 text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>Powered by Celo blockchain</span>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </ThriftWithAccountWatch>
    </ThriftProvider>
  );
};

export default Thrift;