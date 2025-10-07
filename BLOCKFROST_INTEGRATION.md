# Blockfrost Payment Verification Integration

## Overview
This system integrates Blockfrost API to verify real Cardano blockchain transactions before allowing video generation.

## Setup

### Environment Variables
Add to your `.env.local`:
```
BLOCKFROST_MAINNET_PROJECTID=your_blockfrost_project_id_here
```

Get your project ID from: https://blockfrost.io/

### Dependencies
```bash
npm install @blockfrost/blockfrost-js
```

## How It Works

### 1. Price Calculation (`/api/calculate-price`)
- Fetches live ADA price from CoinGecko
- Calculates cost: 1 ADA base + $0.10 per second
- Returns total in both ADA and USD

### 2. User Makes Payment
- User connects Cardano wallet (Nami, Eternl, Flint, etc.)
- PaymentModal shows price breakdown
- User approves transaction in wallet
- Transaction is submitted to blockchain

### 3. Payment Processing (`/api/process-payment`)
- Stores payment details with:
  - Transaction hash
  - Expected amount in lovelace
  - Video generation parameters
  - Timestamp

### 4. Blockchain Verification (`/api/check-payment`)
- Uses Blockfrost to query transaction on Cardano blockchain
- Verifies:
  - Transaction exists and is confirmed
  - Payment sent to correct receiving address
  - Amount matches expected (allows 1% variance for fees)
- Updates payment status when confirmed

### 5. Video Generation (`/api/generate`)
- Requires confirmed payment transaction hash
- Verifies payment before processing
- Generates video using OpenAI Sora API

## Key Files

### `/src/lib/blockfrost.ts`
Core Blockfrost integration with `verifyPayment()` function that:
- Queries transaction details
- Checks transaction outputs
- Verifies payment amount
- Returns confirmation status

### `/src/pages/api/check-payment.ts`
API endpoint that polls Blockfrost to check if transaction is confirmed on blockchain.

### `/src/components/PaymentModal.tsx`
React component that:
- Shows price in ADA/USD
- Handles wallet transaction
- Polls for payment confirmation
- Triggers video generation after confirmation

## Payment Flow

```
1. User fills video details
2. Clicks "Generate Video"
3. Payment modal opens with price
4. User clicks "Pay X ADA"
5. Wallet prompts for approval
6. Transaction submitted to blockchain
7. System polls Blockfrost every 10s
8. Once confirmed, video generation starts
```

## Receiving Address
```
addr1qxtne8wp4qdmc9trp7zaaj9fzvxwhpm7veykwu9cdkk7y9m7wsx98ff5dmlg7fufan2thc3uf9yz7mrq56frvhc0mmaqgyjsld
```

## Security Notes

- All amounts stored in lovelace (1 ADA = 1,000,000 lovelace)
- 1% variance allowed for transaction fees
- Payment records expire after 1 hour
- Blockchain verification prevents double-spending
- No video generation without confirmed payment

## Testing

### Testnet Testing
1. Change Blockfrost project ID to testnet
2. Update receiving address to testnet address
3. Use testnet ADA from faucet: https://docs.cardano.org/cardano-testnet/tools/faucet/

### Mainnet Testing
1. Use small amounts (4-12 second videos)
2. Monitor transactions on: https://cardanoscan.io/
3. Check Blockfrost dashboard for API usage

## Error Handling

The system handles:
- Transaction not found on blockchain
- Insufficient payment amount
- Wrong receiving address
- Network errors
- API rate limits
- Timeout after 5 minutes (30 attempts × 10s)

## Future Improvements

- Database storage instead of in-memory Map
- Webhook notifications from Blockfrost
- Multi-currency support
- Refund mechanism for failed generations
- Transaction history for users
- Admin dashboard for monitoring payments
