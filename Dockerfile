FROM python:3.13-slim

LABEL org.opencontainers.image.source="https://github.com/ChangjoSung/readme-motion-gallery"
LABEL org.opencontainers.image.description="README Motion Gallery GitHub Action"

WORKDIR /app

COPY pyproject.toml README.md LICENSE ./
COPY src ./src

RUN pip install --no-cache-dir .

ENTRYPOINT ["rmg"]
