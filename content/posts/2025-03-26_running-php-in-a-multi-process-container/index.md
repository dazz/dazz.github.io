---
title: "Mastering Multi-Process Containers: Running PHP Applications with s6-overlay"
date: 2025-03-26T20:42:23+01:00
tags:
  - s6-overlay
  - docker
  - devops
  - ci
image: multi-process-container.webp
comments: true
draft: false
toc: true
---

## The Dockerized Development Setup

Containerization has completely changed how we build and deploy PHP applications. With Docker, you can make sure that your production environment behaves just like your local setup, which means fewer surprises when you go live.

In this post, we're diving into running Symfony in a container that runs multiple processes using s6-overlay. We'll explain why having more than one process in a container can be important, how this idea is different from Docker's usual “one process per container” rule, and how s6-overlay makes it easier to run everything together.

Whether you're new to s6-overlay or looking to improve your container setup, this guide walks you through practical, step-by-step tips to help you run your Symfony apps more smoothly. Enjoy discovering a simpler, more flexible way to work with containers!

## Why Two Containers?

Typically, a dockerized PHP development environment consists of:

- **PHP-FPM Container:** Runs the PHP application.
- **NGINX Container:** Serves static files and proxies requests to PHP-FPM.

And the `docker-compose.yaml` looks like this:

```yaml
# docker-compose.yaml
services:
  app:
    image: php:8.4.1-fpm-alpine
    volumes:
      - ./app:/var/www/html

  nginx:
    image: nginx:latest
    ports:
      - "8000:80"
    volumes:
      - ./app/public:/var/www/html/public
    depends_on:
      - app
```

This setup is common, it comes because of two primary reasons:

- **Lack of a Built-in Web Server:**  
  PHP does not include a production-grade HTTP server. Unlike languages like Go or Ruby, PHP relies on external servers (NGINX/Apache) to manage HTTP requests.

- **Docker’s “One Process per Container” Mantra:**  
  Docker traditionally encourages running a single process per container. The reason for that I will explain a bit 
  further down. This leads to separate containers for each service, complicating inter-process communication and health 
  monitoring.

{{< mermaid >}}
sequenceDiagram
    participant Client
    participant NGINX
    participant PHP-FPM

    Client->>NGINX: Send HTTP Request (e.g., /index.php)
    NGINX->>PHP-FPM: Forward Request via FastCGI
    PHP-FPM->>PHP-FPM: Process PHP Script
    PHP-FPM->>NGINX: Return Output (HTML, JSON, etc.)
    NGINX->>Client: Send HTTP Response
{{< /mermaid >}}


## Why is it a problem running two containers?
Running multiple containers isn't inherently problematic. Some hosting platforms limit multi-container deployments, pushing developers toward single-container solutions. But this isn't a technical limitation — it's often a constraint of hosting.
### Build-time dependency between containers
When your PHP application generates static assets that your webserver needs to serve, you're essentially creating a build-time dependency between containers. This isn't automatically bad, but it reveals potential architectural weaknesses.

The core problem isn't multiple containers—it's mixing concerns. Static assets should be treated as build artifacts, not runtime-generated content. Containers should be immutable; writing files during runtime contradicts container best practices.

## Overcoming the One Process Per Container Constraint

### Understanding Container Isolation
{{< admonition type=tldr title="tldr;" >}}
In Docker containers, the first process (PID 1) is responsible for handling system signals and managing child processes. If `PID 1` doesn't properly handle termination signals like `SIGTERM`, it can lead to issues such as zombie processes—completed processes that remain in the process table, potentially causing resource exhaustion.
{{< /admonition >}}

Containers provide isolation by encapsulating an application's filesystem, networking, and process tree. In Docker, the first process started within a container is assigned process ID 1 (`PID 1`). This process becomes the init process for the container, responsible for handling system signals and managing child processes.

Docker relies on sending signals like `SIGTERM` and `SIGKILL` to the container's `PID 1` to manage lifecycle events 
such as stopping or restarting the container. However, if the process running as `PID 1` isn't designed to handle 
these signals properly, it may not terminate gracefully upon receiving a termination signal. This can lead to issues like zombie processes — processes that have completed execution but still have an entry in the process table because their parent hasn't acknowledged their termination. Zombie processes can accumulate over time, leading to resource exhaustion and degraded system performance.

To mitigate these issues, it's important to ensure that the process running as `PID 1` in your container can handle system signals appropriately and manage child processes effectively. One approach is to use a minimal init system or an init-like process as `PID 1`. These init systems are designed to forward signals to child processes and reap zombie processes, ensuring proper process management within the container. For instance, using the exec command in shell scripts can replace the shell process with the intended application process, ensuring it becomes `PID 1` and can handle signals directly.

Alternatively, Docker provides the `--init` flag, which runs an init process as `PID 1`. This init process is responsible for forwarding signals and reaping zombie processes, thereby improving the container's process management.

By addressing the `PID 1` signal handling and zombie reaping issues, you can ensure that your containerized applications are more robust, responsive to lifecycle events, and free from resource leaks caused by lingering zombie processes.

{{< mermaid >}}
sequenceDiagram
    participant Host as Docker Host
    participant Container as Docker Container
    participant PID1 as PID 1 Process
    participant Child as Child Process

    Host->>Container: docker stop app
    Container->>PID1: SIGTERM
    alt PID1 handles SIGTERM
        PID1->>Child: Forward SIGTERM
        Child->>PID1: Termination Acknowledgment
        PID1->>Container: Exit
    else PID1 does not handle SIGTERM
        Note right of PID1: Child processes may become zombies
        Host->>Container: SIGKILL after timeout
        Container->>PID1: SIGKILL
        PID1->>Child: Terminate abruptly
    end
{{< /mermaid >}}

What you see here is that when you execute the `docker stop` command, Docker initiates a graceful shutdown process 
for the specified container. It first sends the `SIGTERM` signal to the main process inside the container, allowing the application to perform necessary cleanup operations. Docker then waits for a default grace period of 10 seconds. If the process does not terminate within this timeframe, Docker sends the `SIGKILL` signal to forcefully stop the container.

### The Role of s6-overlay

{{< admonition type=abstract title="s6-overlay" >}}
> s6-overlay is an easy-to-install (just extract a tarball or two!) set of scripts and utilities allowing you to use existing Docker images while using s6 as a pid 1 for your container and process supervisor for your services.

https://github.com/just-containers/s6-overlay
{{< /admonition >}}

- **Easy Integration:** Seamlessly integrate S6-overlay into Docker images with a straightforward installation 
  process. Just extract a 
  tarball or two!
- **Proper PID 1 functionality**: It ensures that all child processes are managed and that signals are handled 
  gracefully. You'll never have zombie processes hanging around in your container, they will be properly cleaned up.
- **Versatile Process Management:** S6-overlay efficiently handles both one-time tasks and long-running processes,
  making it versatile for containerized tasks.
- **Dependency Control:** Establish dependencies between processes to ensure orderly execution in complex application
  stacks.
- **Sequence Management:** Control the start and stop sequence of processes, streamlining container operations.
- **Environment Variable Templating:** Easily customize process behavior with environment variables, adapting to 
  different environments.
- **Log Management:** Built-in log rotation simplifies log file management within container environments. the 
  supervision system 
  automatically maintains an open pipe between the producer's stdout and the logger's stdin.
- **Graceful Shutdown:** Ensure data integrity with graceful process shutdown and the ability to execute custom 
  scripts before container 
  shutdown.
- **Multi-Arch Support:** S6-overlay accommodates the diverse landscape of container [platforms with support](https://platformengineers.io/services/infrastructure-maintenance-and-support) for multi-architecture container images.

## Setting Up s6-overlay

### Installation

The installation of s6-overlay is straightforward. In your Dockerfile, you typically add and extract two tarballs (one for noarch and one for your architecture). For example:

```dockerfile
FROM busybox

ARG RELEASE_PATH="https://github.com/just-containers/s6-overlay/releases/download/v3.2.0.2"

ADD $RELEASE_PATH/s6-overlay-noarch.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-noarch.tar.xz

ADD $RELEASE_PATH/s6-overlay-x86_64.tar.xz /tmp
RUN tar -C / -Jxpf /tmp/s6-overlay-x86_64.tar.xz

ENTRYPOINT ["/init"]
```

Here, `/init` becomes the container’s entrypoint and will be responsible for process supervision.

(If you want to see a simpler setup jump to [s6-overlay-base image](#s6-overlay-base-image))

### Basic Usage

With s6-overlay installed, your container’s command can be defined in two ways:

{{< admonition type=info title="Using ENTRYPOINT with `/init`" >}}
This enables s6-overlay to take over process supervision right from startup.
{{< /admonition >}}

{{< admonition type=info title="Using `CMD` for your Application" >}}
You can set your command (e.g., running PHP scripts) with CMD. This allows you to override the default behavior while still benefiting from s6-overlay’s supervision.
{{< /admonition >}}

For example:

```dockerfile
ENTRYPOINT ["/init"]
CMD ["php", "bin/console", "messenger:consume", "scheduler_default", "--time-limit=300"]
```

In this configuration, even if you override the command, s6-overlay will continue to manage your process lifecycle.

## Service Types in s6-overlay

s6-overlay supports three service types that let you control how processes run within your container:

1. **Oneshot**: Runs once and exits (e.g., initialization tasks).
2. **Longrun**: Supervised by s6 (e.g., NGINX or PHP-FPM).
3. **Bundle**: Groups related services together.

Let's look into all of them next:

### 1. Oneshot

- **Purpose:** Run a task once (e.g., initialization or migration scripts).
- **Configuration Files:**
    - `type` (contains “oneshot”)
    - `up` (path to the script)
- **Behavior:** The service runs, completes its task, and then exits.

### 2. Longrun

- **Purpose:** Manage long-running processes (daemons such as PHP-FPM or NGINX).
- **Configuration Files:**
    - `type` (contains “longrun”)
    - `run` (executable command/script)
- **Behavior:** s6-overlay supervises these processes and automatically restarts them if they exit unexpectedly.

### 3. Bundle

- **Purpose:** Group related services so they can be started or stopped together.
- **Configuration Files:**
    - `type` (contains “bundle”)
    - `contents.d` (directory listing the grouped services)
- **Behavior:** Bundles allow you to manage multiple services as a single unit.

## A Step-by-Step Example: Running PHP-FPM and NGINX

### 1. Directory Structure

Create the service root directory:

```shell
mkdir -p /etc/s6-overlay/s6-rc.d
```

Then add the `user` bundle, which s6-overlay expects and uses as the entry point for all service configurations:

```shell
/etc/s6-overlay/s6-rc.d
└── user
    ├── contents.d # Directory for service files
    └── type  # File contains string "bundle"
```

### 2. Defining the PHP-FPM Service

Create the PHP-FPM service configuration:

```shell
/etc/s6-overlay/s6-rc.d
├── svc-php-fpm
│   ├── run
│   └── type  # Contains "longrun"
└── user
    └── contents.d
        └── svc-php-fpm
```

And in `/etc/s6-overlay/s6-rc.d/svc-php-fpm/run`:

```bash
#!/command/execlineb -P
/usr/local/sbin/php-fpm --nodaemonize
```

### 3. Defining the NGINX Service

Set up the NGINX service with a dependency on PHP-FPM:

```shell
/etc/s6-overlay/s6-rc.d
├── svc-nginx
│   ├── dependencies.d
│   │   └── svc-php-fpm
│   ├── run
│   └── type  # Contains "longrun"
└── user
    └── contents.d
        └── svc-nginx
```

And the content of `/etc/s6-overlay/s6-rc.d/svc-nginx/run`:

```bash
#!/command/execlineb -P
nginx -g "daemon off;"
```

This ensures that NGINX only starts after PHP-FPM is running.

### 4. Running the Container

Once the configuration is in place, launch your container:

```shell
docker run --name s6-demo -d -p 8000:80 s6-demo
```

Use `docker stop` to gracefully shut down your container. s6-overlay will handle the shutdown by invoking any configured `finish` scripts to perform cleanup or adjust exit codes.

## s6 programs

Below is an overview of several key s6 programs that come with installing s6-overlay.

### execlineb

Execlineb is a minimalistic command interpreter that is part of the s6 suite, designed specifically for process supervision and container management. Unlike traditional shells (such as Bash or sh), execlineb is not a full-featured scripting language but rather a purpose-built tool optimized for:

- Deterministic Process Management: It emphasizes predictable execution and precise control over processes.
- Low Overhead: It’s lightweight, making it ideal for container environments where efficiency is key.
- Reliability: With minimal dependencies and a straightforward design, execlineb helps prevent unexpected behavior in critical system scripts.

```bash
#!/command/execlineb -P
# Using the -P flag preserves the environment variables
s6-setuidgid www-data
exec /usr/local/sbin/php-fpm --nodaemonize
```

Read more about it here: https://skarnet.org/software/execline/

### `with-contenv`

The `with-contenv` command is designed to "inject" the container’s environment variables into the execution context. In containerized environments, it ensures that any environment variables set at the container level are available to the script.

Opposed to when you do not set it the program you execute will not kow about environment variables of the container.

```bash
#!/command/with-contenv sh
env
```

### `s6-setuidgid`

Always drop root privileges before running your service. In `execlineb`, you can do this as follows:

```bash
#!/command/execlineb -P
s6-setuidgid www-data myservice
```

Or in a shell script:

```bash
#!/bin/sh
exec s6-setuidgid www-data myservice
```

Read more about it here: https://skarnet.org/software/s6/s6-setuidgid.html

## Customizing Behavior with Environment Variables

s6-overlay offers a range of environment variables for fine-tuning its behavior, such as:

- `S6_BEHAVIOUR_IF_STAGE2_FAILS`
- `S6_CMD_WAIT_FOR_SERVICES_MAXTIME`
- `S6_KILL_GRACETIME`
- `S6_LOGGING`
- ...and many more.

These allow you to adapt the container’s behavior to your specific needs.

## Automating Tasks with Recipes

After establishing your basic setup, you might want to extend functionality with additional recipes:

### Database Migrations
  Define an oneshot service to run your migration scripts:

```shell
/etc/s6-overlay/s6-rc.d
├── init-migrations
│   ├── type  # Contains "oneshot"
│   └── up
└── scripts
  └── init-migrations
```

And in the migration script:

```bash
#!/command/with-contenv sh
s6-setuidgid www-data
php /var/www/html/bin/console doctrine:migrations:migrate --no-interaction
php /var/www/html/bin/console doctrine:migrations:status
```

### Scheduled Cron Jobs
Symfonys scheduler component replaces cron jobs so you can run scheduled jobs in your application. For this to work you need to have a process running all the time that runs in a loop and asks every time if there is a message scheduled to be triggered. 
Read the complete documentation here: https://symfony.com/doc/current/scheduler.html

Create a longrun service to handle cron-like tasks, such as consuming message queues like this:

```shell []
/etc/s6-overlay/s6-rc.d
├── svc-messenger-scheduler
│   ├── dependencies.d
│   │    └── svc-php-fpm
│   ├── type
│   └── run
└── user/contents.d/svc-messenger-scheduler
```

In `/etc/s6-overlay/s6-rc.d/svc-messenger-scheduler/run`
```shell []
#!/command/with-contenv sh
s6-setuidgid www-data

php /var/www/html/bin/console messenger:consume scheduler_default \
  --time-limit=300 --limit=10 --env=`printcontenv APP_ENV` --quiet
```

### Async Message handling
Same as the scheduler there is a Symfony Messages component that will be connected to a transport and query for new messages. For that we need a worker service running that will consume messages and dispatch them to message handlers.
Read the complete documentation here: https://symfony.com/doc/current/messenger.html

```shell []
/etc/s6-overlay/s6-rc.d
├── svc-messenger-async
│   ├── dependencies.d
│   │    └── svc-php-fpm
│   ├── type
│   └── run
└── user/contents.d/svc-messenger-async
```

In `/etc/s6-overlay/s6-rc.d/svc-messenger-async/run`
```shell []
#!/command/with-contenv sh
s6-setuidgid www-data

php /var/www/html/bin/console messenger:consume messenger:consume async \
    --time-limit=300 --limit=1000 --env="$(printcontenv APP_ENV)" --quiet
```


### Feature flags with `S6_STAGE2_HOOK`
Sometimes you want to deploy a container an turn services on or off depending on the function the container will have.

Those are the scenarios I came up with:

- **migrations**: You want to run migrations but do not want to have to ssh onto the machine where the container is running, exec into it and then execute the script that will execute the migrations. You want to run them when the container starts, but you do not want to execute them always so you want a way how to disable them.
- **worker**: You want to run a container not accessible by http, but run worker scripts like for `symfony/scheduler` or `symfony/messenger`. Those would not need php-fpm or nginx running. And the workers would not need to run in the same container where the http accessible application is running. But in development it is a different story, there you want to run both.

Everything is easy with this feature flag script set with the `S6_STAGE2_HOOK`. 
It enables or disables specific services at startup, tailoring your container behavior to your deployment environment.

In the Dockerfile:
```Dockerfile
# set path to feature-toggle script
ENV S6_STAGE2_HOOK=/etc/s6-overlay/s6-hook/feature-toggle
```

The `feature-toggle` script
```bash []
#!/command/with-contenv sh
INIT_MIGRATIONS="${FEATURE_INIT_MIGRATIONS:-false}"
SVC_MESSENGER_SCHEDULER="${FEATURE_RUN_QUEUE_SCHEDULER:-false}"
SVC_MESSENGER_ASYNC="${FEATURE_RUN_QUEUE_ASYNC:-false}"
SVC_NGINX="${FEATURE_RUN_NGINX:-true}"

for feature in "INIT_MIGRATIONS SVC_MESSENGER_SCHEDULER SVC_NGINX"; do
    is_enabled=$(eval echo \${$feature:-false})
    feature_file=$(echo "$feature" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
    if [ $is_enabled = false ]; then
        echo "feature-toggle: info: $feature is disabled. Deleting service: $feature_file"
        rm -f "/etc/s6-overlay/s6-rc.d/user/contents.d/$feature_file"
    fi
done
exit 0
```

In the `docker-compose.yaml`
```yaml
services:
    app:
        # ...
        environment:
            APP_ENV: "dev"
            FEATURE_RUN_NGINX: "true"
            FEATURE_RUN_QUEUE_SCHEDULER: "true"
            FEATURE_RUN_QUEUE_ASYNC: "true"
            FEATURE_INIT_MIGRATIONS: "false"
```


## s6-overlay base image

I created a base image for s6-overlay which will be build whenever s6-overlay pushes a new version.

https://github.com/dazz/s6-overlay-base

In your `Dockerfile`
```Dockerfile
FROM php:8.3-alpine3.21
COPY --from=hakindazz/s6-overlay-base:3.2.0.2 /s6/root /

# install your app here

ENTRYPOINT ["/init"]
```

The interesting part IMHO is the github workflow that checks if an image for the current version exists and if not it will be built.
See here https://github.com/dazz/s6-overlay-base/blob/main/.github/workflows/docker-image-push.yml
You can adapt it und use it in your org if you need the be able to build your own base images .

{{< admonition type=note title="This is a note" >}}
Read the article that I wrote about it here: [Build your own s6-overlay base image](/posts/2024-08-19_base-image-with-s6-overlay/)
{{< /admonition >}}


## s6-cli

I developed a small cli in Golang to ease creating, validating and documenting services that s6 supervises.

- The repo: https://github.com/dazz/s6-cli
- The Docker image: https://hub.docker.com/repository/docker/hakindazz/s6-cli

{{< admonition type=note title="This is a note" >}}
Read the article that I wrote about it here: [Manage s6-overlay setup with s6-cli](/posts/2024-12-06_s6-cli/)
{{< /admonition >}}

## Conclusion

Using s6-overlay in your dockerized PHP / Symfony setup offers a robust, production-ready solution to manage multiple processes within a single container. 

With proper process supervision, controlled startup/shutdown sequences, and versatile configuration options, s6-overlay fills the gap left by traditional Docker practices. Whether you’re running PHP-FPM, NGINX, or any combination of services, this approach leads to a more stable and maintainable environment.

By following the in-depth examples and best practices outlined above, PHP developers can confidently migrate their Dockerized applications to the cloud, knowing that every process is well-managed and health-checked.


## References

- https://github.com/just-containers/s6-overlay
- https://skarnet.org/software/s6/overview.html
- https://serversideup.net/open-source/docker-php/docs/guide/using-s6-overlay
- https://www.tonysm.com/multiprocess-containers-with-s6-overlay/
- https://github.com/dazz/s6-overlay-base
- https://github.com/dazz/s6-nginx-php-fpm
- [How to use --init parameter in docker run - Stack Overflow](https://stackoverflow.com/questions/43122080/how-to-use-init-parameter-in-docker-run)
- [Run multiple processes in a container - Docker Documentation](https://docs.docker.com/engine/containers/multi-service_container/)
- [How to Use --init Parameter in Docker Run Command - Baeldung](https://www.baeldung.com/ops/docker-init-parameter)
- [What is Docker Init & When to Use It - Best Practices - Spacelift](https://spacelift.io/blog/docker-init)
- [docker run --init: to the rescue of zombie processes - Paolo Mainardi](https://www.paolomainardi.com/posts/docker-run-init/)
- [Container lifecycle | Improve it with PID 1 in Docker | Padok](https://cloud.theodo.com/en/blog/docker-processes-container)
