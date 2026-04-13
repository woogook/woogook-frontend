const CORRELATION_HEADER = "x-correlation-id";

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function getOrCreateCorrelationId(headers: Headers) {
  return headers.get(CORRELATION_HEADER) ?? createCorrelationId();
}

export function attachCorrelationId(
  headers: Headers,
  correlationId = createCorrelationId(),
) {
  headers.set(CORRELATION_HEADER, correlationId);
  return correlationId;
}

export { CORRELATION_HEADER };
