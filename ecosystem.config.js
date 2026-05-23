module.exports = {
  apps: [
    {
      name: 'upgradeskills-lms',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',          // Scales up to use all available CPU cores automatically
      exec_mode: 'cluster',      // Enables cluster mode for rolling zero-downtime updates
      watch: false,
      max_memory_restart: '1G',  // Restarts process if memory exceeds threshold
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
