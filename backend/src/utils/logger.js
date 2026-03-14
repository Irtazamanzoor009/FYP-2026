const log = (...args) => {
  console.log(`[LOG - ${new Date().toISOString()}]`, ...args);
};

const error = (...args) => {
  console.error(`[ERROR - ${new Date().toISOString()}]`, ...args);
};

const warn = (...args) => {
  console.warn(`[WARN - ${new Date().toISOString()}]`, ...args);
};

module.exports = { log, error, warn };
