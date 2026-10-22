const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/expenseflow',
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'esm',
};

export default config;
