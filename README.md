# Softfund — Mainnet (Payment + Verification)

This repository accepts a fixed price of $2.672 USD, converts to SOL (via CoinGecko),
prepares a Solana transfer transaction for the buyer to sign, broadcasts the signed
transaction, and verifies on-chain that the treasury received the expected lamports
before marking payment complete.

**Treasury (hardcoded)**: 6v4DR5rkDFa3WdCQ35wvtfVYfk7i233Uiu6GmQ7JCdRu

## Deploy (Vercel)
1. Create a GitHub repo and push the project or upload the ZIP contents.
2. Import the repo into Vercel (https://vercel.com/new).
3. Deploy. The project uses Mainnet RPC by default.
4. Test using Phantom (real SOL will be used).

## Files of interest
- pages/index.tsx — frontend flow (prepare -> sign -> submit -> verify)
- pages/api/price.ts — fetch SOL/USD price
- pages/api/mint.ts — prepares unsigned transaction and expectedLamports
- pages/api/submit.ts — accepts signed tx, broadcasts, returns txid + expectedLamports
- pages/api/verify.ts — confirms on-chain that treasury received expected lamports

## Warning
This project handles real funds on Mainnet. Review and audit before production use.
