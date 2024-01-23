---
title: Implementing CQRS with MediatR - Part 2
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-01-27T00:00:00+03:30"
description: "This series explores the implementation of the CQRS design pattern using the MediatR library."
imageUrl: "/Hollywood.jpg"
weight: 1
summary: "Discover the practical implementation of the CQRS pattern using MediatR in ASP.NET Core. This tutorial guides you through setting up MediatR, creating commands and queries with the `IRequest` interface, and handling them with `IRequestHandler`. It features a real-world example of adding a customer to a database, showcasing command creation, immutability, and the use of Entity Framework and AutoMapper. The article emphasizes decoupling in request handling, aligning with the **Hollywood Principle**, and provides a glimpse into future topics like Fluent Validation. A must-read for developers looking to enhance their CQRS skills."
---

You can find the source-code for this section of the article in [this GitHub repository](https://github.com/MoienTajik/MediatrTutorial).

----------

#### **Installation and Setup**

Initially, we create a new ASP.NET Core API project and install the MediatR package using the NuGet Package Manager:

```csharp
Install-Package MediatR.Extensions.Microsoft.DependencyInjection
```

{{<linebreak>}}
After installing, add this code to the ConfigureServices method in the Startup.cs file of your project to register the MediatR dependencies in your DI Container:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    // ...
    
    services.AddMediatR(cfg =>
    {
        cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
    });
}
```

{{<linebreak>}}
**\*** If you are using other DI Containers, you can register MediatR in your preferred container using the instructions from [this](https://github.com/jbogard/MediatR/wiki#setting-up) link.

----------

#### IRequest  
  
As mentioned in the [previous post](https://moien.dev/posts/2019-01-21-mediatr-part-1), in CQRS, the methods of the application are divided into Command and Query sections. In MediatR, an interface named IRequest has been created. All our Command/Query classes, which request the execution of a task, will inherit from this interface.

The reason for naming this interface **IRequest** is that we are creating a request to add a new customer, and another part of the application will be responsible for **responding** to this request.

`IRequest` has two overloads: generic and non-generic.
The non-generic implementation is for requests that do not have a return response (usually commands), and we do not expect any response from them. The generic implementation specifies the type of response that will be returned after processing the request.

For instance, we intend to create a new customer in our application. The `Customer` class is defined as follows:

```csharp
public class Customer
{
    public int Id { get; set; }

    public string FirstName { get; set; }

    public string LastName { get; set; }

    public DateTimeOffset RegistrationDate { get; set; }
}
```

And the corresponding DTO is defined like this:

```csharp
public class CustomerDto
{
    public int Id { get; set; }

    public string FirstName { get; set; }

    public string LastName { get; set; }

    public string RegistrationDate { get; set; }
}
```

{{<linebreak>}}
Adding a customer is a **Command** because it adds a new record to the database and changes the **state** of the application. We create a new class named `CreateCustomerCommand`, inherit from IRequest, and set the return response type to `CustomerDto`:

```csharp
public class CreateCustomerCommand : IRequest<CustomerDto>
{
    public CreateCustomerCommand(string firstName, string lastName)
    {
        FirstName = firstName;
        LastName = lastName;
    }

    public string FirstName { get; }

    public string LastName { get; }
}
```


{{<linebreak>}}
The `CreateCustomerCommand` specifies its requirements through the constructor. To create a customer, the minimum required information is the `Firstname` and `Lastname`, and after passing the necessary values to the constructor of this class, the values are immutable due to being get-only.

Here, the concept of [immutability](https://www.yegor256.com/2014/06/09/objects-should-be-immutable.html) is fully observed.

{{< customImg src="immutability.jpg" width="600" >}}

----------

#### IRequestHandler

Every `IRequest` requires a handler to process it. In MediatR, the classes responsible for processing a `IRequest` inherit from the `IRequestHandler` interface and implement its `Handle()` method.

Continuing from the previous example, we create a class named `CreateCustomerCommandHandler`, inherit from `IRequestHandler`, and implement the logic for adding a customer to the database:

```csharp
public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, CustomerDto>
{
    readonly ApplicationDbContext _context;
    readonly IMapper _mapper;

    public CreateCustomerCommandHandler(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<CustomerDto> Handle(CreateCustomerCommand createCustomerCommand, CancellationToken cancellationToken)
    {
        Customer customer = _mapper.Map<Customer>(createCustomerCommand);

        await _context.Customers.AddAsync(customer, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<CustomerDto>(customer);
    }
}
```

The first generic parameter of `IRequestHandler` is the request itself, and the second parameter is the class that will be returned as the response after processing.
  
As you can see in this Handler, we use the Entity Framework's *DbContext* to register information in the database and AutoMapper's *IMapper* to map the `CreateCustomerCommand` to `Customer`.
  
Our AutoMapper profile settings are configured to set the Customer's `RegistrationDate` to the current time during the `CreateCustomerCommand` mapping, and to display the `RegistrationDat`e in a user-friendly format when mapping Customer to CustomerDto:

```csharp
public class DomainProfile : Profile
{
    public DomainProfile()
    {
        CreateMap<CreateCustomerCommand, Customer>()
            .ForMember(c => c.RegistrationDate, opt =>
                opt.MapFrom(_ => DateTimeOffset.Now));

        CreateMap<Customer, CustomerDto>()
            .ForMember(cd => cd.RegistrationDate, opt =>
                opt.MapFrom(c => c.RegistrationDate.ToShortDateString()));
    }
}
```

{{<linebreak>}}
Finally, by injecting the `IMediator` interface into our controller and sending a POST request to this action, we issue the customer creation request through the `Send` method:

```csharp
[HttpPost]
public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerCommand createCustomerCommand)
{
    CustomerDto customer = await _mediator.Send(createCustomerCommand);
    return CreatedAtAction(nameof(GetCustomerById), new { customerId = customer.Id }, customer);
}
```

{{<linebreak>}}
As you can see, here we have only sent the **request**, and the responsibility of finding the handler of this request is undertaken by the MediatR framework, and we have not directly called our handler anywhere ([Hollywood Principle: Don't Call Us, We Call You](http://matthewtmead.com/blog/hollywood-principle-dont-call-us-well-call-you-4/)).

{{< customImg src="Hollywood.jpg" width="300" >}}

{{<linebreak>}}
The implementation of a *Query* is exactly similar to a *Command*, and an example of it exists in the [repository](https://github.com/MoienTajik/MediatrTutorial) mentioned at the beginning of the article.
In addition to the `Send` method, the IMediator interface has another method called `Publish`, which is responsible for raising **events**, which we will use in later articles.

----------

**A few points:**

1- In naming **Commands**, the word *Command* is mentioned at the end of their name: `CreateCustomerCommand`

2- In naming **Queries**, the word *Query* is mentioned at the end of their name: `GetCustomerByIdQuery`

3- In naming **Handlers**, we use the combination of *Command/Query* + *Handler*: `CreateCustomerCommandHandler`, `GetCustomerByIdQueryHandler`

4- In this section, our requests entered their handlers without any validation, which is not the use-case in most applications. In the next section, we will automatically validate the parameters of our requests using [Fluent-Validation](https://github.com/JeremySkinner/FluentValidation).