const root = document.documentElement;
const viewport = window.visualViewport;
let frame;
function updateViewport() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const height = viewport?.height || window.innerHeight;
    const top = viewport?.offsetTop || 0;
    const editing = document.activeElement?.matches('input:not([type="checkbox"]):not([type="file"]), textarea, select');
    const keyboard = Boolean(editing && window.innerHeight - height > 140);
    root.style.setProperty('--visible-height', height + 'px');
    root.style.setProperty('--keyboard-inset', Math.max(0, window.innerHeight - height - top) + 'px');
    root.dataset.keyboardOpen = String(keyboard);
  });
}
viewport?.addEventListener('resize', updateViewport, { passive: true });
viewport?.addEventListener('scroll', updateViewport, { passive: true });
window.addEventListener('resize', updateViewport, { passive: true });
document.addEventListener('focusin', updateViewport);
document.addEventListener('focusout', updateViewport);
document.addEventListener('visibilitychange', updateViewport);
updateViewport();
