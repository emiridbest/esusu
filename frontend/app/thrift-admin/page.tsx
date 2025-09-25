"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { MiniSafeAave, contractAddress } from '../../utils/abi';
import { useThrift } from '../../context/thrift/ThriftContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, DollarSign, Settings, AlertTriangle, Play, Pause, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ThriftGroupAdmin {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  totalMembers: number;
  maxMembers: number;
  currentRound: number;
  contributionAmount: string;
  tokenSymbol: string;
  creator: string;
  members: string[];
  payoutOrder: string[];
  nextPayoutDate?: Date;
  totalContributions: string;
}

const ThriftAdminPage: React.FC = () => {
  const router = useRouter();
  const { allGroups, refreshGroups } = useThrift();
  const [userAddress, setUserAddress] = useState<string>('');
  const [userGroups, setUserGroups] = useState<ThriftGroupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<any>(null);
  const [contract, setContract] = useState<MiniSafeAave | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ThriftGroupAdmin | null>(null);
  const [payoutOrder, setPayoutOrder] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (contract && userAddress && allGroups.length > 0) {
      checkUserThriftGroups(contract, userAddress);
    }
  }, [allGroups, contract, userAddress]);

  const checkAdminStatus = async () => {
    setLoading(true);
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const signerObj = await provider.getSigner();
      setSigner(signerObj);
      const address = await signerObj.getAddress();
      setUserAddress(address);
      
      // Initialize contract
      const contractInstance = new MiniSafeAave(contractAddress, signerObj);
      setContract(contractInstance);
      
      // Check which groups the user is admin of
      await checkUserThriftGroups(contractInstance, address);
      
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const checkUserThriftGroups = async (contractInstance: MiniSafeAave, address: string) => {
    try {
      const userGroupsList: ThriftGroupAdmin[] = [];
      
      // Check each group to see if user is admin
      for (const group of allGroups) {
        try {
          const groupInfo = await contractInstance.getThriftGroup(group.id);
          if (groupInfo && groupInfo.admin && groupInfo.admin.toLowerCase() === address.toLowerCase()) {
            userGroupsList.push({
              id: group.id,
              name: group.name,
              description: group.description,
              isActive: group.isActive,
              totalMembers: group.totalMembers,
              maxMembers: group.maxMembers,
              currentRound: group.currentRound,
              contributionAmount: group.depositAmount,
              tokenSymbol: group.tokenSymbol || 'cUSD',
              creator: groupInfo.admin,
              members: group.members?.map(m => typeof m === 'string' ? m : (m as any).address) || [],
              payoutOrder: [],
              nextPayoutDate: group.nextPaymentDate,
              totalContributions: '0' // Would need to calculate from contract
            });
          }
        } catch (err) {
          console.warn(`Failed to check admin status for group ${group.id}:`, err);
        }
      }
      
      setUserGroups(userGroupsList);
    } catch (err) {
      console.error('Error checking user thrift groups:', err);
      setError('Failed to load thrift groups');
    }
  };

  const handleAction = async (action: () => Promise<any>, successMessage: string) => {
    if (!contract) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const tx = await action();
      await tx.wait();
      toast.success(successMessage);
      await refreshGroups();
    } catch (err: any) {
      const errorMessage = err?.message || 'Transaction failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const activateGroup = async (groupId: number) => {
    await handleAction(
      () => contract!.activateThriftGroup(groupId),
      `Group ${groupId} activated successfully`
    );
  };

  const setGroupPayoutOrder = async (groupId: number) => {
    if (!payoutOrder.trim()) {
      toast.error('Please enter payout order');
      return;
    }
    
    const addresses = payoutOrder.split(',').map(addr => addr.trim());
    await handleAction(
      () => contract!.setPayoutOrder(groupId, addresses),
      `Payout order set for group ${groupId}`
    );
  };

  const distributeGroupPayout = async (groupId: number) => {
    await handleAction(
      () => contract!.distributePayout(groupId),
      `Payout distributed for group ${groupId}`
    );
  };

  const emergencyWithdrawGroup = async (groupId: number) => {
    if (!confirm('Are you sure you want to perform emergency withdrawal? This action cannot be undone.')) {
      return;
    }
    
    await handleAction(
      () => contract!.emergencyWithdraw(groupId),
      `Emergency withdrawal executed for group ${groupId}`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span className="text-lg">Loading your thrift groups...</span>
      </div>
    );
  }

  if (!userAddress) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please connect your wallet to view your thrift admin panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (userGroups.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Alert className="max-w-md mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You are not an admin of any thrift groups. Create a thrift group to access admin functions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Thrift Groups Admin</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your thrift groups, activate groups, set payout orders, and handle emergency situations.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Connected as: {userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 4)}
        </p>
      </div>

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="groups">All Groups</TabsTrigger>
          <TabsTrigger value="activate">Activate Groups</TabsTrigger>
          <TabsTrigger value="payouts">Manage Payouts</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Thrift Groups ({userGroups.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Round</TableHead>
                    <TableHead>Contribution</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono">{group.id}</TableCell>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>
                        <Badge variant={group.isActive ? "default" : "secondary"}>
                          {group.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{group.totalMembers}/{group.maxMembers}</TableCell>
                      <TableCell>{group.currentRound}</TableCell>
                      <TableCell>
                        {parseFloat(group.contributionAmount)} {group.tokenSymbol}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedGroup(group)}
                          >
                            Manage
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activate">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Activate Thrift Groups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userGroups.filter(g => !g.isActive).map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{group.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          ID: {group.id} | Members: {group.totalMembers}/{group.maxMembers}
                        </p>
                      </div>
                      <Button
                        onClick={() => activateGroup(group.id)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        Activate
                      </Button>
                    </div>
                  ))}
                  {userGroups.filter(g => !g.isActive).length === 0 && (
                    <p className="text-gray-500 text-center py-8">No inactive groups found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payouts">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Set Payout Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-select">Select Group</Label>
                    <select
                      id="group-select"
                      className="w-full p-2 border rounded-md"
                      onChange={(e) => {
                        const group = userGroups.find(g => g.id === parseInt(e.target.value));
                        setSelectedGroup(group as any);
                      }}
                    >
                      <option value="">Select a group</option>
                      {userGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} (ID: {group.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedGroup && (
                    <div>
                      <Label htmlFor="payout-order">Payout Order (comma-separated addresses)</Label>
                      <Input
                        id="payout-order"
                        placeholder="0x123..., 0x456..., 0x789..."
                        value={payoutOrder}
                        onChange={(e) => setPayoutOrder(e.target.value)}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Enter member addresses in the order they should receive payouts
                      </p>
                    </div>
                  )}
                  
                  {selectedGroup && (
                    <Button
                      onClick={() => setGroupPayoutOrder(selectedGroup.id)}
                      disabled={isProcessing || !payoutOrder.trim()}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Settings className="h-4 w-4 mr-2" />
                      )}
                      Set Payout Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Distribute Payouts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userGroups.filter(g => g.isActive).map((group) => (
                    <div key={group.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{group.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Round: {group.currentRound} | Members: {group.totalMembers}
                        </p>
                      </div>
                      <Button
                        onClick={() => distributeGroupPayout(group.id)}
                        disabled={isProcessing}
                        variant="outline"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <DollarSign className="h-4 w-4" />
                        )}
                        Distribute
                      </Button>
                    </div>
                  ))}
                  {userGroups.filter(g => g.isActive).length === 0 && (
                    <p className="text-gray-500 text-center py-8">No active groups found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Emergency Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Emergency actions should only be used in critical situations. 
                  These actions may have irreversible consequences.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {userGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ID: {group.id} | Status: {group.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <Button
                      onClick={() => emergencyWithdrawGroup(group.id)}
                      disabled={isProcessing}
                      variant="destructive"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Emergency Withdraw
                    </Button>
                  </div>
                ))}
                {userGroups.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No groups found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ThriftAdminPage;
