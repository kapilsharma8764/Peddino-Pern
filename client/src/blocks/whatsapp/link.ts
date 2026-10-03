/**
 * Turning a number a person typed into a link WhatsApp will accept.
 *
 * Kept out of the component file so it can be tested directly — the formatting
 * rules are where this quietly goes wrong.
 */

/** WhatsApp wants digits only, with the country code and no punctuation. */
export function whatsappNumber(raw: string, countryCode: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const code = countryCode.replace(/\D/g, '')
  // Numbers are often typed with the country code already attached.
  if (code && digits.startsWith(code)) return digits
  return `${code}${digits}`
}

export function whatsappHref(number: string, message: string): string {
  const text = message.trim()
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
