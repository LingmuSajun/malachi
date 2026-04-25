FROM node:22-slim

RUN apt-get update && apt-get install -y \
    git \
    curl \
    python3 \
    make \
    g++ \
    sudo \
    && rm -rf /var/lib/apt/lists/* \
    && echo "node ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/node \
    && chmod 0440 /etc/sudoers.d/node

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /workspace

USER node
