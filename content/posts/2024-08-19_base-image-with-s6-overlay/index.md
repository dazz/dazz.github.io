---
title: Build your own s6-overlay base image
date: 2024-08-19T23:42:23+01:00
tags:
  - s6-overlay
  - docker
  - devops
image: s6-overlay.webp
comments: true
draft: false
---

S6-overlay is a container-focused process manager that offers end-to-end management of the container's lifecycle, from initialization to graceful shutdown.

To make use of s6-overlay we need to add the binaries to our container by adding, extracting and then moving them to the directory where they are expected.

```Dockerfile
ADD https://github.com/just-containers/s6-overlay/releases/download/3.2.0.0/s6-overlay-noarch.tar.xz /tmp  
ADD https://github.com/just-containers/s6-overlay/releases/download/3.2.0.0/s6-overlay-x86_64.tar.xz /tmp
```

## Update dependencies

When adding the s6-overlay sources to in a `Dockerfile` we want to make sure that we get notified when a new version 
is available, so we can always be up-to-date with all our libraries. This can be achieved by adding a section to our [Renovate](https://github.com/renovatebot/renovate) or [Dependabot](https://github.com/dependabot) config, a rule to match

## Version checker know about Docker `FROM`
If we leverage the `FROM` of docker to include our sources we would not need to add anything. I already use the way of loading sources via images in several places:

### include composer
```Dockerfile
FROM composer:2.7.7 AS composer
COPY --from=composer /usr/bin/composer /usr/bin/composer
```

### include extension-installer
```Dockerfile
FROM mlocati/php-extension-installer:2.2.16 AS php-extension-installer
COPY --from=php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions \
  xdebug \
  zip \
;
```

But there is no base image for s6-overlay from justcontainers/s6-overlay . There are some other vendors, but they are opinionated and do more things that are helpful to their case.

## Build your own s6-overlay base image

```Dockerfile
FROM alpine:3 AS s6

ARG TARGETARCH
ARG TARGETVARIANT
ARG S6_RELEASE

RUN apk add --no-cache curl jq \
    && if [ -z ${S6_RELEASE} ]; then \
         S6_RELEASE=$(curl -s https://api.github.com/repos/just-containers/s6-overlay/releases/latest | jq -r '.tag_name' | cut -c2-); \
       fi \
    && S6_PLATFORM=$(case "${TARGETARCH}/${TARGETVARIANT}" in \
         "arm/v7")   echo "armhf";; \
         "arm64/")   echo "aarch64";; \
         *)          echo "x86_64";; \
       esac) \
    && echo "Using s6 release ${S6_RELEASE} platform ${S6_PLATFORM}" \
    && curl -sSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_RELEASE}/s6-overlay-noarch.tar.xz" -o "/tmp/s6-overlay-noarch.tar.xz" \
    && curl -sSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_RELEASE}/s6-overlay-${S6_PLATFORM}.tar.xz" -o "/tmp/s6-overlay-${S6_PLATFORM}.tar.xz" \
    && curl -sSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_RELEASE}/s6-overlay-noarch.tar.xz.sha256" -o "/tmp/s6-overlay-noarch.tar.xz.sha256" \
    && curl -sSL "https://github.com/just-containers/s6-overlay/releases/download/v${S6_RELEASE}/s6-overlay-${S6_PLATFORM}.tar.xz.sha256" -o "/tmp/s6-overlay-${S6_PLATFORM}.tar.xz.sha256" \
    && cd /tmp \
    && sha256sum -c s6-overlay-noarch.tar.xz.sha256 \
    && sha256sum -c s6-overlay-${S6_PLATFORM}.tar.xz.sha256 \
    && mkdir -p /s6/root \
    && tar -C /s6/root -Jxpf /tmp/s6-overlay-noarch.tar.xz \
    && tar -C /s6/root -Jxpf /tmp/s6-overlay-${S6_PLATFORM}.tar.xz

FROM scratch
COPY --from=s6 /s6/root /s6/root
```

It
- downloads for the specified architecture
- asserts the checksum!
- uses a fresh layer to copy everything

This can be built with:
```bash
docker build --no-cache --build-arg S6_RELEASE=3.2.0.0 -t hakindazz/s6-overlay-base:3.2.0.0 .
```

Or you can pull the image to check it out:
```shell
docker pull hakindazz/s6-overlay-base:3.2.0.0
```

## Include via docker `FROM`
The best part: You can now include the versioned sources via docker `FROM`:

```Dockerfile
FROM hakindazz/s6-overlay-base AS s6-overlay
FROM alpine3

COPY --from=s6-overlay /s6/root /

ENTRYPOINT ["/init"]
```

## Happy image building!!!

### Some sources:
- https://github.com/just-containers/s6-overlay
- https://hub.docker.com/r/hakindazz/s6-overlay-base
- https://github.com/dependabot
- https://docs.renovatebot.com/modules/datasource/github-releases/
