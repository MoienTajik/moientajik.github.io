---
title: الگوهای طراحی - Mediator
tags: ["DesignPatterns", "Mediator", "C#", "Patterns"]
date: 2019-01-19
description: "الگوی طراحی Mediator نحوه ی ارتباط چند object را در داخل خود کپسوله و مشخص میکند."
imageUrl: "/img/posts/2019-01-18-Mediator-Design-Pattern/mediator.jpg"
weight: 1
---

الگوی طراحی Mediator نحوه ی ارتباط چند object را در داخل خود کپسوله و مشخص میکند.

![Mediator Pattern](/img/posts/2019-01-18-Mediator-Design-Pattern/mediator.jpg)

یک مثال واقعی از این الگو :

برج مراقبت یک فرودگاه را در نظر بگیرید. این بخش از تمامی هواپیماهایی که تردد میکنند باخبر بوده و وظیفه مدیریت پرواز آن ها را بر عهده داشته و اجازه فرود و پرواز آن ها را صادر میکند.
در صورتی که اجازه فرود داده نشود ، هواپیما اجازه به نشستن ندارد.

در ادامه سناریوی بالا را داخل کد پیاده سازی میکنیم :

در ابتدا interface ای بنام IAirTrafficControl (برج مراقبت) میسازیم که این اینترفیس متدی بنام SendMessage دارد که وظیفه ی ارسال پیام از یک هواپیما به هواپیمای دیگر و ایجاد ارتباط بین آن ها و همچنین افزودن هواپیماها به خود را برعهده دارد :

```C#
public interface IAirTrafficControl
{
    void AddAirplanes(params AirplaneBase[] airplanes);

    void SendMessage(string message, AirplaneBase messageProducerAirplane);
}
```

همه ی هواپیماها از کلاس abstract ای بنام AirplaneBase ارث بری میکنند که این کلاس برای ایجاد شدن ، بعنوان ورودی به یک IAirTrafficControl نیاز دارد :

```Java
public abstract class AirplaneBase
{
    protected readonly IAirTrafficControl AirTrafficControl;

    public AirplaneBase(IAirTrafficControl airTrafficControl)
    {
        AirTrafficControl = airTrafficControl;
    }

    public abstract void Send(string message);

    public abstract void Notify(string message);
}
```

این کلاس دارای 2 متد Send و Notify است.
متد Send وظیفه ارسال یک پیام از هواپیمایی به هواپیمای دیگر و متد Notify وظیفه اعلام دریافت پیام از هواپیما دیگر را بر عهده دارد.

سپس 2 هواپیما که AirplaneBase را پیاده سازی کرده اند را ایجاد میکنیم :

```C#
public class AirbusAirplane : AirplaneBase
{
    public AirbusAirplane(IAirTrafficControl airTrafficControl) : base(airTrafficControl)
    {
    }

    public override void Send(string message)
    {
        Console.WriteLine("Airbus airplane sends message: " + message);
        AirTrafficControl.SendMessage(message, this);
    }

    public override void Notify(string message)
    {
        Console.WriteLine("Airbus airplane gets message: " + message);
    }
}

public class BoeingAirplane : AirplaneBase
{
    public BoeingAirplane(IAirTrafficControl airTrafficControl) : base(airTrafficControl)
    {
    }

    public override void Send(string message)
    {
        Console.WriteLine("Boeing airplane sends message: " + message);
        AirTrafficControl.SendMessage(message, this);
    }

    public override void Notify(string message)
    {
        Console.WriteLine("Boeing airplane gets message: " + message);
    }
}
```

در نهایت به یک Concrete Class که IAirTrafficControl را پیاده سازی کرده و داخل خود لیست هواپیماها را داشته و ارتباط بین آن ها را ایجاد کند نیاز داریم ; این کلاس اصلی ترین کلاس در این الگوست که مشخص میکند ارتباط بین هواپیما ها چگونه باید صورت گیرد :

```C#
// This is our Mediator which maintains communications.
public class MehrabadAirTrafficControl : IAirTrafficControl
{
    readonly List<AirplaneBase> _airplanes = new List<AirplaneBase>();

    public void AddAirplanes(params AirplaneBase[] airplanes)
    {
        _airplanes.AddRange(airplanes);
    }

    public void SendMessage(string message, AirplaneBase messageProducerAirplane)
    {
        List<AirplaneBase> otherAirplanes = _airplanes
            .Where(airplane => airplane != messageProducerAirplane)
            .ToList();

        otherAirplanes.ForEach(airplane => airplane.Notify(message));
    }
}
```

در نهایت به این صورت میتوانیم برنامه خود را تست کنیم :

```C#
public static class Program
{
    static async Task Main()
    {
        IAirTrafficControl mehrabadAirTrafficControl = new MehrabadAirTrafficControl();

        AirplaneBase airbusAirplane = new AirbusAirplane(mehrabadAirTrafficControl);
        AirplaneBase boeingAirplane = new BoeingAirplane(mehrabadAirTrafficControl);

        mehrabadAirTrafficControl.AddAirplanes(airbusAirplane, boeingAirplane);

        airbusAirplane.Send("Can we land right now ?");
        Console.WriteLine("----------");

        boeingAirplane.Send("No! We're landing, wait ...");
        Console.WriteLine("----------");

        // Demonstrate landing ...
        Console.WriteLine("Boeing is landing ...");
        await Task.Delay(TimeSpan.FromSeconds(3));
        Console.WriteLine("----------");

        boeingAirplane.Send("We landed.");
        Console.WriteLine("----------");

        airbusAirplane.Send("OK, We're going to land ...");
        Console.WriteLine("----------");

        boeingAirplane.Send("Good luck.");

        // Results =>
        // Airbus airplane sends message: Can we land right now ?
        // Boeing airplane gets message: Can we land right now ?
        // ----------
        // Boeing airplane sends message: No! We're landing, wait ...
        // Airbus airplane gets message: No! We're landing, wait ...
        // ----------
        // Boeing is landing ...
        // ----------
        // Boeing airplane sends message: We landed.
        // Airbus airplane gets message: We landed.
        // ----------
        // Airbus airplane sends message: OK, We're going to land ...
        // Boeing airplane gets message: OK, We're going to land ...
        // ----------
        // Boeing airplane sends message: Good luck.
        // Airbus airplane gets message: Good luck.
    }
}
```

**[ گیتهاب پروژه ]** : https://github.com/MoienTajik/DesignPatterns-Mediator
