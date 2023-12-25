---
title: Implementing CQRS with MediatR - Part 4
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-02-11T00:00:00+03:30"
description: "This series explores the implementation of the CQRS design pattern using the MediatR library."
imageUrl: "/dry.png"
weight: 1
---

In this part, we aim to explore [Behaviors](https://github.com/jbogard/MediatR/wiki/Behaviors) in the MediatR framework. The code for this part is updated and accessible from this [repository](https://github.com/MoienTajik/MediatrTutorial).

Behaviors enables effortless implementation of [AOP (Aspect-Oriented Programming)](https://www.dotnettips.info/courses/details/4). Behaviors are analogous to [Filters](https://docs.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-2.2#implementation) in ASP.NET Core. Just like how `OnActionExecuting` and `OnActionExecuted` methods let us perform actions before and after the execution of an action method, behaviors in MediatR offer a similar capability. The advantage is that you can write your cross-cutting concern code **once** and reuse it **multiple times** without redundancy.  

----------

### Performance Counter Behavior

Imagine you want to measure the execution time of a method and log a message if it exceeds an acceptable duration. The first approach that may come to mind is to repetitively insert similar code snippets in **all** methods requiring time measurement.

```csharp
public class SomeClass
{
    private readonly ILogger _logger;

    public SomeClass(ILogger logger)
    {
        _logger = logger;
    }

    public void SomeMethod()
    {
        Stopwatch stopwatch = new Stopwatch();
        stopwatch.Start();

        // TODO: Do some work here

        stopwatch.Stop();

        if (stopwatch.ElapsedMilliseconds > TimeSpan.FromSeconds(5).Milliseconds)
        {
            // This method has taken a long time, So we log that to check it later.
            _logger.LogWarning($"SomeClass.SomeMethod has taken {stopwatch.ElapsedMilliseconds} to run completely !");
        }
    }
}
```

{{<linebreak>}}

With this approach, all methods requiring time calculation would need a logger injected into their class. A Stopwatch must be created, started, and stopped, and finally, we must evaluate whether the execution time exceeds the predetermined limit. 
  
Moreover, imagine deciding one day to change the maximum time for logging from 5 seconds to 10 seconds. Because the snippet is repeated across all methods, you will have to modify the entire codebase, violating the [DRY (Don’t Repeat Yourself) principle](https://deviq.com/don-t-repeat-yourself).
  
{{< customImg src="dry.png" width="400px" >}}
{{<linebreak>}}
  
To solve this issue, we use *Behaviors*. Implementing Behaviors in MediatR merely involves inheriting from an interface called `IPipelineBehavior`.

```csharp
public class RequestPerformanceBehavior<TRequest, TResponse> :
    IPipelineBehavior<TRequest, TResponse>
{
    private readonly ILogger<RequestPerformanceBehavior<TRequest, TResponse>> _logger;

    public RequestPerformanceBehavior(ILogger<RequestPerformanceBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }

    public async Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken, RequestHandlerDelegate<TResponse> next)
    {
        Stopwatch stopwatch = new Stopwatch();
        stopwatch.Start();

        TResponse response = await next();

        stopwatch.Stop();

        if (stopwatch.ElapsedMilliseconds > TimeSpan.FromSeconds(5).Milliseconds)
        {
            // This method has taken a long time, So we log that to check it later.
            _logger.LogWarning($"{request} has taken {stopwatch.ElapsedMilliseconds} to run completely !");
        }

        return response;
    }
}
```

{{<linebreak>}}

As you can see, the logic of our code remains unchanged. We inherit from `IPipelineBehavior` and implement its `Handle` method. Like [Middleware](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-2.2#write-middleware) in ASP.NET Core, we also have a `RequestHandlerDelegate` called `next`. By executing and returning it, the remaining Command/Query execution continues.
  
We then register our custom Behaviors via DI in `Startup.cs`.

```csharp
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(RequestPerformanceBehavior<,>));
```

{{<linebreak>}}
Finally, to test the functionality of this Behavior, we introduce a 5-second delay in our `GetCustomerByIdQueryHandler` to make the execution time exceed the specified maximum time for logging:

```csharp
public class GetCustomerByIdQueryHandler : IRequestHandler<GetCustomerByIdQuery, CustomerDto>
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public GetCustomerByIdQueryHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CustomerDto> Handle(GetCustomerByIdQuery request, CancellationToken cancellationToken)
    {
        Customer customer = await _context.Customers
            .FindAsync(request.CustomerId);

        if (customer == null)
        {
            throw new RestException(HttpStatusCode.NotFound, "Customer with given ID is not found.");
        }

        // For testing PerformanceBehavior
        await Task.Delay(5000, cancellationToken);

        return _mapper.Map<CustomerDto>(customer);
    }
}
```

{{<linebreak>}}
After running the application and invoking `GetCustomerById`, you will see the following message in the console:

{{< customImg src="delay.png" >}}
{{<linebreak>}}

----------

### Transaction Behavior

{{<linebreak>}}
{{< customImg src="rollback.png" width="400px" >}}
{{<linebreak>}}

Another usage for Behaviors could be implementing Transactions and Rollbacks. Imagine you want to add a customer to the database only if all tasks within the Command are successfully completed without throwing any exceptions. We can write a `TransactionBehavior` to wrap the Command bodies within a `TransactionScope` and roll back in case of an exception:

```csharp
public class TransactionBehavior<TRequest, TResponse> :
    IPipelineBehavior<TRequest, TResponse>
{
    public async Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken, RequestHandlerDelegate<TResponse> next)
    {
        var transactionOptions = new TransactionOptions
        {
            IsolationLevel = IsolationLevel.ReadCommitted,
            Timeout = TransactionManager.MaximumTimeout
        };

        using (var transaction = new TransactionScope(TransactionScopeOption.Required, transactionOptions,
            TransactionScopeAsyncFlowOption.Enabled))
        {
            TResponse response = await next();

            transaction.Complete();

            return response;
        }
    }
}
```

{{<linebreak>}}
This `Behavior` is then registered in our DI container:

```csharp
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));
```

{{<linebreak>}}
Finally, we modify the `Handle` method in `CreateCustomerCommandHandler` that we created in the previous sections. After the `SaveChanges` related to EF-Core, we throw an Exception.

```csharp
public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, CustomerDto>
{
    readonly ApplicationDbContext _context;
    readonly IMapper _mapper;
    readonly IMediator _mediator;

    public CreateCustomerCommandHandler(ApplicationDbContext context,
        IMapper mapper,
        IMediator mediator)
    {
        _context = context;
        _mapper = mapper;
        _mediator = mediator;
    }

    public async Task<CustomerDto> Handle(CreateCustomerCommand createCustomerCommand, CancellationToken cancellationToken)
    {
        Domain.Customer customer = _mapper.Map<Domain.Customer>(createCustomerCommand);

        await _context.Customers.AddAsync(customer, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        throw new Exception("======= MY CUSTOM EXCEPTION =======");

        // Raising Event ...
        await _mediator.Publish(new CustomerCreatedEvent(customer.FirstName, customer.LastName, customer.RegistrationDate), cancellationToken);

        return _mapper.Map<CustomerDto>(customer);
    }
}
```

{{<linebreak>}}
If you run the application, you will see that even though our exception occurs after `SaveChanges`, the operation is rolled back due to the Transaction Behavior we've written, and no record is registered in the database.

**Note:** Before utilizing Transactions, make sure to read these articles ([1](https://blogs.msdn.microsoft.com/dbrowne/2010/06/03/using-new-transactionscope-considered-harmful), [2](https://particular.net/blog/transactionscope-and-async-await-be-one-with-the-flow)).

----------

MediatR also provides two interfaces, `IRequestPreProcessor` and `IRequestPostProcessor`, which you can use if you need an action to take place before or after the execution of a Command/Query.

Furthermore, default implementations of these two interfaces, named `RequestPreProcessorBehavior` and `RequestPostProcessorBehavior`, exist in the framework and will be executed before and after all handlers by [default](https://github.com/jbogard/MediatR/wiki/Behaviors#built-in-behaviors).