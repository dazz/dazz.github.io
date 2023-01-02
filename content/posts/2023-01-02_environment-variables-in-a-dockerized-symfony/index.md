---
title: "Environment variables in a dockerized Symfony"
date: 2023-01-02T19:24:18+01:00  
tags: [docker, docker-compose, ci, cd, symfony, dotenv, env_file]  
image: claudio-testa-FrlCwXwbwkk-unsplash-1.jpg
comments: true
---  

I have developed a Symfony Web-Application and I run it locally in a dockerized environment with docker-compose. Now this app is going to be deployed to production as a docker container. But in production the handling of environment variables and how they are passed to the container during development is different. I was searching for options and I found there are at least

## 7 ways to pass environment variables to a container
1. `ENV` in dockerfile
2. Dockerfile args passed at build time to `ENV`
3. ENV passing in docker run as option
4. Env_file in docker run as option
5. Environment variables in `docker-compose.yml`
6. Env_file in docker compose for each service
7. `.env` in docker compose substitutes variables in `docker-compose.yml`

This is my journey figuring out which option matches my requirements.

This is a good summary if you're interested: [Environment Variables in Container vs. Docker Compose File](https://rotempinchevskiboguslavsky.medium.com/environment-variables-in-container-vs-docker-compose-file-2426b2ec7d8b)

## The big picture
* We use multiple services which all need to work together
* We deploy and run services in different compositions for each environment
* Each service has their own sensitive data
* Each service might be a different technology or has a different tech stack

## The requirements
All services regardless of which technology they use, should have one streamlined way of how the environment variables should be passed.

## This is what I recommend
* The infrastructure config should be kept in env files but not in the same directory as the application
* Each service gets its own env file to be completely independent of each other, and it gets explicitly set
* During development each service gets the env variables passed via env file
* Every project that has a `docker-compose.yml` moves the application into an `app` directory to separate the application from its infrastructure configuration
* We remove the DotEnv component from symfony and define each environment variable that we expect as parameter so the app tells us instantly when a key-value pair is missing
* In development credentials can be added to the VCS
* in all other envs the credentials can be either stored and linked on the server or be read from a vault

## The implementation

In Symfony the DotEnv component is default enabled in the frontcontroller, so when a new app is created there is always a `.env` file at the project root created with it. [Read more in the documentation.](https://symfony.com/doc/current/configuration.html#configuring-environment-variables-in-env-files)

It is not the same `.env` that `docker-compose.yml` expects.

Docker compose is also using a `.env` file to replace the variables in the `docker-compose.yml` if it is located in the same directory. If you don't know that and put the web apps `.env` file in the same place then you accidentaly might overwrite variables when you think you just updated a variable for the Symfony application.

We have two different trades here that both want to use the `.env` file and both might, but not at the same time, obviously.

### The directory tree

```
.
├── app
│   ├── assets
│   ├── bin
│   ├── ci
│   ├── config
│   ├── migrations
│   ├── node_modules
│   ├── public
│   │   └── index.php
│   ├── src
│   ├── templates
│   ├── tests
│   ├── var
│   ├── vendor
│   ├── composer.json
│   ├── composer.lock
│   ├── Makefile
│   ├── package.json
│   ├── symfony.lock
│   ├── webpack.config.js
│   └── yarn.lock
├── devops
│   ├── database
│   ├── docker
│   │   └── frankenphp
│   │        └── Dockerfile
│   └── env
│       ├── dev.app.env
│       └── dev.database.env
├── CONTRIBUTING.md
├── docker-compose.prod.yml
├── docker-compose.yml
├── Makefile
└── README.md
```

The application code moved into the `./app` directory to be completely separate from the code/config that defines the infrastructure. You see there is no `.env` file left from Symfony.

## The docker-compose.yml

```yaml
version: '3.9'  
services:  
  app:  
    image: ghcr.io/c-base/cbag3:dev-latest  
    build:  
      dockerfile: ./devops/docker/frankenphp/Dockerfile  
      target: dev  
    env_file: ./devops/env/dev.app.env  
    ports:  
      - 80:80  
      - 443:443  
    volumes:  
      - './app:/app'  
  
  database:  
    image: postgres:alpine  
    container_name: database  
    env_file: ./devops/env/dev.database.env  
    ports:  
      - 15432:5432  
    volumes:  
      - ./devops/database:/var/lib/postgresql
```

Each service gets its own `env_file` , the `.env` coud be used to configure variables insider the `docker-compose.yml` but until we need it, it will be left out.

## Disable DotEnv in frontcontroller  and console

```php
# app/public/index.php
<?php  
  
use Cbase\App\Kernel;  
  
$_SERVER['APP_RUNTIME_OPTIONS']['disable_dotenv'] = true; 
  
require_once dirname(__DIR__).'/vendor/autoload_runtime.php';  
  
return function (array $context) {  
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);  
};
```

```php
# app/bin/console
#!/usr/bin/env php  
<?php  
  
use Cbase\App\Kernel;  
use Symfony\Bundle\FrameworkBundle\Console\Application;  
  
$_SERVER['APP_RUNTIME_OPTIONS']['disable_dotenv'] = true;  
  
require_once dirname(__DIR__) . '/vendor/autoload_runtime.php';  
  
return function (array $context) {  
    $kernel = new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);  
  
    return new Application($kernel);  
};
```

See described here: [Configure Symfony Runtime Using Options](https://symfony.com/doc/current/components/runtime.html#using-options)

### Keep DotEnv for tests
For now, we leave the DotEnv for the tests since those environment variables won't change regardless of where they are executed and they will be executed in the dev container. We could change that by running the tests in their own container, but for now keep the `.env.test`.

## Don't forget to add the parameters in services.yml

```yaml
# app/config/services.yaml
parameters:  
    images.upload.directory: '%env(resolve:IMAGES_UPLOAD_DIRECTORY)%'

services:  
    _defaults:  
        autowire: true
        autoconfigure: true
        bind:
            string $imagesUploadDirectory: '%images.upload.directory%'
```
Since every environment has its own env_file there is the danger of forgetting to add an environment variable to the other environments. In order to fail early we load the environment variable at the start of the application and not at the point in time when the service is required as that leads to undiscovered failures.

## Conclusion
We removed the DotEnv from Symfony and will miss out on all the functionality that came with it, but chose using the `env_file` as it can be used for running a container and it can be configured in the `docker-compose.yml`.
The environment configs can be dumped from secret vaults regardless of the tech-stack that the cloud has to offer or kept in a shared directory that won't change between deployments.
There will be **one** explicit way of how each service will get configuration regardless of their environment or tech stack.

## Happy continuously deploying everyone  
