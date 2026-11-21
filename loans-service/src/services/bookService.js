const axios = require('axios');
const CircuitBreaker = require('opossum');

const BOOKS_SERVICE_URL = process.env.BOOKS_SERVICE_URL || 'http://localhost:3002';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || 'service-api-key';

const REQUEST_TIMEOUT_MS = parseInt(process.env.BOOKS_TIMEOUT_MS, 10) || 3000;
const MAX_RETRIES = parseInt(process.env.BOOKS_MAX_RETRIES, 10) || 3;

const booksClient = axios.create({
  baseURL: BOOKS_SERVICE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Une erreur est "réessayable" si c'est une panne réseau/timeout ou un 5xx.
 * Les 4xx (404, 409 stock épuisé, 400...) sont des réponses métier : inutile de rejouer.
 */
const isRetryable = (error) => !error.response || error.response.status >= 500;

/**
 * Retry avec backoff exponentiel + jitter : 200ms, 400ms, 800ms (+ aléa).
 */
const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === retries) break;
      const delay = 200 * 2 ** attempt + Math.floor(Math.random() * 100);
      console.warn(`[BookService] tentative ${attempt + 1} échouée (${error.message}), nouvel essai dans ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
};

// ─── Circuit Breaker (opossum) ───────────────────────────────────────────────
// Après 50 % d'échecs (sur au moins 5 appels), le circuit s'ouvre 10 s :
// les appels échouent immédiatement (fail fast) au lieu de saturer books-service.
const breakerOptions = {
  timeout: REQUEST_TIMEOUT_MS * (MAX_RETRIES + 1) + 2000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
  volumeThreshold: 5,
  // Les erreurs métier (4xx) ne doivent PAS ouvrir le circuit
  errorFilter: (error) => !isRetryable(error),
};

const breaker = new CircuitBreaker((requestConfig) => withRetry(() => booksClient.request(requestConfig)), breakerOptions);

breaker.on('open', () => console.error('[BookService] ⚠️  Circuit OUVERT : books-service indisponible'));
breaker.on('halfOpen', () => console.warn('[BookService] Circuit SEMI-OUVERT : test de books-service'));
breaker.on('close', () => console.log('[BookService] ✅ Circuit FERMÉ : books-service OK'));

const call = async (requestConfig) => {
  const response = await breaker.fire(requestConfig);
  return response.data;
};

/**
 * Récupère un livre. Retourne null si 404.
 * @throws si books-service est indisponible (réseau, circuit ouvert)
 */
const getBook = async (bookId) => {
  try {
    return await call({ method: 'get', url: `/api/books/${bookId}` });
  } catch (error) {
    if (error.response && error.response.status === 404) return null;
    throw error;
  }
};

/**
 * Modifie le stock de façon IDEMPOTENTE.
 * @param {string} bookId
 * @param {'increment'|'decrement'} action
 * @param {string} operationId identifiant unique de l'opération (rejouable sans effet de bord)
 * @param {string} [compensates] operationId d'une réservation à compenser (libère le stock seulement si elle a été appliquée)
 */
const updateStock = async (bookId, action, operationId, compensates) => {
  if (!['increment', 'decrement'].includes(action)) {
    throw new Error(`Action de stock invalide : ${action}`);
  }
  return call({
    method: 'patch',
    url: `/api/books/${bookId}/stock`,
    data: { action, operationId, ...(compensates && { compensates }) },
    headers: { 'x-service-api-key': SERVICE_API_KEY },
  });
};

const getBreakerState = () => ({
  open: breaker.opened,
  halfOpen: breaker.halfOpen,
  stats: breaker.stats,
});

module.exports = { getBook, updateStock, getBreakerState, _breaker: breaker };
