import { useReadContract, useWriteContract } from 'wagmi'
import { INFT_ABI, CONTRACT_ADDRESSES } from './abis'

const inftAddress = CONTRACT_ADDRESSES.inft

export function useGetAgent(tokenId: bigint | undefined) {
  return useReadContract({
    address: inftAddress,
    abi: INFT_ABI,
    functionName: 'getAgent',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  })
}

export function useBackendAuthority() {
  return useReadContract({
    address: inftAddress,
    abi: INFT_ABI,
    functionName: 'backendAuthority',
  })
}

export function useOwnerOf(tokenId: bigint | undefined) {
  return useReadContract({
    address: inftAddress,
    abi: INFT_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  })
}

export function useTokenURI(tokenId: bigint | undefined) {
  return useReadContract({
    address: inftAddress,
    abi: INFT_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  })
}

export function useMintAgent() {
  return useWriteContract()
}
