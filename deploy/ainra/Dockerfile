# syntax=docker/dockerfile:1
# A live AINRA registrar for MyLiquid: AINRA's own registrar-box, built from source, accredited by a TEST-ROOT on
# first start (see entrypoint.sh). Used by compose.yaml; docs/AINRA-LIVE.md explains it.
FROM rust:1.97-slim-bookworm AS build
ARG AINRA_REPO=https://github.com/JacobJandon/ainra.git
ARG AINRA_REF=main
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch "$AINRA_REF" "$AINRA_REPO" /src
WORKDIR /src
RUN cargo build --release -p ainra-services --bin registrar-box -p ainra-ceremony --bin accredit

FROM debian:bookworm-slim AS run
RUN useradd -r -u 10001 ainra \
  && apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data /anchors && chown ainra /data /anchors
COPY --from=build /src/target/release/registrar-box /src/target/release/accredit /usr/local/bin/
COPY entrypoint.sh /usr/local/bin/ainra-entrypoint
USER 10001
EXPOSE 4950
HEALTHCHECK --interval=10s --timeout=3s --retries=12 \
  CMD curl -fsS http://127.0.0.1:4950/health > /dev/null && test -s /anchors/directory.json || exit 1
ENTRYPOINT ["ainra-entrypoint"]
