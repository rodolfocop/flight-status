/** Convert Wikimedia metadata to plain text for image attribution. */
export function cleanImageMetadata(value: unknown): string {
  if (typeof value !== 'string') return '';

  let text = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '<') {
      const end = value.indexOf('>', i + 1);
      if (end !== -1) i = end;
    } else {
      text += value[i];
    }
  }
  return text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim().slice(0, 180);
}
