module.exports = {
  mongodb: {
    connectionString: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    connectionOptions: {},
    admin: false,
    databases: [
      {
        name: 'cardano-transactions',
        host: 'localhost',
        port: 27017
      }
    ]
  },
  site: {
    baseUrl: '/',
    cookieKeyName: 'mongo-express',
    cookieSecret: 'cardano-secret',
    host: 'localhost',
    port: 8081,
    requestSizeLimit: '50mb',
    sessionSecret: 'cardano-session-secret',
    sslEnabled: false,
    sslCert: '',
    sslKey: ''
  },
  basicAuth: {
    username: 'admin',
    password: 'admin'
  },
  options: {
    console: true,
    documentsPerPage: 50,
    editorTheme: 'rubyblue',
    maxPropSize: 100,
    updateNotificationEnabled: false
  }
};
