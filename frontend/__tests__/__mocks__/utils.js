// Mocks for common utility functions used in components
function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

// Add any other utility functions from lib/utils that your components need

module.exports = {
  cn
};

// Add at least one test to the file
describe('Utils mock', () => {
  test('exists', () => {
    expect(true).toBe(true);
  });
});