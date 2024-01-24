---
title: Design Patterns - Mediator
tags: ["DesignPatterns", "Mediator", "C#", "Patterns"]
date: 2019-01-19
description: "The Mediator design pattern encapsulates how multiple objects communicate within itself."
imageUrl: "./mediator.jpg"
weight: 1
summary: "Explore the Mediator design pattern, illustrated through an airport control tower analogy. Learn how it manages communications between planes in **C#**, starting from the `IAirTrafficControl` interface to the implementation of `AirbusAirplane` and `BoeingAirplane` classes. The article concludes with the `JFKAirTrafficControl` class, demonstrating the pattern's role in facilitating effective object interaction. Ideal for those interested in applying design patterns in software engineering."

---

The Mediator design pattern encapsulates how multiple objects communicate within itself.
<img src="./mediator.jpg" width="700px" alt="Mediator" style="margin:auto;">

#### A real-world example of this pattern

Consider an airport control tower. This unit is aware of all the planes in transit and is responsible for managing their flights, issuing takeoff and landing permissions. If landing permission is not granted, the plane is not allowed to land.

Continuing with the above scenario, we implement it in code:

First, we create an interface called `IAirTrafficControl` (Air Traffic Control Tower) that has a method named `SendMessage` responsible for sending messages from one airplane to another and also for adding (registering) airplanes to itself:

```C#
public interface IAirTrafficControl
{
    void AddAirplanes(params AirplaneBase[] airplanes);

    void SendMessage(string message, AirplaneBase messageProducerAirplane);
}
```

All airplanes inherit from an abstract class named `AirplaneBase`, which needs an `IAirTrafficControl` object for its instantiation:

```C#
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

This class has two methods `Send` and `Notify`. The `Send` method is responsible for sending a message from one airplane to another, while the `Notify` method acknowledges receiving a message from another airplane.

Next, we create two airplanes that implement `AirplaneBase`:

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

Finally, we need a concrete class that implements `IAirTrafficControl`, holds a list of airplanes, and manages communication between them. This is the primary class in this pattern that defines how communication between airplanes should occur:

```C#
// This is our Mediator which maintains communications
public class JFKAirTrafficControl : IAirTrafficControl
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

Ultimately, you can test the program as follows:

```C#
public static class Program
{
    static async Task Main()
    {
        IAirTrafficControl jfkAirTrafficControl = new JFKAirTrafficControl();

        AirplaneBase airbusAirplane = new AirbusAirplane(jfkAirTrafficControl);
        AirplaneBase boeingAirplane = new BoeingAirplane(jfkAirTrafficControl);

        jfkAirTrafficControl.AddAirplanes(airbusAirplane, boeingAirplane);

        airbusAirplane.Send("Can we land right now ?");
        Console.WriteLine("----------");

        boeingAirplane.Send("No! we're landing, wait ...");
        Console.WriteLine("----------");

        // Demonstrate landing ...
        Console.WriteLine("Boeing is landing ...");
        await Task.Delay(TimeSpan.FromSeconds(3));
        Console.WriteLine("----------");

        boeingAirplane.Send("Landed.");
        Console.WriteLine("----------");

        airbusAirplane.Send("OK, we're going to land ...");
        Console.WriteLine("----------");

        boeingAirplane.Send("Good luck.");

        // Results =>
        // Airbus airplane sends message: Can we land right now ?
        // Boeing airplane gets message: Can we land right now ?
        // ----------
        // Boeing airplane sends message: No! we're landing, wait ...
        // Airbus airplane gets message: No! we're landing, wait ...
        // ----------
        // Boeing is landing ...
        // ----------
        // Boeing airplane sends message: Landed.
        // Airbus airplane gets message: Landed.
        // ----------
        // Airbus airplane sends message: OK, we're going to land ...
        // Boeing airplane gets message: OK, we're going to land ...
        // ----------
        // Boeing airplane sends message: Good luck.
        // Airbus airplane gets message: Good luck.
    }
}
```

<br>

**GitHub project:** https://github.com/MoienTajik/DesignPatterns-Mediator