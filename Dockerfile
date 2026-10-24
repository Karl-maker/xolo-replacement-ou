# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# ---------- base: Node + pnpm ----------
FROM node:${NODE_VERSION}-slim AS base
# Keep in sync with "packageManager" in the root package.json.
ARG PNPM_VERSION=12.15.0
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# ---------- deps: install dependencies ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/cli/package.json packages/cli/package.json
COPY packages/core/package.json packages/core/package.json
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