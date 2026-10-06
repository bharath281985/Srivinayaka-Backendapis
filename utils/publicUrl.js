const DEFAULT_PROD_BASE_URL = 'https://backendapis.srivinayakacollections.com';

const normalizeBaseUrl = (baseUrl) => {
  if (!baseUrl) return '';
  return String(baseUrl).trim().replace(/\/+$/, '');
};

const getPublicBaseUrl = (req) => {
  const fromEnv = normalizeBaseUrl(process.env.BASE_URL);
  if (fromEnv) return fromEnv;

  if (req?.protocol && typeof req.get === 'function') {
    return normalizeBaseUrl(`${req.protocol}://${req.get('host')}`);
  }

  return DEFAULT_PROD_BASE_URL;
};

const toPublicUrl = (maybeUrlOrPath, req) => {
  if (!maybeUrlOrPath) return maybeUrlOrPath;
  const value = String(maybeUrlOrPath);

  const base = getPublicBaseUrl(req);

  if (/^https?:\/\//i.test(value)) return value;

  if (value.startsWith('/')) return `${base}${value}`;
  return `${base}/${value}`;
};

export { DEFAULT_PROD_BASE_URL, getPublicBaseUrl, toPublicUrl };
