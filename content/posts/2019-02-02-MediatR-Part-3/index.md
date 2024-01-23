---
title: Implementing CQRS with MediatR - Part 3
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-02-02T00:00:00+03:30"
description: "This series explores the implementation of the CQRS design pattern using the MediatR library."
imageUrl: "/PubSub.jpg"
weight: 1
summary: "Part 3 of the CQRS with MediatR series focuses on adding validation and event handling. Fluent Validation is introduced to validate commands, followed by the use of `INotification` and `INotificationHandler` for event handling, illustrated with a `CustomerCreatedEvent`. This setup allows for separate event handlers for different actions like email notifications and logging, adhering to the **Single Responsibility Principle**. The tutorial provides code examples for integrating these features into an ASP.NET Core application, setting the stage for the next part on MediatR behaviors and aspect-oriented programming."
---

In the [previous post](https://moien.dev/posts/2019-01-27-mediatr-part-2), we examined how to use `IRequest` and `IRequestHandler` in MediatR, which are responsible for implementing the Command/Query roles in CQRS. The code for this part is updated and available in this [repository](https://github.com/MoienTajik/MediatrTutorial).

----------

{{< customImg src="FluentValidation.jpg" width="270" >}}
{{<linebreak>}}

Our Command, `CreateCustomerCommand`, lacks any validation for user input. Users can call this Command with any values they like. In this part, we'll add validation capabilities to our Commands using the [Fluent Validation](https://github.com/JeremySkinner/FluentValidation) library.

First, install the library using the following command:

```csharp
Install-Package FluentValidation.AspNetCore
```
{{<linebreak>}}

After adding the library, register it in your DI Container:
```csharp
services.AddMvc()
    .AddFluentValidation(cfg =>
        cfg.RegisterValidatorsFromAssemblyContaining<Startup>()
    );
```

{{<linebreak>}}
Create a new class called `CreateCustomerCommandValidator` that inherits from Fluent Validation's `AbstractValidator` to define the validation logic for `CreateCustomerCommand`:
```csharp
public class CreateCustomerCommandValidator : AbstractValidator<CreateCustomerCommand>
{
    public CreateCustomerCommandValidator()
    {
        RuleFor(customer => customer.FirstName).NotEmpty();
        RuleFor(customer => customer.LastName).NotEmpty();
    }
}
```

As you can see, we have checked that the `FirstName` and `LastName` properties are not empty. FluentValidation offers various validation methods, the list of which you can see [here](https://fluentvalidation.net/built-in-validators). Custom Validators can also be created, as shown in these [examples](https://fluentvalidation.net/custom-validators).

If you run the application and call the `CreateCustomerCommand` with empty fields, you'll immediately encounter an error, indicating that Fluent Validation has performed its validation tasks correctly.

```csharp
Error: 400 - Bad Request

{
  "LastName": [
    "'Last Name' must not be empty."
  ],
  "FirstName": [
    "'First Name' must not be empty."
  ]
}
```

{{<linebreak>}}
**\*** **Note:** All superficial validations like non-empty values, date validation, email validation, etc., must be done **before** Commands are handled. If validation fails, we should not enter the Command's Handle method. ([Fail Fast Principle](https://enterprisecraftsmanship.com/2015/09/15/fail-fast-principle/))

----------

### Events

{{< customImg src="PubSub.jpg" width="270" >}}
{{<linebreak>}}

Suppose we want to send an email to a customer upon successful registration. Sending an email is not the responsibility of `CreateCustomerCommand`. Adding email-sending logic would violate the Single Responsibility Principle ([SRP](http://principles-wiki.net/principles:single_responsibility_principle)).

To solve this issue, we can use events. Events notify their Subscribers. In MediatR, sending and handling Events is done via two interfaces: `INotification` and `INotificationHandler`.
  
Unlike Commands, which can only have one Handler, Events can have multiple handlers. This allows you not only to have a Subscriber responsible for sending emails but also another Subscriber to log the new customer information.
  
First, create a class named `CustomerCreatedEvent` that inherits from `INotification`:

```csharp
public class CustomerCreatedEvent : INotification
{
    public CustomerCreatedEvent(string firstName, string lastName, DateTime registrationDate)
    {
        FirstName = firstName;
        LastName = lastName;
        RegistrationDate = registrationDate;
    }

    public string FirstName { get; }

    public string LastName { get; }

    public DateTime RegistrationDate { get; }
}
```

{{<linebreak>}}
Next, write two handlers for this event. The first handler will be responsible for sending emails:

```csharp
public class CustomerCreatedEmailSenderHandler : INotificationHandler<CustomerCreatedEvent>
{
    public Task Handle(CustomerCreatedEvent notification, CancellationToken cancellationToken)
    {
        // IEmailService.Send($"Welcome {notification.FirstName} {notification.LastName} !");
        return Task.CompletedTask;
    }
}
```

{{<linebreak>}}
The second handler will log the newly registered customer information:

```csharp
public class CustomerCreatedLoggerHandler : INotificationHandler<CustomerCreatedEvent>
{
    readonly ILogger<CustomerCreatedLoggerHandler> _logger;

    public CustomerCreatedLoggerHandler(ILogger<CustomerCreatedLoggerHandler> logger)
    {
        _logger = logger;
    }

    public Task Handle(CustomerCreatedEvent notification, CancellationToken cancellationToken)
    {
        _logger.LogInformation($"New customer has been created at {notification.RegistrationDate}: {notification.FirstName} {notification.LastName}");

        return Task.CompletedTask;
    }
}
```

{{<linebreak>}}
Finally, you just need to modify the handle method inside `CreateCustomerCommandHandler` that we created in the [previous post](https://moien.dev/posts/2019-01-27-mediatr-part-2) and use the `Publish` method from `IMediator` interface to raise this event:

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
        Customer customer = _mapper.Map<Customer>(createCustomerCommand);

        await _context.Customers.AddAsync(customer, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        // Raising Event ...
        await _mediator.Publish(new CustomerCreatedEvent(customer.FirstName, customer.LastName, customer.RegistrationDate), cancellationToken);

        return _mapper.Map<CustomerDto>(customer);
    }
}
```

{{<linebreak>}}
Run the application and set breakpoints on both NotificationHandlers. If you call `/api/customers` to create a new customer, you'll see both of your handlers get raised, and you'll see the customer information logged in the console using our log handler.
```csharp
info: MediatrTutorial.Features.Customer.Events.CustomerCreated.CustomerCreatedLoggerHandler[0]
      New customer has been created at 2/1/2019 11:40:48 PM: Moien Tajik
```

----------

**\*** **Note:** In this part of the tutorial, we used a Notification for logging purposes. If the number of Commands in our application increases, we'll have to create a new `INotification` and `INotificationHandler` for each Command, even though their logic will be very similar.
  
In the next article, we'll eliminate these repetitive parts using MediatR Behaviors, which implement *Aspect-Oriented Programming (AOP)*.