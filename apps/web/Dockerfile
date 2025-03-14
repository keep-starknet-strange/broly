FROM node:21.7.1-alpine

RUN apk add --no-cache bash git jq curl

WORKDIR /app
COPY ./package.json ./pnpm-lock.yaml ./pnpm-workspace.yaml ./

WORKDIR /app/apps/web
COPY ./apps/web/package.json ./

RUN npm install
COPY ./apps/web ./

EXPOSE 5173

SHELL ["/bin/bash", "-c"]

# Clear the entrypoint
ENTRYPOINT []
CMD ["npm", "run", "dev:host"]
