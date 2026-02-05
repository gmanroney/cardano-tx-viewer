require('dotenv').config();
const { spawn } = require('child_process');

console.log('\n🚀 Starting MongoDB Web Interface...\n');
console.log('📊 Access at: http://localhost:8081');
console.log('👤 Username: admin');
console.log('🔑 Password: admin\n');

// Configure via environment variables
const env = {
  ...process.env,
  ME_CONFIG_MONGODB_URL: process.env.MONGODB_URI || 'mongodb://localhost:27017/cardano-transactions',
  ME_CONFIG_MONGODB_ENABLE_ADMIN: 'false',
  ME_CONFIG_BASICAUTH_USERNAME: 'admin',
  ME_CONFIG_BASICAUTH_PASSWORD: 'admin',
  ME_CONFIG_SITE_BASEURL: '/',
  ME_CONFIG_SITE_COOKIESECRET: 'cardano-secret',
  ME_CONFIG_SITE_SESSIONSECRET: 'cardano-session',
  PORT: '8081'
};

// Run mongo-express
const mongoExpress = spawn('npx', ['mongo-express'], {
  stdio: 'inherit',
  shell: true,
  env: env
});

mongoExpress.on('error', (error) => {
  console.error('❌ Failed to start mongo-express:', error);
  process.exit(1);
});

mongoExpress.on('close', (code) => {
  if (code !== 0) {
    console.log(`❌ mongo-express exited with code ${code}`);
  }
  process.exit(code);
});
