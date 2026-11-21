# Lacunes corrigées et pistes d'évolution

## Bugs critiques découverts pendant la revue (corrigés)
| Bug | Effet | Correction |
|---|---|---|
| loans-service envoyait `{change: -1}` alors que books-service attend `{action: "decrement"}` | Tout emprunt échouait (400 → 500) | `bookService.updateStock(bookId, action, operationId)` |
| Header `x-service-api-key` (loans) vs `x-service-key` (books) et variable `SERVICE_API_KEY` vs `SERVICE_KEY` | 500 « Service key not configured » | `verifyServiceKey` accepte les deux, compare en temps constant |
| Retour de livre : échec du stock ignoré (simple `console.warn`) | Stock définitivement faux | Drapeau `stockSyncPending` + job de réconciliation |

## Lacune 1 — Couplage synchrone : FAIT (version « résilience »)
- Timeout 3 s, **retry** avec backoff exponentiel (erreurs réseau/5xx seulement)
- **Circuit Breaker** `opossum` (ouvert après 50 % d'échecs, `errorFilter` ignore les 4xx métier)
- État du circuit exposé dans `/health` → `booksCircuit`
- Suite (optionnelle) : broker RabbitMQ, voir plus bas.

## Lacune 2 — Cohérence : FAIT (Saga orchestrée)
Emprunt : `pending` → réservation stock → `active` ; sinon **compensation** → `failed`.
- books-service : transaction + `SELECT … FOR UPDATE`, table `stock_operations` → opérations **idempotentes** (`operationId`), sinon un retry décrémenterait deux fois.
- `compensates` : on ne rend le stock que si la réservation a réellement été appliquée (sinon « pierre tombale »).
- Job `reconcileStock` (toutes les 2 min) : rejoue les libérations en attente et compense les `pending` abandonnés.

## Lacune 3 — Sécurité : FAIT
- Refresh token en **cookie HttpOnly + SameSite=Strict** (path `/api/auth`), **rotation** à chaque refresh
- Access token **en mémoire** uniquement (plus de `localStorage`)
- CORS restreint (`CORS_ORIGINS`) au lieu de `*`
- Secrets : plus de valeurs en clair dans `docker-compose.yml` (variables `.env`, voir `.env.example`) ; `k8s/base/01-secrets.example.yaml` + Sealed Secrets pour GitOps
- ⚠️ **Le `.env` actuel a été committé/partagé : changer tous les secrets** (`openssl rand -hex 32`)
- Reste : `COOKIE_SECURE=true` avec TLS (cert-manager), mTLS/NetworkPolicy.

## Lacune 6 — Tests + CI : FAIT
- `loans-service/tests` : 13 tests Jest/Supertest (Saga, compensation, limites, retry, 404…)
- `.github/workflows/ci.yml` : tests (obligatoires) → build Docker → scan Trivy

## Lacune 4 — Fichiers (guidé)
Manifest K8s en `replicas: 1` + PVC (limite assumée). Pour scaler :
1. Déployer MinIO (Helm `bitnami/minio`) dans le namespace `library`
2. `npm i @aws-sdk/client-s3 multer-s3` dans books-service
3. Remplacer `multer.diskStorage` par `multerS3({ s3, bucket: 'covers', key: ... })` avec `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (Secret K8s)
4. Stocker l'URL de l'image en base, servir via Ingress `/covers/` ; passer `replicas: 3`

## Lacune 5 — Observabilité (guidé)
- Logs : `helm install loki grafana/loki-stack -n monitoring --set promtail.enabled=true`, datasource Loki dans Grafana. Passer à des logs JSON (`pino`) avec un `requestId`.
- Traces : `npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http`, démarrer avec `node -r ./tracing.js src/server.js`, déployer Jaeger (all-in-one) et `OTEL_EXPORTER_OTLP_ENDPOINT`. L'auto-instrumentation propage `traceparent` entre loans → books.
- Prometheus : annotations `prometheus.io/*` déjà présentes sur les Deployments.

## RabbitMQ (guidé, après le reste)
loans publie `loan.created` / `loan.returned` ; books consomme (`amqplib`), file durable + DLQ. La Saga devient chorégraphiée, mais l'idempotence (`operationId`) reste indispensable (livraison « au moins une fois »).

## Déploiement K3s
```bash
kubectl apply -f k8s/base/00-namespace.yaml
kubectl -n library create secret generic library-secrets --from-literal=JWT_SECRET=$(openssl rand -hex 32) \
  --from-literal=SERVICE_API_KEY=$(openssl rand -hex 32) --from-literal=POSTGRES_PASSWORD=$(openssl rand -hex 16) \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD=$(openssl rand -hex 16)
# remplacer REGISTRY/<service>:TAG par vos images Docker Hub
kubectl apply -f k8s/base/ --recursive   # (ignorer 01-secrets.example.yaml)
```
