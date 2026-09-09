---
title: "Mocks vs. Fakes - Why Mocks Make Refactoring Hard"
date: 2025-11-03T09:45:00+01:00
tags: [php, testing, architecture, hexagonal architecture, tdd]
image: fakes-vs-mocks.png
comments: true
draft: false
toc: true
---

A good test should tell me if a feature is broken. But I have worked with many tests that failed only because I moved a method call, renamed something, or changed code that no user could see.

Most of these tests had one thing in common: every dependency was mocked. The tests knew exactly how the code worked inside, but they knew very little about the final result.

{{< admonition type=tldr title="TL;DR" >}}
Mocks often test **how** the code works. Fakes let you test **what** the code does.

When I test an application service, I usually want to know if the use case works. I do not care if a repository method was called once or twice.

My rule of thumb is:

- Use real objects for domain tests.
- Use small in-memory fakes for application tests.
- Test real adapters with real infrastructure.
- Use mocks when the method call itself is important.

Mocks are not always bad. Mocking every dependency is.
{{< /admonition >}}

## Why We Use So Many Mocks

Many developers learn that a unit test should test one class in isolation. The result often looks like this:

> I am testing one class, so I have to mock every other class.

But a unit does not have to be one class. A unit can also be one use case or one piece of behavior.

Isolation also does not mean that every object has to be a mock. It means that the test should not need a production database, the network, the filesystem, or another external system.

An in-memory repository is still fast and isolated. It is just a normal PHP object that behaves like a simple repository.

Mocks are popular because they are easy to create:

```php
$repository = $this->createMock(OrderRepository::class);
```

A fake takes more work at the beginning. But you write it once and use it in many tests. With mocks, you repeat the setup in every test.

## Mocks, Stubs, Spies, and Fakes

We often call every test double a mock, but there are differences:

| Test double | What it does |
|---|---|
| **Dummy** | Fills a parameter but is not used |
| **Stub** | Returns an answer that you define in the test |
| **Spy** | Records calls so you can check them later |
| **Mock** | Checks if expected calls happened |
| **Fake** | Is a small working version of a real adapter |

A PHPUnit mock can be used as a stub, spy, or mock. In this post, I use *mock* for code that checks calls such as this:

```php
$repository->expects(self::exactly(2))
    ->method('save');
```

Martin Fowler explains the different testing styles in [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html). One style checks the final state. The other checks how objects talk to each other. Both can be useful. The problem starts when we check method calls even though we could check a real result instead.

## Mocks Test How the Code Works

Here is a small application service for creating an order:

```php
final class CreateOrder
{
    public function __construct(
        private CustomerRepository $customers,
        private OrderRepository $orders,
        private PaymentGateway $payments,
    ) {
    }

    public function execute(string $customerId, array $items): Order
    {
        $customer = $this->customers->findById($customerId)
            ?? throw new CustomerNotFound($customerId);

        $order = Order::place($customer, $items);
        $this->orders->save($order);

        $payment = $this->payments->charge(
            $customer->paymentMethodId(),
            $order->total(),
        );

        $order->markAsPaid($payment->transactionId());
        $this->orders->save($order);

        return $order;
    }
}
```

A test with mocks could look like this:

```php
public function testItCreatesAndPaysForAnOrder(): void
{
    $customers = $this->createMock(CustomerRepository::class);
    $orders = $this->createMock(OrderRepository::class);
    $payments = $this->createMock(PaymentGateway::class);

    $customer = Customer::withPaymentMethod('customer-1', 'payment-method-1');

    $customers->expects(self::once())
        ->method('findById')
        ->with('customer-1')
        ->willReturn($customer);

    $orders->expects(self::exactly(2))
        ->method('save')
        ->with(self::isInstanceOf(Order::class));

    $payments->expects(self::once())
        ->method('charge')
        ->with('payment-method-1', 99.98)
        ->willReturn(new Payment('transaction-1', 99.98));

    $service = new CreateOrder($customers, $orders, $payments);

    $order = $service->execute('customer-1', [
        ['sku' => 'ABC', 'price' => 49.99, 'quantity' => 2],
    ]);

    self::assertTrue($order->isPaid());
}
```

This test knows a lot about the code inside `CreateOrder`:

- `findById()` is called once.
- `save()` is called twice.
- `charge()` is called once.
- The methods receive exact values.

Some of this is important. The correct payment method and amount must be used. But does the business care if `save()` is called twice?

Maybe I later decide that an unpaid order should not be saved. I remove the first `save()` and only save the paid order at the end. The result is still one paid order and one payment.

The test still fails because it expects two calls to `save()`.

I improved the code without changing the result, but now I have to change the test. If many tests use the same mock setup, a small refactoring can break many tests.

{{< admonition type=warning title="The warning sign" >}}
That is the main problem: the tests tell me that the code changed, not that the feature is broken.
{{< /admonition >}}

## Fakes Test What the Code Does

A fake implements the same interface as the real adapter, but uses a simpler solution. Instead of storing orders in PostgreSQL, this fake stores them in an array:

```php
final class InMemoryOrderRepository implements OrderRepository
{
    /** @var array<string, Order> */
    private array $orders = [];

    public function save(Order $order): void
    {
        $this->orders[$order->id()] = clone $order;
    }

    public function findById(string $id): ?Order
    {
        return isset($this->orders[$id])
            ? clone $this->orders[$id]
            : null;
    }
}
```

The fake stores a clone. This is important when `Order` is mutable. If it stored the same object, changing the order after `save()` would also change the stored object. A test could then stay green even if the second `save()` was missing.

The payment gateway can also have a small fake:

```php
final class InMemoryPaymentGateway implements PaymentGateway
{
    /** @var list<Payment> */
    private array $payments = [];

    /** @var array<string, int> */
    private array $balances = [];

    public function setBalance(string $paymentMethodId, int $cents): void
    {
        $this->balances[$paymentMethodId] = $cents;
    }

    public function charge(string $paymentMethodId, float $amount): Payment
    {
        $cents = (int) round($amount * 100);

        if (($this->balances[$paymentMethodId] ?? 0) < $cents) {
            throw new InsufficientFunds();
        }

        $this->balances[$paymentMethodId] -= $cents;

        $payment = new Payment(
            'transaction-' . (count($this->payments) + 1),
            $amount,
            $paymentMethodId,
        );

        $this->payments[] = $payment;

        return $payment;
    }

    /** @return list<Payment> */
    public function payments(): array
    {
        return $this->payments;
    }
}
```

Now the test can describe the use case:

```php
public function testItCreatesAndPaysForAnOrder(): void
{
    $customers = new InMemoryCustomerRepository();
    $orders = new InMemoryOrderRepository();
    $payments = new InMemoryPaymentGateway();

    $customers->save(
        Customer::withPaymentMethod('customer-1', 'payment-method-1'),
    );
    $payments->setBalance('payment-method-1', 100_00);

    $service = new CreateOrder($customers, $orders, $payments);

    $order = $service->execute('customer-1', [
        ['sku' => 'ABC', 'price' => 49.99, 'quantity' => 2],
    ]);

    $savedOrder = $orders->findById($order->id());
    self::assertNotNull($savedOrder);
    self::assertTrue($savedOrder->isPaid());
    self::assertSame(99.98, $savedOrder->total());

    self::assertCount(1, $payments->payments());
    self::assertSame(
        'payment-method-1',
        $payments->payments()[0]->paymentMethodId(),
    );
}
```

This test checks the result:

- The order was saved.
- The saved order is paid.
- The total is correct.
- The correct payment method was charged once.

It does not care if `save()` was called once or twice. I can change the code without changing the test, as long as the use case still works.

The test also finds real mistakes. It fails if I use the wrong payment method, charge the wrong amount, or forget to save the paid order.

## Why Fakes Fit Hexagonal Architecture

In hexagonal architecture, the application defines ports:

```php
interface OrderRepository
{
    public function save(Order $order): void;

    public function findById(string $id): ?Order;
}
```

Different adapters can implement this port:

- `DoctrineOrderRepository` stores orders in a database.
- `InMemoryOrderRepository` stores orders in an array.

The application does not need to know which adapter it uses. This also makes the in-memory adapter a good choice for application tests.

I split my tests like this:

```text
Domain tests
  Use real domain objects. Usually no test doubles.

Application tests
  Test complete use cases with in-memory fakes.

Adapter tests
  Test Doctrine with a real database and HTTP adapters with a test server.

System tests
  Test a few important paths through the complete application.
```

The application tests are fast because they do not start external systems. The adapter tests make sure that the production code really works with the database or API.

{{< admonition type=info title="Fakes do not replace adapter tests" >}}
Application tests with fakes check the use case. Adapter tests check if the production code really works with the database, filesystem, queue, or API. We need both.
{{< /admonition >}}

## Fakes Can Be Wrong Too

A fake is not automatically correct. It can behave differently from the real adapter.

For example, an in-memory repository may:

- forget a unique constraint;
- return the same mutable object;
- sort results differently;
- ignore transactions;
- hide database-specific problems.

This is why I use the same contract tests for the fake and the real adapter:

```php
abstract class OrderRepositoryContractTest extends TestCase
{
    abstract protected function repository(): OrderRepository;

    public function testSavedOrderCanBeFoundByItsId(): void
    {
        $repository = $this->repository();
        $order = OrderBuilder::anOrder()->withId('order-1')->build();

        $repository->save($order);

        self::assertEquals($order, $repository->findById('order-1'));
    }

    public function testUnknownOrderIsNotFound(): void
    {
        self::assertNull(
            $this->repository()->findById('missing-order'),
        );
    }
}
```

Both repository tests extend this class:

```php
final class InMemoryOrderRepositoryTest
    extends OrderRepositoryContractTest
{
    protected function repository(): OrderRepository
    {
        return new InMemoryOrderRepository();
    }
}

final class DoctrineOrderRepositoryTest
    extends OrderRepositoryContractTest
{
    protected function repository(): OrderRepository
    {
        return self::getContainer()->get(DoctrineOrderRepository::class);
    }
}
```

This makes sure that both implementations follow the same basic rules.

It does not test everything. Transactions, locking, database constraints, and parallel requests still need tests with the real database.

## Why Fakes Become Cheaper Over Time

A mock is often faster to write for the first test:

```php
$repository = $this->createMock(OrderRepository::class);
$repository->method('findById')->willReturn($order);
```

But every new test needs its own setup. After a while, the same expectations are copied into many test files.

A fake takes more time once:

```php
$repository = new InMemoryOrderRepository();
$repository->save($order);
```

After that, every test can use it. If the interface changes, I update the fake in one place instead of updating many mock setups.

Fakes are also easier to debug. They are normal PHP code. I can set a breakpoint in the fake and inspect its state. With a generated PHPUnit mock, I mostly see the answers that I configured in the test.

## When Mocks Make Sense

There are good reasons to use mocks or spies. I use them when the call itself is the thing I want to test.

Examples:

- A cache should prevent a second database lookup.
- A retry should stop after three attempts.
- A transaction should be rolled back after an error.
- Legacy code is hard to test in another way.
- A third-party system is too complex to fake in a useful way.

Even then, a recording fake can sometimes be easier to read:

```php
$mailer = new InMemoryMailer();

$service->sendConfirmation($order);

self::assertCount(1, $mailer->sentMessages());
self::assertSame(
    'customer@example.com',
    $mailer->sentMessages()[0]->recipient(),
);
```

This still checks that an email left the application. But it checks the sent message instead of configuring a list of expected method calls before running the test.

Sometimes a mock is still the simpler choice. The important part is to choose it for a reason, not because every dependency must be mocked.

## What I Use

Before I create a test double, I ask:

1. **Can I test this with real domain objects?**
   Then I do not need a test double.

2. **Does this port have simple behavior that I can implement in memory?**
   I use a fake and check the result.

3. **Am I testing a real adapter?**
   I use the real database, filesystem, queue, or a test server.

4. **Is the number or order of calls important?**
   I use a spy or mock and explain the reason in the test name.

5. **Would the fake become as complex as the real system?**
   I stop and use the real system or a smaller interface.

{{< admonition type=tip title="The simplest rule" >}}
Test the result unless the interaction is the result.
{{< /admonition >}}

## How to Start Replacing Mocks

You do not have to rewrite the complete test suite. Start with one port:

1. Pick a repository that is mocked in many tests.
2. Write down how it should behave.
3. Create a small in-memory implementation in `tests/Double/`.
4. Run the same contract tests against the fake and the real adapter.
5. Change one application test to check the result instead of method calls.
6. Keep mocks where a call count or call order is a real requirement.

The first fake may take longer than the first mock. It pays off when the next tests can reuse it.

## Conclusion

My problem is not that mocks exist. My problem is using mocks for every dependency in every test.

A test should tell me if a feature is broken. It should not fail only because I moved a method call or changed how the code works inside.

Fakes help me write tests around complete use cases. They make the state visible, they are easy to debug, and they let me refactor without changing tests that still describe the same behavior.

Use mocks when the interaction is important. Otherwise, test what the code actually did.
