module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '1h',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
};
