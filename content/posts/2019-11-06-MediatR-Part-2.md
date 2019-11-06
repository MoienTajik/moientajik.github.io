---
title: پیاده سازی CQRS توسط MediatR - قسمت دوم
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: 2019-11-06
description: "در این سری مقالات به پیاده سازی الگوی طراحی CQRS توسط کتابخانه MediatR میپردازیم."
imageUrl: "/img/posts/2019-11-06-MediatR-Part-2/Hollywood.jpg"
weight: 1
---

در این مطلب قصد داریم به بررسی امکانات داخلی فریمورک MediatR بپردازیم. سورس این قسمت مقاله در این [ریپازیتوری](https://github.com/MoienTajik/MediatrTutorial) قابل دسترسی است.

----------

#### **نصب و راه اندازی**

در ابتدا یک پروژه جدید ASP.NET Core از نوع API را ایجاد میکنیم و با استفاده از Nuget Package Manager ، پکیج MediatR را داخل پروژه نصب میکنیم:

```csharp
Install-Package MediatR
```

  
بعد از نصب نیاز داریم تا نیازمندی‌های این فریمورک را داخل DI Container خود Register کنیم. اگر از DI Container پیشفرض ASP.NET Core استفاده کنیم ، کافیست پکیج متناسب آن با Microsoft.Extensions.DependencyInjection را نصب کرده و براحتی نیازمندی‌های MediatR را فراهم سازیم:

```csharp
Install-Package MediatR.Extensions.Microsoft.DependencyInjection
```

بعد از نصب کافیست این کد را به متد ConfigureServices فایل Startup.cs پروژه خود اضافه کنید تا نیازمندی‌های MediatR داخل DI Container شما Register شوند:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddMvc();
    services.AddMediatR();
}
```

  
**\*** اگر از DI Container‌های دیگری استفاده میکنید، میتوانید با استفاده از [توضیحات این لینک](https://github.com/jbogard/MediatR/wiki#setting-up) MediatR را داخل Container مورد نظرتان Register کنید.

----------

#### IRequest  
  
همانطور که در  [مطلب قبل](https://moien.dev/posts/2019-11-06-mediatr-part-1)  گفتیم، در CQRS، متدهای برنامه به دو قسمت Command و Query تقسیم میشوند. در MediatR اینترفیسی بنام IRequest ایجاد شده‌ است و تمامی Class‌های Command/Query ما که  **درخواست** انجام کاری را میدهند، از این interface ارث بری خواهند کرد.  
  

دلیل نامگذاری این interface به IRequest این است که ما  **درخواست** افزودن یک مشتری جدید را ایجاد میکنیم و قسمت دیگری از برنامه، وظیفه  **پاسخگویی**  به این درخواست را برعهده خواهد داشت.  
  

IRequest دارای 2 Overload از نوع Generic و Non-Generic است.  
پیاده سازی Non-Generic آن برای درخواست‌هایی است که Response برگشتی ندارند ( معمولا Command‌ها ) و منتظر جوابی از سمت آن‌ها نیستیم و پیاده سازی Generic آن، نوع Response ای را که بعد از پردازش درخواست برگشت داده میشود، مشخص میسازد.  
  

برای مثال قصد داریم مشتری جدیدی را در برنامه خود ایجاد کنیم. کلاس Customer به این صورت تعریف شده است:

```csharp
public class Customer
{
    public int Id { get; set; }

    public string FirstName { get; set; }

    public string LastName { get; set; }

    public DateTime RegistrationDate { get; set; }
}
```

  
و Dto متناسب با آن نیز به این صورت تعریف شده است :

```csharp
public class CustomerDto
{
    public int Id { get; set; }

    public string FirstName { get; set; }

    public string LastName { get; set; }

    public string RegistrationDate { get; set; }
}
```

  
افزودن مشتری، یک  **Command** است؛ زیرا باعث افزودن رکوردی جدیدی به دیتابیس و تغییر  **State** برنامه میشود. کلاس جدیدی به اسم CreateCustomerCommand ایجاد کرده و از IRequest ارث بری میکنیم و نوع Response برگشتی آن را CustomerDto قرار میدهیم:

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

  
کلاس CreateCustomerCommand نیازمندی‌های خود را از طریق Constructor مشخص میسازد. برای ایجاد کردن یک مشتری  **حداقل** چیزی که لازم است، Firstname و Lastname آن است و بعد از ارسال مقادیر مورد نیاز به سازنده این کلاس، مقادیر بدلیل get-only بودن قابل تغییر نیستند.

در اینجا مفهوم [immutability](https://www.yegor256.com/2014/06/09/objects-should-be-immutable.html) بطور کامل رعایت شده است.

![Immutability](/img/posts/2019-11-06-MediatR-Part-2/immutability.jpg)

----------

#### IRequestHandler

هر Request نیاز به یک Handler دارد تا آن را پردازش کند. در MediatR کلاس‌هایی که وظیفه پردازش یک IRequest را دارند، از اینترفیس IRequestHandler ارث بری کرده و متد Handle آن را پیاده سازی میکنند. اگر متد شما Synchronous است، میتوانید از کلاس RequestHandler بطور مستقیم ارث بری کنید.  

در ادامه مثال قبلی، کلاسی به اسم CreateCustomerCommandHandler ایجاد و از IRequestHandler ارث بری میکنیم و منطق افزودن مشتری به دیتابیس را پیاده سازی میکنیم:

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

ورودی اول IRequestHandler، کلاسی است که درخواست آن را پردازش خواهد کرد و پارامتر ورودی دوم، کلاسی است که در نتیجه پردازش بعنوان Response برگشت داده خواهد شد.  
  
همانطور که میبینید در این Handler از DbContext مربوط به Entity Framework برای ثبت اطلاعات داخل دیتابیس و IMapper مربوط به AutoMapper برای نگاشت CreateCustomerCommand به Customer استفاده شده است.  
  
تنظیمات Profile مربوط به AutoMapper ما به این صورت است تا در هنگام نگاشت CreateCustomerCommand ، مقدار RegistrationDate مربوط به Customer برابر با زمان فعلی قرار داده شود و برای نگاشت Customer به CustomerDto نیز ، تاریخ RegistrationDate با فرمتی قابل فهم به کاربران نمایش داده شود :

```csharp
public class DomainProfile : Profile
{
    public DomainProfile()
    {
        CreateMap<CreateCustomerCommand, Customer>()
            .ForMember(c => c.RegistrationDate, opt =>
                opt.MapFrom(_ => DateTime.Now));

        CreateMap<Customer, CustomerDto>()
            .ForMember(cd => cd.RegistrationDate, opt =>
                opt.MapFrom(c => c.RegistrationDate.ToShortDateString()));
    }
}
```

  
در نهایت با inject کردن اینترفیس IMediator به کنترلر خود و فرستادن یک درخواست POST به این اکشن، درخواست ایجاد مشتری را توسط متد Send میدهیم :

```csharp
[HttpPost]
public async Task<IActionResult> CreateCustomer([FromBody] CreateCustomerCommand createCustomerCommand)
{
    CustomerDto customer = await _mediator.Send(createCustomerCommand);
    return CreatedAtAction(nameof(GetCustomerById), new { customerId = customer.Id }, customer);
}
```

  
همانطور که میبینید ما در اینجا فقط  **درخواست** فرستاده‌ایم و وظیفه پیدا کردن Handler این درخواست را فریمورک MediatR برعهده گرفته‌است و ما هیچ جایی بطور مستقیم Handler خود را صدا نزده ایم. ( [Hollywood Principle: Don't Call Us, We Call You](http://matthewtmead.com/blog/hollywood-principle-dont-call-us-well-call-you-4/) )

![Hollywood](/img/posts/2019-11-06-MediatR-Part-2/Hollywood.jpg)

روند پیاده سازی Query‌ها نیز دقیقا شبیه به Command است و نمونه‌ای از آن داخل ریپازیتوری ذکر شده‌ در ابتدای مطلب وجود دارد.  
اینترفیس IMediator علاوه بر متد Send ، دارای متد دیگری بنام Publish نیز هست که وظیفه Raise کردن Event‌ها را برعهده دارد که در مقالات بعدی از آن استفاده خواهیم کرد.  

----------

**چند نکته :**

1- در نامگذاری Command‌ها، کلمه Command در انتهای نام آن‌ها آورده میشود؛ مثال: CreateCustomerCommand

2- در نامگذاری Query‌ها، کلمه Query در انتهای نام آن‌ها آورده میشود؛ مثال : GetCustomerByIdQuery

3- در نامگذاری Handler‌ها، از ترکیب Command/Query + Handler استفاده میکنیم؛ مثال : CreateCustomerCommandHandler, GetCustomerByIdQueryHandler  

4- در این قسمت Request‌های ما بدون هیچ Validation ای وارد Handler هایشان میشدند که این نیاز اکثر برنامه‌ها نیست. در قسمت بعدی با استفاده از [Fluent Validation](https://github.com/JeremySkinner/FluentValidation) پارامترهای Request هایمان را بطور خودکار اعتبارسنجی میکنیم.