// @ts-check

/**
 * Generate a unique name with a prefix and timestamp to avoid test data conflicts.
 */
export function uniqueName(prefix) {
  return `${prefix}_TEST_${Date.now()}`;
}

/**
 * Generate test organization data.
 */
export function testOrg() {
  return {
    name: uniqueName('ORG'),
    phone: '555-0100',
    email: `test_${Date.now()}@test.com`,
  };
}

/**
 * Generate test quote data.
 */
export function testQuote() {
  return {
    name: uniqueName('QUOTE'),
  };
}

/**
 * Generate test repair data.
 */
export function testRepair() {
  return {
    name: uniqueName('REPAIR'),
  };
}
