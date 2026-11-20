/** Server-only projection of untrusted Teya responses. Never copy messages or bodies to logs. */
const codes = new Set([
  'BAD_REQUEST', 'UNAUTHORISED', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT',
  'TOO_MANY_REQUESTS', 'INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE',
  'VALIDATION_ERROR', 'VALIDATION_FAILED', 'INVALID_ARGUMENT', 'INVALID_REQUEST',
  'INVALID_FORMAT', 'INVALID_VALUE', 'INVALID_TYPE', 'INVALID_FIELD', 'INVALID_PARAMETER',
  'REQUIRED', 'REQUIRED_FIELD', 'MISSING_FIELD', 'MISSING_REQUIRED_FIELD',
  'OUT_OF_RANGE', 'TOO_LONG', 'TOO_SHORT', 'NOT_SUPPORTED', 'UNSUPPORTED_CURRENCY',
  'EMAIL', 'E164', 'UUID', 'MIN', 'MAX', 'ONEOF',
])

// Only schema field names are emitted. Metadata keys and array values can contain personal data.
const fields = new Set([
  'amount', 'amount.currency', 'amount.value', 'store_id', 'type', 'language',
  'success_url', 'cancel_url', 'failure_url', 'merchant_reference', 'post_success_payment',
  'customer', 'customer.name', 'customer.email', 'customer.phone_number',
  'customer_success_email', 'merchant_success_email', 'metadata',
  'line_items', 'line_items[].description', 'line_items[].quantity', 'line_items[].unit_price',
  'billing_address', 'billing_address.city', 'billing_address.country', 'billing_address.state',
  'billing_address.street_address_line1', 'billing_address.street_address_line2',
  'billing_address.street_address_line3', 'billing_address.zipcode',
  'required_customer_fields', 'save_payment_method',
])
const containers = new Set(['details', 'errors', 'violations', 'field_errors', 'field_violations', 'fieldViolations', 'validation_errors', 'validationErrors', 'invalid_params', 'invalidParams', 'fields'])

function fieldName(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    if (value.length > 8 || value.some(part => !(typeof part === 'string' || typeof part === 'number'))) return
    value = value.join('.')
  }
  if (typeof value !== 'string' || value.length > 160) return
  const normalized = value.replace(/^#?\//, '').replaceAll('/', '.')
    .replace(/\[\d+\]|\.\d+(?=\.|$)/g, '[]').replace(/^(body|request)\./, '')
  return fields.has(normalized) ? normalized : undefined
}

// Opaque strings can be tokens, email addresses or URLs. Accept only structured UUID/trace IDs.
// Skip even well-formed IDs if they contain a known request/credential value.
function correlationId(value: unknown, privateValues: readonly string[]) {
  if (typeof value !== 'string' || value.length > 64) return
  if (!/^(?:[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}|[\da-f]{16}|[\da-f]{32}|[\da-f]{2}-[\da-f]{32}-[\da-f]{16}-[\da-f]{2})$/i.test(value)) return
  if (privateValues.some(privateValue => privateValue && value.toLowerCase().includes(privateValue.toLowerCase()))) return
  return value
}

export function checkoutRejectionDiagnostic(
  response: Pick<Response, 'status' | 'headers'>,
  body: unknown,
  environment: 'sandbox' | 'production',
  privateValues: readonly string[],
) {
  const providerCodes = new Set<string>()
  const validationFields = new Set<string>()
  const validationErrors = new Map<string, { field?: string; code?: string }>()
  let visited = 0
  const walk = (value: unknown, depth: number, inheritedField?: string) => {
    if (++visited > 100 || depth > 5 || !value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.slice(0, 20).forEach(item => walk(item, depth + 1, inheritedField)); return }
    const record = value as Record<string, unknown>
    const field = fieldName(record.field) || fieldName(record.field_name) || fieldName(record.property) || fieldName(record.path) || fieldName(record.param) || fieldName(record.name) || inheritedField
    const candidateCode = record.code ?? record.error_code
    const normalizedCode = typeof candidateCode === 'string' && candidateCode.length <= 64 ? candidateCode.toUpperCase() : undefined
    const code = normalizedCode && codes.has(normalizedCode) ? normalizedCode : undefined
    if (field) validationFields.add(field)
    if (code) providerCodes.add(code)
    if (field || code) validationErrors.set(`${field || ''}:${code || ''}`, { ...(field ? { field } : {}), ...(code ? { code } : {}) })
    for (const [key, child] of Object.entries(record).slice(0, 40)) {
      if (containers.has(key)) walk(child, depth + 1)
      const mappedField = fieldName(key)
      if (mappedField) {
        validationFields.add(mappedField)
        // Error maps often hold descriptions; inspect objects only, never free text.
        walk(child, depth + 1, mappedField)
      }
    }
  }
  walk(body, 0)
  const record = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  const requestId = ['x-request-id', 'request-id', 'x-amzn-requestid']
    .map(header => correlationId(response.headers.get(header), privateValues)).find(Boolean)
    || correlationId(record.request_id ?? record.requestId, privateValues)
  const correlation = ['x-correlation-id', 'correlation-id', 'traceparent', 'x-trace-id']
    .map(header => correlationId(response.headers.get(header), privateValues)).find(Boolean)
    || correlationId(record.correlation_id ?? record.correlationId ?? record.trace_id ?? record.traceId, privateValues)
  return {
    event: 'teya.checkout.rejected', environment, httpStatus: response.status,
    ...(requestId ? { providerRequestId: requestId } : {}),
    ...(correlation ? { providerCorrelationId: correlation } : {}),
    providerCodes: [...providerCodes].slice(0, 20),
    validationFields: [...validationFields].slice(0, 20),
    validationErrors: [...validationErrors.values()].slice(0, 20),
  }
}
