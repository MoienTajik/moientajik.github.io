---
title: قیود مسیریابی در ASP.NET Core
tags: ["AspNet", "AspNetCore", "Routing"]
date: "2018-11-09T00:00:00+03:30"
description: "در ASP.NET Core قابلیت Route Constraints باعث جلوگیری از رسیدن مقادیر نامعتبر به پارامترهای Action یک Controller میشود."
imageUrl: "/img/posts/2018-11-09-AspNetCore-Route-Constraints/routing.png"
weight: 1
---

Route Constraints قابلیتی است در ASP.NET Core که با استفاده از آن میتوانید از رسیدن مقادیر نامعتبر به پارامترهای Action متد یک Controller جلوگیری کنید.

بعنوان مثال میتوانید محدودیتی قرار دهید که Routing فقط زمانی انجام شود که پارامتر وارد شده توسط کاربر، از جنس int باشد:

```csharp
[Route("api/[controller]")]
public class ValuesController : ControllerBase
{
    [HttpGet("{id:int}")]
    public IActionResult Get(int id)
    {
        return Ok(id);
    }
}
```

با قرار دادن یک Break-point در ابتدای اکشن متد، اگر سعی کنید این اکشن متد را با یک alpha string فراخوانی کنید، خواهید دید که به Break-point نرسیده و عمل Routing  **انجام نمیشود**. اما اگر با یک عدد فراخوانی شود، Routing با موفقیت انجام شده و عدد ورودی در نتیجه، به شما بازگردانده میشود که نشان میدهد Constraint به درستی عمل کرده است.

✖  api/values/hi

✓ api/values/7

شاید بپرسید تفاوت این روش، با کد زیر چیست:

```csharp
[Route("api/[controller]")]
public class ValuesController : ControllerBase
{
    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        // id is 0 here if you pass string.
        return Ok(id);
    }
}
```

در اینجا اگر بعنوان پارامتر ورودی، یک alpha string دهید، Routing  **انجام میشود**، اما چون ورودی int نیست، مقدار id با 0 پر خواهد شد.  

✓ api/values/hi

✓ api/values/7

----------

2 روش برای اعمال Route Constraint‌ها بر روی URL Parameter‌ها وجود دارند که در ادامه به آن‌ها می‌پردازیم.

####   

#### 1- Inline Constraints

این نوع Constraint‌ها بعد از URL Parameter قرار گرفته و با استفاده از Colon از هم جدا میشوند:

```csharp
app.UseMvc(routes =>
{
    routes.MapRoute("Values",
        "api/values/{id:int}",
        new { controller = "Values", action = "Get" });
});
```

همچنین میتوانید چندین Constraint را باهم ترکیب کنید و محدود به یک Constraint نیستید:

```csharp
[Route("api/[controller]")]
public class ValuesController : ControllerBase
{
    [HttpGet("{name:minlength(2):maxlength(10):alpha}")]
    public IActionResult Get(string name)
    {
        return Ok(name);
    }
}
```

✖ api/values/M

✖ api/values/1234  

✖ api/values/abcdefghijk

✓ api/values/Moien

  

#### 2- MapRoute's Constraints Argument

همه‌ی Constraint‌ها کلاسی هستند که اینترفیس IRouteConstraint را پیاده سازی کرده‌اند. داخل MapRoute میتوانید بطور مستقیم این کلاس‌ها را بعنوان Constraint معرفی کنید:

```csharp
app.UseMvc(routes =>
{
    routes.MapRoute(
        name: "Values",
        template: "api/values/{name}",
        defaults: new { controller = "Values", action = "Get" },
        constraints: new
        {
            name = new CompositeRouteConstraint(new List<IRouteConstraint>
            {
                new AlphaRouteConstraint(),
                new MinLengthRouteConstraint(2),
                new MaxLengthRouteConstraint(10)
            })
        });
});
```

**\***  این روش در Attribute Routing قابل پیاده سازی نیست.

  

----------

#### ایجاد یک Constraint سفارشی

همانطور که قبلتر گفتیم، همه‌ی Constraint‌ها کلاسی هستند که اینترفیس IRouteConstraint را پیاده سازی کرده‌اند. بنابراین میتوانیم با پیاده سازی این اینترفیس، یک Constraint سفارشی را ایجاد کنیم.

در اینجا قصد داریم Constraint ای را ایجاد کنیم که یک string را به عنوان ورودی دریافت و متد StartsWith را بر روی آن انجام دهد و در صورت true بودن، Routing انجام شود:

```csharp
public class StartsWithConstraint : IRouteConstraint
{
    public StartsWithConstraint(string startsWith)
    {
        if (string.IsNullOrWhiteSpace(startsWith))
            throw new ArgumentNullException(nameof(StartsWith));
        StartsWith = startsWith;
    }

    private string StartsWith { get; }

    public bool Match(HttpContext httpContext,
        IRouter route,
        string parameterName,
        RouteValueDictionary values,
        RouteDirection routeDirection)
    {
        if (parameterName == null)
            throw new ArgumentNullException(nameof(parameterName));

        if (values == null)
            throw new ArgumentNullException(nameof(values));

        if (!values.TryGetValue(parameterName, out var value) || value == null)
            return false;

        string valueString = Convert.ToString(value, CultureInfo.InvariantCulture);
        return valueString.StartsWith(StartsWith);
    }
}
```

همانطور که می‌بینید، به راحتی با پیاده سازی متد Match میتوانید شرط مورد نظر خود را اعمال کنید. بعد از ایجاد Constraint سفارشی خود، باید آن را داخل ConfigureServices برنامه Register کنید:

```csharp
services.Configure<RouteOptions>(opt =>
opt.ConstraintMap.Add("startsWith", typeof(StartsWithConstraint)));
```

و در نهایت با نامی که هنگام Register کردن دادید ( در اینجا startsWith ) ، از آن استفاده کنید:

```csharp
[Route("api/[controller]")]
public class ValuesController : ControllerBase
{
    [HttpGet("{name:minlength(2):maxlength(10):alpha:startsWith(Mo)}")]
    public IActionResult Get(string name)
    {
        return Ok(name);
    }
}
```

✖ api/values/Ali

✓ api/values/Moien

✓ api/values/Morteza  

----------

در [اینجا](https://gist.github.com/MoienTajik/5c5962dba7fb2de278c7eece944f3d85#aspnet-core-default-route-constraints-list) می‌توانید لیستی از Constraint‌های پیشفرض پیاده سازی شده در ASP.NET Core را مشاهده کنید.