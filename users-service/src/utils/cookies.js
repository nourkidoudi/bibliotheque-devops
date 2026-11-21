const REFRESH_COOKIE = 'refreshToken';

const baseOptions = () => ({
  httpOnly: true,                                   // inaccessible à JavaScript => protège contre le vol par XSS
  secure: process.env.COOKIE_SECURE === 'true',     // true derrière HTTPS (Ingress TLS)
  sameSite: 'strict',                               // pas envoyé depuis un site tiers => protège contre le CSRF
  path: '/api/auth',                                // envoyé uniquement aux routes d'authentification
});

const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });

const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, baseOptions());

module.exports = { REFRESH_COOKIE, setRefreshCookie, clearRefreshCookie };
