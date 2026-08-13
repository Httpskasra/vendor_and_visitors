# Production deployment: Docker + Nginx + Let's Encrypt

Architecture:

Internet -> Cloudflare DNS -> VPS :80/:443 -> nginx container -> frontend/backend containers -> PostgreSQL

Only ports 80 and 443 are published publicly. PostgreSQL, backend, and frontend remain on the internal Docker network.

## 1) Cloudflare before first certificate
Keep both DNS records as **DNS only** (gray cloud):

- A `@` -> `94.101.178.241`
- A `www` -> `94.101.178.241`

## 2) Create production environment

```bash
cp .env.production.example .env.production
nano .env.production
```

Set a real email and strong secrets. Generate examples with:

```bash
openssl rand -base64 48
openssl rand -base64 64
```

## 3) Open firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 4) First deployment + SSL

```bash
chmod +x scripts/*.sh
./scripts/init-ssl.sh .env.production
```

This script:
1. builds/starts Postgres, backend, frontend and nginx over HTTP;
2. obtains the Let's Encrypt certificate with a webroot challenge;
3. switches nginx to HTTPS + HTTP->HTTPS redirect;
4. starts the Certbot renewer.

## 5) Verify

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -I https://fattahi-shop.ir
curl -I https://www.fattahi-shop.ir
```

Logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f nginx
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f frontend
```

## 6) Later deployments

```bash
./scripts/deploy.sh .env.production
```

## 7) Cloudflare after HTTPS works
After direct HTTPS is working, you may turn the Cloudflare proxy on (orange cloud) for `@` and `www`, then set Cloudflare SSL/TLS mode to **Full (strict)**.

## Certificate renewal
The `certbot` container checks for renewal every 12 hours. The nginx container reloads itself periodically so renewed certificates are picked up without host-level nginx/certbot.
