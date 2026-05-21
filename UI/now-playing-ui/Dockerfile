# Step 1: Build the app
FROM node:22 AS build
WORKDIR /app
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm ci
RUN npm run build

# Step 2: Serve with nginx
FROM nginx:stable-alpine

# Update system packages to fix CVE vulnerabilities
RUN apk update && apk upgrade && apk add --no-cache libxml2 >=2.13.4-r6 && rm -rf /var/cache/apk/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
