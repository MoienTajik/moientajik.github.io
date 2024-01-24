---
title: Implementing CQRS with MediatR - Part 5
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-02-24T00:00:00+03:30"
description: "This series explores the implementation of the CQRS design pattern using the MediatR library."
imageUrl: "/EventStore.png"
weight: 1
summary: "Part 5 of the CQRS with MediatR series introduces *Event Sourcing* using **EventStore**. It focuses on integrating EventStore into an ASP.NET Core application, highlighted by creating the `EventStoreDbContext` class. The tutorial showcases the `EventLoggerBehavior` in MediatR for logging Command actions and responses, utilizing a **Convention over Configuration** approach. This part provides a practical guide for effectively tracking and understanding system state changes in a CQRS application through event history."
---

The code for this section has been updated and can be accessed from this [repository](https://github.com/MoienTajik/MediatrTutorial).

----------

## Event Sourcing

In this part, we intend to store our Command information in an append-only database after processing. By utilizing this [method](https://martinfowler.com/eaaDev/EventSourcing.html), we can understand at a **specific date**, with what inputs (request), what output (response) has been returned by the program at that moment.

<img src="./EventStore.png" alt="EventStore" style="margin:auto;"><br>

To implement Event Sourcing, we will use the [EventStore](https://eventstore.org/) database, the source of which is also available on [GitHub](https://github.com/EventStore/EventStore). Note that you can use other databases like Elasticsearch, Redis, etc., for your Event Store database and are not limited to EventStore.
  
For setting up the **EventStore** in this section, we will use Docker. Using the command below, we pull and run EventStore image from the [Docker Hub](https://hub.docker.com/r/eventstore/eventstore), and expose ports `2113` and `1113` so that we can use them in our application:

```csharp
docker run --name eventstore-node -d -p 2113:2113 -p 1113:1113 eventstore/eventstore
```

EventStore has an admin panel accessible through [http://localhost:2113](http://localhost:2113). The default username is `admin` and the password is `changeit`.

After logging into the admin panel, you will encounter such a dashboard, indicating that EventStore has been successfully run:
<img src="./EventStore-Panel.png" alt="EventStore-Panel" style="margin:auto;">

----------

To use EventStore in our application, like other packages, we install its nuget package from [NuGet](https://www.nuget.org/packages/EventStore.Client):

```csharp
Install-Package EventStore.Client
```

Then we create a class named `EventStoreDbContext` and place the logic of connecting to EventStore within it:

```csharp
public class EventStoreDbContext : IEventStoreDbContext
{
    public async Task<IEventStoreConnection> GetConnection()
    {
        IEventStoreConnection connection = EventStoreConnection.Create(
            new IPEndPoint(IPAddress.Loopback, 1113),
            nameof(MediatrTutorial));

        await connection.ConnectAsync();

        return connection;
    }

    public async Task AppendToStreamAsync(params EventData[] events)
    {
        const string appName = nameof(MediatrTutorial);
        IEventStoreConnection connection = await GetConnection();

        await connection.AppendToStreamAsync(appName, ExpectedVersion.Any, events);
    }
}
```

As you see, we connect to EventStore using port `1113`, which we exposed earlier using Docker. Also, for our `AppendToStreamAsync` method in EventStore, we have written a [Facade](https://www.dofactory.com/net/facade-design-pattern) which has made working with it easier for us.
  
Considering that EventStore has stated in its [Documentation](https://eventstore.org/docs/dotnet-api/index.html#eventstoreconnection) that it is thread-safe, we register `EventStoreDbContext` as singleton in our DI container, and throughout the application lifespan, we will have an instance of it:

```csharp
services.AddSingleton<IEventStoreDbContext, EventStoreDbContext>();
```

We intend to store the requests which are of type `Command`, along with their responses, inside EventStore. To distinguish whether a request is a *Query* or *Command*, we will use their names. As we mentioned in previous sections, commands should be suffixed with "**Command**" in their name.
  
This is a Convention in our program that must be observed. ([Convention over Configuration](https://www.danylkoweb.com/Blog/aspnet-mvc-convention-over-configuration-BU))

<img src="./CoC.png" width="300px" alt="ConventionOverConfiguration" style="margin:auto;">

----------

Like previous Behaviors, we create a new behavior named `EventLoggerBehavior`, inherit from `IPipelineBehavior`, and inject our `EventStoreDbContext` into it:

```csharp
public class EventLoggerBehavior<TRequest, TResponse> :
   IPipelineBehavior<TRequest, TResponse>
{
    readonly IEventStoreDbContext _eventStoreDbContext;

    public EventLoggerBehavior(IEventStoreDbContext eventStoreDbContext)
    {
        _eventStoreDbContext = eventStoreDbContext;
    }

    public async Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken, RequestHandlerDelegate<TResponse> next)
    {
        TResponse response = await next();

        string requestName = request.ToString();

        // Commands convention
        if (requestName.EndsWith("Command"))
        {
            Type requestType = request.GetType();
            string commandName = requestType.Name;

            var data = new Dictionary<string, object>
            {
                {
                    "request", request
                },
                {
                    "response", response
                }
            };

            string jsonData = JsonConvert.SerializeObject(data);
            byte[] dataBytes = Encoding.UTF8.GetBytes(jsonData);

            EventData eventData = new EventData(eventId: Guid.NewGuid(),
                type: commandName,
                isJson: true,
                data: dataBytes,
                metadata: null);

            await _eventStoreDbContext.AppendToStreamAsync(eventData);
        }

        return response;
    }
}
```

Using this behavior, we only store those requests which are **Commands** and change the program state, inside EventStore. Now, it’s enough to register this behavior to our DI container:

```csharp
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(EventLoggerBehavior<,>));
```

If you run the program and call one of the commands like `CreateCustomerCommand`, using `POST api/customers`, your request and response along with the `type` of that Command and the `DateTime` when this request occurred, will be stored in EventStore, which can be viewed in the EventStore admin panel, under the *Stream Browser* tab:

<img src="./EventStore-Panel-Stream.png" alt="EventStore-Panel-Stream" style="margin:auto;"><br>

The naming of this section as Stream, is due to the fact that we have a **history** of events occurred in the system, through which we can understand the current state and **how** we arrived at this state.