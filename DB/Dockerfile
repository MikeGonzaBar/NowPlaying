# Use the official PostgreSQL image as the base
FROM postgres:alpine

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=nowplaying
ENV POSTGRES_USER=nowplaying_user
ENV POSTGRES_PASSWORD=nowplaying_password

# Expose the PostgreSQL port
EXPOSE 5432

# Use a volume for persistent data storage
VOLUME ["/var/lib/postgresql/data"]