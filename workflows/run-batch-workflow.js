import { runOutreachWorkflow } from './run-outreach-workflow.js';
import { exportObjectsToCsv, importLeadsFromCsv } from '../batch/csv.js';

export async function runBatchWorkflow({ leads = null, csvPath = null, sendMode = 'dry_run', autoApprove = true, exportPath = 'data/exports/batch-results.csv' } = {}) {
  const sourceLeads = leads || (csvPath ? await importLeadsFromCsv(csvPath) : []);
  const results = [];

  for (const rawLead of sourceLeads) {
    const result = await runOutreachWorkflow({ rawLead, sendMode, autoApprove });
    results.push({
      id: result.id,
      businessName: result.businessName,
      channel: result.salesStrategy?.primaryChannel || result.channel,
      status: result.status,
      score: result.scoring?.totalScore || 0,
      approvalStatus: result.approvalRequest?.status || '',
      suppressed: result.suppressed ? 'yes' : 'no',
      skippedReason: result.skippedReason || '',
      outboundMessage: result.outreach?.lastMessage || result.polishedMessage || ''
    });
  }

  const exportedCsv = await exportObjectsToCsv(exportPath, results);
  return { total: results.length, results, exportedCsv };
}
