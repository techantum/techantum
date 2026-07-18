module.exports = {
  apps: [
    {
      name: 'techantum',
      script: 'scripts/start-production.sh',
      cwd: '/var/www/techantum',
      interpreter: 'bash',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4028,
      },
    },
  ],
};
