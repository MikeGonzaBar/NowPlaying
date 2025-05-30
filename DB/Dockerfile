# Use the latest PostgreSQL 17 Alpine image
FROM postgres:17.5-alpine

# Update system packages to fix CVE vulnerabilities
RUN apk update && apk upgrade && apk add --no-cache libxml2 >=2.13.4-r6 && rm -rf /var/cache/apk/*

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=nowplaying
ENV POSTGRES_USER=nowplaying_user
ENV POSTGRES_PASSWORD=nowplaying_password

# Expose the PostgreSQL port
EXPOSE 5432

# Use a volume for persistent data storage
VOLUME ["/var/lib/postgresql/data"]
