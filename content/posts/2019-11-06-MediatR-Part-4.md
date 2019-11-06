---
title: پیاده سازی CQRS توسط MediatR - قسمت چهارم
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-11-06T23:00:00+03:30"
description: "در این سری مقالات به پیاده سازی الگوی طراحی CQRS توسط کتابخانه MediatR میپردازیم."
imageUrl: "/img/posts/2019-11-06-MediatR-Part-4/dry.png"
weight: 1
---

در این قسمت قصد داریم به بررسی [Behavior‌](https://github.com/jbogard/MediatR/wiki/Behaviors) ها در فریمورک MediatR بپردازیم. کدهای این قسمت بروزرسانی و از این [ریپازیتوری](https://github.com/MoienTajik/MediatrTutorial) قابل دسترسی است.  

با استفاده از Behavior‌ها امکان پیاده سازی [AOP](https://www.dotnettips.info/courses/details/4) را براحتی خواهید داشت. Behavior‌ها، مانند [Filter‌‌](https://docs.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-2.2#implementation) ها در ASP.NET MVC هستند. همانطور که با استفاده از متدهای OnActionExecuting و OnActionExecuted میتوانستیم اعمالی را قبل و بعد از اجرای یک اکشن‌متد انجام دهیم، چنین قابلیتی را با Behavior‌ها در MediatR نیز خواهیم داشت. مزیت اینکار این است که شما میتوانید کدهای Cross-Cutting-Concern خود را  **یکبار**  نوشته و  **چندین**  بار بدون تکرار مجدد، از آن استفاده کنید.  

----------

### Performance Counter Behavior

فرض کنید میخواهید زمان انجام کار یک متد را اندازه گیری کرده و در صورت طولانی بودن زمان انجام آن، لاگی را مبنی بر کند بودن بیش از حد مجاز این متد، ثبت کنید. شاید اولین راهی که برای انجام اینکار به ذهنتان بیاید این باشد که داخل  **تمام** متدهایی که میخواهیم زمان انجام آنها را محاسبه کنیم، چنین کدی را تکرار کنیم:

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

در این صورت تمام متدهایی که نیاز به محاسبه زمان پردازش را دارند، باید به کلاسشان Logger تزریق شود. Stopwatch باید ایجاد، Start و Stop شود و در نهایت، بررسی کنیم که آیا زمان انجام این متد از حداکثری که برای آن مشخص کرده‌ایم گذشته است یا خیر.  
  
علاوه بر این تصور کنید روزی تصمیم بگیرید که حداکثر زمان برای Log کردن را از 5 ثانیه به 10 ثانیه تغییر دهید. در این صورت بدلیل اینکه در همه متدها این قطعه کد تکرار شده‌است، مجبور به تغییر تمام کدهای برنامه برای اصلاح این بخش خواهید شد. در اینجا اصل  [DRY](https://deviq.com/don-t-repeat-yourself/) نقض شده‌است.  
  
<img src="/img/posts/2019-11-06-MediatR-Part-4/dry.png" alt="DRY" width="400px" style="margin:auto;">
<br>
  
برای حل این مشکل از Behavior‌ها استفاده میکنیم. برای پیاده سازی Behavior‌ها داخل MediatR، کافیست از interface ای بنام IPipelineBehavior ارث بری کنیم:

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

همانطور که میبینید منطق کد ما تغییری نکرده‌ است. از IPipelineBehavior ارث بری کرده و متد Handle آن را پیاده سازی کرده‌ایم. همانند [Middleware‌](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-2.2#write-middleware) ها در ASP.NET Core، در اینجا نیز یک RequestHandlerDelegate بنام next داریم که با اجرا و return آن، روند اجرای بقیه Command/Query‌ها ادامه پیدا خواهد کرد.  
  
سپس باید Behavior‌های خود را از طریق DI به MediatR معرفی کنیم. داخل Startup.cs به این صورت RequestPerformanceBehavior خود را Register میکنیم:

```csharp
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(RequestPerformanceBehavior<,>));
```

در نهایت برای تست کارکرد این Behavior، در کوئری GetCustomerByIdQueryHandler خود 5 ثانیه Delay ایجاد میکنیم تا طول اجرای آن، از Maximum زمان مشخص شده بیشتر و Log انجام شود:

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

پس از اجرای برنامه و فراخوانی GetCustomerById ، داخل Console این پیغام را خواهید دید:  

<img src="/img/posts/2019-11-06-MediatR-Part-4/delay.png" alt="Delay" style="margin:auto;">
<br>

----------

### Transaction Behavior

<br>

<img src="/img/posts/2019-11-06-MediatR-Part-4/rollback.png" alt="Rollback" width="400px" style="margin:auto;">
<br>
  
یکی دیگر از استفاده‌های Behavior‌ها میتواند پیاده سازی Transaction و Rollback باشد. فرض کنید میخواهیم افزودن یک مشتری به دیتابیس فقط زمانی صورت گیرد که تمام کارهای داخل Command با موفقیت و بدون رخ دادن Exception انجام شود. برای انجام اینکار میتوان یک TransactionBehavior نوشت تا بدنه Command‌ها را داخل یک TransactionScope قرار دهد و در صورت وقوع Exception ، عمل Rollback صورت گیرد :

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

سپس این Behavior را داخل DI Container خود Register میکنیم :

```csharp
services.AddScoped(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));
```

در نهایت متد Handle در CreateCustomerCommandHandler را که در قسمت‌های قبل ایجاد کردیم، تغییر داده و بعد از SaveChanges مربوط به Entity Framework، یک Exception را صادر میکنیم:

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
  
اگر برنامه را اجرا کنید خواهید دید با اینکه Exception ما بعد از SaveChanges رخ داده است، اما بدلیل استفاده از Transaction Behavior ای که نوشتیم، عملیات Rollback صورت گرفته و داخل دیتابیس رکوردی ثبت نشده‌است.  
  

**\*** **نکته :**  پیش از استفاده از Transaction‌ها حتما این مطالب ( [1](https://blogs.msdn.microsoft.com/dbrowne/2010/06/03/using-new-transactionscope-considered-harmful/) , [2](https://particular.net/blog/transactionscope-and-async-await-be-one-with-the-flow) ) را مطالعه کنید.

----------

MediatR دارای 2 اینترفیس IRequestPreProcessor و IRequestPostProcessor نیز هست که اگر نیاز داشته باشید یک عمل فقط  **قبل** یا  **بعد** از انجام یک Command/Query صورت گیرد، میتوانید از آنها استفاده کنید.

همچنین پیاده سازی‌های پیشفرضی از این 2 اینترفیس با نام‌های RequestPreProcessorBehavior و RequestPostProcessorBehavior داخل فریمورک،  [بطور پیشفرض](https://github.com/jbogard/MediatR/wiki/Behaviors#built-in-behaviors) وجود دارد که قبل و بعد از تمامی Handler‌ها اجرا خواهند شد.