# Bibliothèque universitaire — microservices (Master DevOps & Cloud, ISET Tozeur)

Réalisé par Nour Kidoudi et Maryem Elheni.

| Service | Rôle | Port | Base |
|---|---|---|---|
| users-service | inscription, connexion, JWT, rôles | 3001 | PostgreSQL |
| books-service | catalogue, recherche, stock | 3002 | PostgreSQL |
| loans-service | emprunts, retours, retards | 3003 | MongoDB |
| frontend | React + Nginx | 8080 | — |

## Lancer en local (Docker Compose)
```bash
cp .env.example .env      # puis modifier les secrets
docker compose up --build
# http://localhost:8080  (admin : ADMIN_EMAIL / ADMIN_PASSWORD du .env)
```

## Déploiement k3s
Voir le dossier `k8s/` (à compléter à l'étape suivante).
