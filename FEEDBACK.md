# Partner Feedback — ETHGlobal Open Agents 2026

## KeeperHub

### What we built
We integrated KeeperHub as the automated execution layer for all on-chain writes: `ParikshaINFT.recordHire()`, `ParikshaINFT.recordParikshaRun()`, and `BadgeNFT.mintBadge()`. The integration lives in `lib/chain-executor.ts`.

### What worked
- The concept is exactly right for our use case: we don't want every API call to manage its own signer/nonce/retry logic
- The REST API shape we guessed (`POST /v1/execute` with Bearer token and `contractAddress`, `abi`, `functionName`, `args`, `network` fields) is clean and intuitive
- The fallback we built (direct ethers.js with 2 retries) made development unblocked while the integration was being figured out

### What didn't work / issues encountered
1. **Docs returned 403** — `docs.keeperhub.com` was inaccessible throughout the hackathon. We had to guess the API shape from the name/concept alone.
2. **No SDK** — there's no `@keeperhub/sdk` npm package. For a hackathon this forces builders to guess or skip.
3. **API key** — we set `KEEPERHUB_API_KEY` but couldn't verify the endpoint was accepting it since docs were down. All on-chain calls fell back to direct ethers.js.

### What would make it better
1. **Public docs** that don't 403 — even a single-page API reference would unblock builders
2. **npm SDK** — `npm install @keeperhub/sdk` + a 10-line example in the docs
3. **Test endpoint** — a sandbox URL or curl example in the README
4. **Webhook/receipt support** — our current integration polls for the tx hash; a webhook on confirmation would let us update the UI in real-time

### Suggestions for future hackathons
- Provide a working API key in the hackathon Slack/Discord so builders can test immediately
- A 5-minute "Hello World" tutorial video would drive significantly more integrations

---

## 0G

### What worked
- EVM compatibility made contract deployment seamless — standard Foundry workflow, no changes needed
- `https://evmrpc-testnet.0g.ai` was stable throughout the hackathon
- `chainscan-galileo.0g.ai` explorer works and shows our contract transactions

### What was tricky
- **Storage node URL** — `storage-testnet.0g.ai` is not prominently documented. We guessed it, implemented with a 10-second fetch timeout, and fell back to Supabase. Works in theory but couldn't verify actual file retrieval.
- **USDC on 0G Galileo** — we used Base Sepolia for x402 payments since that's where the official test USDC lives; 0G storage for training data, and 0G compute for contract execution. The split is clean but could confuse users.

### What would make it better
- A clear "Storage 101" page with working code examples for upload + retrieve
- Official test USDC on 0G Galileo to enable end-to-end payment flows on a single chain

---

## x402

### What worked
- The concept of HTTP 402 for crypto payments is elegant and maps cleanly onto our hire flow
- The `@coinbase/x402` package structure is sensible

### What was tricky
- Full client-side x402 flow (wallet → payment channel → retry) is complex to build correctly in a hackathon timeframe
- We simplified to: backend issues 402, frontend sends a separate USDC transfer, passes `txHash` to our API, backend verifies the Transfer event on Base Sepolia

### What would make it better
- A Next.js example that shows the full round-trip (React hook + server middleware) would let builders copy-paste a working pattern in an hour
