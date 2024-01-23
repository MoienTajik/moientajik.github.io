---
title: C# Garbage Collector - Part 3
tags: ["CSharp", "C#", "GC", "Garbage Collector"]
date: "2020-01-10T20:00:00+03:30"
description: "In this series of articles, we aim to dive into Memory Management in C#, acquaint ourselves with the Garbage Collector, and gain an overall understanding of how it operates."
imageUrl: "./WS-GC.png"
weight: 1
---

In the previous [article](https://moien.dev/posts/2019-12-12-gc-part-2), we discussed the differences between stack and heap and concluded that for freeing heap memory without manual intervention, we require the **garbage collector**.

----------

## A brief history of GC in .NET

The genesis of the garbage collector (GC) in .NET dates back to 1990 when Microsoft was developing its version of JavaScript, named JScript. Initially developed by a four-person team, one member, [Patrick Dussud](https://www.zdnet.com/article/microsoft-big-brains-patrick-dussud), who is recognized as the father of .NET's garbage collector, developed a Conservative GC within the team. At that time, the CLR did not exist, and Patrick was working on the JVM.

Initially, Microsoft aimed to implement its version of the JVM instead of creating something akin to the current .NET runtime. However, once the CLR team was formed, they realized that the JVM imposed certain limitations on them, prompting the creation of their own environment.

With this decision, Patrick redeveloped a new GC from scratch, targeting the "best GC possible" concept, using LISP, his language of expertise. He then wrote a transpiler from LISP to C++ to make the code compatible with Microsoft's runtime. ([The birth of the CLR](https://docs.microsoft.com/en-us/archive/blogs/patrick_dussud/how-it-all-startedaka-the-birth-of-the-clr))

The current codes for the garbage collector used in .NET can be accessed from [this file](https://github.com/dotnet/runtime/blob/master/src/coreclr/src/gc/gc.cpp) in Microsoft's runtime repository. Today, Maoni Stephens, the technical lead of Microsoft's GC team, who has written and presented many conferences and articles on various aspects of GC implementation, can be followed on [her blog](https://devblogs.microsoft.com/dotnet/author/maoni).

----------

Currently, .NET is equipped with three modes (flavors) of GC, each optimized for different types of applications. Let's dive into each of these:

## Server GC  
  
Optimized for server-side applications like ASP.NET Core and WCF, this variant of GC is designed for environments with high request rates and frequent object allocations and deallocations.

Server GC operates with a separate heap and a GC thread for each processor. This means that if you have an eight-core processor, there will be an independent heap and GC thread on each core during garbage collection.
  
This approach ensures the collection process is as swift as possible without additional pauses, preventing the application from "freezing".
  
Server GC is only executable on multi-core processors. Attempting to run a server-side application in Server GC mode on a single-core processor will automatically result in a fallback to **Non-Concurrent Workstation GC**.

To use Server GC in non-server-side applications (like WPF, Windows Services, etc.) on multi-core processors, add the following settings to your app.config or web.config:

```xml
<configuration>
  <runtime>
    <gcServer enabled="true"/>
  </runtime>
</configuration>
```

In .NET Core applications, these settings can be added to your csproj file:

```csharp
<PropertyGroup>
  <ServerGarbageCollection>true</ServerGarbageCollection>
</PropertyGroup>
```

----------

## Concurrent Workstation GC

This default mode is primarily used in Windows Forms and Windows Service applications. It's optimized for scenarios where the application should not pause or become unresponsive, even momentarily, during garbage collection.
  
To enable Concurrent Workstation GC, include these settings in your application's config:

```xml
<configuration>
  <runtime>
    <gcConcurrent enabled="true" />
  </runtime>
</configuration>
```

----------

## Non-Concurrent Workstation GC

  
Similar to Server GC, this mode conducts the collection on the thread that requests the object allocation.
  
For example: 

**•** Thread one requests the allocation of a 10000-character string.
  

**•** The memory lacks sufficient space, triggering the garbage collector to free up the required space.
  

**•** The CLR suspends all threads, the garbage collector begins its operation on the **initiating thread**, collecting unused objects.
  

**•** Once the collection is complete, all previously suspended threads resume their operations.
  
  
This GC mode is recommended for server-side applications running on single-core processors. To activate it, modify the config settings of your application as follows:

```xml
<configuration>
  <runtime>
    <gcConcurrent enabled="false" />
  </runtime>
</configuration>
```

----------

The following table will assist in selecting the appropriate GC settings based on the nature of your application (in most cases, the default settings are optimal, and manual adjustments to GC are unnecessary):

|                                  |                     Concurrent Workstation                     |                   Non-Concurrent Workstation                   |                                                              Server GC                                                             |
|:--------------------------------:|:--------------------------------------------------------------:|:--------------------------------------------------------------:|:----------------------------------------------------------------------------------------------------------------------------------:|
|            <b>Design Goal</b>           | <span dir="ltr">Balance throughput and responsiveness for client apps with UI.</span> |        <span dir="ltr">Maximize throughput on single-processor machines.</span>       | <span dir="ltr">Maximize throughput on multi-processor machines for server apps that create multiple threads to handle the same types of requests.</span> |
|          <b>Number of Heaps</b>         |                                1                               |                                1                               |                                               <span dir="ltr">1 per processor ( hyper thread aware )</span>                                               |
|            <b>GC Threads</b>            | <span dir="ltr">The thread which performs the allocation that triggers the GC.</span> | <span dir="ltr">The thread which performs the allocation that triggers the GC.</span> |                                                 <span dir="ltr">1 dedicated GC thread per processor</span>                                                |
|    <b>Execution Engine Suspension</b>   |   <span dir="ltr">EE is suspended much shorter but several times during a GC.</span>  |                  <span dir="ltr">EE is suspended during a GC.</span>                  |                                                    <span dir="ltr">EE is suspended during a GC.</span>                                                    |
|          <b>Config Setting</b>          |                  <gcConcurrent enabled="true">                 |                 <gcConcurrent enabled="false">                 |                                                      <gcServer enabled="true">                                                     |
| <b>On a single processor (fallback)</b> |                                                                |                                                                |                                                    Non-Concurrent Workstation GC                                                   |