import Merchant from "@/pages/pay";
import * as Dialog from "@radix-ui/react-dialog";
import React, { useState } from "react";

interface MerchantModalProps {
  onAddMerchant: (name: string, description: string, address: string) => Promise<void>;
  onModifyMerchant: (newName: string, newDescription: string, newAddress: string) => Promise<void>;
  onClose: () => void;
  merchant: Merchant;
}




const MerchantModal: React.FC<MerchantModalProps> = ({
  onAddMerchant,
  onModifyMerchant,
  onClose,
  merchant,
}) => {
  const [name, setName] = useState(merchant?.name || "");
  const [description, setDescription] = useState(merchant?.description || "");
  const [address, setAddress] = useState(merchant[3]);

  const handleSave = () => {
    if (merchant) {
      onModifyMerchant(name, description, address);
    } else {
      onAddMerchant(name, description, address);
    }
    onClose();
  };

  return (
    <Dialog.Root open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Overlay className="fixed inset-0 bg-black opacity-40" />

      <Dialog.Content
        className="fixed top-0 left-1/2 transform -translate-x-1/2
  bg-white rounded-md shadow-lg p-6 max-w-sm mx-auto"
        draggable
      >        <div className="bg-white rounded-md shadow-lg px-4 py-6">
          <div className="flex items-center justify-end">
            <Dialog.Close className="p-2 text-gray-400 rounded-md hover:bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 mx-auto"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Dialog.Close>
          </div>
          <div className="max-w-sm mx-auto space-y-3 text-center">
            <Dialog.Title className="text-lg font-medium text-gray-800 ">
              {merchant ? "Edit Merchant" : "Add New Merchant"}
            </Dialog.Title>


            <Dialog.Description className=" text-sm text-gray-600">
              <p>
                Here, you can add or modify your product info to receive fast payments via stable coins
              </p>
            </Dialog.Description>

            <fieldset className="Fieldset relative">
              <input
                className="w-full pl-12 pr-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                placeholder="Enter your Product Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full pl-12 pr-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                placeholder="Enter your Product Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                className="w-full pl-12 pr-3 py-2 text-gray-500 bg-transparent outline-none border focus:border-indigo-600 shadow-sm rounded-lg"
                placeholder={address ? address : "Add Wallet Address Here"}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </fieldset>
            <Dialog.Close asChild>
              <button
                onClick={handleSave}
                className="w-full mt-3 py-3 px-4 bg-black font-medium text-sm text-center text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg ring-offset-2 ring-indigo-600 focus:ring-2"
              >
                {merchant ? "Save Changes" : "Add Merchant"}
              </button>
            </Dialog.Close>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default MerchantModal;