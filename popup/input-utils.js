export function normalizeUsername(value) {
  return String(value ?? '').trim().replace('@', '').toLowerCase();
}

export function updateInputClearState(inputGroup, input) {
  if (!inputGroup || !input) return;
  const hasValue = input.value.trim().length > 0;
  inputGroup.classList.toggle('has-value', hasValue);
}

export function setInputValue(input, value, options = {}) {
  if (!input) return;
  const { moveCaret = true } = options;
  input.value = value ?? '';
  if (moveCaret) {
    moveCaretToEnd(input);
  }
}

export function moveCaretToEnd(input) {
  if (!input) return;
  const length = input.value.length;
  requestAnimationFrame(() => {
    try {
      input.setSelectionRange(length, length);
    } catch (error) {
      // Ignore if selection isn't supported (or input isn't focusable yet).
    }
  });
}
