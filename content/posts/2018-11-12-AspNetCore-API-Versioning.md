---
title: API Versioning in ASP.NET Core
tags: ["AspNet", "AspNetCore", "API", "Versioning"]
date: "2018-11-09T00:00:00+03:30"
description: "API Versioning in ASP.NET Core"
imageUrl: "/img/posts/2018-11-12-AspNetCore-API-Versioning/ApiVersioning.png"
weight: 1
---

حتما درباره [الزامات](https://github.com/Microsoft/api-guidelines/blob/master/Guidelines.md?WT.mc_id=-blog-scottha#12-versioning) استفاده‌ از API Versioning خوانده ایم. همانطور که میدانیم ، پیاده سازی Versioning در ASP.NET Web API کاری دشوار و زمانبر بود؛ اما در ASP.NET Core انجام تمامی آن مراحل، در یک خط صورت می‌گیرد که در ادامه آن را بررسی میکنیم.

----------

برای شروع با اجرای این دستور در Package Manager Console، پکیج [Microsoft.AspNetCore.Mvc.Versioning](https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Versioning) را داخل پروژه نصب می‌کنیم:

```csharp
Install-Package Microsoft.AspNetCore.Mvc.Versioning
```

بعد از نصب، کافیست کد زیر را داخل متد ConfigureServices در فایل Startup.cs پروژه‌ی خود اضافه کنید:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddMvc();
    services.AddApiVersioning();
    // ...
}
```

در ابتدا بعد از نصب این پکیج، ممکن است شما API هایی داشته باشید که برای آن‌ها از قبل ورژنی مشخص نکرده باشید (بصورت explicit ). می‌توانید یک Version پیش‌فرض را به برنامه اضافه کرده و برای Endpoint هایی که ورژن ندارند، از آن استفاده کنید :

```csharp
services.AddApiVersioning(opt =>
{
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.DefaultApiVersion = new ApiVersion(1, 0);
});
```

در این صورت، API شما به شکل زیر قابل دسترسی خواهد بود:

-   api/foo?api-version=1.0/

  

پارامتر DefaultApiVersion را برابر با یک ApiVersion قرار داده‌ایم. کلاس ApiVersion دارای Overload‌های مختلفی است. Overload ای را که ما در اینجا از آن استفاده کرده‌ایم، بعنوان پارامتر اول Major Version و برای پارامتر دوم، Minor Version را میگیرد. همچنین بجای Major و Minor میتوان از یک DateTime بعنوان ورژن استفاده کرد:

```csharp
opt.DefaultApiVersion = new ApiVersion(new DateTime(2018, 10, 22));
```

و در این صورت API شما به شکل زیر قابل دسترسی می‌باشد:

-   api/foo?api-version=2018-10-22/  
    

----------

#### URL Path Segment Versioning

تا به اینجا API Versioning ما بر اساس  **Query String Parameters**  انجام می‌شود؛ اما اگر بخواهیم بجای آن به شکل مقابل به API‌‌های خود دسترسی داشته باشیم چطور؟ : _api/v1/foo/_

برای پیاده سازی به این صورت، کافیست Route کنترلر خود را به این شکل تغییر دهید:

```csharp
[Route("api/v{version:apiVersion}/[controller]")]
public class FooController : ControllerBase
{
    public ActionResult<IEnumerable<string>> Get()
    {
        return new[] { "value1", "value2" };
    }
}
```

----------

**Header Versioning**

روش سوم انجام Versioning، استفاده از Header است. برای فعال کردن Header Versioning، داخل Startup، کد خود را به شکل زیر تغییر دهید:

```csharp
public void ConfigureServices(IServiceCollection services)
{
    services.AddMvc();
    services.AddApiVersioning(opt => opt.ApiVersionReader = new HeaderApiVersionReader("api-version"));
}
```

با انجام این تغییر، برای تست API خود دیگر نمی‌توانید از Browser استفاده کنید که این یکی از مشکلات این روش است. برای تست کردن یک درخواست GET ساده مجبور به استفاده از ابزارهایی همچون Postman, CURL و ... هستید. ما در اینجا برای تست از Postman استفاده می‌کنیم:

<img src="/img/posts/2018-11-12-AspNetCore-API-Versioning/versioning.png" alt="Versioning" width="700px" style="margin:auto;">

----------

**Deprecating**

ممکن است بخواهید یک ورژن را منسوخ دانسته و آن را Deprecate کنید. دقت کنید که Deprecate کردن یک API، به معنی  **از کار افتادن**  آن نیست. به این صورت میتوانید یک Endpoint از برنامه خود را Deprecate شده «**معرفی**» کنید:

```csharp
[ApiVersion("2")]
[ApiVersion("1", Deprecated = true)]
[Route("api/v{version:apiVersion}/[controller]")]
public class FooController : ControllerBase
{
    [HttpGet]
    public string Get() => "I'm deprecated, Bye bye :(";

    [HttpGet, MapToApiVersion("2.0")]
    public string GetV2() => "Hello world ! :D";
}
```

برای برگرداندن نام API‌ها و وضعیت Support شان داخل Response Header، باید ReportApiVersions فعال شود:

```csharp
services.AddApiVersioning(opt =>
{
    opt.DefaultApiVersion = new ApiVersion(1, 0);
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.ReportApiVersions = true;
});
```

که در نتیجه‌ی آن، Response Header برگشتی به این شکل خواهد بود :

<img src="/img/posts/2018-11-12-AspNetCore-API-Versioning/deprecation.png" alt="Deprecation" width="350px" style="margin:auto;">

----------

**Ignoring Versioning**

اگر داخل برنامه‌ی خود، کنترلری را دارید که در طی زمان آپدیت نشده و تغییر نخواهد کرد، می‌توانید از Version زدن آن با استفاده از ApiVersionNeutral جلوگیری کنید:

```csharp
[ApiVersionNeutral]
[Route("api/[controller]")]
public class BarController : ControllerBase
{
    public string Get() => HttpContext.GetRequestedApiVersion().ToString();
}
```

اجرای این متد در صورت غیرفعال بودن AssumeDefaultVersionWhenUnspecified باعث وقوع خطای NullReferenceException می‌شود و بدین معناست که همانطور که انتظار داشتیم، Version ای برای این Endpoint تنظیم نشده است.

----------

**مطلب تکمیلی:**

برای آپدیت کردن و یا معرفی نسخه‌ی جدیدی از یک کنترلر با ورژنی متفاوت، نیازی به Rename کردن کلاس قبلی برای رفع Conflict با نام فایل جدید نیست؛ با استفاده از namespace‌ها میتوانید کنترلری همنام، اما با ورژن و عملکردی متفاوت داشته باشید:

```csharp
namespace TestVersioning.Controllers.V1
{
    [ApiVersion("1", Deprecated = true)]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class FooController : ControllerBase
    {
        public string Get() => "I'm deprecated, Bye bye :(";
    }
}

namespace TestVersioning.Controllers.V2
{
    [ApiVersion("2")]
    [Route("api/v{version:apiVersion}/[controller]")]
    public class FooController : ControllerBase
    {
        public string GetV2() => "Hello world ! :D";
    }
}
```