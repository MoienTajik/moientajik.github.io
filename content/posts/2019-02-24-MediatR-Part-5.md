---
title: پیاده سازی CQRS توسط MediatR - قسمت پنجم
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-02-24T00:00:00+03:30"
description: "در این سری مقالات به پیاده سازی الگوی طراحی CQRS توسط کتابخانه MediatR میپردازیم."
imageUrl: "/img/posts/2019-02-24-MediatR-Part-5/EventStore.png"
weight: 1
---

کدهای این قسمت به‌روزرسانی شده و از این [ریپازیتوری](https://github.com/MoienTajik/MediatrTutorial) قابل دسترسی است.

----------

## Event Sourcing

در این قسمت قصد داریم تا اطلاعات Command‌های خود را بعد از Process، داخل یک دیتابیس Append-Only ذخیره کنیم. با استفاده از این [روش](https://martinfowler.com/eaaDev/EventSourcing.html) میتوانیم بفهمیم در یک **تاریخ مشخص**، با چه ورودی‌هایی ( Request )، چه جواب ( Response ) ای در آن لحظه از برنامه برگشت داده شده‌ است.  

<br>
<img src="/img/posts/2019-02-24-MediatR-Part-5/EventStore.png" alt="Event Store" style="margin:auto;">
<br>

برای پیاده سازی Event Sourcing از دیتابیس  [EventStore](https://eventstore.org/) که سورس آن نیز در [گیتهاب](https://github.com/EventStore/EventStore) قابل دسترسی است، استفاده خواهیم کرد. توجه داشته باشید که شما میتوانید از دیتابیس‌های دیگری مثل Elasticsearch, Redis و ... به‌منظور دیتابیس Event Store خود استفاده کرده و محدود به EventStore نیستید.  
  
برای راه اندازی دیتابیس EventStore در این قسمت، از Docker استفاده خواهیم کرد. آموزش Docker قبلا طی مقالاتی ([2](https://www.dotnettips.info/post/2746) ,  [1](https://www.dotnettips.info/learningpaths/details/78)) در سایت DotNetTips قرار گرفته‌ است و در این مقاله به تکرار نحوه استفاده از آن نخواهیم پرداخت.  
  
با استفاده از دستور زیر، EventStore را از روی [Docker Hub](https://hub.docker.com/r/eventstore/eventstore/) که Registry پیشفرض است، Pull و اجرا میکنیم و پورت‌های 2113 و 1113 آن را به بیرون Expose میکنیم تا داخل برنامه خود، از آن‌ها استفاده کنیم:

```csharp
docker run --name eventstore-node -d -p 2113:2113 -p 1113:1113 eventstore/eventstore
```

EventStore دارای پنل ادمینی است که از طریق http://localhost:2113 قابل دسترسی است. Username پیشفرض آن برابر با admin و کلمه عبور آن برابر با changeit است.

بعد از لاگین در پنل ادمین، با چنین Dashboard ای مواجه خواهید شد و نشان از این دارد که EventStore بدرستی اجرا شده است:

<img src="/img/posts/2019-02-24-MediatR-Part-5/EventStore-Panel.png" alt="Event Store Panel" style="margin:auto;">

----------

برای استفاده از EventStore داخل برنامه خود، مانند دیگر دیتابیس‌ها، Client موجود آن را برای #C، از [NuGet](https://www.nuget.org/packages/EventStore.Client/) نصب میکنیم:

```csharp
Install-Package EventStore.Client
```

سپس کلاسی بنام EventStoreDbContext ایجاد و منطق ارتباط با EventStore را داخل آن قرار میدهیم :

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

همانطور که می‌بینید، با استفاده از IP 1113 که در بالاتر با استفاده از Docker آن را Expose کرده بودیم، به EventStore متصل شده‌ایم. همچنین برای متد AppendToStreamAsync خود EventStore ، یک [Facade](https://www.dofactory.com/net/facade-design-pattern) نوشته‌ایم که نحوه کار با آن را برایمان راحت‌تر کرده‌است.  
  
با توجه به اینکه EventStore در [Documentation](https://eventstore.org/docs/dotnet-api/index.html#eventstoreconnection) خود بیان کرده که Thread-Safe است، در DI Container خود، EventStoreDbContext را بصورت Singleton ثبت و Register میکنیم و در طول عمر برنامه، یک instance از آن خواهیم داشت:

```csharp
services.AddSingleton<IEventStoreDbContext, EventStoreDbContext>();
```

قصد داریم Request هایی را که از نوع Command هستند، همراه با Response آن‌ها داخل EventStore ذخیره کنیم. برای تشخیص Query/Command بودن یک Request ، از نام آنها استفاده خواهیم کرد. همانطور که در قسمت‌های قبل گفتیم ، Command‌ها باید با ذکر "**Command**" در پایان نامشان همراه باشند.  
  
این یک Convention در برنامه ماست که باید رعایت شود. ( [Convention over Configuration](https://www.danylkoweb.com/Blog/aspnet-mvc-convention-over-configuration-BU) )  

<img src="/img/posts/2019-02-24-MediatR-Part-5/CoC.png" alt="Convention over Configuration" width="300px" style="margin:auto;">

----------

مانند Behavior‌های قبلی، یک Behavior جدید را بنام EventLoggerBehavior ایجاد و از IPipelineBehavior ارث بری کرده و EventStoreDbContext خود را به آن Inject میکنیم:

#### [Code](https://www.dotnettips.info/post/3002/%d9%be%db%8c%d8%a7%d8%af%d9%87-%d8%b3%d8%a7%d8%b2%db%8c-cqrs-%d8%aa%d9%88%d8%b3%d8%b7-mediatr-%d9%82%d8%b3%d9%85%d8%aa-%d9%be%d9%86%d8%ac%d9%85#codeItem5)

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

با استفاده از این Behavior، فقط Request هایی را که Command هستند و State برنامه را تغییر میدهند، داخل EventStore ذخیره میکنیم. اکنون کافیست تا این Behavior را داخل DI Container خود اضافه کنیم :

```csharp
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(EventLoggerBehavior<,>));
```

اگر برنامه را اجرا و یکی از Command‌ها را مانند CreateCustomerCommand، با استفاده از api/Customers <= POST فراخوانی کنید، Request و Response شما با Type آن Command و همراه با DateTime ای که این Request رخ داده‌است، داخل EventStore ذخیره خواهد شد ، که در Admin Panel مربوط به EventStore، در تب Stream Browser قابل مشاهده است :  

<img src="/img/posts/2019-02-24-MediatR-Part-5/EventStore-Panel-Stream.png" alt="Event Store Stream" style="margin:auto;">
<br>

نامگذاری این بخش به Stream، بدلیل این است که ما جریان و **تاریخچه‌ ای** از وقایع بوجود آمده در سیستم را داریم که با استفاده از آن‌ها میتوانیم به وضعیت جاری و  **نحوه** رسیدن به این State دست پیدا کنیم.