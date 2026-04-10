import { listLeads } from '../crm/lead-store.js';
import { exportObjectsToCsv } from '../batch/csv.js';

const filePath = process.argv[2] || 'data/exports/leads-export.csv';
const leads = await listLeads();
const exportedCsv = await exportObjectsToCsv(filePath, leads);
console.log(JSON.stringify({ filePath: exportedCsv, total: leads.length }, null, 2));
