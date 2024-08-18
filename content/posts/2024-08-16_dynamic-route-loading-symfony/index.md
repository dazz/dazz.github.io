---
title: Dynamic Route loading in a non standard Symfony structure
date: 2024-08-16T23:42:23+01:00
tags:
  - clean architecture
  - ddd
  - routing
  - symfony
image: loading-route-in-a-symphonical-way.webp
comments: true
draft: false
---

When you divert from Symfony's standard structure there are some things that do not work out of the box anymore. One of it is routing.

## Default Symfony
If you start a fresh Symfony project you will be presented with the following stricture:

```bash  
app/src  
├─ Controller
├─ Entity
├─ Repository
└─ Kernel.php
```  

The routing config looks like this:

```yaml
# app/config/routes.yaml
controllers:
    resource:
        path: ../src/Controller/
        namespace: App\Controller
    type: attribute
```

So the `Controller` directory is the place all controllers go you might think first. But When the project gets bigger a different structure might make more sense.

## The DDD/Clean Architecture approach
If we use a DDD/Clean Architecture approach the structure might look like this:

```bash
app/src
├─ Blog 
│ ├─ Application
│ │ └─ CreateArticleController.php
│ ├─ Domain
│ │ └─ Article.php
│ └─ Infrastructure
├─ Registration
│ ├─ Application
│ │ ├─ CreateAccountController.php
│ │ ├─ CreateAccountRequest.php
│ │ └─ CreateAccountResponse.php
│ ├─ Domain
│ │ └─ Account.php
│ └─ Infrastructure
└─ Kernel.php
```

But now every Controller needs to be added to the routing config since the loading expects all controllers in one place.

{{< admonition type=tip title="" >}}
Configs should be kept clean and small 
{{< /admonition >}}

```yaml
# app/config/routes.yaml
app_registration_createaccount:
    # loads routes from the PHP attributes of the given class
    resource: App\Registration\CreateAccountController
    type:     attribute

app_blog_createarticle:
    # loads routes from the PHP attributes of the given class
    resource: App\Blog\CreateArticleController
    type:     attribute
```

This is not the comfortable way, since we were starting to embrace the `Route` attribute because it means we do not need to add each route to the routing config in a growing file and developers must not forget to add or update each route which might get annoying during refactoring.

## Loading Routes dynamic
In Symfony there is a simple way we can solve this: [We can create our own loader with a custom service](https://symfony.com/doc/current/routing/custom_route_loader.html).

## The implementation

{{< admonition type=symfony title="From the Symfony Documentation">}}
> When the main loader parses this, it tries all registered delegate loaders.

> If you're using [autoconfigure](https://symfony.com/doc/current/service_container.html#services-autoconfigure), your class should implement the [RouteLoaderInterface](https://github.com/symfony/symfony/blob/7.1/src/Symfony/Bundle/FrameworkBundle/Routing/RouteLoaderInterface.php "Symfony\Bundle\FrameworkBundle\Routing\RouteLoaderInterface") interface to be tagged automatically.

> If your service is invokable, you don't need to specify the method to use.

> Your service doesn't have to extend or implement any special class, but the called method must return a [RouteCollection](https://github.com/symfony/symfony/blob/7.1/src/Symfony/Component/Routing/RouteCollection.php "Symfony\Component\Routing\RouteCollection") object.
{{< /admonition >}}

All good points
- We create an invokable service class
- Implement the `RouteLoaderInterface`
- Let it return a `RouteCollection`

```bash
app/src
├─ Blog
│ └─ Application
│   └─ CreateArticleController.php
├─ Registration
│ └─ Application
│   └─ CreateAccountController.php
├─ Shared
│ └─ Application
│   └─ Routing
│     └─ RouteLoader.php <=== here
└─ Kernel.php
```

The Loader class:

```php
<?php  
  
declare(strict_types=1);  
  
namespace App\Shared\Application\Routing;  
  
use ReflectionClass;  
use Symfony\Bundle\FrameworkBundle\Routing\RouteLoaderInterface;  
use Symfony\Component\Finder\Finder;  
use Symfony\Component\Routing\Attribute\Route as RouteAttribute;  
use Symfony\Component\Routing\Route;  
use Symfony\Component\Routing\RouteCollection;  
  
class RouteLoader implements RouteLoaderInterface  
{  
    private bool $isLoaded = false;  
  
    public function __construct(private readonly string $routeLoaderBaseDirectory)  
    {  
    }  
 
    public function __invoke(mixed $resource, string $type = null): RouteCollection  
    {
        if ($this->isLoaded) {  
            throw new \RuntimeException('Do not add this loader twice.');
        }

        $routeCollection = new RouteCollection();  

        $finder = self::fromDirectories(
            $this->routeLoaderBaseDirectory,
            $this->routeLoaderBaseDirectory . '/*/**',
        );

        foreach ($finder as $file) {
            $className = $this->getClassNameFromFile($file->getRealPath());
            $namespace = $this->getClassNamespaceFromFile($file->getRealPath());
            if (!$className || !$namespace) {
                continue;
            }
            $fullQualifiedClassName = $namespace . '\\' . $className;

            // Use reflection to check for Symfony Route attributes
            $reflectionClass = new ReflectionClass($fullQualifiedClassName);
            $attributes = $this->getRouteAttributes($reflectionClass);

            // Handle class-level attributes for invokable controller classes
            if ($reflectionClass->hasMethod('__invoke')) {
                foreach ($attributes as $routeAttribute) {
                    $route = $this->createRouteFromAttribute($routeAttribute);
                    $routeName = $routeAttribute->getName() ?? $this->generateRouteName($fullQualifiedClassName, '__invoke'); 
                    $routeCollection->add($routeName, $route);
                }
                continue; // there should only be a class declaration when invokable
            }

            // Handle method-level attributes
            foreach ($reflectionClass->getMethods() as $method) {
                foreach ($attributes as $routeAttribute) {
                    $route = $this->createRouteFromAttribute($routeAttribute);
                    $routeName = $routeAttribute->getName() ?? $this->generateRouteName($fullQualifiedClassName, $method->getName());
                    $routeCollection->add($routeName, $route);
                }
            }
        }

        $this->isLoaded = true;

        return $routeCollection;
    }

    /**
     * @see https://stackoverflow.com/a/39887697
     */
    private function getClassNameFromFile($filePathName): string  
    {  
        $contents = file_get_contents($filePathName);  
  
        $classes = [];  
        $tokens = token_get_all($contents);  
        $count = count($tokens);  
        for ($i = 2; $i < $count; $i++) {  
            if ($tokens[$i - 2][0] == T_CLASS  
                && $tokens[$i - 1][0] == T_WHITESPACE  
                && $tokens[$i][0] == T_STRING  
            ) {  
  
                $className = $tokens[$i][1];  
                $classes[] = $className;  
            }
        }

        return array_pop($classes);  
    }

    private function getClassNamespaceFromFile($filePathName): ?string  
    {
        $src = file_get_contents($filePathName);  

        $tokens = token_get_all($src);  
        $count = count($tokens);  
        $i = 0;  
        $namespace = '';  
        $namespaceOk = false;  
        while ($i < $count) {  
            $token = $tokens[$i];  
            if (is_array($token) && $token[0] === T_NAMESPACE) {  
                // Found namespace declaration  
                while (++$i < $count) {  
                    if ($tokens[$i] === ';') {  
                        $namespaceOk = true;  
                        $namespace = trim($namespace);  
                        break;  
                    }  
                    $namespace .= is_array($tokens[$i]) ? $tokens[$i][1] : $tokens[$i];  
                }  
                break;  
            }  
            $i++;  
        }  
  
        return $namespaceOk ? $namespace : null;  
    }  
  
    private function createRouteFromAttribute(RouteAttribute $routeAttribute): Route  
    {        return new Route(  
            path: $routeAttribute->getPath(),  
            defaults: $routeAttribute->getDefaults(),  
            requirements: $routeAttribute->getRequirements(),  
            options: $routeAttribute->getOptions(),  
            host: $routeAttribute->getHost(),  
            schemes: $routeAttribute->getSchemes(),  
            methods: $routeAttribute->getMethods(),  
            condition: $routeAttribute->getCondition()  
        );  
    }

    /**  
     * @return RouteAttribute[]  
     */  
    private function getRouteAttributes(ReflectionClass $reflectionClass): array  
    {  
        return array_map(fn(\ReflectionAttribute $attribute) => $attribute->newInstance(), $reflectionClass->getAttributes(RouteAttribute::class));  
    }
  
    private function generateRouteName(string $className, string $methodName): string  
    {  
        $routeName = strtolower(str_replace(  
            ['\\', 'Controller', 'Application_'],  
            ['_', '', ''],  
            $className)  
        );  
  
        if ($methodName === '__invoke') {  
            return $routeName;  
        }

        return $routeName . '_' . $methodName;  
    }  

    private static function fromDirectories(string $dir, string ...$moreDirs): Finder  
    {
        return (new Finder())->in($dir)->in($moreDirs)->files()->name('*Controller.php')->sortByName()->followLinks();  
    }
}
```

Add the class in the routing config:

```yaml
# app/config/routing.yaml
controllers:  
    resource: App\Shared\Application\Routing\RouteLoader  
    type: service
```

One thing still left to do is make the path with the `$routeLoaderBaseDirectory` in the service configuration autowirable.

```yaml
# app/config/services.yaml
parameters:  
  
services:  
    _defaults:  
        autowire: true
        autoconfigure: true
        bind:
            string $routeLoaderBaseDirectory: '%kernel.project_dir%/src'
```

## Controller

```php
namespace App\Registration\Application;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\AsController;
use Symfony\Component\Routing\Attribute\Route;

#[AsController] # to make it autowirable
#[Route(
    path: '/registration/createaccount',
    name: 'app_registration_createaccount',
    methods: [Request::METHOD_POST]
)]
final readonly class CreateAccountController
{
    public function __invoke(CreateAccountRequest $request): CreateAccountResponse
    {
        // create account logic
        return new CreateAccountResponse();
    }
}
```

## `bin/console debug:router`

```bash
> bin/console debug:router
 -------------------------------- -------- -------- ------ ----------------------------- 
  Name                             Method   Scheme   Host   Path                         
 -------------------------------- -------- -------- ------ ----------------------------- 
  app_blog_createarticle           POST     ANY      ANY    /blog/article  
  app_registration_createaccount   POST     ANY      ANY    /registration/account
 -------------------------------- -------- -------- ------ -----------------------------
```


## Happy loading routes everyone!


#### More sources
- [gist.github.com/dazz RouteLoader.php](https://gist.github.com/dazz/151ed59887dc0299c4f462c33b701c94)
- [tomasvotruba.com - 2 Tricks to get your Symfony configs lines to minimum](https://tomasvotruba.com/blog/2-tricks-to-get-your-symfony-configs-lines-to-minimum)