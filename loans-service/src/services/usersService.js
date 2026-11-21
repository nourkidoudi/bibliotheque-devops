const axios = require('axios');

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3011';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY;

const usersClient = axios.create({
  baseURL: USERS_SERVICE_URL,
  timeout: 3000,
  headers: { 'Content-Type': 'application/json' },
});

let staffCache = [];
let staffCacheExpiresAt = 0;

const getStaffRecipients = async () => {
  if (staffCacheExpiresAt > Date.now()) {
    return staffCache;
  }
  if (!SERVICE_API_KEY) {
    throw new Error('SERVICE_API_KEY is required to retrieve notification recipients.');
  }

  const response = await usersClient.get('/api/internal/staff', {
    headers: { 'x-service-api-key': SERVICE_API_KEY },
  });
  if (!Array.isArray(response.data.data)) {
    throw new Error('Users service returned an invalid staff list.');
  }

  staffCache = response.data.data;
  staffCacheExpiresAt = Date.now() + 60_000;
  return staffCache;
};

module.exports = { getStaffRecipients };
