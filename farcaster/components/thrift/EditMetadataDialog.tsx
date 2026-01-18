"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BrowserProvider } from "ethers";

export type EditMetadataDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractAddress: string;
  groupId: number;
  initialName: string;
  initialDescription?: string;
  initialCoverImageUrl?: string;
  initialCategory?: string;
  initialTags?: string[];
  onSaved?: (data: { name: string; description?: string; coverImageUrl?: string; category?: string; tags?: string[] }) => void;
};

export default function EditMetadataDialog(props: EditMetadataDialogProps) {
  const { open, onOpenChange, contractAddress, groupId, initialName, initialDescription, initialCoverImageUrl, initialCategory, initialTags, onSaved } = props;
  const { toast } = useToast();

  const [name, setName] = useState(initialName || "");
  const [description, setDescription] = useState(initialDescription || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl || "");
  const [category, setCategory] = useState(initialCategory || "");
  const [tags, setTags] = useState<string>(Array.isArray(initialTags) ? initialTags.join(", ") : "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName || "");
      setDescription(initialDescription || "");
      setCoverImageUrl(initialCoverImageUrl || "");
      setCategory(initialCategory || "");
      setTags(Array.isArray(initialTags) ? initialTags.join(", ") : "");
    }
  }, [open, initialName, initialDescription, initialCoverImageUrl, initialCategory, initialTags]);

  const disabled = useMemo(() => !name || saving, [name, saving]);

  const handleSave = async () => {
    if (!name) return;
    try {
      setSaving(true);
      if (typeof window === "undefined" || !(window as any).ethereum) {
        throw new Error("Wallet provider not available");
      }

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const signerAddress = (await signer.getAddress()).toLowerCase();

      // 1) Try to use existing SIWE session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json().catch(() => ({}));
      if (!session?.authenticated || session?.address !== signerAddress) {
        // 2) Acquire SIWE session
        const origin = window.location.origin;
        const chainId = (await provider.getNetwork()).chainId.toString();
        const msgRes = await fetch(`/api/auth/siwe/message?address=${signerAddress}&chainId=${chainId}&domain=${encodeURIComponent(window.location.host)}&uri=${encodeURIComponent(origin)}`);
        const msgData = await msgRes.json();
        if (!msgRes.ok) {
          throw new Error(msgData?.error || 'Failed to get SIWE message');
        }
        const siweSignature = await signer.signMessage(msgData.message);
        const verifyRes = await fetch('/api/auth/siwe/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: signerAddress, message: msgData.message, signature: siweSignature })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData?.error || 'SIWE verification failed');
        }
      }

      // 3) Now call metadata API without per-request signature (session will be used)
      const res = await fetch("/api/thrift/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractAddress,
          groupId,
          name,
          description,
          coverImageUrl: coverImageUrl || undefined,
          category: category || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined
        }),
      });

      const resText = await res.text();
      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        console.error("Failed to parse metadata save response:", resText);
        throw new Error(`Server Error: ${resText.substring(0, 100)}...`);
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save metadata");
      }

      toast({ title: "Saved", description: "Group details updated" });
      onSaved?.({ name, description, coverImageUrl: coverImageUrl || undefined, category: category || undefined, tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined });
      onOpenChange(false);
    } catch (e: any) {
      console.error("Failed to save thrift metadata:", e);
      toast({ variant: "destructive", title: "Save failed", description: e?.message || String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Group Details</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right mt-2">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={5} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="coverImageUrl" className="text-right">Cover Image URL</Label>
            <Input id="coverImageUrl" value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} className="col-span-3" placeholder="https://..." />
          </div>
          {coverImageUrl ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <div />
              <img src={coverImageUrl} alt="Cover" className="col-span-3 rounded-md max-h-40 object-cover border" onError={() => { /* ignore preview errors */ }} />
            </div>
          ) : null}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3" placeholder="Savings, Friends, Work, ..." />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">Tags</Label>
            <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} className="col-span-3" placeholder="comma,separated,tags" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="bg-primary/20 border-primary/60 text-primary font-semibold hover:bg-primary/30 hover:border-primary/80 transition-all duration-300">Cancel</Button>
          <Button onClick={handleSave} disabled={disabled}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
