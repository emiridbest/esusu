import React from "react";
import { 
  Dialog, 
  DialogContent,
  DialogOverlay,
  DialogPortal
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface SigningModalProps {
  open: boolean;
  onClose: () => void;
}

export const SigningModal: React.FC<SigningModalProps> = ({
  open,
  onClose,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="bg-black/50 animate-in fade-in" />
        <DialogContent className="animate-in fade-in-90 slide-in-from-bottom-10 sm:zoom-in-90 sm:slide-in-from-bottom-0">
          <div className="flex flex-col items-center p-6 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-800 text-center">
              Please sign the transaction in your wallet to continue.
            </p>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};