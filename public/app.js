const statusEl = document.getElementById('status');
const form = document.getElementById('echo-form');
const input = document.getElementById('message');
const out = document.getElementById('echo-out');

async function loadStatus() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    statusEl.textContent = `Działa. Node ${data.node}, uptime ${data.uptimeSeconds} s.`;
    statusEl.className = 'status ok';
  } catch {
    statusEl.textContent = 'Brak połączenia z serwerem.';
    statusEl.className = 'status err';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  out.textContent = 'Wysyłam…';
  try {
    const res = await fetch('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.value }),
    });
    const data = await res.json();
    out.textContent = res.ok
      ? `Serwer odpowiada: „${data.message}” (${new Date(data.receivedAt).toLocaleTimeString('pl-PL')})`
      : data.error;
  } catch {
    out.textContent = 'Nie udało się połączyć z serwerem.';
  }
});

loadStatus();
