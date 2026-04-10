import { runBatchWorkflow } from './workflows/run-batch-workflow.js';

async function main() {
  const result = await runBatchWorkflow({
    csvPath: 'examples/leads.csv',
    sendMode: 'dry_run',
    autoApprove: true,
    exportPath: 'data/exports/batch-results.csv'
  });

  console.log('=== BATCH RESULTS ===');
  console.table(result.results.map((item) => ({
    id: item.id,
    businessName: item.businessName,
    status: item.status,
    score: item.score,
    channel: item.channel,
    approvalStatus: item.approvalStatus,
    suppressed: item.suppressed,
    skippedReason: item.skippedReason
  })));

  console.log('\n=== EXPORTED CSV ===');
  console.log(result.exportedCsv);
}

main();
