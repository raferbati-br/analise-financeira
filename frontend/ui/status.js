export function showStatus(statusEl, statusCard, message) {
  statusEl.textContent = message;
  statusCard.hidden = false;
}

export function clearStatus(statusEl, statusCard) {
  statusEl.textContent = '';
  statusCard.hidden = true;
}
