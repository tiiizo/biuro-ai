// Copying to the clipboard: the Clipboard API (localhost is a secure context), and when it is not available —
// the old way through a hidden text field and execCommand('copy').

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // no permission or the document has no focus → try below
  }
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  field.style.pointerEvents = 'none';
  document.body.append(field);
  field.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  field.remove();
  active?.focus();
  return ok;
}
