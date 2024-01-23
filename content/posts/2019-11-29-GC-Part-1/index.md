---
title: C# Garbage Collector - Part 1
tags: ["CSharp", "C#", "GC", "Garbage Collector"]
date: "2019-11-29T21:00:00+03:30"
description: "In this series of articles, we aim to dive into Memory Management in C#, acquaint ourselves with the Garbage Collector, and gain an overall understanding of how it operates."
imageUrl: "./GC.jpg"
weight: 1
---

<br>

![Garbage Collection](./GC.jpg)
<div style="text-align: center;">
	<span style="font-weight: bold;text-align: center;">Garbage Collection</span>
</div>

<br>

Imagine you have created a variable and assigned it a value:

```csharp
string message = "Hello World!";
```

Have you ever wondered about the lifespan of the message variable? When should it be removed from memory by the runtime?

----------

Programming languages are divided into two categories: Managed and Unmanaged:
  

1.  **Unmanaged:** In these languages, the responsibility of object creation, determining the right time for their disposal, and their actual disposal rests on you. C and C++ are examples of unmanaged languages.
    
2.  **Managed:** In these languages, you are still responsible for object creation, but the runtime takes over the responsibility of deciding and disposing of them at the right time. In such languages, we don't worry about deleting a variable we created several lines above, passed to several methods, and manipulated in various ways. C# and Java are examples of managed languages.

  
The key idea behind managed languages is to free you from the complexities of memory management, allowing you to focus on the business logic.
  
Most projects have enough business complexities. Combining these with the technical complexities of memory management often makes maintaining the project extremely difficult, gradually turning many into legacy systems. 
  
This doesn't mean projects written in languages like C and C++ are inherently legacy or unmaintainable. It implies that maintaining code in such languages is generally harder. Moreover, a project's maintainability depends on many other factors.

<img src="./Legacy.jpeg" height="300px" alt="Legacy Code" style="margin:auto;">
<br>

Let's compare a simple example in both C and C#.


We have a program that creates an integer variable, assigns the value 25 to it, and then passes this variable to a method for printing.
  
C code:

```c
#include <stdio.h>
#include <stdlib.h>

void printReport(int* data)
{
    printf("Report: %d", *data);
}

int main(void)
{
    int *myNumber;
    myNumber = (int*)malloc(sizeof(int));
    if (myNumber == 0)
    {
        printf("ERROR: Out of memory");
        return 1;
    }

    *myNumber = 25;
    printReport(myNumber);

    free(myNumber);
    myNumber = NULL;

    return 0;
}
```

  
The "goal" and primary business of this program was to print a simple report, but more issues were involved:
  

1. Allocating memory for an integer using `malloc`. 
2. Casting the returned void pointer to an int pointer.
3. Maintaining the address of the allocated variable in a pointer.
4. Checking if memory allocation was successful.
5. Assigning the value 25 to the allocated variable.
6. Passing the `myNumber` pointer to the `printReport` function.
7. Freeing the allocated memory for myNumber when no longer needed.
8. Setting myNumber to NULL to prevent [dangling pointer](https://en.wikipedia.org/wiki/Dangling_pointer) issues.
  
How many of these steps were truly necessary for our program's business logic? This is a very simple and unrealistic example, but imagine the code volume and complexity for a large program with its own business rules and complexities.
  
C# code:

```csharp
using System;

public class Program
{
    public static void Main()
    {
        int myNumber = 25;
        PrintReport(myNumber);
    }

    private static void PrintReport(int number)
    {
        Console.WriteLine($"Report: {number}");
    }
}
```

As you can see, our focus here is on the main goal and business logic, without the complexities of manual memory management. The C# runtime, [CoreCLR](https://github.com/dotnet/coreclr), handles memory management behind the scenes.

----------

<img src="./Transmission.png" height="300px" alt="Transmission" style="margin:auto;">
<br>
  
The difference between Managed and Unmanaged languages can be likened to driving a manual vs. an automatic car.
  
Usually, the main goal of driving is to go from point **A** to point **B**. With a manual car, in addition to reaching our destination, we are engaged in changing gears at the **right** speed, potentially hundreds or thousands of times. In this method, we have more control and sometimes perform better compared to an automatic system, but we deviate from our primary goal.

On the other hand, with an automatic car, all our focus is on reaching our destination. We are not involved in changing gears multiple times along the way, as an external engine handles this task. Although this method is easier than the manual approach, you naturally have less control than before.
<br>

### Similar differences exist between Managed and Unmanaged languages.

<br>

In **Unmanaged** languages, you have full control over the lifespan of objects and memory management, but you are also involved in other side topics. The power of unmanaged languages is often seen in game engines and real-time processing systems, where memory management is done manually, and the developers determine the lifespan of objects to avoid any disruptions or slowdowns, even for a few milliseconds.

In **Managed languages**, most of the time, you don't even need to get involved in the side topics of memory management, as your runtime automatically handles it. However, sometimes you need to identify sensitive parts of your program (so-called Hot-Paths), benchmark them, and ensure they perform well under high load and request volumes, and also that they don't have memory leaks. Sometimes a human (manual system) can decide better than an automatic system about what should happen in a program at a given moment.

In this series of articles, we aim to delve into Memory Management in C#, acquaint ourselves with the Garbage Collector, and gain an overall understanding of how it operates.