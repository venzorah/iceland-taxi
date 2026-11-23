type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
let errorId = 0

/** Field feedback stays next to its control, including inside an existing dialog. */
export function clearFieldError(field: Field) {
  const id = field.dataset.inlineErrorId
  if (!id) return
  field.ownerDocument.getElementById(id)?.remove()
  const describedBy = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(value => value && value !== id).join(' ')
  if (describedBy) field.setAttribute('aria-describedby', describedBy)
  else field.removeAttribute('aria-describedby')
  if (field.dataset.previousAriaInvalid) field.setAttribute('aria-invalid', field.dataset.previousAriaInvalid)
  else field.removeAttribute('aria-invalid')
  delete field.dataset.inlineErrorId
  delete field.dataset.previousAriaInvalid
}

export function showFieldError(field: Field) {
  if (!field.ownerDocument || !field.willValidate) return
  let id = field.dataset.inlineErrorId
  if (!id) {
    id = `field-error-${++errorId}`
    field.dataset.inlineErrorId = id
    field.dataset.previousAriaInvalid = field.getAttribute('aria-invalid') || ''
    field.setAttribute('aria-describedby', [field.getAttribute('aria-describedby'), id].filter(Boolean).join(' '))
  }
  field.setAttribute('aria-invalid', 'true')
  let message = field.ownerDocument.getElementById(id)
  if (!message) {
    message = field.ownerDocument.createElement('span')
    message.id = id
    message.className = 'field-validation-error'
    message.setAttribute('role', 'alert')
    field.insertAdjacentElement('afterend', message)
  }
  message.textContent = field.validationMessage || 'Please check this field.'
}

/** Shared native constraints plus whitespace checks; optional controls stay optional. */
export function validateFields(root: HTMLElement): boolean {
  const fields = root.querySelectorAll<Field>('input, textarea, select')
  let firstInvalid: Field | undefined
  for (const field of fields) {
    if (field.disabled || !field.willValidate) continue
    if (field.dataset.requiredWhitespace === 'true') { field.setCustomValidity(''); delete field.dataset.requiredWhitespace }
    if (field.required && !field.value.trim()) {
      field.setCustomValidity('Please complete this field.'); field.dataset.requiredWhitespace = 'true'
    }
    if (!field.checkValidity()) { showFieldError(field); firstInvalid ??= field }
    else clearFieldError(field)
  }
  firstInvalid?.focus()
  return !firstInvalid
}
