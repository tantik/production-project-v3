import { spawn } from 'child_process';
import { loadEnv } from '../services/env.js';
loadEnv();
const child = spawn(process.execPath, ['server/app.js'], { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code || 0));
