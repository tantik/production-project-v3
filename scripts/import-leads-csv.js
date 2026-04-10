import { importLeadsFromCsv } from '../batch/csv.js';

const filePath = process.argv[2] || 'examples/leads.csv';
const leads = await importLeadsFromCsv(filePath);
console.log(JSON.stringify({ filePath, total: leads.length, leads }, null, 2));
