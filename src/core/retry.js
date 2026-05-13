function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promiseFactory, timeoutMs, message = "Tempo limite excedido.") {
  let timeoutId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([Promise.resolve().then(promiseFactory), timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

async function retry(operation, options = {}) {
  const retries = Number.isInteger(options.retries) ? options.retries : 2;
  const delayMs = Number.isFinite(options.delayMs) ? options.delayMs : 600;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : null;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (timeoutMs) {
        return await withTimeout(operation, timeoutMs, options.timeoutMessage);
      }
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

module.exports = {
  retry,
  sleep,
  withTimeout,
};
