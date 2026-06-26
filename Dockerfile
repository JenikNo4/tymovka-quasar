# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
# Quasar postinstall (quasar prepare) needs full project files,
# so install deps first without running lifecycle scripts.
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_API_BASE=http://localhost:8080
ARG VITE_FRONTEND_BASE=http://localhost:9000/
ARG VITE_LOGOUT_URL=/logout
ARG VITE_SUCCESS_URL=/dashboard
ARG VITE_GOOGLE_OAUTH_URL=/oauth2/authorization/google
ARG VITE_API_GRAPHQL=http://localhost:8080/graphql
ARG VITE_APP_VERSION=dev

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_FRONTEND_BASE=$VITE_FRONTEND_BASE
ENV VITE_LOGOUT_URL=$VITE_LOGOUT_URL
ENV VITE_SUCCESS_URL=$VITE_SUCCESS_URL
ENV VITE_GOOGLE_OAUTH_URL=$VITE_GOOGLE_OAUTH_URL
ENV VITE_API_GRAPHQL=$VITE_API_GRAPHQL
ENV VITE_APP_VERSION=$VITE_APP_VERSION

RUN npm run postinstall && npm run build

FROM nginx:1.27-alpine
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/spa/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
