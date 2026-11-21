# 📖 Spécification de l'API REST des Microservices

Plateforme de gestion de bibliothèque universitaire - Architecture Microservices

---

## 1. users-service (Port 3001)

Base URL: `http://localhost:3001/api` ou via Ingress `/api/auth` et `/api/users`

### Authentification (`/api/auth`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `POST` | `/auth/register` | Inscription d'un nouvel étudiant | Public |
| `POST` | `/auth/login` | Connexion et émission des tokens (JWT access & refresh) | Public |
| `POST` | `/auth/refresh-token` | Renouvellement du token d'accès | Public |
| `POST` | `/auth/logout` | Déconnexion et invalidation | Public |
| `GET` | `/auth/me` | Profil de l'utilisateur connecté | Authentifié |
| `PUT` | `/auth/me` | Mise à jour du profil | Authentifié |
| `PUT` | `/auth/me/password` | Modification du mot de passe | Authentifié |

### Gestion des Utilisateurs (`/api/users`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `GET` | `/users` | Liste paginée des utilisateurs avec filtres | Bibliothécaire / Admin |
| `GET` | `/users/:id` | Détails d'un utilisateur par ID | Bibliothécaire / Admin |
| `PUT` | `/users/:id/role` | Modification du rôle (`student`, `librarian`, `admin`) | Admin |
| `PUT` | `/users/:id/status` | Activation / suspension de compte | Admin |
| `GET` | `/users/stats/overview` | Statistiques globales sur les inscrits | Admin |

---

## 2. books-service (Port 3002)

Base URL: `http://localhost:3002/api` ou via Ingress `/api/books` et `/api/categories`

### Catalogue des Ouvrages (`/api/books`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `GET` | `/books` | Liste paginée, recherche plein texte (`q`), filtre par discipline | Public |
| `GET` | `/books/featured` | Livres les mieux notés et nouveautés | Public |
| `GET` | `/books/:id` | Détail complet d'un livre et ses avis | Public |
| `POST` | `/books` | Création d'un nouvel ouvrage | Bibliothécaire / Admin |
| `PUT` | `/books/:id` | Modification d'un ouvrage | Bibliothécaire / Admin |
| `DELETE` | `/books/:id` | Suppression logique d'un ouvrage | Admin |
| `PATCH` | `/books/:id/stock` | Ajustement du stock (`change: +1` ou `-1`) | Clé de service interne |
| `POST` | `/books/:id/reviews` | Ajout d'une note (1-5) et commentaire | Authentifié |
| `POST` | `/books/upload-cover/:id` | Téléversement d'image de couverture | Bibliothécaire / Admin |

### Catégories Documentaires (`/api/categories`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `GET` | `/categories` | Liste de toutes les disciplines | Public |
| `POST` | `/categories` | Ajout d'une discipline | Admin |

---

## 3. loans-service (Port 3003)

Base URL: `http://localhost:3003/api` ou via Ingress `/api/loans`, `/api/notifications`, `/api/stats`

### Gestion des Prêts (`/api/loans`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `POST` | `/loans/borrow` | Emprunter un livre (vérifie limite max 5 et stock) | Authentifié |
| `PUT` | `/loans/:id/return` | Restituer un livre (calcule amende de retard si dépassé) | Authentifié / Staff |
| `PUT` | `/loans/:id/renew` | Prolonger l'emprunt de 14 jours (max 2 fois) | Authentifié |
| `GET` | `/loans/my-loans` | Historique des emprunts de l'utilisateur connecté | Authentifié |
| `GET` | `/loans/my-loans/active` | Prêts actifs de l'utilisateur connecté | Authentifié |
| `GET` | `/loans` | Liste complète de tous les prêts | Bibliothécaire / Admin |
| `GET` | `/loans/overdue` | Liste des emprunts en situation de retard | Bibliothécaire / Admin |
| `PUT` | `/loans/:id/fine/pay` | Encaisser et régulariser une amende | Bibliothécaire / Admin |
| `PUT` | `/loans/:id/lost` | Déclarer un livre perdu avec frais de remplacement | Bibliothécaire / Admin |

### Notifications & Rappels (`/api/notifications`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `GET` | `/notifications` | Liste des alertes de l'utilisateur | Authentifié |
| `GET` | `/notifications/unread-count` | Nombre de notifications non lues | Authentifié |
| `PUT` | `/notifications/:id/read` | Marquer une notification comme lue | Authentifié |
| `PUT` | `/notifications/read-all` | Tout marquer comme lu | Authentifié |
| `DELETE` | `/notifications/:id` | Supprimer une notification | Authentifié |

### Statistiques & Reporting (`/api/stats`)

| Méthode | Endpoint | Description | Accès |
|---------|----------|-------------|-------|
| `GET` | `/stats/overview` | Totaux des emprunts, retards, amendes | Bibliothécaire / Admin |
| `GET` | `/stats/monthly` | Tendances mensuelles pour les graphiques | Bibliothécaire / Admin |
| `GET` | `/stats/top-books` | Top 5 des ouvrages les plus empruntés | Bibliothécaire / Admin |
| `GET` | `/stats/top-borrowers` | Utilisateurs les plus actifs | Admin |

---

## Métriques Prometheus & Health Checks

Chaque microservice expose :
- `GET /health` : État du service, temps de fonctionnement (`uptime`), statut.
- `GET /metrics` : Métriques Prometheus au format standard (`http_request_duration_seconds`, `http_requests_total`, etc.).
