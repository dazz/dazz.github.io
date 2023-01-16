---
title: "Environment variables in a dockerized Symfony"
date: 2023-01-02T19:24:18+01:00  
tags: [docker, docker-compose, ci, cd, symfony, dotenv, env_file]  
image: amy-humphries-2M_sDJ_agvs-unsplash.jpg
comments: true
draft: false
---  

I have developed a **Symfony Web-Application**, and it runs locally in a dockerized environment with docker-compose. This app is going to be deployed to production as a docker container. 
In production the handling of environment variables and how they are passed to the container during development is different.

## 12 Factor App
A few points from the [12factor methodology](https://12factor.net):

* [III. Config](https://12factor.net/config): Store config in the environment since env vars are easy to change between deploys without changing any code
* [X. Dev/prod parity](https://12factor.net/dev-prod-parity): Keep development, staging, and production as similar as possible

I was searching for options how to handle the differences how environment variables are passed and I found there are at least

## 7 ways to pass environment variables to a container
1. `ENV` in dockerfile
2. Dockerfile args passed at build time to `ENV`
3. ENV passing in docker run as option
4. Env_file in docker run as option
5. Environment variables in `docker-compose.yml`
6. Env_file in docker compose for each service
7. `.env` in docker compose substitutes variables in `docker-compose.yml`

And there is even more. If variables are passed to a container there is an order of precedence as follows:

{{< admonition type=tip title="Order of Precedence" >}}
1. Passed from the command line [`docker compose run --env <KEY[=[VAL]]>`](https://docs.docker.com/compose/envvars-precedence/../../engine/reference/commandline/compose_run#options).
2. Passed from/set in `compose.yaml` service’s configuration, from the [environment key](https://docs.docker.com/compose/envvars-precedence/../../compose/compose-file#environment).
3. Passed from/set in `compose.yaml` service’s configuration, from the [env_file key](https://docs.docker.com/compose/envvars-precedence/../../compose/compose-file#env_file).
4. Passed from/set in Container Image in the [ENV directive](https://docs.docker.com/engine/reference/builder#env).

from https://docs.docker.com/compose/envvars-precedence/
{{< /admonition >}}


# How to deal with environment variables in a dockerized Symfony

## The goal
All services regardless of which technology they use, should have one streamlined way of how the environment variables should be passed to the application.

## The big picture
* We use multiple services which all need to work together
* Services run in docker container
* We deploy and run services in different compositions for each environment
* Each service has their own sensitive data
* Each service might be a different technology or has a different tech stack

## Steps towards the goal
* The infrastructure config should be kept in env files but not in the same directory as the application
* Each service gets its own env file to be completely independent of each other, and it gets explicitly set
* During development each service gets the env variables passed via env file (`env_file` in docker-compose)
* Every project that has a `docker-compose.yml` moves the application into an `app` directory to separate the application from its infrastructure configuration
* We remove the DotEnv component from symfony and define each environment variable that we expect as parameter so the app tells us instantly when a key-value pair is missing
* In development credentials can be added to the VCS
* In all other envs the credentials can be either stored and linked on the server or be read from a vault

## The implementation

In Symfony the DotEnv component is default installed and enabled in the frontcontroller, so when a new app is created there is always a `.env` file at the project root created with it. [Read more in the documentation.](https://symfony.com/doc/current/configuration.html#configuring-environment-variables-in-env-files)

It is not the same `.env` that `docker-compose.yml` expects.
{{< admonition type=warning title="Symfony DotEnv and Docker Compose use the same file name .env" >}}
Docker compose is also using a file named  `.env` to replace the variables in the `docker-compose.yml` if it is located in the same directory. 
If you don't know that and put the web apps `.env` file in the same place then you accidentally might overwrite variables when you think you just updated a variable for the Symfony application.
{{< /admonition >}}

We have two different stacks here that both want to use the `.env` file and both might, but not at the same time, obviously. 

Since we want to use config variables explicitly and not by accident the Symfony DotEnv component is going to be removed and all config is moved inside environment variable files that are passed into the container.

### The directory tree

To ease the separation of infrastructure and code the application code moves into the `./app` directory to be completely separate from the code/config that defines the infrastructure.
You see there is no `.env` file left from Symfony. All variables have now moved to the env files inside the `devops/env` directory.


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
│       ├── app.env
│       └── database.env
├── CONTRIBUTING.md
├── docker-compose.prod.yml
├── docker-compose.yml
├── Makefile
└── README.md
```

## The docker-compose.yml

Each service gets its own `env_file` where we can configure the sensitive data for each service.

```yaml
version: '3.9'  
services:  
  app:  
    image: ghcr.io/c-base/cbag3:dev-latest  
    build:  
      dockerfile: ./devops/docker/frankenphp/Dockerfile  
      target: dev  
    env_file: ./devops/env/app.env  
    ports:  
      - 80:80  
      - 443:443  
    volumes:  
      - './app:/app'  
  
  database:  
    image: postgres:alpine  
    container_name: database  
    env_file: ./devops/env/database.env  
    ports:  
      - 15432:5432  
    volumes:  
      - ./devops/database:/var/lib/postgresql
```

{{< admonition type=tip >}}
the `.env` file can be used with docker compose to configure variables inside the `docker-compose.yml`
{{< /admonition >}}

## Disable DotEnv in frontcontroller  and console

The DotEnv component is disabled since all environment variables have already passed to the container.

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


{{< admonition type=symfony title="Symfony Runtime">}}
See described here: [Configure Symfony Runtime Using Options](https://symfony.com/doc/current/components/runtime.html#using-options)
{{< /admonition >}}

{{< admonition type=note title="run app only inside container">}}
By disabling DotEnv we will no longer be able to run the application outside the container (our local machine) unless we set all environment variables there as well. 
{{< /admonition >}}

{{< admonition type=note title="keep DotEnv for tests" >}}
For now, we leave the DotEnv for the tests since those environment variables won't change regardless of where they are executed, and they will be executed in the dev container. We could change that by running the tests in their own container, but for now keep the `.env.test`.
{{< /admonition >}}

## Don't forget to add the parameters in `services.yml`

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

Since every environment has its own env_file there is the danger of forgetting to add an environment variable to the other environments. 

{{< admonition type=tip >}}
In order to fail early we load the environment variable at the start of the application, by binding it.
If we do not bind parameters to variables but just bin them to a service we might miss that we forgot to set an 
environment variable in the env file since the service might not be loaded in every request.
{{< /admonition >}}

## Run docker  container in production with env-file

```bash
cat devops/env/app.env
# This is a comment
IMAGES_UPLOAD_DIRECTORY="%kernel.project_dir%/var/uploads"

docker run --env-file devops/env/app.env app env | grep -E 'IMAGES'
IMAGES_UPLOAD_DIRECTORY="%kernel.project_dir%/var/uploads"
```

Read more about it in the [docker documentation](https://docs.docker.com/engine/reference/commandline/run/#-set-environment-variables--e---env---env-file).

## Migration Path
There is a migration path for projects that use already many config yaml files and want to migrate to environment 
variables.

```yaml
# config/my-app.yaml
parameters:
  images.upload.directory: '%kernel.project_dir%/var/uploads'
```

```yaml
# config/services.yaml
parameters:
  env(IMAGES_UPLOAD_DIRECTORY): '%images.upload.directory%'

services:
  _defaults:
    bind:
      string $imagesUploadDirectory: '%env(resolve:IMAGES_UPLOAD_DIRECTORY)%'
```

1. the configuration processor looks up if there is an environment variable `IMAGES_UPLOAD_DIRECTORY`
2. if that is the case, it will be taken, 
3. otherwise if it is not found `'%images.upload.directory%'` will be set to the environment variable.
4. the `'%env(resolve:IMAGES_UPLOAD_DIRECTORY)%'` is bound to a variable `$imagesUploadDirectory`

Read more about configuration processors in the [Symfony documentation about "Environment Variable Processors"](https://symfony.com/doc/current/configuration/env_var_processors.html).

This would result in the following migration path:
1. Make it possible to set variables via environment variables
2. Make sure all environments set the corresponding variables
3. Remove many quirky unnecessary config files
4. win

## Conclusion
We removed the DotEnv from Symfony and will miss out on all the functionality that came with it, but chose using the `env_file` as it can be used for running a container, and it can be configured in the `docker-compose.yml`.
The environment configs can be dumped from secret vaults regardless of the tech-stack that the cloud has to offer or kept in a shared directory that won't change between deployments.
There will be **one** explicit way of how each service will get configuration regardless of their environment or tech stack.
Also, we learned that there is a simple way in Symfony to migrate to environment variables.

## Happy continuously deploying everyone  


#### More sources
* [Environment Variables in Container vs. Docker Compose File](https://rotempinchevskiboguslavsky.medium.com/environment-variables-in-container-vs-docker-compose-file-2426b2ec7d8b)

