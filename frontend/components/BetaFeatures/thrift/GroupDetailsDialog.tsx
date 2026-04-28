"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ThriftGroup, ThriftMember } from '@/context/thrift/ThriftContext';
import { Button } from '@/components/ui/button';

interface GroupDetailsDialogProps {
    group: ThriftGroup | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    members: ThriftMember[];
    currentUserAddress: string | null;
}

export function GroupDetailsDialog({ group, open, onOpenChange, members, currentUserAddress }: GroupDetailsDialogProps) {
    if (!group) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        {group.name}
                        <Badge variant="outline" className="ml-2 font-normal">
                            {group.tokenSymbol || 'cUSD'}
                        </Badge>
                    </DialogTitle>
                    <p className="text-muted-foreground">{group.description}</p>
                </DialogHeader>

                <div className="flex-1 overflow-hidden mt-4">
                    <Tabs defaultValue="overview" className="h-full flex flex-col">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
                            <TabsTrigger value="contributions">My Contributions</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="flex-1 overflow-y-auto py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                        <h3 className="font-semibold mb-2">Financials</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Deposit Amount</span>
                                                <span className="font-medium">{parseFloat(group.depositAmount)} {group.tokenSymbol}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Pool Total</span>
                                                <span className="font-medium font-mono">{(parseFloat(group.depositAmount) * group.totalMembers).toFixed(2)} {group.tokenSymbol}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-muted/30 p-4 rounded-lg border">
                                        <h3 className="font-semibold mb-2">Cycle Status</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Current Round</span>
                                                <span className="font-medium">{group.currentRound}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Status</span>
                                                <Badge variant={group.isActive ? "default" : "secondary"}>
                                                    {group.isActive ? "Active" : "Formation"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col">
                            <div className="rounded-md border overflow-y-auto flex-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Member</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map((member, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">
                                                    {member.userName || `Member ${idx + 1}`}
                                                    {member.address.toLowerCase() === currentUserAddress?.toLowerCase() && (
                                                        <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {member.address}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    -
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {members.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                    No members loaded via chain data yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="contributions" className="flex-1 overflow-y-auto py-4">
                            <div className="bg-card border rounded-lg p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-medium">Your Contribution Status</h3>
                                        <p className="text-sm text-muted-foreground">Track your payments and upcoming obligations</p>
                                    </div>
                                    {group.isActive && (
                                        <Button>Make Contribution</Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="border rounded-lg p-4">
                                        <div className="text-sm text-muted-foreground mb-1">Total Contributed</div>
                                        <div className="text-2xl font-bold">
                                            {group.userContribution ? parseFloat(group.userContribution) : 0} <span className="text-sm font-normal text-muted-foreground">{group.tokenSymbol}</span>
                                        </div>
                                    </div>
                                    <div className="border rounded-lg p-4">
                                        <div className="text-sm text-muted-foreground mb-1">Last Payment</div>
                                        <div className="text-lg font-medium">
                                            {group.userLastPayment ? group.userLastPayment.toLocaleDateString() : 'None'}
                                        </div>
                                    </div>
                                    <div className="border rounded-lg p-4">
                                        <div className="text-sm text-muted-foreground mb-1">Next Due</div>
                                        <div className="text-lg font-medium text-amber-600">
                                            {group.userNextPayment
                                                ? group.userNextPayment.toLocaleDateString()
                                                : group.isActive
                                                    ? (group.currentRound === 0 ? "Round 1" : `Round ${group.currentRound + 1}`)
                                                    : "Upon Activation"
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
