---
title: پیاده سازی CQRS توسط MediatR - قسمت سوم
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-02-02T00:00:00+03:30"
description: "در این سری مقالات به پیاده سازی الگوی طراحی CQRS توسط کتابخانه MediatR میپردازیم."
imageUrl: "/img/posts/2019-02-02-MediatR-Part-3/PubSub.jpg"
weight: 1
---

در [قسمت قبلی](https://moien.dev/posts/2019-01-27-mediatr-part-2) روش استفاده از IRequest و IRequestHandler را در MediatR که نقش پیاده سازی Command/Query را در CQRS بر عهده دارند، بررسی کردیم. کدهای این قسمت در این [ریپازیتوری](https://github.com/MoienTajik/MediatrTutorial) به‌روزرسانی شده و قابل دسترسی است.

----------

<img src="/img/posts/2019-02-02-MediatR-Part-3/FluentValidation.jpg" alt="Fluent Validation" width="270" style="margin:auto;">
<br>

Command ما که نقش ایجاد یک مشتری را داشت ( CreateCustomerCommand ) ، هیچ Validation ای برای اعتبار سنجی مقادیر ورودی از سمت کاربر را ندارد و کاربر با هر مقادیری میتواند این Command را فراخوانی کند. در این قسمت با استفاده از کتابخانه [Fluent Validation](https://github.com/JeremySkinner/FluentValidation)  امکان اعتبار سنجی را به Command‌های خود اضافه میکنیم.  
  
در ابتدا با استفاده از دستور زیر ، این کتابخانه را داخل پروژه خود نصب میکنیم:

```csharp
Install-Package FluentValidation.AspNetCore
```
  
بعد از افزودن این کتابخانه، باید آن را داخل DI Container خود Register کنیم:

```csharp
services.AddMvc()
    .AddFluentValidation(cfg => cfg.RegisterValidatorsFromAssemblyContaining<Startup>());
```
  
کلاس جدیدی با نام CreateCustomerCommandValidator ایجاد میکنیم و از کلاس AbstractValidator مربوط به Fluent Validation ارث بری میکنیم تا منطق اعتبارسنجی برای CreateCustomerCommand را داخل آن تعریف نماییم :  

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

همانطور که میبینید در اینجا خالی نبودن Firstname و Lastname ورودی از سمت کاربر را چک کرده‌ایم. Fluent Validation دارای متدهای زیادی برای اعتبارسنجی است که لیست آن‌ها را در [اینجا](https://fluentvalidation.net/built-in-validators) میتوانید ببینید. همچنین درصورت نیاز میتوانید Validator‌های سفارشی خود را طبق [نمونه‌ها](https://fluentvalidation.net/custom-validators) ایجاد کنید.  
  
اگر برنامه را اجرا و CreateCustomerCommand را با مقادیر خالی فراخوانی کنیم، خواهید دید که بلافاصله با چنین خطایی مواجه خواهید شد که نشان میدهد Fluent Validation بدرستی وظیفه اعتبارسنجی ورودی‌ها را انجام داده است:

```csharp
Error: Bad Request

{
  "LastName": [
    "'Last Name' must not be empty."
  ],
  "FirstName": [
    "'First Name' must not be empty."
  ]
}
```

  
**\*** **نکته :**  تمامی اعتبارسنجی‌های سطحی ( Superficial Validation ) مانند خالی نبودن مقادیر، اعتبارسنجی تاریخ‌ها، اعتبارسنجی ایمیل و ... باید  **قبل**  از Handle شدن Command‌ها صورت گیرد و در صورت ناموفق بودن اعتبارسنجی، نباید وارد متد Handle در Command‌ها شویم. ( [Fail Fast Principle](https://enterprisecraftsmanship.com/2015/09/15/fail-fast-principle/) )

----------

### Events

<img src="/img/posts/2019-02-02-MediatR-Part-3/PubSub.jpg" alt="Observer Pattern" style="margin:auto;">
<br>

فرض کنید میخواهیم در صورت موفقیت آمیز بودن ثبت نام یک مشتری، برای او ایمیلی ارسال کنیم. فرستادن ایمیل وظیفه CreateCustomerCommand نیست و در صورت افزودن منطق ارسال ایمیل به Command، اصل [SRP](http://principles-wiki.net/principles:single_responsibility_principle) را نقض کرده‌ایم.  

  
برای حل این مشکل میتوانیم از Event‌ها استفاده کنیم. Event‌ها خبری را به Subscriber‌ **های**  خود میدهند. در فریمورک MediatR، ارسال و Handle کردن Event‌‌ها، با دو interface صورت میگیرد: INotification و INotificationHandler  
  
بر خلاف Command‌ها که فقط یک Handler میتوانند داشته باشند، Event ها میتوانند چندین Handler داشته باشند. مزیت داشتن چند Subscriber برای Event‌ها این است که شما علاوه بر اینکه میتوانید Subscriber ای داشته باشید که وظیفه ارسال Email برای مشتری را بر عهده داشته باشد، میتوانید Subscriber دیگری داشته باشید که اطلاعات مشتری جدید را Log کند.  
  
ابتدا کلاس CustomerCreatedEvent را ایجاد و از INotification ارث بری میکنیم. این کلاس منتشر کننده یک اتفاق است که آن را Producer مینامند :

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
  
سپس دو Handler برای این Event مینویسیم. Handler اول وظیفه ارسال ایمیل را بر عهده دارد :

```csharp
public class CustomerCreatedEmailSenderHandler : INotificationHandler<CustomerCreatedEvent>
{
    public Task Handle(CustomerCreatedEvent notification, CancellationToken cancellationToken)
    {
        // IMessageSender.Send($"Welcome {notification.FirstName} {notification.LastName} !");
        return Task.CompletedTask;
    }
}
```
  
و Handler دوم، وظیفه Log کردن اطلاعات مشتری ثبت شده را بر عهده خواهد داشت:  

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

در نهایت کافیست داخل CreateCustomerCommandHandler که در [قسمت قبل](https://moien.dev/posts/2019-01-27-mediatr-part-2) آن را ایجاد کردیم، متد Handle را ویرایش و با استفاده از متد Publish موجود در اینترفیس IMediator، این Event را Raise کنیم :

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

برنامه را اجرا و روی دو NotificationHandler خود Breakpoint قرار دهید. اگر api/Customers را برای ایجاد یک مشتری جدید فراخوانی کنید، بعد از ثبت نام موفق مشتری، خواهید دید که هر دو Handler شما Raise میشوند و اطلاعات مشتری را که با LogHandler خود داخل Console لاگ کردیم، خواهیم دید:

```csharp
info: MediatrTutorial.Features.Customer.Events.CustomerCreated.CustomerCreatedLoggerHandler[0]
      New customer has been created at 2/1/2019 11:40:48 PM: Moien Tajik
```

----------

**\*** **نکته :** در این قسمت از آموزش برای Log کردن اطلاعات از یک Notification استفاده کردیم. اگر تعداد Command‌های ما در برنامه بیشتر شوند، به ازای هر Command مجبور به ایجاد یک Notification و NotificationHandler خواهیم بود که منطق کار آن‌ها بسیار شبیه به یک دیگر است.  
  
در مقاله بعدی با استفاده از Behaviors موجود در MediatR که [AOP](https://www.dotnettips.info/courses/details/4) را پیاده سازی میکند، این موارد تکراری را از بین خواهیم برد.