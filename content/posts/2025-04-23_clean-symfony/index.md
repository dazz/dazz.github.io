---
title: "Clean Symfony: Symfony + Clean Architecture + DDD"
date: 2025-04-24T09:00:00+02:00
tags: [symfony, php, clean-architecture, rector, phpunit, renovatebot, dependabot, deprecation, ci, tech-debt, phpstan, deptrac]
draft: true
comments: true
toc: true
---

## Architekturansatz: Symfony > Clean Code > Clean Architecture > DDD

Unser Projekt basiert auf vier sich ergänzenden Prinzipien:

- Symfony als Framework
- Clean Code als Entwicklungsphilosophie
- Clean Architecture zur Strukturierung der Anwendung
- Domain-Driven Design zur Modellierung der Geschäftslogik

Jeder dieser Bausteine wird im Folgenden erläutert.


## 1. Symfony

### Was ist Symfony?

Symfony ist ein modernes, komponentenbasiertes PHP-Framework für den Bau von Webanwendungen und APIs. Es bietet robuste Werkzeuge zur Entwicklung von skalierbaren, wartbaren und testbaren Anwendungen – vom Microservice bis zum Monolithen.

Unser Projekt basiert auf dem aktuellen Symfony-Framework und nutzt:

- **Symfony Flex** zur schlanken Paketverwaltung
- **Autowiring** zur automatischen Injection von Services
- **Attribute-basiertes Routing** (`#[Route]`)
- **HTTP-Kernel**, **EventDispatcher**, **DependencyInjection** – die Basiskomponenten von Symfony


### Kernkonzepte

| Begriff                | Bedeutung                                                                 |
|------------------------|---------------------------------------------------------------------------|
| **Controller**         | Einstiegspunkt für HTTP-Anfragen – delegiert an die Anwendungslogik       |
| **Service Container**  | Verwalter aller Dienste & Abhängigkeiten (Dependency Injection)            |
| **Routing**            | Definiert, welche URL welche Methode aufruft                               |
| **Autowiring**         | Symfony erkennt automatisch, welche Abhängigkeiten benötigt werden         |
| **Bundles**            | Modularisierungskonzept (bei uns durch Bounded Contexts ersetzt)           |
| **EventDispatcher**    | Ermöglicht lose gekoppelte Kommunikation zwischen Komponenten              |
| **Form / Validator / Serializer** | Helfer für Webformulare, Datenvalidierung und DTO-Mapping    |


### Was bedeutet das konkret für unser Projekt?

Unser Projekt nutzt Symfony bewusst **nicht in seiner klassischen Struktur** (Controller, Service, Entity), sondern:

- **Controller sind Entry Points für einen konkreten Use Case**
- Der **Symfony Service Container** verwaltet Use-Case-Handler, Adapter, Repositories
- **Routing wird Attribut-basiert definiert**
- **Dependency Injection erfolgt automatisch** über Typ-Hints
- Wir verwenden gezielt nur die Symfony-Komponenten, die ins Konzept passen

Ein Beispiel dafür ist der Login-Prozess:

```php
#[Route('/login', name: 'user_login', methods: ['POST'])]
public function __invoke(#[MapRequestPayload] LoginUserRequest $request): JsonResponse
{
    $command = new LoginUserCommand($request->email, $request->password);
    $response = ($this->handler)($command);
    return new JsonResponse(['token' => $response->token]);
}
```

Dieser Controller:

- ist schlank und delegiert an den Use Case
- verwendet `#[MapRequestPayload]` zur automatischen Deserialisierung
- baut keine Geschäftslogik auf – das ist Aufgabe des `LoginUserHandler`


### Symfony als Grundlage – nicht als Zentrum

Wir nutzen Symfony als **Toolbox**, nicht als Architektur.
Unsere Architektur ist unabhängig von Symfony – Symfony ist nur eine sehr gute Implementierungsplattform dafür.

In den nächsten Kapiteln zeigen wir, wie wir mit Clean Code, Clean Architecture und DDD darauf aufbauen.

## 2. Clean Code

### Was bedeutet Clean Code?

**Clean Code** ist keine Technologie, sondern eine Philosophie. Der Begriff wurde durch Robert C. Martin („Uncle Bob“) geprägt und beschreibt Quellcode, der:

- **einfach zu lesen**
- **leicht zu verstehen**
- **einfach zu ändern**
- und **leicht zu testen** ist.

Clean Code ist nicht "Code, der funktioniert", sondern Code, der **funktioniert und gepflegt werden kann** – auch in 6 Monaten, auch von anderen.


### Kernprinzipien von Clean Code

| Prinzip                     | Bedeutung                                                                 |
|-----------------------------|---------------------------------------------------------------------------|
| **Meaningful Names**        | Variablen, Klassen und Methoden sagen klar, was sie tun                   |
| **Small Functions**         | Methoden sind kurz, präzise und machen genau eine Sache                   |
| **Single Responsibility**   | Jede Klasse hat genau eine Aufgabe / einen Grund zur Änderung             |
| **Fail Fast**               | Ungültige Zustände werden sofort erkannt und verhindert                   |
| **Readability > Cleverness**| Lesbarkeit ist wichtiger als „smarte“ Tricks                              |
| **Automated Tests**         | Tests validieren Funktionalität und verhindern Regressionen               |


### Typische Clean-Code-Begriffe

| Begriff               | Bedeutung                                                                   |
|------------------------|----------------------------------------------------------------------------|
| **Code Smell**         | Hinweis auf ein Designproblem (z. B. lange Methoden, viele Abhängigkeiten) |
| **Refactoring**        | Strukturverbesserung ohne Änderung des Verhaltens                         |
| **Technical Debt**     | Designkompromisse, die später Wartungskosten verursachen                  |
| **YAGNI**              | „You Ain’t Gonna Need It“ – nur bauen, was wirklich gebraucht wird        |
| **KISS**               | „Keep It Simple, Stupid“ – keine unnötige Komplexität                     |
| **DRY**                | „Don’t Repeat Yourself“ – Wiederholung vermeiden                          |


### Was bedeutet das konkret für unser Projekt?

Wir schreiben Clean Code durch folgende Regeln:

- **Jede Klasse hat eine klar definierte Aufgabe**  
  → z. B. `LoginUserHandler` behandelt ausschließlich den Login-Use Case.

- **Methoden sind kurz und lesbar**  
  → etwa `LoginUserHandler::__invoke()` hat nur 8–10 Zeilen.

- **Sprache der Fachdomäne wird in Klassennamen wiedergegeben**  
  → z. B. `InvalidCredentialsException`, `LoginUserCommand`, `UserRepositoryInterface`

- **Keine magischen Strings oder "versteckte" Abhängigkeiten**  
  → Konkrete Implementierungen werden über Interfaces injiziert.

- **Fehler werden sofort sichtbar gemacht**  
  → z. B. `InvalidCredentialsException` wird sofort geworfen, wenn Email oder Passwort falsch sind.


### Beispiel

```php
final class LoginUserHandler
{
    public function __invoke(LoginUserCommand $command): LoginUserResponse
    {
        $user = $this->userRepository->findByEmail($command->email);
        if (!$user || !$this->passwordHasher->verify($command->password, $user->getHashedPassword())) {
            throw new InvalidCredentialsException();
        }

        return new LoginUserResponse(token: bin2hex(random_bytes(16)));
    }
}
```

Dieser Code:

- ist lesbar und selbsterklärend
- verzichtet auf Kommentare, weil die Namen sprechend sind
- trennt klar Verantwortung (z. B. keine Response-Building-Logik im Handler)


Clean Code ist die **Basis für Clean Architecture** – denn saubere Architektur braucht auch sauberen Code.

### Vorsicht bei „Don't Repeat Yourself“ (DRY)

Das Prinzip **„Don't Repeat Yourself“** wird häufig falsch verstanden – und dadurch zur Falle.

Viele Teams neigen dazu, sich wiederholende Codezeilen **zu früh** in einen gemeinsamen Service oder ein `Shared/`-Modul zu extrahieren.  
Oft landet dieser Service dann in einem technischen Layer, wird überall verwendet – und wächst zu einem „God-Service“.

Das Problem:
> Sobald eine Stelle eine Abweichung oder Sonderlogik braucht, beginnt das Bedingungs-Karussell.  
> Und plötzlich müssen alle anderen Use Cases wissen, wann diese Kondition **nicht** zutreffen darf.

#### Besserer Ansatz

- **Code darf sich wiederholen**, wenn es spezifischer, lesbarer und weniger gekoppelt bleibt.
- Wiederholungen in verschiedenen Kontexten sind **gesund**, solange sie isoliert sind.
- Nur wenn eine Funktion tatsächlich **technologie- oder domänenunabhängig** ist, lohnt sich eine Extraktion.

Beispiel für gute Wiederholung:

```php
// In Use Case A
if ($invoice->isOverdue()) {
    $mailer->sendReminder($invoice);
}

// In Use Case B
if ($invoice->isOverdue()) {
    $logger->alert('invoice overdue');
}
```

→ Zwei Use Cases, die **unabhängig dieselbe Bedingung prüfen** – ohne Coupling.

#### Wann extrahieren?

Nur wenn:

- es eine echte **Hilfsfunktionalität** ist (z. B. String, Array, Date)
- der Code keinen **Use Case kennt**
- der Code keine **Domänenlogik kapselt**
- Wiederverwendung einen **konkreten Wartungsvorteil bringt**

> Wiederholung ist kein Code-Smell – blinde Abstraktion schon.


## 3. Clean Architecture – Definition
**Abhängigkeiten, SOLID und Prinzipien guter Architektur**

### Was bedeutet „Clean Architecture“?

Clean Architecture beschreibt ein **Architekturkonzept für langlebige Software**. Es geht nicht um Frameworks, sondern darum:

- **Businesslogik von technischen Details zu trennen**
- **Abhängigkeiten gezielt zu strukturieren**
- **Änderungen lokal zu halten**

Der Kernsatz:
> _„Abhängigkeiten zeigen immer nach innen.“_

Das bedeutet:
- Frameworks, Datenbanken, Webserver, APIs usw. sind Details.
- Die **Geschäftsregeln (Use Cases, Domain)** stehen im Zentrum.
- Äußere Komponenten (z. B. Symfony, Doctrine) kennen die Businesslogik nicht.


### Die Kreise der Clean Architecture

Im klassischen Modell besteht das System aus konzentrischen Kreisen:

```
[ Framework / UI / Infrastructure ]
             ↓
      [ Application / Use Cases ]
             ↓
          [ Domain ]
```

Nur **Abhängigkeiten nach innen** sind erlaubt.  
Beispiel: Die Datenbank kennt die `User`-Entity nicht, sie speichert nur Datenstrukturen.


### SOLID – Die 5 Prinzipien guter Softwarearchitektur

Clean Architecture beruht auf den **SOLID-Prinzipien**, um die Kreise **auch innerhalb des Codes** umzusetzen:

| Prinzip                        | Bedeutung                                                                 |
|-------------------------------|---------------------------------------------------------------------------|
| **S – Single Responsibility** | Eine Klasse hat genau einen Grund zur Änderung                            |
| **O – Open/Closed**           | Offen für Erweiterung, geschlossen für Änderung                          |
| **L – Liskov Substitution**   | Unterklassen müssen sich wie ihre Basisklasse verhalten                   |
| **I – Interface Segregation** | Lieber viele kleine Interfaces als ein großes                             |
| **D – Dependency Inversion**  | High-Level-Logik hängt nicht von Low-Level-Details ab – sondern von Abstraktionen |


### Was das in unserem Projekt bedeutet

| Prinzip                    | Beispiel aus unserem Projekt |
|---------------------------|------------------------------|
| **SRP** (Single Responsibility) | `LoginUserHandler` macht **nur** Login – kein Token-Erstellen, kein Loggen |
| **OCP** (Open/Closed)     | Neue Login-Mechanik? → Neue `PasswordHasherInterface`-Implementierung möglich |
| **LSP** (Liskov Substitution) | `DoctrineUserRepository` kann überall eingesetzt werden, wo `UserRepositoryInterface` erwartet wird – ohne Überraschung |
| **ISP** (Interface Segregation) | `UserRepositoryInterface` definiert nur das, was `LoginUserHandler` wirklich braucht – keine `findAll()`-Ballast-Methoden |
| **DIP** (Dependency Inversion) | `LoginUserHandler` kennt nur `UserRepositoryInterface`, nicht Doctrine |

Abhängigkeiten sind **umgekehrt**:  
Use Cases definieren die Regeln – Infrastruktur folgt den Vorgaben und implementiert sie.


### Design Patterns in unserer Architektur

Wir unterscheiden zwei Arten von Mustern:

1. Architektur-Patterns  
   → definieren Struktur, Layer und Zuständigkeiten im System
2. Klassische Design Patterns  
   → lösen wiederkehrende Probleme auf Objekt- oder Klassenebene

### 1. Architektur-Patterns in unserer Anwendung

**Ports & Adapters (Hexagonal Architecture)**  
Trennt Anwendungskern und Infrastruktur.  
Beispiel in Symfony:

```php
// Port (Interface)
interface UserRepositoryInterface {
    public function findByEmail(string $email): ?User;
}

// Adapter (Implementierung)
class DoctrineUserRepository implements UserRepositoryInterface {
    public function findByEmail(string $email): ?User {
        return $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
    }
}
```

**Command & Handler**  
Ein Command repräsentiert eine Absicht, ein Handler führt sie aus.  
Beispiel:

```php
final class LoginUserCommand {
    public function __construct(public string $email, public string $password) {}
}

final class LoginUserHandler {
    public function __invoke(LoginUserCommand $command): LoginUserResponse {
        // ...
    }
}
```

#### Dependency Injection

In unserer Architektur ist **Dependency Injection (DI)** ein zentrales Prinzip:  
Klassen deklarieren ihre Abhängigkeiten, die Symfony zur Laufzeit automatisch bereitstellt.

Symfony unterstützt dieses Prinzip vollständig durch:

- `autowire`: automatische Erkennung der Abhängigkeiten anhand von Typen
- `autoconfigure`: automatische Anwendung von Konfiguration auf Basis von Interface oder Attributen

Beispiel:

```php
final class LoginUserHandler
{
    public function __construct(
        private UserRepositoryInterface $repo,
        private PasswordHasherInterface $hasher
    ) {}
}
```

→ Keine Konfiguration nötig – Symfony erkennt und verdrahtet automatisch.

##### services.yaml

```yaml
# config/services.yaml
services:
  _defaults:
    autowire: true      # Konstruktor-Injection nach Typ
    autoconfigure: true # Tags, Events, Handler automatisch anwenden
```

#### autowire: true

Mit `autowire: true` kannst du Abhängigkeiten einfach per Typ-Hint in den Konstruktor schreiben. Symfony erkennt anhand des Typs, welchen Dienst du meinst – **solange es nur eine passende Definition gibt**.

Beispiel:

```php
public function __construct(LoggerInterface $logger)
```

→ Symfony injiziert automatisch den konfigurierten Logger.

Wichtig: **Autowiring funktioniert nur für Objekte**, nicht für primitive Typen (z. B. `string`, `int`). Für diese musst du:

1. den Parameter explizit binden (in `services.yaml`)
2. oder mit `#[Autowire]` annotieren

```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;

public function __construct(
    #[Autowire('%env(resolve:APP_DOMAIN)%')]
    private string $domain
) {}
```

#### autoconfigure: true

Mit `autoconfigure: true` erkennt Symfony **automatisch, wie ein Dienst verwendet werden soll**:

- Implementierst du `EventSubscriberInterface`? → Symfony taggt dich automatisch.
- Markierst du eine Klasse mit `#[AsMessageHandler]`? → Symfony registriert sie automatisch für den Messenger.
- Implementierst du `Twig\Extension\ExtensionInterface`? → Du wirst als Twig-Erweiterung geladen.

Beispiel:

```php
#[AsMessageHandler]
final class SendEmailHandler
{
    // ...
}
```

→ Kein manuelles Tagging nötig.

#### Erweiterte Attribute

##### #[Autowire]

Ermöglicht das explizite Verdrahten komplexer oder benannter Services:

```php
public function __construct(
    #[Autowire(service: 'monolog.logger.request')]
    private LoggerInterface $logger
) {}
```

##### #[AutowireCallable]

Wenn du z. B. eine Methode als Callback injizieren willst:

```php
use Symfony\Component\DependencyInjection\Attribute\AutowireCallable;

public function __construct(
    #[AutowireCallable(service: MessageUtils::class, method: 'format')]
    private MessageFormatterInterface $formatter
) {}
```

→ `MessageUtils::format()` wird als „callable Service“ injiziert.

##### #[Autoconfigure]

Du kannst eine Klasse auch direkt mit `#[Autoconfigure]` konfigurieren, z. B. als `public` markieren:

```php
#[Autoconfigure(public: true)]
final class PublicService {}
```

#### Fazit

Dependency Injection mit Symfony ist leistungsstark und elegant:

- **Autowire** spart Konfigurationsaufwand
- **Autoconfigure** sorgt für automatische Registrierungen
- **Attribute** machen komplexe Fälle deklarativ und übersichtlich
- Alle Konfigurationen sind explizit nachvollziehbar – aber nie redundant

> Wir definieren nur, was nötig ist – Symfony erledigt den Rest.


### 2. Klassische Design Patterns für sauberen Code

**Factory Pattern**  
Erzeugt Objekte, ohne konkrete Klassen direkt zu verwenden.  
Beispiel:

```php
interface NotificationFactoryInterface {
    public function create(string $type): NotificationInterface;
}

class EmailNotificationFactory implements NotificationFactoryInterface {
    public function create(string $type): NotificationInterface {
        return new EmailNotification(/* ... */);
    }
}
```

**Decorator Pattern**  
Erweitert bestehende Services dynamisch. In Symfony per Service-Dekoration:

```php
class LoggingMailer implements MailerInterface {
    public function __construct(
        private MailerInterface $decorated,
        private LoggerInterface $logger
    ) {}

    public function send(RawMessage $message, Envelope $envelope = null): void {
        $this->logger->info('Sending email: ' . $message->getSubject());
        $this->decorated->send($message, $envelope);
    }
}
```

**Strategy Pattern**  
Kapselt alternative Algorithmen in austauschbare Klassen.  
Beispiel:

```php
interface DiscountStrategy {
    public function apply(float $amount): float;
}

class BlackFridayDiscount implements DiscountStrategy {
    public function apply(float $amount): float {
        return $amount * 0.5;
    }
}

class DiscountService {
    public function __construct(private DiscountStrategy $strategy) {}

    public function applyDiscount(float $amount): float {
        return $this->strategy->apply($amount);
    }
}
```

**Observer Pattern**  
Beobachter reagieren auf Events. Symfony verwendet das z. B. mit EventSubscriber:

```php
class UserRegisteredSubscriber implements EventSubscriberInterface {
    public static function getSubscribedEvents(): array {
        return [
            UserRegisteredEvent::class => 'onUserRegistered',
        ];
    }

    public function onUserRegistered(UserRegisteredEvent $event): void {
        // z. B. Begrüßungsmail verschicken
    }
}
```

### Das Law of Demeter (LoD)

> **„Sprich nur mit deinen direkten Freunden.“**

Das Law of Demeter sagt:
Eine Methode sollte nur aufrufen:

- Eigene Methoden
- Methoden von Feldern (eigenen Abhängigkeiten)
- Methoden auf Argumenten oder lokal erzeugten Objekten

🚫 Kein Chain-Zugriff wie:
```php
$user->getProfile()->getCompany()->getAddress()->getStreet()
```

✅ Besser:
```php
$user->getCompanyAddressStreet()
```

→ Führt zu besserer Kapselung, weniger Kopplung und höherer Wartbarkeit.


### Fazit

Clean Architecture hilft uns, Systeme zu bauen, die:

- unabhängig von Frameworks sind
- sich leicht ändern lassen
- fachlich verständlich bleiben

Wir setzen Patterns dort ein, wo sie:

- Komplexität reduzieren
- Verantwortung trennen
- Verhalten nachvollziehbar machen

Design Patterns sind kein Ziel – sie sind ein Werkzeug für Klarheit im Code.
Im nächsten Kapitel steigen wir in die Ebene **„Komponenten & Kontext“** ein:
Wie modularisieren wir unser System jenseits einzelner Klassen?
Wie helfen uns Bounded Contexts dabei?

### Libraries to note:
- https://github.com/CuyZ/Valinor
- https://packagist.org/packages/myclabs/deep-copy

## 4. Clean Architecture – Teil 2
**Komponenten, Feature-Zuschnitt & Bounded Contexts**

### Was ist eine Komponente?

In Clean Architecture ist eine **Komponente eine abgeschlossene Einheit**, die:

- eine **klare Aufgabe** erfüllt (z. B. "Benutzer registrieren")
- **eigenständig getestet** werden kann
- **minimale Abhängigkeiten** nach außen hat

Eine Komponente besteht typischerweise aus mehreren Klassen, z. B. Handler, Request, Domain-Logik, Infrastrukturadapter – aber sie bildet zusammen einen **funktionalen Use Case** oder ein **fachliches Modul**.


### Feature-Zuschnitt statt Layer-Zuschnitt

In vielen Symfony-Projekten wird nach Technik getrennt:

```
Controller/
Service/
Repository/
Entity/
```

➡ Das führt schnell zu Querverweisen und „God-Services“.

**Wir machen es anders:**

Wir schneiden den Code **nach Features**:

```
src/
└── User/
    └── Application/
        └── Login/
            ├── LoginUserController.php
            ├── LoginUserHandler.php
            ├── LoginUserCommand.php
            └── LoginUserResponse.php
```

So bleibt alles, was einen bestimmten Anwendungsfall betrifft, **nah beieinander**.


### Bounded Contexts – Fokus durch Trennung

Ein **Bounded Context** ist ein abgegrenzter Teil einer Domäne, in dem bestimmte Begriffe und Regeln gelten.

Beispiel:
- Im „User“-Kontext bedeutet „Login“: Zugang per Passwort.
- Im „Admin“-Kontext bedeutet „Login“ vielleicht: Zwei-Faktor-Authentifizierung.

🧱 Jeder Bounded Context bekommt seinen eigenen Verzeichnisbaum:

```
src/
├── User/
│   └── ...
└── Admin/
    └── ...
```

Sie teilen sich keine Services, keine Entitäten – **Kommunikation nur über Schnittstellen oder Events**.


### Shared-Konzepte

Manchmal sind Teile so generisch, dass sie **übergreifend genutzt werden** dürfen – z. B. Exceptions, ValueObjects, Util-Klassen.

Diese kommen in dedizierte `Shared/`-Verzeichnisse:

```
src/
└── Shared/
    ├── ValueObject/
    ├── Application/
    └── Infrastructure/
```

Regel: **Shared ist bewusst – nie Default.**


### Unser Ansatz im Projekt

Wir nutzen eine Kombination aus:

| Konzept                 | Umsetzung im Projekt                                           |
|-------------------------|----------------------------------------------------------------|
| **Feature-Zuschnitt**   | Jedes Use Case in eigenem Ordner (z. B. `Login/`)              |
| **Kontexttrennung**     | z. B. `User/`, `Admin/`, `Document/`, `Invoice/`               |
| **Eindeutige Verantwortung** | z. B. `LoginUserHandler` kennt keine Token-Erzeugung außerhalb |
| **Klare Abhängigkeitsrichtung** | Application → Domain-Interfaces → Infrastruktur-Adaptionen |


### Vorteile

- Entwickler finden schnell alle relevanten Dateien zu einem Feature
- Änderungen an einem Use Case sind lokal möglich
- Testing ist einfacher, weil Use Cases entkoppelt sind
- Teams können kontextweise arbeiten (Context Ownership)


### So sieht das konkret aus

📁 Beispielstruktur: `LoginUser`

```
src/
└── User/
    ├── Application/
    │   └── Login/
    │       ├── LoginUserController.php
    │       ├── LoginUserHandler.php
    │       ├── LoginUserCommand.php
    │       ├── LoginUserRequest.php
    │       └── LoginUserResponse.php
    ├── Domain/
    │   ├── Entity/User.php
    │   └── Repository/UserRepositoryInterface.php
    └── Infrastructure/
        └── Repository/DoctrineUserRepository.php
```


### Ausblick

Im nächsten Kapitel steigen wir ein in den letzten Baustein unseres Architekturansatzes:  
**Domain-Driven Design (DDD)** – dort geht es um Ubiquitous Language, Aggregate Roots, ValueObjects und wie man komplexe Fachlichkeit modelliert.


## 5. Domain-Driven Design (DDD)
**Fachlich modellieren statt nur programmieren**

### Was ist DDD?

**Domain-Driven Design (DDD)** ist ein Ansatz zur Entwicklung von Software, der darauf fokussiert ist, **komplexe Fachlichkeit (Domänenlogik)** gemeinsam mit Fachexpert:innen zu modellieren.

DDD hilft, Systeme zu bauen, die:

- eine **klare Struktur** haben
- **eng an der Fachdomäne** orientiert sind
- **in Bounded Contexts** zerlegt werden
- mit einer gemeinsamen Sprache beschrieben werden


### Die vier zentralen Bausteine von DDD

| Begriff                  | Bedeutung                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| **Ubiquitous Language**  | Einheitliche Sprache zwischen Entwickler:innen und Fachseite              |
| **Bounded Context**      | Abgegrenzter Bereich mit konsistentem Vokabular und Regeln                |
| **Entities & ValueObjects** | Modelle für fachliche Objekte mit Identität (Entity) oder nur Wert (VO) |
| **Aggregates**           | Cluster von Entitäten, die als Einheit behandelt werden (z. B. „Order“)   |


### Fachsprache = Klassennamen

Statt „UserService“ oder „LogicManager“ schreiben wir:

- `LoginUserHandler`
- `UserCredentials`
- `InvalidCredentialsException`

Die Sprache des Codes ist identisch mit der Fachsprache.


### Value Objects vs. Entities

| Vergleich               | ValueObject                             | Entity                             |
|-------------------------|------------------------------------------|------------------------------------|
| **Beispiel**            | `EmailAddress`, `Money`, `Period`        | `User`, `Document`, `Invoice`      |
| **Identität**           | Nein                                     | Ja                                 |
| **Vergleich**           | über Wert                                | über ID                            |
| **Veränderlich**        | typischerweise unveränderlich (immutable)| meist veränderlich                 |


### Aggregate = Geschäftsobjekte mit Regeln

Ein **Aggregate** ist eine Entität mit „Anhang“, die **in sich konsistent** sein muss.

Beispiel:

```
User (Aggregate Root)
├── EmailAddress (ValueObject)
└── PasswordHash (ValueObject)
```

→ Änderungen am `User` dürfen nicht dazu führen, dass das Objekt **zwischenzeitlich inkonsistent** ist.


### Repositories = Zugriff auf Aggregate

Wir greifen nie direkt auf die Datenbank zu.  
Stattdessen definieren wir **Repositories**, z. B.:

```php
interface UserRepositoryInterface
{
    public function findByEmail(string $email): ?User;
}
```

Die konkrete Umsetzung (Doctrine, Filesystem, API) ist unsichtbar für die Anwendungsschicht.


### Domain Services

Manche Logik gehört **nicht in Entitäten**, z. B.:

- Passwort-Hashing
- Versand von E-Mails
- Validierung externer Daten

→ Dafür gibt es **Domain Services** mit sprechenden Interfaces:

```php
interface PasswordHasherInterface
{
    public function verify(string $plain, string $hashed): bool;
}
```


### Application Layer = Use Cases

Use Cases (z. B. Login, Registrierung, Upload) stehen **über** der Domain und orchestrieren Abläufe:

```php
$command = new LoginUserCommand($email, $password);
$response = $handler($command);
```

→ Hier wird die Domäne verwendet, aber nicht „umgebaut“.


### Bounded Contexts im Projekt

Jeder Kontext wie `User/`, `Document/`, `Invoice/` ist ein **eigener fachlicher Bereich** mit:

- eigener Sprache (z. B. „Login“, „Register“, „ResetPassword“)
- eigener Datenstruktur
- eigenen Regeln

Sie kommunizieren **nur explizit** – z. B. über Events, HTTP-Schnittstellen oder dedizierte Adapter.


### Unser DDD-Ansatz im Projekt

| Prinzip                 | Umsetzung im Code                                             |
|-------------------------|---------------------------------------------------------------|
| Ubiquitous Language     | Klassennamen = Fachbegriffe                                   |
| Bounded Contexts        | Trennung in `User/`, `Document/`, `Invoice/`                  |
| Entities & VOs          | `User`, `UserCredentials`, `EmailAddress`                     |
| Repositories & Services | `UserRepositoryInterface`, `PasswordHasherInterface`          |
| Aggregate Roots         | `User` kontrolliert eigene Konsistenz                         |
| Kontextspezifische Use Cases | z. B. `LoginUserHandler`, `RegisterUserHandler`           |


### DDD ist kein Dogma – sondern Werkzeug

Wir wenden DDD dort an, wo es passt:

✅ bei komplexer Fachlichkeit  
⚠️ pragmatisch, nicht religiös  
🚫 kein Overengineering bei simplen Prozessen


### Fazit

DDD ermöglicht es uns, **komplexe Fachlichkeit elegant zu modellieren**, zu testen und zu kommunizieren.  
Es ist das **Sprach- und Strukturfundament** unserer gesamten Architektur.


## Projektstrukturübersicht

Diese Übersicht dient als Referenz für alle Entwickler:innen, um sich in der Architektur und im Projektbaum schnell zurechtzufinden.

### A. Blueprint: Struktur für neue Use Cases

```text
src/
└── <BoundedContext>/
    ├── Application/
    │   └── <UseCase>/
    │       ├── <UseCase>Controller.php       # Symfony Entry Point
    │       ├── <UseCase>Handler.php          # Use Case Koordination
    │       ├── <UseCase>Command.php          # Eingabe (Request an Use Case)
    │       ├── <UseCase>Request.php          # Optionales Request DTO
    │       └── <UseCase>Response.php         # Ausgabe-DTO
    ├── Domain/
    │   ├── Entity/
    │   ├── ValueObject/
    │   ├── Repository/
    │   └── Service/
    └── Infrastructure/
        ├── Repository/
        └── Service/
```

### B. Übersicht: Kontexte & Features (Big Picture)

```text
src/
├── User/
│   └── Application/
│       ├── Login/
│       └── Register/
├── Document/
│   └── Application/
│       ├── Upload/
│       └── Review/
├── Invoice/
│   └── Application/
│       ├── Generate/
│       └── Send/
└── Shared/
    ├── ValueObject/
    ├── Application/
    └── Infrastructure/
```

Diese Struktur folgt den Prinzipien von Clean Architecture und Domain-Driven Design:

- **Kontext-orientierte Trennung** (User, Document, Invoice)
- **Feature-zentrierter Aufbau** innerhalb eines Kontexts
- **Explizite Schichten**: Application, Domain, Infrastructure
- **Gemeinsame Komponenten** im `Shared/`-Namespace

### C. Konkreter Use Case: `LoginUser`

```text
src/
└── User/
    ├── Application/
    │   └── Login/
    │       ├── Exception/
    │       │   └── InvalidCredentialsException.php       # Login fehlgeschlagen
    │       ├── LoginUserCommand.php                      # Message an den Use Case
    │       ├── LoginUserController.php                   # Symfony Controller (#[MapRequestPayload])
    │       ├── LoginUserHandler.php                      # Use Case / Handler
    │       ├── LoginUserRequest.php                      # JSON Payload → Request DTO
    │       └── LoginUserResponse.php                     # Antwort DTO mit Token
    ├── Domain/
    │   ├── Entity/
    │   │   └── User.php                                  # Benutzer-Modell
    │   ├── Repository/
    │   │   └── UserRepositoryInterface.php               # Port: Zugriff auf Benutzer
    │   └── Service/
    │       └── PasswordHasherInterface.php               # Port: Passwortprüfung
    └── Infrastructure/
        ├── Repository/
        │   └── DoctrineUserRepository.php                # Adapter: Doctrine-Repo
        └── Service/
            └── SymfonyPasswordHasher.php                 # Adapter: Symfony Hashing
```

Diese Implementierung erfüllt alle Prinzipien von Clean Architecture & DDD:

- **Klare Verantwortung pro Klasse**
- **Sinnvolle Trennung von Fachlogik und technischer Infrastruktur**
- **Lesbarer, testbarer, austauschbarer Code**

Du kannst diesen Tree als Ausgangspunkt für alle neuen Features nutzen.  
Er lässt sich leicht anpassen – ob für `RegisterUser`, `UploadDocument`, `SendInvoice` oder zukünftige Kontexte.


## 6. Fehler- und Exception Handling
**„Alle werfen, einer fängt“ – konsistentes Error Management**

### Warum Fehlerbehandlung Architektur betrifft

In klassischen Symfony-Projekten wird Exception Handling oft „nebenbei“ gemacht:  
Ein `try/catch` hier, ein `Response::HTTP_400` da – das führt zu:

- dupliziertem Code
- inkonsistentem Verhalten
- schwer testbaren Controllern

**Unsere Regel:**
> _Alle werfen, einer fängt._


### Prinzipien

1. **Use Cases, Domain und Infrastruktur werfen Exceptions**
2. **Ein zentraler Subscriber fängt alle Exceptions**
3. **Die Fehlerantwort wird konsistent erzeugt**
4. **Fachliche Fehler ≠ Technische Fehler**


### 6.1 Extend SPL Exceptions

Definiere Exceptions so spezifisch wie möglich und erweitere SPL Exceptions.

Ein eigenes ExceptionInterface in einer Komponente ermöglicht noch feinere Behandlung des Fehlers.

```php []
namespace App\Exception;

class ArticleNotFoundException extends \RuntimeException implements ExceptionInterface
{
}
```

```php
Throwable
  └── Exception
      ├── LogicException
      │    ├── Symfony\Component\Console\Exception\LogicException
      │    └── Symfony\Component\ExpressionLanguage\SyntaxError
      └──  RuntimeException
            ├── App\Exception\ArticleNotFoundException
            └── Symfony\Component\Filesystem\Exception\RuntimeException
```

### 6.2 Granularität im Exception Handling

Die Granularität entscheidet, **was genau** abgefangen wird:

```php
catch (\Exception)                     // 1. Alles
catch (\App\Exception\ExceptionInterface) // 2. Nur eigene
catch (\RuntimeException)             // 3. SPL-basiert
catch (ArticleNotFoundException)      // 4. spezifisch
```

#### 1. Alles abfangen (nicht empfohlen)

```php
try {
    throw new \App\Exception\ArticleNotFoundException();
} catch (\Exception $exception) {
    // ...
}
```

#### 2. Nur unsere eigenen Exceptions (besser)

```php
try {
    throw new \App\Exception\ArticleNotFoundException();
} catch (\App\Exception\ExceptionInterface $exception) {
    // ...
}
```

#### 3. SPL-basiert (z. B. RuntimeException)

```php
try {
    throw new \App\Exception\ArticleNotFoundException();
} catch (\RuntimeException $exception) {
    // ...
}
```

#### 4. Ganz spezifisch (wenn sinnvoll)

```php
try {
    throw new \App\Exception\ArticleNotFoundException();
} catch (\App\Exception\ArticleNotFoundException $exception) {
    // ...
}
```


### 6.3 Zentrale Fehlerverarbeitung per Listener

Wir verwenden einen zentralen Listener auf das `kernel.exception`-Event:

```php
// src/Shared/Infrastructure/Http/ExceptionListener.php
#[AsEventListener(event: KernelEvents::EXCEPTION, priority: 1)]
final class ExceptionListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();
        $response = match (true) {
            $exception instanceof HttpExceptionInterface =>
                new Response($exception->getMessage(), $exception->getStatusCode()),
            $exception instanceof ExceptionInterface =>
                new Response($exception->getMessage(), $this->mapExceptionToStatusCode($exception)),
            default =>
                new Response('Internal Server Error', Response::HTTP_INTERNAL_SERVER_ERROR),
        };

        $event->setResponse($response);
    }

    private function mapExceptionToStatusCode(ExceptionInterface $exception): int
    {
        return match (true) {
            $exception instanceof ArticleNotFoundException,
            $exception instanceof ImageNotFoundException => Response::HTTP_NOT_FOUND,
            $exception instanceof ArticleExpiredException => Response::HTTP_BAD_REQUEST,
            default => Response::HTTP_INTERNAL_SERVER_ERROR,
        };
    }
}
```

➡ Dieses Muster erlaubt uns, **alle Fehler zentral zu behandeln** und **trotzdem feingranular zu unterscheiden**.


### 6.4 Symfony 6.3+: HTTP Exception Attribute

Mit Symfony 6.3+ können Exceptions direkt mit HTTP-Status und Headern annotiert werden:

```php
namespace App\Exception;

use Symfony\Component\HttpKernel\Attribute\WithHttpStatus;
use Symfony\Component\ErrorHandler\Attribute\WithLogLevel;
use Psr\Log\LogLevel;

#[WithHttpStatus(422, ['Retry-After' => 10])]
#[WithLogLevel(LogLevel::WARNING)]
class ArticleNotFoundException extends \RuntimeException
{
}
```

> Vorteile:
> - keine manuelle Mapping-Methode nötig
> - Exception bleibt selbstständig und selbsterklärend
> - aber: leicht gekoppelt an Symfony (optional)


### 6.5 Wann `try/catch` sinnvoll ist

Im Allgemeinen gilt:

> _Jeder `catch`-Block muss seinen Platz rechtfertigen._

Er sollte **einen echten Mehrwert gegenüber dem Default-Handler bieten**.

#### Re-Throw mit zusätzlichem Kontext

```php
try {
  $this->client->requestLeave($user->id, $request->date);
} catch (HttpException $previous) {
  throw new LeaveDomainException(
    message: "Failed to send leave request {$request->id} for {$user->id}",
    previous: $previous
  );
}
```

➡ So entsteht ein nachvollziehbarer Stacktrace mit sinnvoller Business-Semantik.

#### Graceful Degradation bei Batches

```php
foreach ($assignments as $assignment) {
  try {
    $this->doAssign($assignment);
  } catch (\Exception $exception) {
    $this->logger->critical(
      "Failed to assign {$assignment->id}",
      ['exception' => $exception]
    );
  }
}
```

➡ Wenn ein Fehler passiert, loggen wir ihn – und machen weiter.  
Aber: Batches sind oft ein Anti-Pattern. Besser wäre: atomare Jobs in Queues.


### Fazit

Fehlerbehandlung ist keine Nebensache.  
Sie ist Teil der Architektur – und verdient Struktur, klare Regeln und zentrale Verarbeitung.

✅ Exceptions können überall geworfen werden  
✅ Symfony fängt sie zentral und macht eine Antwort daraus  
✅ Nur in Ausnahmefällen setzen wir bewusst `try/catch` ein

**Unser Motto:**
> _Use Cases kümmern sich ums Werfen. Symfony ums Fangen._


## 7. Asynchrone Nachrichten mit Symfony Messenger
**Commands, Events, Queues und Hintergrundprozesse**

### Warum Messaging?

In vielen Anwendungen gibt es Aufgaben, die **nicht sofort** erledigt werden müssen – z. B.:

- E-Mails versenden
- Daten mit Drittsystemen synchronisieren
- aufwendige Berichte generieren

Diese Aufgaben laufen besser **asynchron** – also im Hintergrund. Dafür bietet Symfony die **Messenger-Komponente**.

Wir unterscheiden zwei Nachrichtentypen:

| Typ     | Zweck                             |
|---------|------------------------------------|
| **Command** | Ein konkreter Auftrag („Sende Mail X“) |
| **Event**   | Etwas ist passiert („User registriert“) |

### Architekturprinzipien

1. Use Case schickt eine Nachricht (Command/Event)
2. Symfony Messenger transportiert sie (sofort oder später)
3. Ein Handler verarbeitet sie
4. Fehler werden automatisch behandelt oder gespeichert

### Beispiel: E-Mail asynchron senden

#### 1. Befehl definieren

```php
namespace App\User\Application\Notify;

class SendWelcomeEmailCommand
{
    public function __construct(
        public readonly string $email,
        public readonly string $name
    ) {}
}
```

#### 2. Handler für den Befehl

```php
namespace App\User\Application\Notify;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class SendWelcomeEmailHandler
{
    public function __construct(private MailerInterface $mailer) {}

    public function __invoke(SendWelcomeEmailCommand $command): void
    {
        $email = (new Email())
            ->to($command->email)
            ->subject('Willkommen')
            ->text("Hallo {$command->name}, willkommen!");

        $this->mailer->send($email);
    }
}
```

#### 3. Dispatchen im Use Case

```php
$this->messageBus->dispatch(new SendWelcomeEmailCommand($email, $name));
```

### Konfiguration

In `messenger.yaml`:

```yaml
framework:
  messenger:
    transports:
      async: '%env(MESSENGER_TRANSPORT_DSN)%'
    routing:
      'App\User\Application\Notify\SendWelcomeEmailCommand': async
```

> Hinweis: Der Transport kann z. B. Doctrine, Redis, RabbitMQ, Amazon SQS sein.

### Vorteile

- entkoppelte, wartbare Logik
- automatische Retry-Mechanismen
- Fehler landen im `failed` Transport
- ideal für Hintergrundverarbeitung

### Fehlerbehandlung

Bei Fehlern wird die Nachricht automatisch **mehrfach erneut versucht**.  
Wenn das scheitert, landet sie in einer **Failure Queue**, aus der sie analysiert oder erneut gesendet werden kann.

Mit dem Befehl:

```bash
php bin/console messenger:failed:show
php bin/console messenger:failed:retry
php bin/console messenger:failed:remove
```

### Mehrere Handler pro Event

Bei Domain Events (z. B. `UserRegistered`) kann es **mehrere Handler** geben – z. B.:

- Mail senden
- Logging
- Welcome-Paket starten

Symfony ruft sie **alle nacheinander** auf.

### Sync vs. Async

Nicht alle Messages müssen asynchron sein.  
In Tests oder bei sofortigem Feedback verwenden wir auch `sync`.

```yaml
framework:
  messenger:
    default_bus: messenger.bus.default
    transports:
      sync: 'sync://'
```

### Fazit

Mit Symfony Messenger machen wir unsere Anwendung **resilient, skalierbar und entkoppelt**.

- **Commands**: exakt ein Handler, klarer Ablauf
- **Events**: Broadcast an viele Handler
- Nachrichten können später verarbeitet werden – aber der Code bleibt sauber und klar


## 8. Wiederkehrende Aufgaben mit Symfony Scheduler
**Geplante Prozesse als strukturierte Symfony Tasks**

### Warum Scheduler?

Viele Anwendungen benötigen regelmäßig laufende Aufgaben:

- alte Daten löschen
- E-Mail-Erinnerungen verschicken
- Berichte generieren

Mit der Scheduler-Komponente können wir solche wiederkehrenden Aufgaben **direkt im Symfony-Code** definieren – ohne Cron-Jobs, ohne externe Tools.

### Aufgaben definieren

Tasks können entweder Methoden oder ganze Klassen sein.

#### Task als Methode

```php
use Symfony\Component\Scheduler\Attribute\AsCronTask;

final class CleanupTask
{
    #[AsCronTask('0 5 * * *', timezone: 'Europe/Berlin')]
    public function cleanOldData(): void
    {
        // z. B. Sessions oder Logs löschen
    }
}
```

#### Task als Klasse

```php
use Symfony\Component\Scheduler\Attribute\AsCronTask;

#[AsCronTask('0 0 * * 1', timezone: 'Europe/Berlin')]
final class WeeklySummaryTask
{
    public function __invoke(): void
    {
        // wöchentliche Reports erzeugen
    }
}
```

### Abhängigkeiten und Services

Tasks sind normale Symfony Services – sie können über den Konstruktor beliebige Abhängigkeiten injizieren:

```php
public function __construct(
    private LoggerInterface $logger,
    private DocumentRepository $documents,
) {}
```

### Wichtiger Hinweis: IDs statt Objekte in Nachrichten

Wenn ein Task oder Command Nachrichten dispatcht (z. B. an einen Worker), **dürfen keine vollständigen Objekte übergeben werden** – nur IDs oder einfache Werte:

```php
$this->bus->dispatch(new RecalculateReportCommand(reportId: $report->getId()));
```

→ Hintergrund: Nachrichten werden serialisiert und über Messenger verschickt. Entitäten oder Services **dürfen nicht** im Payload landen.

### Konsumieren des Schedulers

Scheduler basiert intern auf der Messenger-Komponente.

Die geplanten Tasks laufen über den Transport:

```bash
php bin/console messenger:consume scheduler_default
```

→ Dieser Consumer sollte im Hintergrund laufen, z. B. als Service, Supervisor oder Container-Prozess.

### Fazit

Der Symfony Scheduler erlaubt es, **wiederkehrende Aufgaben sauber im Code zu modellieren**:

- Tasks sind Services mit voller DI-Unterstützung
- Sie werden über `#[AsCronTask]` geplant
- Die Ausführung läuft über Messenger
- Nachrichten enthalten IDs – nicht Domain-Objekte

So schaffen wir **strukturierte, testbare und produktionsreife Prozesse**, ganz ohne externen Cron.


## 9. Mehrstufige Abläufe mit der Workflow-Komponente
**Statusübergänge, Prozesse, Genehmigungen – als Graph**

### Warum Workflows?

Manche Prozesse haben **klare, nacheinander ablaufende Schritte**, z. B.:

- Rechnung → Entwurf → Versendet → Bezahlt
- Dokument → Hochgeladen → Freigegeben → Archiviert
- User → Registriert → E-Mail bestätigt → Aktiviert

Diese Zustände und Übergänge bilden **einen Zustandautomaten** – ideal für Symfony Workflows.

### Vorteile

- Prozesse werden **explizit im Code modelliert**
- erlaubt klare Validierung von Übergängen
- unterstützt **State Machines** und **Workflows**
- mit Symfony integriert – inkl. Events, Guards und DI


### Beispiel: Dokument-Freigabeprozess

```yaml
# config/packages/workflow.yaml
framework:
  workflows:
    document_review:
      type: 'state_machine'
      marking_store:
        type: 'single_state'
        property: 'status'
      supports:
        - App\Document\Domain\Entity\Document
      places:
        - uploaded
        - reviewed
        - approved
        - archived
      transitions:
        review:
          from: uploaded
          to: reviewed
        approve:
          from: reviewed
          to: approved
        archive:
          from: approved
          to: archived
```

### Das Domain-Model

```php
namespace App\Document\Domain\Entity;

class Document
{
    public string $status = 'uploaded';

    // ...
}
```

### Einen Übergang ausführen

```php
$workflow = $workflowRegistry->get($document, 'document_review');

if ($workflow->can($document, 'review')) {
    $workflow->apply($document, 'review');
}
```

➡ Das prüft, ob der Übergang möglich ist – und führt ihn aus.

### Automatisch auslösen (EventListener)

```php
use Symfony\Component\Workflow\Event\CompletedEvent;

#[AsEventListener(event: 'workflow.document_review.completed.approve')]
public function onApproval(CompletedEvent $event): void
{
    $document = $event->getSubject();
    // z. B. Benachrichtigung versenden
}
```

### Guards: Übergänge absichern

```php
#[AsEventListener(event: 'workflow.document_review.guard.approve')]
public function canApprove(GuardEvent $event): void
{
    if (!$this->authChecker->isGranted('ROLE_ADMIN')) {
        $event->setBlocked(true);
    }
}
```

➡ Übergänge können **abgebrochen werden**, z. B. durch Rollenprüfung.

### Visualisieren (optional)

```bash
composer require symfony/monolog symfony/console symfony/workflow symfony/ux-chartjs
php bin/console workflow:dump document_review | dot -Tpng -o flow.png
```

Erzeugt eine PNG-Grafik mit dem kompletten Übergangsgrafen.

### Persistenz

Die Workflows schreiben den aktuellen Zustand **in eine Property** des Objekts – kein zusätzliches Mapping nötig.

Der komplette Verlauf kann zusätzlich geloggt oder historisiert werden, wenn gewünscht.

### Fazit

Die Workflow-Komponente bringt Ordnung in Prozesse mit vielen Zuständen.  
Sie erlaubt es, Abläufe:

- explizit zu definieren
- sicher zu validieren
- sauber zu testen
- einfach zu visualisieren

Ideal für Dokumente, Benutzerprozesse, Prüfungen, Genehmigungen oder Statusänderungen.


## 10. Refactoring: Von gewachsener Symfony-Struktur zu Clean Architecture
**Schrittweise Modernisierung mit Feature-Fokus**

### Ziel des Refactorings

Wir wollen aus einer technisch und historisch gewachsenen Struktur eine moderne, strukturierte Anwendung machen, die:

- **nach Features** und **Kontexten** gegliedert ist
- eine **klare Trennung zwischen Domäne, Anwendung und Infrastruktur** hat
- auf **Use Cases statt auf Services** basiert
- Symfony als Werkzeug nutzt, aber nicht als Strukturgeber

Das passiert **nicht auf einmal**, sondern **inkrementell und teamfreundlich**.


### Typische Probleme in gewachsener Struktur

1. **Technik-zentrierte Gliederung** (Controller, Service, Handler, Form, etc.)
2. **Wilde Namenskonventionen** (z. B. `MainFunctions`, `Finalizer`, `WorkflowParts`)
3. **Unklare Verantwortlichkeiten** in Services
4. **Hohe Kopplung durch direkte Nutzung von Doctrine-Entitäten**
5. **Keine expliziten Use Cases**, stattdessen verteilte Logik


### Das Prinzip: Feature-Zuschnitt statt Technik-Zuschnitt

Aus z. B.

```text
src/
├── Cancellation/
│   ├── Handler/
│   ├── Mapper/
│   └── Service/
```

wird:

```text
src/
└── Invoice/
    └── Application/
        └── Cancel/
            ├── CancelInvoiceCommand.php
            ├── CancelInvoiceHandler.php
            ├── CancelInvoiceResponse.php
            └── CancelInvoiceController.php
```

→ Ein klarer Use Case, mit klarer Verantwortlichkeit, in einem klar benannten Kontext.

### Der Refactoring-Prozess (empfohlen)

#### 1. Identifiziere stabile Use Cases

- Was tut die App fachlich?
- Was sind konkrete Operationen mit Anfang und Ende?

Beispiel:
- Rechnung stornieren
- Subscription deaktivieren
- Set freigeben

#### 2. Lege neue Strukturen an (neben der alten)

- Neues Feature-Verzeichnis anlegen (`Application/FeatureX`)
- Controller/Handler/Command neu schreiben
- Schrittweise Verantwortung aus Service-Klassen herausziehen

#### 3. Nutze "Strangler Fig" Pattern

> Neue Features werden in neuer Struktur gebaut.  
> Alte Services werden bei Gelegenheit aufgelöst oder durch neue Use Cases ersetzt.

#### 4. Vermeide gleichzeitige Umbauten in mehreren Bereichen

→ Konzentriere dich auf **eine Feature-Gruppe nach der anderen**.

### Migrationshilfe: Mapping alt → neu

| Alt                                | Neu (Beispiel)                                         |
|------------------------------------|--------------------------------------------------------|
| `Handler/`                         | `Application/<UseCase>/<UseCase>Handler.php`           |
| `Service/`                         | Wird Teil von Handler oder als DomainService           |
| `Entity/`                          | `Domain/Entity/`                                       |
| `Repository/`                      | `Domain/Repository/` Interface + Adapter               |
| `Controller/`                      | `Application/<UseCase>/<UseCase>Controller.php`        |
| `Form/Type/`                       | Optional, je nach UI-Strategie                         |
| `Events/`, `EventListener/`        | `Application/<UseCase>/Event/` oder Symfony Subscriber |
| `Twig/`, `Util/`, `ReportGeneration/` | Auflösen, einordnen, ersetzen                          |


### Best Practices

- **Fang bei Use Cases an**, nicht bei Entities
- **Baue neue Dinge im neuen Stil**, migriere alte nur wenn nötig
- **Arbeite testgetrieben**, besonders bei kritischen Prozessen
- **Benutze Symfony bewusst**: als Werkzeug, nicht als Ordnungsprinzip
- **Dokumentiere jeden Refactoring-Schritt** im Team

### Zielstruktur (vereinfacht)

```text
src/
├── Document/
│   ├── Application/
│   │   ├── Upload/
│   │   └── Approve/
│   ├── Domain/
│   │   ├── Entity/
│   │   └── Repository/
│   └── Infrastructure/
│       └── Repository/
├── Invoice/
│   └── ...
├── Shared/
│   ├── ValueObject/
│   └── Infrastructure/
└── ...
```

### Fazit

Refactoring ist ein **Prozess, kein Event**.  
Mit Clean Architecture als Zielstruktur können wir:

- Klarheit schaffen
- Abhängigkeiten reduzieren
- Teamverständnis fördern
- Legacy-Code würdevoll modernisieren

> Bauen wir nicht nur neue Features – bauen wir **ein System, das neue Features gerne aufnimmt**.

---

### 10.1 Refactoring-Beispiel: Von Message + Handler + Service → Use Case

In gewachsenen Symfony-Anwendungen sieht man oft Strukturen wie:

```text
src/
└── <Modul>/
    ├── <Something>Message.php
    ├── Handler/
    │   └── <Something>Handler.php
    ├── Service/
    │   └── <Something>Service.php
    └── Mapper/
        └── <Something>Mapper.php
```

Diese Struktur ist technisch organisiert – nicht fachlich.  
Sie erschwert Verständnis, Testbarkeit und Wiederverwendbarkeit.


### Ziel: Feature-orientierter Use Case

Wir transformieren das Ganze in **einen klar benannten Use Case** mit strukturierter Verantwortlichkeit:

```text
src/
└── <BoundedContext>/
    ├── Application/
    │   └── <UseCaseName>/
    │       ├── <UseCaseName>Command.php
    │       ├── <UseCaseName>Handler.php
    │       ├── <UseCaseName>Request.php
    │       ├── <UseCaseName>Response.php
    │       ├── <UseCaseName>Controller.php
    │       └── Exception/
    │           └── <SomethingFailedException.php>
    ├── Domain/
    │   ├── Entity/
    │   ├── ValueObject/
    │   ├── Repository/
    │   └── Service/
    │       └── <BusinessService>.php
    └── Infrastructure/
        └── Mapper/
            └── <ExternalSystem>Mapper.php
```


### Refactoring-Schritte im Detail

#### 1. **Message → Command**

Alte `*Message.php` Klassen werden zu `*Command.php` und sind:

- **Absichtserklärungen**, was geschehen soll
- **Daten-Transportobjekte** für den Use Case Handler

```php
final class ArchiveEntityCommand
{
    public function __construct(
        public readonly string $id
    ) {}
}
```

#### 2. **Handler bleibt – aber wird UseCase-Handler**

Der `*Handler` wird verschoben nach `Application/<UseCase>/` und implementiert ausschließlich den Geschäftsablauf.

```php
final class ArchiveEntityHandler
{
    public function __construct(private EntityArchiver $archiver) {}

    public function __invoke(ArchiveEntityCommand $command): ArchiveEntityResponse
    {
        return $this->archiver->archive($command->id);
    }
}
```

#### 3. **Service → DomainService**

Technische Services wie `*Service.php` werden aufgeteilt:

- **Fachliche Operationen** wandern in `Domain\Service`
- **Technische Infrastruktur** (z. B. E-Mail, Filesystem, API-Call) wandert in `Infrastructure/`

```php
final class EntityArchiver
{
    public function __construct(private EntityRepositoryInterface $repo) {}

    public function archive(string $id): ArchiveEntityResponse
    {
        // Geschäftslogik hier
    }
}
```

#### 4. **Mapper → Infrastruktur**

Objektkonvertierungen für externe Systeme (z. B. APIs, XML, Dateien) gehören in `Infrastructure/Mapper/`:

```php
final class ExternalSystemMapper
{
    public function mapToExternalFormat(Entity $entity): array
    {
        // ...
    }
}
```

### Ergebnis: Geklärte Verantwortlichkeiten

| Element                     | Neue Rolle                                               |
|-----------------------------|-----------------------------------------------------------|
| `Message`                   | Command für den Use Case                                  |
| `Handler`                   | orchestriert den Anwendungsfall (Application Layer)       |
| `Service`                   | wird als DomainService oder Adapter aufgeteilt            |
| `Mapper`                    | technischer Adapter, nach Infrastructure verschoben       |


### Bonus: Vereinheitlichung der Benennung

**Alt:**
```text
CancelXHandler
FinalizeYHandler
GenerateZHandler
```

**Neu:**
```text
CancelInvoiceHandler
FinalizeBookingHandler
GenerateReportHandler
```

→ Kein „Handler“ ohne Kontext – jede Klasse drückt exakt aus, was passiert.


### Fazit

Durch diese Umstrukturierung:

- gewinnen wir **klare, fachlich benannte Use Cases**
- kapseln wir technische Details aus
- machen wir jeden Anwendungsfall **isoliert testbar**
- und ebnen den Weg für **Nachvollziehbarkeit, Erweiterbarkeit und Team-Ownership**

---

### 10.2 Vom Use Case zum Bounded Context
**Wie aus Features fachlich schlüssige Kontexte werden**

Ein Bounded Context ist mehr als ein Verzeichnis – es ist ein **abgegrenzter Fachbereich** mit:

- eigenem Datenmodell
- eigener Sprache
- eigenen Regeln und Abläufen

Unser Ziel:
> Aus isolierten Use Cases werden **zusammenhängende Kontexte** mit klaren Schnittstellen.

### Schritt 1: Use Cases clustern

Beginne mit dem, was deine Anwendung **wirklich tut**: den Use Cases.  
Sortiere sie nach fachlicher Nähe und gemeinsamer Sprache.

**Beispiel:**

| Use Cases                           | Vermuteter Kontext |
|------------------------------------|---------------------|
| `GenerateInvoice`, `SendInvoice`, `CancelInvoice` | Invoice |
| `UploadDocument`, `ApproveDocument`, `ArchiveDocument` | Document |
| `RegisterUser`, `LoginUser`, `InviteUser` | User |

### Schritt 2: Sprache sichtbar machen (Ubiquitous Language)

Erstelle eine einfache Tabelle oder Liste je Use Case Gruppe:

```text
Kontext: Invoice

- Invoice
- Cancellation
- Reminder
- DueDate
```

Wichtig: Klärt Begriffe im Team.  
Wenn in zwei Gruppen „Stornierung“ etwas anderes bedeutet, habt ihr **zwei Kontexte**, nicht einen.

### Schritt 3: Technische Strukturierung nach Kontext

Nach der logischen Gruppenbildung legst du **Kontextverzeichnisse an**:

```text
src/
├── User/
│   ├── Application/
│   ├── Domain/
│   └── Infrastructure/
├── Invoice/
│   ├── Application/
│   ├── Domain/
│   └── Infrastructure/
└── Document/
    ├── Application/
    ├── Domain/
    └── Infrastructure/
```

Neue Use Cases entstehen **direkt im passenden Kontext**.  
Bestehende Services werden nach und nach dorthin überführt.

### Schritt 4: Trennung durch explizite Kommunikation

Kontexte sprechen **nicht direkt über Klassen** miteinander.

Stattdessen nutzen wir:

- Events (`UserRegisteredEvent`)
- Interfaces (`DocumentRepositoryInterface`)
- DTOs (z. B. `UserSummary`)
- API-Aufrufe oder Services mit Mappern

Ziel: **lockere Kopplung – explizite Schnittstelle**

### Schritt 5: Nicht alles sofort umstellen

Ein vollständiger Umbau ist **weder nötig noch sinnvoll**.

Stattdessen:

- Neue Features immer im neuen Kontext-Stil bauen
- Alte Services bei Gelegenheit migrieren
- Unklare Fälle in `Legacy/` oder `Shared/` isolieren

### Beispiel: Vom Use Case zum Kontext

**Vorher:**

```text
src/
├── Service/
├── Handler/
├── Mapper/
├── GenerateXHandler.php
├── FinalizeYHandler.php
└── CancelZHandler.php
```

**Nachher:**

```text
src/
└── Report/
    ├── Application/
    │   ├── GenerateReport/
    │   ├── FinalizeReport/
    │   └── CancelReport/
    ├── Domain/
    │   ├── Entity/
    │   ├── Service/
    │   └── ValueObject/
    └── Infrastructure/
        └── Mapper/
```

→ Jeder Kontext wird mit jedem Umbau **sprachlich und technisch klarer**.


### Fazit

Bounded Contexts entstehen nicht durch Ordner – sondern durch Verständnis.  
Wir bauen sie **Use Case für Use Case**, bis eine Struktur entsteht, die:

- verständlich
- wartbar
- modular
- und teamübergreifend nachvollziehbar ist.

> Der Kontext ist König. Der Use Case ist der Weg dorthin.


## 11. Testing mit PHPUnit
**Tests entlang der Architektur – nicht entlang der Ordner**

### Warum testen?

Tests schützen vor Regressionen, fördern sauberen Code und schaffen Vertrauen beim Refactoring.  
In Clean Architecture testen wir nicht „Controller“, „Services“ oder „Modelle“ (Implementierungsdetails) –
sondern **Verhalten**, **Entscheidungen** und **Schnittstellen**. Wir orientieren uns an **Anwendungsfällen (Use
Cases)** – nicht an Dateinamen.

### Testarten im Architekturkontext

| Testtyp               | Fokus                                         | Layer            |
|------------------------|-----------------------------------------------|------------------|
| **Unit Test**          | Einzelne Methode, ohne externe Abhängigkeiten | Domain / Application |
| **Application Test**   | Use Case (Handler) mit Mocks oder Fakes       | Application      |
| **Integration Test**   | Zusammenarbeit echter Services                | Infrastructure   |
| **End-to-End Test**    | Kompletter Request → Response                 | Symfony Kernel   |

### 1. Application-Tests: Use Case isoliert testen

```php
use App\Invoice\Application\CancelInvoice\CancelInvoiceHandler;
use App\Invoice\Application\CancelInvoice\CancelInvoiceCommand;
use PHPUnit\Framework\TestCase;

final class CancelInvoiceHandlerTest extends TestCase
{
    public function testCancelsInvoice(): void
    {
        $repo = $this->createMock(InvoiceRepositoryInterface::class);
        $repo->expects($this->once())->method('cancelById')->with('abc-123');

        $handler = new CancelInvoiceHandler($repo);
        $command = new CancelInvoiceCommand('abc-123');

        $handler($command);
    }
}
```

➡ Kein Symfony, kein Datenbank-Setup – nur Logik.


### 2. Domain-Tests: Logik ohne Framework

```php
use App\Invoice\Domain\Entity\Invoice;
use PHPUnit\Framework\TestCase;

final class InvoiceTest extends TestCase
{
    public function testMarkAsCancelled(): void
    {
        $invoice = new Invoice('abc-123');
        $invoice->cancel();

        $this->assertTrue($invoice->isCancelled());
    }
}
```

➡ Domain-Logik ist ideal für kleine, schnelle Tests.


### 3. Integrationstests: Zusammenarbeit echter Dienste

```php
use App\Infrastructure\Doctrine\DoctrineInvoiceRepository;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class DoctrineInvoiceRepositoryTest extends KernelTestCase
{
    public function testCanSaveAndFindInvoice(): void
    {
        self::bootKernel();

        $repo = static::getContainer()->get(DoctrineInvoiceRepository::class);
        $invoice = new Invoice('test-id');

        $repo->save($invoice);
        $found = $repo->find('test-id');

        $this->assertEquals($invoice, $found);
    }
}
```

➡ Nutzt echten Container, Datenbank ggf. per Testdatenbank.


### 4. End-to-End (E2E): Symfony Request durchlaufen lassen

```php
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CancelInvoiceControllerTest extends WebTestCase
{
    public function testCancellingInvoiceReturnsSuccess(): void
    {
        $client = static::createClient();
        $client->request('POST', '/invoices/cancel', [
            'id' => 'abc-123',
        ]);

        $this->assertResponseIsSuccessful();
        $this->assertJson($client->getResponse()->getContent());
    }
}
```

➡ Stellt sicher, dass Routing, DI, Request-Handling funktionieren.


### Empfehlungen

- **Use Cases zuerst testen**, dann Domain
- **Mocks statt Datenbank** im Application-Layer
- **E2E nur für kritische Flows oder APIs**
- **Tests direkt neben dem Code** (`tests/<Context>/<UseCase>`)


### Tools zur Unterstützung

- `phpunit.xml.dist` zentral verwalten
- `--testdox` für sprechende Testausgaben
- `symfony/phpunit-bridge` für Symfony-native Integration
- Coverage optional, Fokus: relevante Logik, nicht Setter


### Fazit

Tests machen dein System nicht nur stabiler –  
sie machen es **verstehbar**, **refactorbar** und **architektonisch robust**.

> Wir testen keine Dateien. Wir testen Verhalten.


### 11.1 Testkategorien im Teamkontext (nach Stiven 👋)

In der Praxis taucht immer wieder die Frage auf:

> „Wo gehört dieser Test hin?“

Stiven und sein Team haben in einem Symfony-API-Projekt (ohne Frontend) eine klare Kategorisierung entwickelt,  
um Verwirrung im Team zu vermeiden. Diese Kategorien helfen, Tests gezielt einzuordnen und Wartungskosten zu reduzieren.

#### Kategorie 1: Unit Tests

- Testet **eine Klasse ohne externe Abhängigkeiten**
- Ausnahme: Maximal **1 Ebene** an Abhängigkeiten erlaubt – wenn diese **selbst keine Abhängigkeiten** haben
- Muss von `PHPUnit\Framework\TestCase` erben
- Ideal für ValueObjects, einfache Services

```php
class Place
{
    private string $where;

    public function __construct()
    {
        $this->where = '';
    }
}

class Time
{
    private string $when = '10:00';
}

class Appointment
{
    public function __construct(private Place $place, private Time $time) {}
}
```

#### Kategorie 2: Integration Tests

- Testet **Klassen mit Abhängigkeiten aus dem Symfony Container**
- Ziel: ein **Teilbereich** der Funktionalität
- Erbt von `Symfony\Bundle\FrameworkBundle\Test\KernelTestCase`
- Nutzen **echte Services aus dem Container**

```php
class AppointmentHandler
{
    public function __construct(private NoWorkCalendar $calendar) {}

    public function handle(Appointment $appointment): void
    {
        $region = $this->calendar->getRegionalCalendar($appointment->getCountry());
        $result = $region->canHappen($appointment);
        // ...
    }
}
```

#### Kategorie 3: Functional Tests

- Testet **einen API-Endpoint** bzw. eine **Ressource** inkl. Payloads
- Mehrere Payloads für denselben Endpoint erlaubt
- Query-Parameter **verändern die Bedeutung** der Anfrage
- Erbt von `Symfony\Bundle\FrameworkBundle\Test\WebTestCase`
- Fokus: Parameter, Validierung, Antwort

```yaml
POST /appointments
GET  /appointments
GET  /appointments/{id}
PUT  /appointments/{id}
```

#### Kategorie 4: Acceptance Tests

- Testet **ganze User Stories**
- Ruft **mehrere Endpoints** auf
- Kombiniert viele Query-Parameter
- Nutzt `Symfony\Bundle\FrameworkBundle\Test\WebTestCase`


```yaml
search:
  GET /appointments?from=...&to=...&onlyAfter=true&allowWeekends=false

a-person-made-a-mistake:
  POST   /appointments
  POST   /correction
  GET    /appointments
  DELETE /appointments/{id}
  POST   /appointments
```

### Fazit

Diese Kategorien helfen, Klarheit zu schaffen:

- Entwickler:innen wissen **sofort**, wo welcher Test hingehört
- Tests sind **nach Ziel** strukturiert, nicht nach Technik
- Das Team kann Entscheidungen **einheitlich** treffen – ohne Meetings

> Einheitlichkeit im Testdesign spart mehr Zeit, als jeder Testlauf.


### 11.2 Best Practices für PHPUnit 10–12.x

- PHPUnit ist seit v10 modularisiert: `phpunit/phpunit`, `phpunit/php-code-coverage`, etc.
- `@depends` ist nützlich für zusammenhängende Use Case Tests, sollte aber nach Möglichkeit nie verwendet werden.
- `--teamcity`, `--coverage-xml`, `--coverage-html` sind wichtige Reporting-Optionen
- Verwende `.phpunit.result.cache` für performante Wiederholungen
- Vermeide **“risky tests”** (keine Asserts, kein Return, etc.)

### 11.3 Coverage & Reporting

Mit aktuellem PHPUnit:

```bash
phpunit --coverage-html coverage/
phpunit --coverage-clover build/logs/clover.xml
```

Weitere Optionen (`phpunit --help`):

- `--coverage-text`
- `--coverage-php`
- `--only-summary-for-coverage-text`
- `--path-coverage`
- `--no-coverage`

### 11.4 Typische Fehlerquellen

- ❌ Tests hängen voneinander ab
- ❌ Kein Isolationsprinzip (z. B. persistente DB)
- ❌ Reine Coverage-Tests ohne Assertion
- ❌ Mocks überall statt echte Use Case-Tests


### 11.5 Empfehlung: Teststruktur im Projekt

Unsere Tests spiegeln **die Architektur der Anwendung** exakt wider.

Die Struktur orientiert sich an:

- **Bounded Contexts** (z. B. `User`, `Document`, `Invoice`)
- **Use Cases** innerhalb dieser Kontexte
- **Testart**: primär Application- und Domain-Tests

```text
tests/
├── User/
│   ├── Application/
│   │   ├── LoginUser/
│   │   │   └── LoginUserHandlerTest.php
│   │   └── RegisterUser/
│   │       └── RegisterUserHandlerTest.php
│   └── Domain/
│       ├── Entity/
│       │   └── UserTest.php
│       └── ValueObject/
│           └── EmailAddressTest.php
├── Document/
│   ├── Application/
│   │   ├── UploadDocument/
│   │   │   └── UploadDocumentHandlerTest.php
│   │   └── ApproveDocument/
│   │       └── ApproveDocumentHandlerTest.php
│   └── Domain/
│       └── Entity/
│           └── DocumentTest.php
├── Shared/
│   └── Domain/
│       └── ValueObject/
│           └── UuidTest.php
└── bootstrap.php
```

### Vorteile dieser Struktur

- **Use Case-spezifisch**: Jede Logik hat ihren eigenen Test-Ordner
- **Modular**: Tests können kontextweise ausgeführt werden (`--filter`)
- **Refactoring-freundlich**: Testordner bewegen sich mit dem Code
- **Teamfreundlich**: Entwickler:innen wissen sofort, wo ein Test hin muss

### Bonus: Platz für weitere Testarten

Du kannst problemlos eigene Test-Typen ergänzen:

```text
tests/
└── Invoice/
    ├── Application/
    │   └── GenerateInvoice/
    │       ├── GenerateInvoiceHandlerTest.php
    │       └── GenerateInvoiceRequestValidatorTest.php
    ├── Acceptance/
    │   └── InvoiceLifecycleTest.php
    └── Api/
        └── GenerateInvoiceEndpointTest.php
```

> Struktur ist nicht Dogma – aber Klarheit im Testcode ist ein Geschenk an dein zukünftiges Team.


### 11.6 Testarten per Basisklasse – semantisch statt strukturell

In unserer Architekturstruktur trennen wir Tests **nicht** nach Unit, Integration oder Acceptance in eigenen Verzeichnissen, sondern nach **Kontext** und **Use Case**.

Damit wir trotzdem gezielt **nur bestimmte Arten von Tests** ausführen können, nutzen wir **Basisklassen** als Marker für die Testart.

#### Beispiel-Basisklassen

```php
// tests/TestCase/UnitTestCase.php
namespace App\Tests\TestCase;

use PHPUnit\Framework\TestCase;

abstract class UnitTestCase extends TestCase {}
```

```php
// tests/TestCase/IntegrationTestCase.php
namespace App\Tests\TestCase;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

abstract class IntegrationTestCase extends KernelTestCase {}
```

Weitere Beispiele wären `FunctionalTestCase`, `AcceptanceTestCase` oder `ApiTestCase`, je nach Bedarf.

#### Verwendung im Test

```php
use App\Tests\TestCase\UnitTestCase;

final class LoginUserHandlerTest extends UnitTestCase
{
    public function testLoginSucceeds(): void
    {
        // ...
    }
}
```

```php
use App\Tests\TestCase\IntegrationTestCase;

final class DoctrineUserRepositoryTest extends IntegrationTestCase
{
    public function testFindsUserByEmail(): void
    {
        // ...
    }
}
```

#### Vorteile dieser Strategie

- **Trennung über Code**, nicht über Verzeichnisse
- Alle Tests bleiben **am Ort der Logik**
- Filterung bleibt möglich
- Die Testart ist im Code **sofort sichtbar**

#### Filterung über PHPUnit

Mit dieser Struktur brauchst du nur eine zentrale `phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/9.5/phpunit.xsd"
         bootstrap="tests/bootstrap.php"
         colors="true">
    <testsuites>
        <testsuite name="all">
            <directory>tests</directory>
        </testsuite>
    </testsuites>

    <coverage>
        <include>
            <directory suffix=".php">src</directory>
        </include>
    </coverage>
</phpunit>
```

Dann kannst du gezielt nur bestimmte Testarten ausführen:

```bash
# Nur Unit-Tests
vendor/bin/phpunit --filter UnitTestCase

# Nur Integration-Tests
vendor/bin/phpunit --filter IntegrationTestCase
```

#### Komfort mit Composer-Skripten

In deiner `composer.json`:

```json
{
    "scripts": {
        "test:unit": "phpunit --filter UnitTestCase",
        "test:integration": "phpunit --filter IntegrationTestCase",
        "test": "phpunit"
    }
}
```

→ So kannst du direkt im Terminal ausführen:

```bash
composer test:unit
composer test:integration
composer test
```

### Fazit

Wir bauen **keine parallelen Test-Verzeichnisse**, sondern setzen auf:

- Klarheit durch Kontext & Use Case
- Typisierung der Testart per Basisklasse
- Flexible Filterung ohne Strukturbruch

> Tests da, wo sie hingehören – und trotzdem gezielt steuerbar.

## 12. Continuous Integration, Codequalität & Releases
**Qualität sichern – automatisch, reproduzierbar, nachvollziehbar**

### 12.1 Begriffe: CI, CD und wie sie zusammenhängen

| Begriff                  | Bedeutung                                                                 |
|--------------------------|---------------------------------------------------------------------------|
| **Continuous Integration (CI)** | Automatisiertes Testen und Prüfen bei jedem Commit                     |
| **Continuous Delivery (CD)**    | Automatisiertes Bauen und Liefern eines Release-Artefakts (z. B. Docker-Image) |
| **Continuous Deployment**      | Automatisiertes Ausrollen des Artefakts in eine Zielumgebung           |

#### Zusammenfassung:

- **CI** sichert Qualität bei jedem Push/Merge
- **CD** stellt sicher, dass das Projekt jederzeit auslieferbar ist
- **Continuous Deployment** geht noch weiter: Lieferung = Ausführung

---

### 12.2 Wann laufen welche Pipelines?

| Ereignis / Aktion              | Was passiert automatisch?                        |
|--------------------------------|--------------------------------------------------|
| `push` auf Branch              | Lint, Static Analysis, PHPUnit, Mutation Tests   |
| `merge` auf `main`/`release/*` | Build Docker Image, Tag-Version, optional CD     |
| `release` via Tag oder Commit  | Changelog generieren, GitHub/GitLab Release      |
| Manuelles Triggern             | z. B. Deployment in Test oder Prod-Umgebung       |

---

### 12.3 CI Tools (empfohlen im Projekt)

| Tool              | Zweck                              | Beschreibung                            |
|-------------------|-------------------------------------|------------------------------------------|
| `phpunit`         | Unit- und Integrationstests         | klassischer Test-Runner                  |
| `infection`       | Mutationstests                      | prüft Testqualität                       |
| `phpstan`, `psalm`| statische Analyse                   | findet Bugs, bevor sie passieren         |
| `rector`          | automatisches Refactoring           | Upgradehilfe, Modernisierung             |
| `php-cs-fixer`    | Code-Stil & Formatierung            | formatiert nach Regelwerk                |
| `deptrac`         | Architekturprüfung                  | stellt Verbindungsregeln zwischen Layern sicher |
| Linter            | (z. B. `php -l`) Syntaxprüfung       | optional, meist durch andere Tools abgedeckt |

### 12.4 Git & Commit-Konventionen

Wir verwenden **Conventional Commits** – erweitert um Ticket-Referenzen, damit jede Änderung nachvollziehbar dem jeweiligen Issue oder Task zugeordnet ist.

#### Format

```text
<type>(<TICKET-ID>): <message>
```

Beispiele:

```text
feat(BAS-123): allow login with username or email
fix(MEIK-88): fix wrong totals in PDF summary
chore(ITS-1): update PHP version for testing
refactor(BAS-42): extract tax calculator
```

#### Zulässige `type`-Werte

- `feat`: neues Feature
- `fix`: Bugfix
- `chore`: Infrastruktur, CI, Setup, Docs, etc.
- `refactor`: interne Codeänderung (ohne neues Feature oder Fix)
- `test`: Testcode
- `style`: Formatierung, Semikolon, Einrückung, etc.
- `perf`: Performance-Verbesserung
- `ci`: Build- & Deploy-Änderungen

#### Vorteile

- **Automatische Changelog-Generierung**
- **Semantische Versionierung**
- **Filterung von Branches, Pipelines, Release Notes**
- **Klare Zuordnung zu Aufgaben im Ticketsystem**

#### Optional: Commit Linter

Nutze z. B. [commitlint](https://commitlint.js.org/) oder eigene Git-Hooks, um das Format automatisch zu überprüfen.

```bash
npm install --save-dev @commitlint/{config-conventional,cli}
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
```

> Jeder Commit ist ein Kommunikationsbaustein –  
> also sprechen wir klar, strukturiert und nachverfolgbar.


### 12.5 Releases und Version History

Wir erstellen Releases:

- per Git Tag (z. B. `v1.3.0`)
- mit automatischem oder manuellem Changelog
- durch GitHub/GitLab Releases oder CLI Tools

Optionale Helfer:

- `conventional-changelog`
- `release-it`
- `semantic-release`

---

### 12.6 Delivery Workflow mit Docker

Beim Delivery-Schritt:

- wird ein Docker-Image gebaut
- mit einer eindeutigen Version getaggt
- ins Registry (z. B. GitLab, GHCR, DockerHub, Nexus, Azure) gepusht

Beispiel im CI:

```yaml
docker build -t myapp:${CI_COMMIT_SHORT_SHA} .
docker tag myapp:${CI_COMMIT_SHORT_SHA} myapp:latest
docker push myapp:${CI_COMMIT_SHORT_SHA}
docker push myapp:latest
```

Je nach Strategie kann danach ein manueller oder automatisierter **Deploy-Job** folgen.

---

### Fazit

Mit klarer CI/CD-Strategie stellen wir sicher:

- Qualität in jedem Commit
- reproduzierbare Builds
- nachvollziehbare Änderungen und Releases

> Code schreiben ist das eine – aber CI/CD macht ihn wertvoll.


## 13. Architekturregeln prüfen mit deptrac
**Struktur sichern, Layer trennen, Verletzungen aufdecken**

### Warum deptrac?

In Clean Architecture definieren wir **explizite Abhängigkeitsrichtungen** – z. B.:

- Application darf auf Domain zugreifen
- Domain kennt niemanden
- Infrastructure darf alles kennen – aber nicht umgekehrt

Diese Regeln **leben im Kopf – bis man sie mit deptrac überprüfbar macht**.

deptract analysiert deinen Code statisch und prüft, ob sich Klassen an die von dir definierten Architekturgrenzen halten.

### Ziel

> **Die Struktur sichtbar und überprüfbar machen – in jedem Commit**

### Layer-Definition (empfohlene Struktur)

In `deptrac.yaml` definierst du deine Schichten z. B. so:

```yaml
parameters:
  layers:
    - name: Domain
      collectors:
        - type: className
          regex: ^App\\.+\\Domain\\

    - name: Application
      collectors:
        - type: className
          regex: ^App\\.+\\Application\\

    - name: Infrastructure
      collectors:
        - type: className
          regex: ^App\\.+\\Infrastructure\\

    - name: Shared
      collectors:
        - type: className
          regex: ^App\\Shared\\
```

### Regeln zwischen Layers

```yaml
ruleset:
  Domain: ~          # darf auf niemanden zugreifen
  Application:
    - Domain         # darf Domain und Shared verwenden
    - Shared
  Infrastructure:
    - Application    # darf Application, Domain und Shared nutzen
    - Domain
    - Shared
  Shared:
    - Shared         # darf nur Shared verwenden
```

Damit erlaubst du z. B. `Uuid` oder `EmailAddress` als ValueObject aus `Shared\Domain\ValueObject` sowohl in Domain als auch Application zu verwenden – aber **Shared bleibt stabil** und darf nicht auf andere Layer zugreifen.


→ Du beschreibst nur erlaubte Zugriffe. Alles andere ist ein Regelverstoß.

### Beispielverstoß

Wenn `User\Application\LoginUserHandler.php` auf `User\Infrastructure\DoctrineUserRepository.php` direkt zugreift, meldet deptrac:

```text
Violation: App\User\Application\LoginUserHandler -> App\User\Infrastructure\DoctrineUserRepository
Layer Application must not depend on Infrastructure
```

### deptrac im Projekt einsetzen

1. Konfigurationsdatei anlegen: `deptrac.yaml`
2. Befehl ausführen:

```bash
vendor/bin/deptrac analyse deptrac.yaml
```

Optional: Ausgabeformat z. B. als Tabelle, GitHub-Anmerkung oder HTML-Report

### Integration in CI

In `composer.json`:

```json
"scripts": {
  "analyse:arch": "vendor/bin/deptrac analyse --formatter github"
}
```

In deiner Pipeline:

```bash
composer analyse:arch
```

### Tipps zur Konfiguration

- Verzeichnisse pro Kontext → `regex: ^App\\User\\Domain\\`
- Layers nicht zu grob definieren
- Optional: zusätzlich `Shared`, `Test`, `Legacy` als eigene Layer
- Verwende `skip_violations`, um Altlasten temporär zuzulassen

### Optional: Visualisierung

Mit `--formatter graphviz` erzeugst du eine `.dot`-Datei für Graphviz:

```bash
vendor/bin/deptrac analyse --formatter graphviz > deptrac.dot
dot -Tpng deptrac.dot -o architecture.png
```

### Fazit

Mit deptrac:

- wird deine Architektur **überprüfbar**
- sind Verstöße **sofort sichtbar**
- bleibt dein Code **strukturiert – auch im Team**

> Architektur lebt nicht im Diagramm. Sie lebt im Code. Und deptrac hilft, sie gesund zu halten.


## 0. Die 12-Factor App
**Modern, skalierbar, konfigurierbar – von Anfang an richtig bauen**

### Was ist die 12-Factor App?

Die [12-Factor App](https://12factor.net/de/) ist ein Architekturmanifest für moderne Webanwendungen.  
Sie beschreibt bewährte Prinzipien, um Anwendungen zu bauen, die:

- **leicht deploybar** sind
- **in jeder Umgebung konsistent** laufen
- sich **einfach konfigurieren und skalieren** lassen

Diese Prinzipien sind besonders wichtig für containerisierte Umgebungen, Microservices und Continuous Deployment Workflows.

---

### Die 12 Faktoren im Überblick

| Nr. | Faktor                     | Ziel                                                                 |
|-----|----------------------------|----------------------------------------------------------------------|
| I   | Codebasis                  | Eine Codebasis, viele Deploys                                       |
| II  | Abhängigkeiten             | Explizite Abhängigkeitserklärung                                    |
| III | Konfiguration              | Konfiguration über Environment-Variablen                            |
| IV  | Backing Services           | Ressourcen wie DBs als Services behandeln                           |
| V   | Build, Release, Run        | Trennung von Build- und Run-Phasen                                  |
| VI  | Prozesse                   | Die App läuft als stateless Prozesse                                |
| VII | Port-Binding               | Die App bringt ihren eigenen Webserver mit                          |
| VIII| Concurrency                | Skalierung durch Prozesse                                           |
| IX  | Disposability              | Schnelles Starten und Stoppen                                       |
| X   | Dev/Prod-Parität           | Entwicklungs- und Produktionsumgebung ähneln sich                   |
| XI  | Logs                       | Logs als Event-Stream                                               |
| XII | Admin-Prozesse             | Admin Tasks als einmalige Prozesse                                  |

---

### Was wir mit unserer Architektur bereits erreicht haben

Unsere Clean Architecture-Struktur bringt bereits viele dieser Faktoren mit:

| Faktor | Erfüllung     | Kommentar                                                                            |
|--------|---------------|--------------------------------------------------------------------------------------|
| I      | ✅             | Eine Symfony-Codebasis für mehrere Environments                                      |
| II     | ✅             | Composer + Dependency Injection                                                      |
| III    | ✅ (siehe unten) | Einheitliche Konfiguration mit Environment-Variablen                                 |
| IV     | ✅             | DB, Queue, Mailer als Services via Docker oder externe Ressourcen                    |
| V      | ✅             | Build über Docker, Run als Container-Prozess                                         |
| VI     | ✅             | App, Worker, Scheduler als unabhängige Prozesse                                      |
| VII    | ✅             | App exposed HTTP-Port, z. B. 80 oder 443                                             |
| VIII   | ✅             | Worker & Scheduler skalierbar                                                        |
| IX     | ✅             | Kein State im Container, schnelle Startzeit                                          |
| X      | ✅             | dev/prod werden durch explizite Environment-Variablen konfiguriert sind sonst gleich |
| XI     | ✅             | Logs via Monolog → stdout/stderr → Docker Logs                                       |
| XII    | ✅             | Symfony Console Commands, Migrations, Tasks                                          |


### Schwerpunkt: III. Konfiguration über Environment-Variablen

> „Konfiguration ist alles, was sich zwischen Deploys ändert.“

In unserer Architektur werden alle Konfigurationen **ausschließlich über Environment-Variablen** gesteuert – keine `.env`-Dateien im Anwendungscode, keine DotEnv-Komponente zur Laufzeit (außer in Tests).

### Prinzipien

- **Keine Konfiguration im Code**
- **Keine DotEnv-Komponente** mehr in der Symfony Runtime
- **Keine Konfiguration in `config/*.yaml` außer Bindings**
- Alle Konfiguration kommt immer nur durch **explizite Environment-Variablen**
- **Alle Werte kommen von außen – entweder über `docker-compose.yaml` oder Deployment-Tooling (Ansible, Terraform)**
- **Alle verwendeten Variablen müssen in den parameters der `config/services.yaml` deklariert werden**
- Die App **darf nur starten**, wenn alle benötigten Variablen gesetzt sind
- `.env.test` bleibt temporär für Tests

### Vorteile dieses Konzepts

- **Konfigurationsquelle ist eindeutig**: `env_file`
- **Jede Umgebung ist explizit** (dev, prod, test, staging)
- **Fehlende Konfigurationen werden sofort bemerkt**
- **Vault/Secrets/Cloud-Configs** lassen sich nahtlos integrieren
- **Unabhängig vom Symfony-Ökosystem**

### Symfony Runtime deaktiviert DotEnv:

```php
// app/public/index.php
$_SERVER['APP_RUNTIME_OPTIONS']['disable_dotenv'] = true;
```

```php
// app/bin/console
$_SERVER['APP_RUNTIME_OPTIONS']['disable_dotenv'] = true;
```

> Achtung: Die App läuft dann **nur noch im Container**, es sei denn man setzt alle Variablen manuell.

### Migration bestehender Konfiguration

Schrittweise Migration:

1. Konfigurationen per `%env(XYZ)%` definieren
2. Default-Werte im Parameterbaum definieren
3. `.env` durch `env_file` ersetzen
4. DotEnv deaktivieren
5. Tests & Secrets explizit setzen

Beispiel:

```yaml
parameters:
  domain: '%env(resolve:APP_DOMAIN)%'
  images.upload.directory: '%env(resolve:IMAGES_UPLOAD_DIRECTORY)%'

services:
  _defaults:
    bind:
      string $domain: '%domain%'
      string $imagesUploadDirectory: '%images.upload.directory%'
```

### Warum `resolve:`?

Das Prefix `resolve:` sorgt dafür, dass der Wert **sofort beim Container-Boot** geladen wird.  
Wenn die Variable nicht gesetzt ist, schlägt Symfony bereits beim Start fehl – und nicht erst, wenn der Service verwendet wird.

### Unterschiedliche Umgebungen, unterschiedliche Wege

| Umgebung     | Weg der Konfiguration                          |
|--------------|------------------------------------------------|
| **Development** | direkt in `docker-compose.yaml` unter `environment:`     |
| **Staging / Prod** | via Ansible, Terraform, Secrets oder Container-Plattform |

### DotEnv nur für Tests

Für Tests (PHPUnit) kann `Dotenv` weiterhin verwendet werden, z. B. `.env.test`.  
Dort sind die Konfigurationswerte konstant, werden nicht verändert und laufen im dev-Container.

### Fazit

Wir erfüllen Faktor III vollständig:

- durch die **Trennung von Infrastruktur und Anwendung**
- durch die **Verwendung von `env_file`**
- durch die **Deaktivierung von DotEnv**
- ist **konsequent environment-agnostisch**
- **bricht sofort**, wenn eine Konfiguration fehlt – genau das wollen wir

> Konfiguration ist kein "Vielleicht". Sie ist ein Vertragsbestandteil der Anwendung.
> Unsere Symfony-Anwendung ist environment-agnostisch, reproduzierbar und klar konfiguriert – so wie es moderne Software verlangt.


## 14. Projekt aktuell halten & technische Schulden vermeiden
**Pflege statt Verfall – durch Tools, Routinen und Transparenz**

Ein gutes Architekturfundament nützt wenig, wenn es verrottet.  
Deshalb setzen wir auf einen klaren Fahrplan, um das Projekt:

- aktuell zu halten
- technische Schulden zu vermeiden
- Deprecations systematisch abzubauen
- Upgrades risikoarm durchzuführen

### Ziele

- Neue Symfony-, PHP-, Library-Versionen **frühzeitig nutzen**
- **Deprecations im Blick behalten** – statt sie zu ignorieren
- Upgrades automatisieren und vereinfachen
- Libraries aktiv beobachten und prüfen

---

### 1. Rector – strukturiertes automatisches Refactoring

[Rector](https://getrector.com/) automatisiert typische Refactorings und Migrations. Es bietet:

- Upgrade-Pfade für Symfony, Doctrine, PHP, PHPUnit, etc.
- eigene Regeldefinitionen für Projektregeln
- Fixes für repetitive Codemuster

Beispiel:

```bash
vendor/bin/rector process src --set symfony
```

→ Passt Code an neue Symfony APIs an.

---

### 2. Deprecation Warnings – frühzeitig beheben

Symfony und viele Bibliotheken melden Deprecations, bevor APIs verschwinden.  
Wir behandeln Deprecations nicht als Warnung, sondern als:

> „Hinweis auf zukünftige Bugs“

#### Symfony

```bash
php bin/phpunit --group legacy
php bin/phpunit --log-junit var/phpunit.junit.xml
```

Tools wie `symfony/phpunit-bridge` helfen, Deprecations als Teil der Tests auszugeben und auszuwerten.

#### PHPUnit Deprecation Baseline

Seit PHPUnit 10 ist es möglich, eine **Baseline** für Deprecations zu führen:

```bash
phpunit --generate-deprecation-baseline
```

→ Dadurch kannst du neue Deprecations erkennen, ohne von alten erschlagen zu werden.

### 3. RenovateBot und/oder Dependabot

Automatisierte Pull Requests für neue Versionen:

- `composer.json`-Updates mit ChangeLog-Hinweis
- PRs mit semantischem Diff und Versionsemantik
- Automatisch getaggte Merges für neue Releases

Wir setzen:

- **RenovateBot** für maximale Konfiguration, auch Self-Hosted
- **Dependabot** für GitHub-native Security-Fixes

Wichtig:

- PRs werden nie automatisch gemerged
- Jede Änderung löst eine **CI-Pipeline** aus

### 4. Test-gestütztes Updaten

Kein Update ohne Tests. Unsere Update-Strategie:

1. `composer update --with-dependencies`
2. `phpunit`
3. `rector`
4. `deptrac analyse`
5. Merge only if ✅

### 5. Automatisiertes Feedback auf techn. Schulden

| Tool          | Zweck                           |
|---------------|----------------------------------|
| Rector        | automatische Refactorings        |
| Symfony Bridge| Deprecations tracken             |
| phpstan       | statische Analyse                |
| php-cs-fixer  | Style-Richtlinien erzwingen      |
| deptrac       | Architekturgrenzen überwachen    |
| PHPUnit       | Tests + Deprecation Baseline     |
| RenovateBot   | Dependency Monitoring            |


### 6. Versionen im Blick behalten – worauf wir achten

Damit keine ungeplanten Updates oder inkompatiblen Änderungen ins Projekt gelangen, überprüfen wir regelmäßig die folgenden Bereiche auf Versionsstände:

#### 1. GitLab CI / GitHub Actions

- Docker-Images in `image:` Zeilen
- Services in `services:` Blocks (z. B. DBs)
- Tools in `before_script:` oder `script:` (z. B. Composer, Node, PHP)

Beispiel:

```yaml
image: php:8.2-cli
services:
  - postgres:15
```

#### 2. Composer (PHP-Dependencies)

- `composer.json` → Alle Versionen möglichst **explizit** mit SemVer-Einschränkung (`^`, `~`, `>=`)
- Dev-Dependencies ebenfalls gepflegt (z. B. phpunit, rector, infection, deptrac)

#### 3. Dockerfiles

- Basis-Images exakt pinnen  
  Beispiel:

```Dockerfile
FROM php:8.2-fpm-alpine
```

- Externe Tools mit Version installieren  
  z. B. `composer@2.6`, `node@20`, `yarn@1.22`

#### 4. `package.json` (JavaScript/Node)

- Alle Versionen explizit angeben, kein `"*"` oder `"latest"`
- `npm audit` / `yarn audit` regelmäßig prüfen

#### 5. `.dockerignore` und `.gitignore`

- prüfen, ob `node_modules/`, `vendor/` korrekt ausgeschlossen sind
- keine `.env` oder Secret-Leaks

#### 6. Renovate-Konfiguration

- **Whitelist oder Include-Liste** definieren
- Sicherheitsupdates für Docker-Base-Images aktivieren
- Schedule für Updates festlegen (z. B. wöchentlich)

#### Best Practice: Versionen immer pinnen

| Kontext       | Empfehlung                        |
|---------------|------------------------------------|
| Composer      | `^8.2`, `~1.3.0`, keine `"*"`       |
| Docker        | `php:8.2-fpm-alpine` statt `latest`|
| Node/NPM      | keine `"latest"`, lieber `^20.0.0` |
| GitLab CI     | Images explizit, keine Defaults    |

> Nur was festgelegt ist, ist kontrollierbar.
> Alles andere ist ein Bug mit Wartezeit.


### Fazit

Technische Schulden entstehen nicht, weil sich Code ändert –  
sondern weil man **nicht vorbereitet ist**, wenn es passiert.

Wir vermeiden das durch:

- klare Regeln
- automatisierte Tools
- Transparenz in der CI

> Wartbarkeit ist kein Zustand. Sie ist ein Prozess.
