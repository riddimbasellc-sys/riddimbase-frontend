# Email Notification Integration

This project now includes scaffolding for email notifications using Supabase Edge Functions + Resend (or another provider).

## Overview
Functions deployed under `supabase/functions/`:
- `send-sale-email`: Sends owner + buyer email after a beat sale.
- `payout-paid-email`: Sends producer + owner email when a payout is marked completed.

Front-end service `src/services/notificationService.js` invokes these endpoints if `VITE_SUPABASE_FUNCTIONS_URL` and `VITE_NOTIFICATIONS_ENABLED=true`.

## Environment Variables
Add to function environment (via `supabase secrets set`):
- `RESEND_API_KEY` (or replace implementation with SENDGRID / Mailgun)
- `FROM_EMAIL` (verified sender)
- `OWNER_EMAIL` (owner notification address)

Front-end `.env.local`:
```
VITE_SUPABASE_FUNCTIONS_URL=https://<project-ref>.functions.supabase.co
VITE_NOTIFICATIONS_ENABLED=true
```

## Deploy Functions
```bash
supabase functions deploy send-sale-email
supabase functions deploy payout-paid-email
```
Optionally test locally:
```bash
supabase functions serve send-sale-email
curl -X POST -H 'Content-Type: application/json' \
  -d '{"beatTitle":"Test Beat","license":"Basic","buyerEmail":"buyer@example.com","amount":29}' \
  http://localhost:54321/functions/v1/send-sale-email
```

## Security & RLS
Edge functions run with service role by default. Do not expose service role keys client-side. For production, consider verifying a JWT inside the function to ensure only authenticated actions trigger emails.

Example verification snippet:
```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
// decode and validate auth header, then proceed
```

## Extending
- Add HTML templates instead of inline strings.
- Queue emails by inserting into a `notifications` table and processing in a scheduled function.
- Add rate limiting (check recent sends for same event).
- Localize content using a template map.

## Fallback Behavior
If `RESEND_API_KEY` is missing the function logs and returns `skipped: true` enabling safe dev without emails.

## Trigger Points
- Sales: `recordSale` in `beatsService` -> `sendSaleEmail`.
- Payouts: `markPayoutComplete` in `adminMetricsService` -> `sendPayoutEmail`.

Replace the mock user/payout data with Supabase tables for production.
