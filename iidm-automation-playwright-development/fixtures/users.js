// @ts-check

/**
 * User credentials for different roles.
 * Used across all test suites via the auth helper.
 */
export const users = {
  default: {
    email: 'defaultuser@enterpi.com',
    password: 'Enspirit@625',
    role: 'admin',
    landingPage: '/quote_for_parts',
  },
  sales: {
    email: 'g.bhavanishankar@enspirit.co',
    password: 'Enspirit@625',
    role: 'sales',
    landingPage: '/quote_for_parts',
  },
  customer: {
    email: 'chumpchange@espi.co',
    password: 'Enspirit@625',
    role: 'customer',
    portalURL: 'https://www.staging-portal-v1.iidm.com',
    landingPage: '/',
  },
};
