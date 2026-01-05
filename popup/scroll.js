export function scrollToShowElement(element, container, options = {}) {
  const { padding = 16, maxAttempts = 3 } = options;
  if (!element || !element.isConnected) return;

  const scrollContainer = container || element.closest('.content');
  if (!scrollContainer) return;

  const attemptScroll = (attempts) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const elementRect = element.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        const visibleBottom = containerRect.bottom - padding;
        const elementBottom = elementRect.bottom;

        if (elementBottom <= visibleBottom) {
          return;
        }

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const behavior = prefersReducedMotion ? 'auto' : 'smooth';
        const scrollAmount = elementBottom - visibleBottom;

        scrollContainer.scrollBy({ top: scrollAmount, behavior });

        if (attempts >= maxAttempts) {
          return;
        }

        waitForScrollEnd(scrollContainer, () => {
          attemptScroll(attempts + 1);
        });
      });
    });
  };

  attemptScroll(0);
}

function waitForScrollEnd(container, callback) {
  let idleTimeoutId = null;
  let fallbackTimeoutId = null;

  const cleanup = () => {
    if (idleTimeoutId) {
      clearTimeout(idleTimeoutId);
    }
    if (fallbackTimeoutId) {
      clearTimeout(fallbackTimeoutId);
    }
    container.removeEventListener('scroll', onScroll);
    container.removeEventListener('scrollend', onScrollEnd);
  };

  const onScrollEnd = () => {
    cleanup();
    callback();
  };

  const onScroll = () => {
    if (idleTimeoutId) {
      clearTimeout(idleTimeoutId);
    }
    idleTimeoutId = setTimeout(onScrollEnd, 120);
  };

  if ('onscrollend' in container) {
    container.addEventListener('scrollend', onScrollEnd, { once: true });
  } else {
    container.addEventListener('scroll', onScroll);
  }

  fallbackTimeoutId = setTimeout(onScrollEnd, 240);
}
