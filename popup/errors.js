import { t } from '../utils/i18n.js';

export function getErrorTitle(errorType) {
  const titles = {
    NOT_AUTHENTICATED: t('notLoggedIn'),
    RATE_LIMITED: t('rateLimited'),
    NETWORK_ERROR: t('networkError')
  };
  return titles[errorType] || t('error');
}

export function getErrorMessage(error) {
  if (!error) return t('unexpectedError');

  switch (error.type) {
    case 'NOT_AUTHENTICATED':
      return t('notLoggedInDesc');
    case 'RATE_LIMITED':
      return t('rateLimitedDesc');
    case 'NETWORK_ERROR':
      return t('networkErrorDesc');
    default:
      return error.message || t('unexpectedError');
  }
}
