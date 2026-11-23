/** Shared native constraints plus whitespace checks; optional controls stay optional. */
export function validateFields(root: HTMLElement): boolean {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')
  for (const field of fields) {
    if (field.disabled || !field.willValidate) continue
    if (field.dataset.requiredWhitespace === 'true') { field.setCustomValidity(''); delete field.dataset.requiredWhitespace }
    if (field.required && !field.value.trim()) {
      field.setCustomValidity('Please complete this field.'); field.dataset.requiredWhitespace = 'true'
    }
    if (!field.checkValidity()) { field.reportValidity(); field.focus(); return false }
  }
  return true
}
