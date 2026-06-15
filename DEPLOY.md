# Deployment — neuroscan.proxora.uz

Live: **https://neuroscan.proxora.uz** (Let's Encrypt SSL, auto-renew).

## Architecture on the server (165.22.157.54)

```
Browser ──HTTPS──> host nginx (TLS, neuroscan.proxora.uz)
                        │  proxy_pass 127.0.0.1:8093
                        ▼
                 neuroscan-frontend (nginx, static SPA)
                        │  /api, /static → http://backend:8000  (docker network)
                        ▼
                 neuroscan-backend (FastAPI + ONNX Runtime, ~70 MB RAM)
```

- Inference runs on **ONNX Runtime** (no TensorFlow at runtime) — ~17 ms/image, ~70 MB RAM.
- Containers bind to `127.0.0.1` only; host `ufw` allows only 22/80/443.
- App files: `/opt/neuroscan` · compose: `docker-compose.prod.yml`.
- Secrets: `/opt/neuroscan/.env` (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`) — not in the image.
- Data volume: `backend_data` (SQLite DB, uploads, Grad-CAM, metrics JSON) persists across restarts.

## Update / redeploy

From the project root locally:

```bash
# 1. rebuild the frontend (prod image ships the pre-built dist)
cd frontend && npm run build && cd ..

# 2. sync changed files (excludes venv, node_modules, .keras, samples)
sshpass -e rsync -az --delete -e "ssh -o StrictHostKeyChecking=no" \
  --exclude backend/venv --exclude frontend/node_modules --exclude .git \
  --exclude keras-test --exclude 'backend/models/tumor-detection.keras' \
  --exclude backend/data/samples --exclude '__pycache__' --exclude '*.log' \
  ./ root@165.22.157.54:/opt/neuroscan/

# 3. rebuild + restart on the server
ssh root@165.22.157.54 'cd /opt/neuroscan && docker compose -f docker-compose.prod.yml up -d --build'
```

## If the model changes

Re-export ONNX before deploying (the server never needs TensorFlow):

```bash
python scripts/convert_to_onnx.py   # writes models/tumor-detection.onnx + head_weights.npz
```

## Notes

- SSL cert renews automatically via the certbot systemd timer.
- To reseed the demo DB: `docker compose -f docker-compose.prod.yml exec backend python data/seed.py`
  (or remove the `backend_data` volume to reset).
