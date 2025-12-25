"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { UsersIcon, CalendarIcon, BellIcon, PlusIcon, SparklesIcon, ArrowRightIcon, ShieldIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThriftProvider } from '@/context/thrift/ThriftContext';
import { CreateCampaignDialog } from '@/components/thrift/CreateCampaignDialog';
import { CampaignList } from '@/components/thrift/CampaignList';
import { UserCampaigns } from '@/components/thrift/UserCampaigns';
import { cn } from '@/lib/utils';
import { useMiniAppDimensions } from '@/hooks/useMiniAppDimensions';

// Quick action component for thrift features
const ThriftQuickAction = ({
  icon,
  title,
  description,
  href,
  variant = "default"
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  variant?: "default" | "outline";
}) => {
  const router = useRouter();
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:scale-[1.02] border-gray-100 dark:border-gray-700",
        variant === "outline" ? "bg-white/50 dark:bg-gray-800/50 backdrop-blur-md" : "bg-primary/5"
      )}
      onClick={() => router.push(href)}
    >
      <CardContent className="p-6 flex flex-col items-center gap-2">
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
  const dimensions = useMiniAppDimensions();

  return (
    <ThriftProvider>
      <div
        className={`${dimensions.containerClass} mx-auto px-2 py-2 overflow-auto`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: dimensions.maxWidth,
        }}
      >
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



        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="my-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ThriftQuickAction
              icon={<UsersIcon className="h-6 w-6 text-primary" />}
              title="Create Thrift Group"
              description="Start a new savings group"
              href="#"
              variant="outline"
            />
            <ThriftQuickAction
              icon={<CalendarIcon className="h-6 w-6 text-primary" />}
              title="Join Group"
              description="Find and join existing groups"
              href="#"
              variant="outline"
            />
            <ThriftQuickAction
              icon={<BellIcon className="h-6 w-6 text-primary" />}
              title="Manage Groups"
              description="View your active groups"
              href="#"
              variant="outline"
            />
          </div>
        </motion.div>

        {/* Tabbed Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <Tabs defaultValue="my-groups" className="w-full">
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
    </ThriftProvider>
  );
};

export default Thrift;