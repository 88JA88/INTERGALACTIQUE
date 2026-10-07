(() => {
  if (!('serviceWorker' in navigator)) return;

  const notice = document.getElementById('mise-a-jour');
  const message = document.getElementById('message-mise-a-jour');
  const refreshButton = document.getElementById('actualiser-application');
  const confirmationKey = 'intergalactique-pwa-updated';
  let reloading = false;

  function showNotice(text, canRefresh = false) {
    message.textContent = text;
    refreshButton.hidden = !canRefresh;
    refreshButton.disabled = false;
    notice.hidden = false;
  }

  function offerUpdate(registration) {
    const worker = registration.waiting;
    if (!worker) return;
    showNotice('Une nouvelle version est prête.', true);
    refreshButton.onclick = () => {
      sessionStorage.setItem(confirmationKey, '1');
      refreshButton.disabled = true;
      message.textContent = 'Actualisation de l’application…';
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
  }

  window.addEventListener('load', async () => {
    const confirmationPending = sessionStorage.getItem(confirmationKey) === '1';
    if (confirmationPending) {
      sessionStorage.removeItem(confirmationKey);
      showNotice('Application actualisée.');
    }

    const registration = await navigator.serviceWorker.register('./service-worker.js');
    if (registration.waiting) offerUpdate(registration);
    else if (!confirmationPending) showNotice('Version à jour.');

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(registration);
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
})();
