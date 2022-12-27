---
title: "Goodbye Jekyll, hello Hugo"
date: 2022-12-27T17:44:27+01:00
tags: []
image: hugo.png
comments: true
---

I started this blog in March 2013 when I was working for ImagineEasy when I had a few ideas to write down on how I'd work with Doctrine Repositories. I still like the idea, but I'd probably do it a bit different today. The blog and also how I'd work with doctrine.

At the time Jekyll was the way to handle a static file blog. Since then, again, a few things have changed. GitHub is now owned by Microsoft and there are GitHub Actions.

Jekyll still exists, but all in all I think it was a modern choice at a different time. So what's next then? I must admit I did not look far, it was more a Zeitgeist thing that just ran my way.

Someone mentioned HUGO as a blog that you can easily publish to from Obsidian, I'm not planning on using that particular feature, but I looked [HUGO](https://gohugo.io/about/) up, and it seems that it is exactly what I was to lazy to look for. A static site generator that uses markdown and can be build by GitHub Actions.

There is already a huge list of possible themes and many look promising from the thumbnail, but feature wise there is a huge difference. What to look out for:

* How far is the template deviating from the default, in case you ever want to change the template.
* Which features do you want/need and are they already included, is it complicated to add them  later?
* Are there existing installations that are actively used, so they can be used as a reference
* Is there a reference/documentation on how to install it on the host
* How do you publish new content, are there examples/documentation?
* What is the version of the technologies in the deploy chain, old?

For every point there is also the question of how complicated each step is.

As a reference, this is what I ended up doing:

## Local setup

### install hugo
```bash
sudo apt-get install hugo
```

### create a new site
see the [official Quick Start](https://gohugo.io/getting-started/quick-start/) for more infos.
```bash
hugo new site dazz.github.io
cd dazz.github.io
git init
```

### add a theme
Look at all the [blog themes](https://themes.gohugo.io/tags/blog/) hugo already has listed.

I chose `hugo-ficurinia` as it has the following enabled: tags, categories, fonts I like, simply deploys and looks as promised.

Add the theme as submodule:
```bash
git submodule add https://gitlab.com/gabmus/hugo-ficurinia themes/hugo-ficurinia
```

And run a local server to test everything
```bash
hugo server -t hugo-ficurinia
```

### add a blog post
There is probably nothing much to see, so let's add a new post as draft.
```bash
hugo new posts/hello-world/index.md
```
Make sure to read about how to [organize the content](https://gohugo.io/content-management/organization/) in directories.

### run the server
And run the server again and also include the draft post
```bash
hugo server -t hugo-ficurinia --buildDrafts
```

When you run just `hugo -t hugo-ficurinia`  the site will be build and dumped to `public/`. That is what we will later do to deploy the site.

Time to commit all the changed files and add the remote to push everything
```bash
git remote add origin git@github.com:dazz/dazz.github.io.git
git push origin main
```
There will nothing happen yet as we still need to add the github workflow

## Deploy to GitHub pages via GitHub actions

```bash
mkdir -p .github/workflows
touch .github/workflows/pages-deploy.yml
```


```yaml
# file: .github/workflows/pages-deploy.yml
name: "Build and Deploy gh-pages"  
on:  
  push:  
    branches:  
      - main  
    paths-ignore:  
      - .gitignore  
      - README.md  
      - LICENSE  
  
  # Allows you to run this workflow manually from the Actions tab  
  workflow_dispatch:  
  
permissions:  
  contents: write # needed to push to the gh-pages branch
  pages: write  
  id-token: write  
  
# Allow one concurrent deployment  
concurrency:  
  group: "pages"  
  cancel-in-progress: true  
  
jobs:  
  build:  
    runs-on: ubuntu-latest  
  
    steps:  
  
      # Step 1 - Checks-out your repository under $GITHUB_WORKSPACE  
      - name: Checkout  
        uses: actions/checkout@v3  
        with:  
          fetch-depth: 0  
          submodules: true  
  
      # Step 2 - Sets up the latest version of Hugo  
      - name: Hugo setup  
        uses: peaceiris/actions-hugo@v2.6.0  
        with:  
          extended: true  
          hugo-version: 'latest'  
  
      # Step 3 - Adds a cache  
      - uses: actions/cache@v2  
        with:  
          path: /tmp/hugo_cache  
          key: ${{ runner.os }}-hugomod-${{ hashFiles('**/go.sum') }}  
          restore-keys: |  
            ${{ runner.os }}-hugomod-  
  
      # Step 4 - Clean and don't fail  
      - name: Clean public directory  
        run: rm -rf public/*  
  
      # Step 5 - Builds the site using the latest version of Hugo  
      # Also specifies the theme we want to use      
      - name: Build  
        run: hugo --minify --theme=hugo-ficurinia  
  
      # Step 6 - Push our generated site to our gh-pages branch  
      - name: GitHub Pages action  
        uses: peaceiris/actions-gh-pages@v3.9.0  
        with:  
          github_token: ${{ secrets.GITHUB_TOKEN }}  
          publish_dir: ./public  
          cname: dazz.github.io
```

Read more about the options you get when using [peaceiris/actions-hugo](https://github.com/marketplace/actions/hugo-setup) and [peaceiris/actions-gh-pages](https://github.com/marketplace/actions/github-pages-action).

## Customization
Now the customization party can start. All the options are listed in the `config.toml`.

## [Happy blogging \\o/](https://dazz.github.io)