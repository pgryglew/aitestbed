const statusEl = document.getElementById('status');
const form = document.getElementById('ask-form');
const input = document.getElementById('ask');
const answer = document.getElementById('answer');

async function loadStatus() {
  try {
    const data = await (await fetch('/api/health')).json();
    statusEl.textContent = `Serwer działa · Node ${data.node}`;
    statusEl.className = 'status ok';
  } catch {
    statusEl.textContent = 'Brak połączenia z serwerem';
    statusEl.className = 'status err';
  }
}

async function ask(message) {
  answer.textContent = 'Wysyłam…';
  try {
    const res = await fetch('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    answer.textContent = res.ok ? `Serwer odpowiada: „${data.message}”` : data.error;
  } catch {
    answer.textContent = 'Nie udało się połączyć z serwerem.';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  ask(input.value);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    input.value = chip.textContent;
    ask(chip.textContent);
  });
});

loadStatus();
