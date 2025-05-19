'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import ElectricityPayment from '../../components/utilityBills/ElectricityPayment';
import CablePayment from '../../components/utilityBills/CablePayment';
import DataBundlePurchase from '../../components/utilityBills/DataBundlePurchase';
import { UtilityProvider, useUtility } from '../../context/utilityProvider/UtilityContext';
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Label } from "../../components/ui/label";
import { Icons } from '../../components/ui/icons';
import CountrySelector from '../../components/CountrySelector';

// Main content component - separated to use the useUtility hook
function UtilityBillsContent() {
  const [selectedToken, setSelectedToken] = useState('CUSD');
  const { handleTokenChange, selectedCountry, countryData } = useUtility();
  
  // Update the token in context when it changes
  useEffect(() => {
    handleTokenChange(selectedToken);
  }, [selectedToken, handleTokenChange]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Utility Bill Payments</h1>
          <p className="text-muted-foreground mt-2">
            Pay for electricity, cable TV, and data with crypto
          </p>
        </div>

        {/* Country Selector */}
        <CountrySelector />
        
        {!selectedCountry && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
            <p className="font-medium">Please select your country</p>
            <p className="mt-1">This will determine which services are available and what currency is used for pricing.</p>
          </div>
        )}

        {selectedCountry && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>Select the crypto token to pay with</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedToken} 
                  onValueChange={setSelectedToken} 
                  className="flex flex-wrap gap-6"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent">
                    <RadioGroupItem value="CUSD" id="cusd" />
                    <Label htmlFor="cusd" className="flex items-center cursor-pointer">
                      <div className="w-8 h-8 mr-2 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 font-bold text-xs">cUSD</span>
                      </div>
                      <div>
                        <p className="font-medium">Celo Dollar (cUSD)</p>
                        <p className="text-xs text-muted-foreground">Stablecoin pegged to USD</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent">
                    <RadioGroupItem value="USDC" id="usdc" />
                    <Label htmlFor="usdc" className="flex items-center cursor-pointer">
                      <div className="w-8 h-8 mr-2 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">USDC</span>
                      </div>
                      <div>
                        <p className="font-medium">USD Coin (USDC)</p>
                        <p className="text-xs text-muted-foreground">Stablecoin by Circle</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent">
                    <RadioGroupItem value="USDT" id="usdt" />
                    <Label htmlFor="usdt" className="flex items-center cursor-pointer">
                      <div className="w-8 h-8 mr-2 rounded-full bg-teal-100 flex items-center justify-center">
                        <span className="text-teal-600 font-bold text-xs">USDT</span>
                      </div>
                      <div>
                        <p className="font-medium">Tether (USDT)</p>
                        <p className="text-xs text-muted-foreground">Stablecoin by Tether</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Tabs defaultValue="electricity" className="w-full">
              <TabsList className="grid grid-cols-3 mb-8">
                <TabsTrigger 
                  value="electricity" 
                  className="flex items-center"
                  disabled={countryData && !countryData.servicesAvailable.electricity}
                >
                  <Icons.lightning className="w-4 h-4 mr-2" />
                  Electricity
                </TabsTrigger>
                <TabsTrigger 
                  value="cable" 
                  className="flex items-center"
                  disabled={countryData && !countryData.servicesAvailable.cable}
                >
                  <Icons.tv className="w-4 h-4 mr-2" />
                  Cable TV
                </TabsTrigger>
                <TabsTrigger 
                  value="data" 
                  className="flex items-center"
                  disabled={countryData && !countryData.servicesAvailable.data}
                >
                  <Icons.wifi className="w-4 h-4 mr-2" />
                  Data
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="electricity">
                <ElectricityPayment />
              </TabsContent>
              
              <TabsContent value="cable">
                <CablePayment />
              </TabsContent>
              
              <TabsContent value="data">
                <DataBundlePurchase />
              </TabsContent>
            </Tabs>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
              <p className="font-medium">Payment information</p>
              <p className="mt-1">All payments are processed on the Celo blockchain and sent to a secure wallet address. Payments are irreversible - please verify all details before confirming payment.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function UtilityBillsPage() {
  return (
    <UtilityProvider>
      <UtilityBillsContent />
    </UtilityProvider>
  );
}

