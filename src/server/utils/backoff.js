// backoff.js
export async function withBackoff(fn, attempts = 3) {
  let delay = 500; // ms
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      const status = e?.response?.status;
      const retryable =
        status === 429 || (status >= 500 && status < 600) ||
        e.code === "ETIMEDOUT" || e.code === "ECONNRESET";
      if (retryable && i < attempts - 1) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
}
