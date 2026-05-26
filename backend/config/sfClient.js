const axios = require('axios');

const {
  SF_API_BASE_URL,
  SF_COMPANY_ID,
  SF_USERNAME,
  SF_PASSWORD,
} = process.env;

if (!SF_API_BASE_URL || !SF_USERNAME || !SF_PASSWORD || !SF_COMPANY_ID) {
  console.warn(
    '[sfClient] Missing one of SF_API_BASE_URL / SF_USERNAME / SF_PASSWORD / SF_COMPANY_ID — SF calls will fail until the .env is filled in.'
  );
}

// SuccessFactors Basic auth requires username in the form "user@companyId".
// If the caller already included the suffix, don't double it.
const username = SF_USERNAME?.includes('@')
  ? SF_USERNAME
  : `${SF_USERNAME}@${SF_COMPANY_ID}`;

const sf = axios.create({
  baseURL: `${SF_API_BASE_URL?.replace(/\/$/, '')}/odata/v2`,
  auth: { username, password: SF_PASSWORD },
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

module.exports = sf;
