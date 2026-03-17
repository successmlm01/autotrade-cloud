# 1. Étape de Build
FROM node:20-slim AS builder

WORKDIR /app

# Copie des fichiers de configuration
COPY package*.json ./
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/

# Installation des dépendances
RUN npm install

# Copie du reste du code
COPY . .

# Build du backend (TypeScript -> JavaScript)
RUN cd apps/server && ../../node_modules/.bin/tsc

# 2. Étape de Production
FROM node:20-slim

WORKDIR /app

# On ne copie que ce qui est nécessaire pour l'exécution
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/server/package*.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/node_modules ./node_modules

# Variable d'environnement par défaut
ENV NODE_ENV=production

# Note : La commande de démarrage sera définie dans Railway
# pour choisir entre l'API ou le Worker
