# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo-powered static blog site (DazzLog) that deploys to GitHub Pages. The site uses the hugo-ficurinia theme and focuses on programming content and technical articles.

**Key Architecture:**
- **Static Site Generator**: Hugo with hugo-ficurinia theme
- **Content Structure**: Markdown files in `content/posts/` with date-prefixed directories
- **Deployment**: GitHub Actions workflow builds and deploys to GitHub Pages
- **Development**: Docker-based local development environment

## Development Commands

### Local Development
```bash
# Start development server (preferred method)
make serve

# Stop development server  
make stop

# Manual Docker approach
docker compose up -d
docker compose stop
```

### GitHub Actions Validation
```bash
# Test GitHub workflow locally before pushing
make ci-github
```

### Content Management
- **Posts**: Located in `content/posts/YYYY-MM-DD_slug/index.md`
- **Static Assets**: Place in `static/` directory
- **Images**: Co-located with posts in their respective directories

## Content Structure

### Post Format
Posts follow this directory structure:
```
content/posts/YYYY-MM-DD_title-slug/
├── index.md           # Main content with frontmatter
├── image.jpg          # Hero image (optional)
└── other-assets.*     # Any additional files
```

### Frontmatter Requirements
```yaml
---
title: "Post Title"
date: YYYY-MM-DDTHH:MM:SS+02:00
tags: [tag1, tag2, tag3]
draft: false           # Set to true for unpublished posts
comments: true
toc: true             # Enable table of contents
---
```

## Theme Configuration

**Hugo-Ficurinia Theme Features:**
- Paper card style enabled (`paperCards = true`)
- Search functionality enabled
- Cactus.chat comments integration
- Custom SCSS in `assets/scss/`
- Responsive design with content width of 1000px

**Key Theme Files:**
- `config.toml`: Main configuration
- `assets/scss/custom.scss`: Custom styling
- `layouts/partials/inject/head.html`: Custom head injections

## Deployment

**Automatic Deployment:**
- Pushes to `main` branch trigger GitHub Actions workflow
- Hugo builds with `--minify --theme=hugo-ficurinia`
- Deploys to GitHub Pages with custom domain `blog.dazzlog.de`

**Manual Validation:**
- Use `make ci-github` to test workflow locally with `act`
- Validates before push to prevent "push-and-pray" deployments

## File Organization

**Important Directories:**
- `content/`: All content (posts, about, talks, etc.)
- `static/`: Static assets (images, favicon, etc.)
- `themes/hugo-ficurinia/`: Theme files (do not modify)
- `assets/scss/`: Custom SCSS files
- `layouts/`: Theme overrides and custom layouts
- `public/`: Generated site (git-ignored)

**Special Files:**
- `compose.yaml`: Docker development environment
- `Makefile`: Development commands
- `.github/workflows/`: CI/CD configuration

## Content Guidelines

- Use descriptive, date-prefixed directory names for posts
- Include relevant tags for discoverability
- Add hero images for visual appeal
- Enable TOC for longer technical posts
- Co-locate assets with content when possible

## Development Notes

- Hugo server runs on port 1313 in Docker
- Theme uses JetBrains Mono font
- Syntax highlighting with Dracula theme
- Search index automatically generated
- RSS feed available at `/index.xml`

## Blog Posts Reference

### All Blog Posts (Chronological)

1. **2022-12-26** - "Hello, world!"
   - **File:** `content/posts/2022-12-26_hello-world/index.md`
   - **Topics:** first blog post, introduction

2. **2022-12-27** - "Goodbye Jekyll, hello Hugo"
   - **File:** `content/posts/2022-12-27_goodbye-jekyl-hello-hugo/index.md`
   - **Topics:** jekyll, hugo, blog migration, github, github-actions, continuous deployment, git, static site generators

3. **2022-12-28** - "Build and push docker images to ghcr.io with GitHub Actions"
   - **File:** `content/posts/2022-12-28_build-and-push-docker-images-to-ghcr-with-github-actions/index.md`
   - **Topics:** docker, github, github-actions, github-packages, continuous deployment, container registry

4. **2023-01-02** - "Environment variables in a dockerized Symfony"
   - **File:** `content/posts/2023-01-02_environment-variables-in-a-dockerized-symfony/index.md`
   - **Topics:** docker, docker-compose, ci/cd, symfony, dotenv, env_file, 12-factor app, containerization

5. **2024-08-19** - "Build your own s6-overlay base image"
   - **File:** `content/posts/2024-08-19_base-image-with-s6-overlay/index.md`
   - **Topics:** s6-overlay, docker, devops, process management, container lifecycle

6. **2024-12-06** - "Manage s6-overlay setup with s6-cli"
   - **File:** `content/posts/2024-12-06_s6-cli/index.md`
   - **Topics:** s6-overlay, docker, devops, ci/cd, golang cli tools, service management

7. **2025-03-26** - "Mastering Multi-Process Containers: Running PHP Applications with s6-overlay"
   - **File:** `content/posts/2025-03-26_running-php-in-a-multi-process-container/index.md`
   - **Topics:** s6-overlay, docker, devops, ci/cd, php, multi-process containers, php-fpm, nginx

8. **2025-04-23** - "Clean Symfony: Symfony + Clean Architecture + DDD"
   - **File:** `content/posts/2025-04-23_clean-symfony/index.md`
   - **Topics:** symfony, php, clean-architecture, rector, phpunit, renovatebot, dependabot, deprecation, ci/cd, tech-debt, phpstan, deptrac, domain-driven design

9. **2025-08-17** - "Summer Projects 2025: 3 websites in 3 weeks" *(Draft)*
   - **File:** `content/posts/2025-08-17_summer-projects/index.md`
   - **Topics:** claude code, workflow, ai, zola, bulma, tailwindcss, css, markdown, static site generators

### Main Topic Categories

**Docker & Containerization:**
- Docker image building and deployment
- GitHub Container Registry (ghcr.io)
- Environment variable management
- Multi-process containers with s6-overlay
- Process supervision and lifecycle management

**Symfony & PHP:**
- Environment configuration in containerized environments
- Clean Architecture and Domain-Driven Design
- Multi-process PHP applications (PHP-FPM + NGINX)
- Testing, static analysis, and code quality tools

**DevOps & CI/CD:**
- GitHub Actions workflows
- Container deployment strategies
- Process management with s6-overlay
- Development tooling and automation

**Static Site Generators:**
- Blog migration from Jekyll to Hugo
- Zola static site generator
- AI-assisted development workflows
- CSS frameworks (Bulma, TailwindCSS)

**Development Tools:**
- s6-cli for container service management
- Claude Code for AI-assisted development
- Build automation and deployment pipelines
- Content management and validation