module.exports = {
  apps: [
    {
      name: 'ppv7-web',
      script: 'server/app.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production', PORT: 3000 }
    },
    {
      name: 'ppv7-worker',
      script: 'scripts/worker-loop.js',
      interpreter: 'node',
      env: { NODE_ENV: 'production', WORKER_SEND_MODE: 'dry_run', WORKER_INTERVAL_MS: 30000 }
    }
  ]
};
