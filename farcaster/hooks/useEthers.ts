import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { useMemo } from 'react'
import type { Account, Chain, Client, Transport } from 'viem'
import { type Config, useConnectorClient, useAccount } from 'wagmi'
import { config } from '../components/providers/WagmiProvider'

export function clientToSigner(client: Client<Transport, Chain, Account>) {
  const { transport } = client
  const { address } = useAccount()
 const network = {
    chainId: config.chains[0].id,
    name: config.chains[0].name,
    ensAddress: config.chains[0].contracts?.ensRegistry?.address,
  }
  const provider = new BrowserProvider(transport, network)
  const signer = new JsonRpcSigner(provider, address)
  return signer
}

/** Hook to convert a viem Wallet Client to an ethers.js Signer. */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient<Config>({ chainId })
  return useMemo(() => (client ? clientToSigner(client) : undefined), [client])
}


