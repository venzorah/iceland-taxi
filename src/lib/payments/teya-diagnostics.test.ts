import assert from 'node:assert/strict'
import test from 'node:test'
import { checkoutRejectionDiagnostic } from './teya-diagnostics'

const requestId = 'b727530c-c13a-45c7-bc12-80b931c1ea5f'
const trace = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'

test('HTTP 400 projection retains only codes, schema fields and structured provider IDs', () => {
  const response = new Response(null, { status: 400, headers: { 'X-Request-Id': requestId, traceparent: trace } })
  const diagnostic = checkoutRejectionDiagnostic(response, {
    code: 'BAD_REQUEST', description: 'Rejected phone +3547771234, customer@example.test',
    errors: [
      { code: 'invalid_format', field: 'customer.phone_number', message: 'private phone value', rejected_value: '+3547771234' },
      { code: 'OUT_OF_RANGE', path: ['body', 'line_items', 0, 'unit_price'] },
      { code: 'private-token', field: 'customer@example.test' },
    ],
  }, 'sandbox', [])
  assert.equal(diagnostic.httpStatus, 400)
  assert.equal(diagnostic.environment, 'sandbox')
  assert.equal(diagnostic.providerRequestId, requestId)
  assert.equal(diagnostic.providerCorrelationId, trace)
  assert.deepEqual(diagnostic.providerCodes, ['BAD_REQUEST', 'INVALID_FORMAT', 'OUT_OF_RANGE'])
  assert.deepEqual(diagnostic.validationFields, ['customer.phone_number', 'line_items[].unit_price'])
  assert(diagnostic.validationErrors.some(item => item.field === 'customer.phone_number' && item.code === 'INVALID_FORMAT'))
  assert.doesNotMatch(JSON.stringify(diagnostic), /customer@|354777|private-token|private phone|description|message|rejected_value/)
})

test('opaque IDs, injected messages, arbitrary codes and private metadata paths never reach diagnostics', () => {
  const privateId = '99999999-9999-4999-8999-999999999999'
  const body = {
    code: 'SECRET_TOKEN', message: 'Bearer SECRET_TOKEN', description: 'Name Customer Person, phone +3547771234',
    correlation_id: privateId,
    errors: [
      { field: 'metadata.customer@example.test', code: 'CUSTOMER_PERSON', message: 'https://taxi.example/manage-booking?token=SECRET_TOKEN' },
      { path: 'customer.phone_number.customer@example.test', code: '+3547771234' },
      { field: 'customer.email', code: 'EMAIL', attemptedValue: 'customer@example.test' },
    ],
    request: { authorization: 'Bearer SECRET_TOKEN', client_secret: 'CLIENT_SECRET', customer: { name: 'Customer Person' } },
  }
  for (const header of ['Bearer SECRET_TOKEN', 'customer@example.test', 'https://taxi.example/manage-booking?token=SECRET_TOKEN', privateId, 'unsafe\u001b[31m']) {
    const diagnostic = checkoutRejectionDiagnostic(new Response(null, { status: 400, headers: { 'x-request-id': header } }), body, 'sandbox', [privateId])
    assert.equal(diagnostic.providerRequestId, undefined)
    assert.equal(diagnostic.providerCorrelationId, undefined)
    assert.deepEqual(diagnostic.validationFields, ['customer.email'])
    assert.deepEqual(diagnostic.providerCodes, ['EMAIL'])
    assert.doesNotMatch(JSON.stringify(diagnostic), /SECRET|Customer Person|customer@|354777|https:|99999999|unsafe/)
  }
})

test('structured body IDs and supported error maps are retained, messages and malformed bodies ignored', () => {
  const response = new Response(null, { status: 400 })
  const diagnostic = checkoutRejectionDiagnostic(response, {
    request_id: requestId,
    field_errors: { '/customer/phone_number': [{ code: 'E164', message: 'sensitive' }], 'amount.currency': ['private free text'] },
  }, 'sandbox', [])
  assert.equal(diagnostic.providerRequestId, requestId)
  assert.deepEqual(diagnostic.validationFields, ['customer.phone_number', 'amount.currency'])
  assert.deepEqual(diagnostic.providerCodes, ['E164'])
  for (const body of [null, 'HTML SECRET', 12, { description: 'amount.currency SECRET', code: 'not-documented' }]) {
    const projected = checkoutRejectionDiagnostic(response, body, 'sandbox', [])
    assert.deepEqual(projected.providerCodes, [])
    assert.deepEqual(projected.validationFields, [])
    assert.doesNotMatch(JSON.stringify(projected), /SECRET|HTML|not-documented/)
  }
})

test('provider-controlled nesting and output size are bounded', () => {
  const response = new Response(null, { status: 400 })
  const body: { errors: unknown[] } = { errors: [] }
  body.errors = [body, ...Array.from({ length: 10000 }, () => ({ field: 'customer.phone_number', code: 'REQUIRED' }))]
  const diagnostic = checkoutRejectionDiagnostic(response, body, 'sandbox', [])
  assert(diagnostic.validationErrors.length <= 20)
  assert(JSON.stringify(diagnostic).length < 2000)
})
