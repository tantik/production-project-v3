# AI Sales System for Japan — v3

This version is a cleaner, more production-oriented foundation for outreach in Japan.

## Included
- lead enrichment + scoring
- Japanese outreach message generation
- message selection + polishing
- manual approval queue
- dry-run channel adapters
- local CRM + conversation history
- reply classification + draft response planning
- guarded follow-up scheduler
- environment loading from `.env` / `.env.local`

## Run

```bash
npm install
npm run env:check
npm run start
npm run start:batch
npm run reply:demo
npm run approval:demo
npm run followup:demo
```

## Main flow
1. Prepare lead
2. Enrich + score
3. Generate 3 messages
4. Select + polish
5. Create approval request
6. Approve and send
7. Receive reply
8. Classify intent
9. Draft next reply or schedule follow-up

## Storage
- `data/leads.json`
- `data/results.json`
- `data/conversations/*.json`
- `data/outbox/**/*`
- `data/approvals/*.json`
- `data/followups/queue.json`

## Notes
- Current senders are dry-run adapters only.
- Real Instagram / LINE integrations should be added later behind the same sender interface.
- Do not commit your `.env` file.
