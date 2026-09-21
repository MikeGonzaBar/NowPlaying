# Stage 1: rebuild the gosu entrypoint helper from source with a current,
# patched Go toolchain. The stock postgres:17-alpine image vendors a gosu built
# with an older Go whose stdlib Trivy/Grype flag with many Go stdlib CVEs.
FROM golang:1.26.6-alpine AS gosu-builder
RUN apk add --no-cache git \
    && git clone --depth 1 https://github.com/tianon/gosu.git /gosu
WORKDIR /gosu
ENV CGO_ENABLED=0
RUN go build -trimpath -o /out/gosu .

# Use the latest PostgreSQL 17 Alpine image (same major => data/migration
# compatible with the existing database volume).
FROM postgres:17.11-alpine

# Update system packages to fix CVE vulnerabilities.
# libssl3/libcrypto3 are pinned to the patched OpenSSL build so the
# critical CVE-2026-31789 fix is enforced even if the base layer is cached.
RUN apk update && apk upgrade && apk add --no-cache \
    libxml2>=2.13.4-r6 \
    libssl3>=3.5.6-r0 \
    libcrypto3>=3.5.6-r0 \
    && rm -rf /var/cache/apk/*

# Replace the base image's vendored gosu (old Go) with our static build compiled
# under the patched toolchain, then make sure it still runs.
COPY --from=gosu-builder /out/gosu /usr/local/bin/gosu
RUN /usr/local/bin/gosu postgres true

# Set environment variables for PostgreSQL
ENV POSTGRES_DB=nowplaying
ENV POSTGRES_USER=nowplaying_user
ENV POSTGRES_PASSWORD=nowplaying_password

# Expose the PostgreSQL port
EXPOSE 5432

# Use a volume for persistent data storage
VOLUME ["/var/lib/postgresql/data"]
