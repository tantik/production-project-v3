# AI Sales System for Japan — v2

This version adds a more production-ready workflow layer:
- manual approval queue
- channel adapters
- follow-up scheduler
- reply handling
- local CRM + conversation history

## Run

```bash
npm install
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

Current senders are dry-run adapters only. They are built to be replaced later with real Instagram / LINE integrations.
