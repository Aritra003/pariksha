import { useReadContract, useWriteContract } from 'wagmi'
import { ATTESTATION_ABI, CONTRACT_ADDRESSES } from './abis'

const attestationAddress = CONTRACT_ADDRESSES.attestation

export function useGetAttestation(id: bigint | undefined) {
  return useReadContract({
    address: attestationAddress,
    abi: ATTESTATION_ABI,
    functionName: 'getAttestation',
    args: id !== undefined ? [id] : undefined,
    query: { enabled: id !== undefined },
  })
}

export function useAttestationCount() {
  return useReadContract({
    address: attestationAddress,
    abi: ATTESTATION_ABI,
    functionName: 'getAttestationCount',
  })
}

export function useAttest() {
  return useWriteContract()
}
