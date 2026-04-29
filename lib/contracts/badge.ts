import { useReadContract, useWriteContract } from 'wagmi'
import { BADGE_ABI, CONTRACT_ADDRESSES } from './abis'

const badgeAddress = CONTRACT_ADDRESSES.badge

export function useHasBadge(agentEns: string | undefined, badgeType: number | undefined) {
  return useReadContract({
    address: badgeAddress,
    abi: BADGE_ABI,
    functionName: 'hasBadge',
    args: agentEns !== undefined && badgeType !== undefined ? [agentEns, badgeType] : undefined,
    query: { enabled: agentEns !== undefined && badgeType !== undefined },
  })
}

export function useGetBadge(tokenId: bigint | undefined) {
  return useReadContract({
    address: badgeAddress,
    abi: BADGE_ABI,
    functionName: 'getBadge',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  })
}

export function useBadgeBalanceOf(owner: `0x${string}` | undefined) {
  return useReadContract({
    address: badgeAddress,
    abi: BADGE_ABI,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  })
}

export const BADGE_TYPES = {
  VERIFIED: 0,
  VETERAN: 1,
  EXCELLENCE: 2,
  POLYGLOT: 3,
  SPECIALIST: 4,
} as const

export function useMintBadge() {
  return useWriteContract()
}
