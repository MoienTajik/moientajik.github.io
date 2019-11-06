---
title: آشنایی با ویژگی DebuggerTypeProxy در Visual Studio
tags: ["VisualStudio", "Debug", "Debugger"]
date: "2018-07-05T00:00:00+03:30"
description: "آشنایی با ویژگی DebuggerTypeProxy در Visual Studio"
imageUrl: "/img/posts/2018-07-05-DebuggerTypeProxy/2.png"
weight: 1
---

ویژگی [DebuggerDisplay](https://www.dotnettips.info/post/198) در Visual Studio پیش تر معرفی شده است. ویژگی دیگری شبیه به این ویژگی وجود دارد به نام **DebuggerTypeProxy** که در ادامه به معرفی آن می‌پردازیم.

----------

کلاس زیر را در نظر بگیرید:

```csharp
public class Data
{
    public string Name { get; set; }
    public string ValueInHex { get; set; }
}
```

پس از اجرای برنامه ، مقادیر کلاس ایجاد شده به این صورت خواهند بود :

<img src="/img/posts/2018-07-05-DebuggerTypeProxy/1.png" width="400px" style="margin:auto;">
<br>

در اینجا مقدار Hex برایمان قابل  **فهم** نیست. سناریویی را در نظر بگیرید که مقادیر باید داخل دیتابیس به صورت Hex نگهداری شوند، اما می‌خواهیم هنگام  **دیباگ،** مقدار پراپرتی HexValue به صورت قابل  **درک** و decimal آن نمایش داده شود.

برای انجام اینکار میتوانیم از  **DebuggerTypeProxy** استفاده کنیم. ابتدا کلاسی ایجاد میکنیم که بعنوان proxy، مقادیر را به شکلی که نیاز داریم نمایش دهد. این کلاس object اصلی را در Constructor دریافت کرده و مقادیر مورد نظرمان، از طریق property هایی که در آن تعریف می‌کنیم قابل دسترسی هستند:

```csharp
public class DataDebugView
{
    private readonly Data _data;

    public DataDebugView(Data data)
    {
        _data = data;
    }

    public string DecimalValue
    {
        get
        {
            bool isValidHex = int.TryParse(_data.HexValue, System.Globalization.NumberStyles.HexNumber, null, out var value);
            return isValidHex ? value.ToString() : "INVALID HEX STRING";
        }
    }
}
```

در نهایت برای اعمال کردن این کلاس proxy، از ویژگی  **DebuggerTypeProxy** بر روی کلاس اصلی استفاده می‌کنیم:

```csharp
[DebuggerTypeProxy(typeof(DataDebugView))]
public class Data
{
    public string Name { get; set; }

    public string HexValue { get; set; }
}
```

بعد از اعمال تغییرات و اجرای دوباره برنامه، نحوه نمایش مقادیر کلاس به این صورت تغییر خواهند یافت:

<img src="/img/posts/2018-07-05-DebuggerTypeProxy/2.png" width="400px" style="margin:auto;">