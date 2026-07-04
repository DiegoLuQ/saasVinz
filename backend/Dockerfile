# Dockerfile for SaaS Crematorio Backend
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Poetry/Pip configurations
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

# Install system dependencies
# libpq-dev & gcc are required for psycopg2 compilation
# curl is useful for healthchecks
# postgresql-client provides pg_dump/pg_restore for la función de respaldos
#   (create_db_dump conecta por TCP a la BD; no requiere el socket de Docker)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    netcat-traditional \
    postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set work directory
WORKDIR /app

# Install Python dependencies
# Copy only requirements first to leverage Docker cache
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Copy entrypoint script and make it executable
COPY entrypoint.sh /app/entrypoint.sh
# Normalizar saltos de línea (CRLF→LF) del entrypoint y del script de provisión
# de la BD, por si se editaron en Windows, y darles permiso de ejecución.
RUN sed -i 's/\r$//' /app/entrypoint.sh /app/scripts/provision_db.sh \
    && chmod +x /app/entrypoint.sh /app/scripts/provision_db.sh

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port (default for uvicorn)
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
