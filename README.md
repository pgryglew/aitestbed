# aitestbed.pl

Prosty startowy projekt strony na Node.js (>= 18), bez zewnętrznych zależności.

## Uruchomienie lokalne

```bash
npm start        # http://localhost:3000
npm run dev      # z automatycznym restartem
npm test         # testy
```

Port ustawisz zmienną `PORT`.

## Struktura

- `server.js` – serwer HTTP, pliki statyczne i API (`/api/health`, `/api/echo`)
- `public/` – frontend (HTML, CSS, JS)
- `test/` – testy

## Dostęp dla agentów i wyszukiwarek

- `/robots.txt` deklaruje `Content-Signal: search=yes, ai-train=no` i wskazuje sitemapę.
- `/sitemap.xml` wymienia publiczne strony serwisu.
- `/llms.txt` zawiera skrót serwisu i odnośniki do ważnych stron.
- Żądanie strony głównej z `Accept: text/markdown` zwraca `/index.md`; nagłówek `Link` reklamuje wersję Markdown i `llms.txt`.
- `/.well-known/mcp/server-card.json` opisuje serwer MCP, a `POST /mcp` udostępnia tylko do odczytu narzędzia `get_voltrider_overview` i `list_electric_offroad_motorcycles`.
- `public/webmcp.js` rejestruje narzędzie przeglądarkowe `summarize_voltrider`, jeśli przeglądarka udostępnia WebMCP.

## Wdrożenie pod aitestbed.pl (VPS, Ubuntu)

1. Ustaw w DNS rekordy A (i AAAA) domeny `aitestbed.pl` oraz `www` na adres IP serwera.
2. Na serwerze zainstaluj Node.js 18+, nginx i pm2:
   ```bash
   sudo apt install nginx
   sudo npm i -g pm2
   ```
3. Sklonuj repozytorium i uruchom:
   ```bash
   git clone <adres-repo> /var/www/aitestbed && cd /var/www/aitestbed
   PORT=3000 pm2 start server.js --name aitestbed
   pm2 save && pm2 startup
   ```
4. Skonfiguruj nginx (`/etc/nginx/sites-available/aitestbed.pl`):
   ```nginx
   server {
     server_name aitestbed.pl www.aitestbed.pl;
     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $remote_addr;
     }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/aitestbed.pl /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
5. Włącz HTTPS:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d aitestbed.pl -d www.aitestbed.pl
   ```

Alternatywa: Render, Railway lub Fly.io – wskaż repozytorium, komenda startowa `npm start`, a domenę dodaj w panelu usługi.
