# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# ---------- base: Node + pnpm ----------
FROM node:${NODE_VERSION}-slim AS base
# Keep in sync with "packageManager" in the root package.json.
ARG PNPM_VERSION=12.15.0
# Prisma needs the system OpenSSL library to select its engine reliably on slim images.
RUN apt-get update \
    && apt-get install --no-install-recommends -y openssl \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# ---------- deps: install dependencies ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/cli/package.json packages/cli/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/db/package.json packages/db/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ---------- build: typecheck + compile ----------
FROM deps AS build
COPY . .
RUN pnpm typecheck
RUN pnpm build

# ---------- test: run the tests against the build ----------
FROM build AS test
RUN pnpm test
