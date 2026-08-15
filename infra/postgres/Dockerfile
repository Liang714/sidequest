# Postgres + PostGIS + pgvector for local dev.
# Combines both extensions on top of the official postgres image via the
# PGDG apt repo (there's no single official image shipping both).
FROM postgres:16

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-16-postgis-3 \
        postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*

COPY init.sql /docker-entrypoint-initdb.d/00-extensions.sql
