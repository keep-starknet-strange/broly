FROM node:21.7.1-alpine

RUN apk add --no-cache bash git jq curl
RUN curl -L https://www.npmjs.com/install.sh | sh
RUN node -v
RUN npm -v

WORKDIR /app
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./
RUN npm install
WORKDIR /app/apps/web
COPY ./apps/web/package.json ./

# Install dependencies for web
RUN npm install
COPY ./apps/web ./

EXPOSE 5173

SHELL ["/bin/bash", "-c"]

# Clear the entrypoint
ENTRYPOINT []
CMD ["npm", "run", "dev:host"]
