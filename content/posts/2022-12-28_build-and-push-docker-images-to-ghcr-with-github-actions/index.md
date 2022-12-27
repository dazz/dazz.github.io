---
title: "Build and push docker images to ghcr.io with GitHub Actions"
date: 2022-12-28T00:25:38+01:00
tags: [docker, github, github-actions, github-packages, cd]
image: dockergithub.png
comments: true
---

When you host your project code on GitHub and want to release it as a docker image for deployment or just publish it, the way to go are GitHub actions. It’s basically hooks that can start CI/DC workflows on repository events.

GitHub actions can be used to build and push images to GitHubs Container Registry which are reachable under [https://ghcr.io](https://ghcr.io) which is part of the package registry. The package registry is not only for docker images, it can also host quite a few other kinds of packages. In this case we’ll focus on docker images.

## **Prerequisites**:

* GitHub Repository
* Basic Knowledge about GitHub actions syntax
* Dockerfile

## The GitHub Workflow

I created a workflow in my repository under `.github/workflow/cd.md` and added the following:

```yaml
name: Continuous Delivery
on:
  push:
    branches:
      - 'main'
    tags:
      - 'v*.*.*'

jobs:
  build:
    name: Buid and push Docker image to GitHub Container registry
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - name: Checkout the repository
        uses: actions/checkout@v3

      - name: Docker Setup Buildx
        uses: docker/setup-buildx-action@v2.2.1

      - name: Docker Login
        uses: docker/login-action@v2.1.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker images
        uses: docker/build-push-action@v3.2.0
        env:
          REGISTRY: ghcr.io
          IMAGE_NAME: ${{ github.repository }}
        with:
          context: .
          file: ./Dockerfile
          target: final
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

## Let’s go through the important parts:

**Permissions**: Actions have access to the repo while running. We should always make sure by setting the permissions, that actions have the minimum access they require. See here: [permissions for the github_token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)

**Step 1-2: Checkout the code** and Setup docker**

**Step 3: Login to GitHub Container Registry**: This is where the interesting part starts. The `github.actor` that will be the user that triggered the workflow. For password use `secrets.GITHUB_TOKEN` which is a temporary token which is automatically generated for this workflow. See here: [publishing images to github-packages](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images#publishing-images-to-github-packages)

**Step 4: Build and push Docker images**: If the registry that you want to push to belongs to an organization then you will need to add permission to create packages.
If it lives under your own handle you don't need to configure anything more since you are then the owner already and the `secrets.GITHUB_TOKEN` has all the permissions granted by that.

Straight forward the action will consume the `Dockerfile` build to the target build step that you can define. In docker there is this thing that the repository whre the image will be hosted is also part of the tag. Setting the image to the repository name will create an image with the following tag: `ghcr.io/OWNER/IMAGE_NAME:latest
Read more here: [pushing container images](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#pushing-container-images)

## Happy shipping \\o/