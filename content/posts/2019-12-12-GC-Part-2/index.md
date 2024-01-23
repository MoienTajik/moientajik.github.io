---
title: C# Garbage Collector - Part 2
tags: ["CSharp", "C#", "GC", "Garbage Collector"]
date: "2019-12-12T23:00:00+03:30"
description: "In this series of articles, we aim to dive into Memory Management in C#, acquaint ourselves with the Garbage Collector, and gain an overall understanding of how it operates."
imageUrl: "./Heap.jpg"
weight: 1
summary: "This article delves into the distinction between **Stack** and **Heap** in C# memory management. It explains how the stack, with its `LIFO` method, stores value types like structs and enums, while the heap handles reference types like `strings`. Key concepts like **boxing** and **unboxing** are covered, showing how value types can be converted to reference types and vice versa. The article emphasizes the importance of efficient memory management and the role of the garbage collector in .NET, particularly in managing heap memory and optimizing overall application performance."
---

In this article, we will explore the differences between **Stack** and **Heap** in memory, particularly in the context of C#.

In simple terms, when you create a new variable, depending on its type, the "value" of your variable will be stored in either the Stack or the Heap.

----------

## Stack

The Stack is a data structure where data is stored linearly and operates on a **LIFO** (Last In, First Out) basis, meaning the last data item put in the Stack is the first one that can be accessed. When we put data in the Stack, we **Push** it, and when we read the last data due to its linear structure, we **Pop** it.

<br>
<img src="./Stack.png" height="450px" alt="Stack" style="margin:auto;">
<br>

This data structure is kept in memory, and many of the variables we create in our code are stored in this type of memory structure.
  
A variable's value is stored in the Stack if it is of value type. In C#, generally structs and enums are value types and are stored in the Stack by default. All value types in C# implicitly inherit from [System.ValueType](https://docs.microsoft.com/en-us/dotnet/api/system.valuetype).

Below are the default value types defined in C# known as Simple Types:

|   Type  |                          Represents                          |
|:-------:|:------------------------------------------------------------:|
|   bool  |                         Boolean value                        |
| integer |                    8-bit unsigned integer                    |
|   char  |                   16-bit Unicode character                   |
| decimal | 128-bit precise decimal values with 28-29 significant digits |
|  double |          64-bit double-precision floating point type         |
|  float  |          32-bit single-precision floating point type         |
|   int   |                  32-bit signed integer type                  |
|   long  |                  64-bit signed integer type                  |
|  sbyte  |                   8-bit signed integer type                  |
|  short  |                  16-bit signed integer type                  |
|   uint  |                 32-bit unsigned integer type                 |
|  ulong  |                 64-bit unsigned integer type                 |
|  ushort |                 16-bit unsigned integer type                 |

If you check the source of any of these types, like [Int32](https://github.com/dotnet/coreclr/blob/master/src/System.Private.CoreLib/shared/System/Int32.cs), in Microsoft's CoreFX repository, you will find that all these types are defined as Structs, which by default, are stored in the Stack.

The lifetime of variables stored in the Stack is limited to the end of the execution of a method. This means that once a method execution is completed, all the variables used in that method are automatically removed from the Stack. The type and size of values for variables stored in the Stack are determined during Compile-Time.

Local variables, method input parameters, and a method's return value are examples of items whose values are stored in the Stack:

```csharp
public static int Add(int number1, int number2)
{
    // number1 is on the stack (function parameter)
    // number2 is on the stack (function parameter)

    int sum = number1 + number2;
    // sum is on the stack (local variable)

    return sum;
}
```

<br>

In C#, during compile-time, the code is translated into IL (Intermediate Language), also known as MSIL (Microsoft Intermediate Language) or CIL (Common Intermediate Language). The structure of this language is stack-based, and understanding it helps us better comprehend the concept of the Stack.

IL is the language understood and executed by CLR (Common Language Runtime), which is Microsoft's runtime. The source for Microsoft's runtime, formerly known as [CoreCLR](https://github.com/dotnet/coreclr) and now simply as Runtime, is open-source and available [here](https://github.com/dotnet/runtime).

Using programs like [dotPeek](https://www.jetbrains.com/decompiler), [dnSpy](https://github.com/0xd4d/dnSpy), [ILDASM](https://learn.microsoft.com/en-us/dotnet/framework/tools/ildasm-exe-il-disassembler), or online tools like [Sharplab](https://sharplab.io), you can view the IL code of your program's DLLs. These tools are similar, with dnSpy having the advantage of IL code debugging capabilities, and ILDASM is accessible without additional software installation through Visual Studio:

```csharp
C:\Program Files (x86)\Microsoft SDKs\Windows\{version}\Bin\ildasm.exe
```

<br>

As mentioned earlier, the lifespan of the Stack is limited to the duration of a method. The Stack created when calling a method, which includes the method's inputs, local variables, and return address, is known as a **Stack Frame** or **Activation Frame**.

<br>
<img src="./Stack-Structure.png" height="400px" alt="Stack Structure" style="margin:auto;">
<br>

If we call the above `Add` method with parameters 2 and 5, the resulting IL output will be as follows (parts of the output have been omitted for simplicity):

```csharp
.method private hidebysig static int32 Add(int32 number1, int32 number2) cil managed
{
  .locals init (int32 V_0, int32 V_1)

  IL_0001:  ldarg.0 // Stack is: [2]
  IL_0002:  ldarg.1 // Stack is: [2, 5]
  IL_0003:  add     // Stack is: [7]
  IL_0004:  stloc.0 // Stack is: [] and V_0's value is: 7

  IL_0005:  ldloc.0 // Stack is: [7]
  IL_0006:  stloc.1 // Stack is: [] and V_1's value is: 7

  IL_0009:  ldloc.1 // Stack is: [7]
  IL_000a:  ret     // Return [7]
}
```

You can find a list of instructions used in CIL [here](https://en.wikipedia.org/wiki/List_of_CIL_instructions).
  
Let's analyze the output line by line:

**1.** In IL, you can store values resulting from computations or other methods in local variables, but first you have to declare them at the beginning.

- Using `locals` (which stands for local variables), you can define the necessary variables for the lifetime of the method. Naming these variables (not mandatory, like `V_0` and `V_1`) is used for readability.

**2.** The keyword `ldarg` (Load Argument) is used to load the method's input parameter into the Stack.
- `ldarg.0` means loading the first input parameter into the Stack, resulting in a Stack Frame with one member, the value 2.
- `ldarg.1` means loading the second input parameter into the Stack, resulting in a Stack Frame with two members, values 2 and 5.

**3.** Using the keyword `add`, the values in the Stack are added together, resulting in a Stack Frame with one member, value 7.
  
**4.** The keyword `stloc` (Store Local) is used to store the last member in the Stack into the specified local variable.
- `stloc.0` means storing the last value in the Stack, number 7, into variable 0, i.e., `V_0`.

**5.** The keyword `ldloc` (Load Local) is used to load a stored local variable into the Stack.
- `ldloc.0` means loading the stored value of local variable 0, `V_0`, into the Stack.
  
**6.** Finally, the value 7, stored in variable 1 or `V_1`, is again stored, loaded with `ldloc.1`, and returned with the `ret` instruction.

**\* Note:** If you have examined the codes carefully, you might wonder why there is a need to create an additional variable and store the result in it before returning it in step 6. In C#, your codes are optimized during Release build and JIT-compilation, and one of these optimization steps includes removing these extra variables, so there's no need to worry.
  
**\* Note:** By now, you might understand why a `StackOverflowException` occurs. Stack space is limited. This [space](https://stackoverflow.com/a/28658130/6661314) is 1 megabyte in 32-bit systems and 4 megabytes in 64-bit systems. If the volume of variables pushed onto the Stack exceeds these limits, or if a method continuously calls itself (recursion) without ever exiting, you will encounter a `StackOverflowException`.

----------

## Heap

<br>

<img src="./Heap.jpg" height="450px" alt="Heap" style="margin:auto;">
<div style="text-align: center;">
	<span style="font-style: italic; text-color: gray;">Heap: a group of things placed, thrown, or lying one on another.</span>
</div>

<br>

Contrary to the orderly and sequential structure of the Stack, we have the Heap. The Heap is a part of memory that doesn't have a specific structure, order, or layout.

Unlike the Stack, which is limited to a method, the Heap is global and accessible anywhere in the program. Memory allocation in the Heap is dynamic, and any data type can be stored at any time.

Strings are an example of types stored in the Heap. It's important to note that when we say "stored," we refer to the **value** of a variable.
  
When we create a string variable, its value is stored in the Heap, and the memory address of that variable on the Heap is stored in the Stack:

```csharp
public static void SayHi()
{
    string name = "Moien";
}
```

In this example, since [string is a class](https://github.com/dotnet/corefx/blob/master/src/Common/src/CoreLib/System/String.cs), its value is stored in the heap, and the address of that memory segment is placed on the Stack:

```csharp
.method private hidebysig static void SayHi() cil managed
{
  .locals init (string V_0)

  IL_0001:  ldstr      "Moien" // Stack is: [memory-address of string in heap]
  IL_0006:  stloc.0

  IL_0007:  ret
}
```

Variables whose values are stored in the Heap are known as reference types.
  
**\*Note:** In this example, a variable named name is created but not used. During JIT compilation, due to the optimizations at the runtime level, this method will be deemed redundant and ignored.

<br>
<img src="./Heap.png" height="450px" alt="Heap Structure" style="margin:auto;">
<br>


----------

## Boxing

The process of converting a value type, such as int, which is typically stored in the Stack, into an object stored in the Heap, is known as **Boxing**. This action causes allocation on the memory, which is quite costly.
  
By performing boxing, we can store a number, contrary to its usual practice, on the heap:

```csharp
public static void Boxing()
{
    const int number = 5;

    object boxedNumber = number;          // implicit boxing using implicit cast
    object boxedNumber = (object)number;  // explicit boxing using direct cast
}
```

Initially, the number 5 was stored on the Stack, but by boxing it, i.e., placing its value inside an object, the value is transferred from the stack to the heap, causing allocation:

```csharp
.method public hidebysig static void Boxing() cil managed
{
  .locals init (object V_0)

  IL_0001:  ldc.i4.5                                // Stack is: [5]
  IL_0002:  box        [System.Runtime]System.Int32 // Stack is: [memory-address of 5 in heap]

  IL_0007:  stloc.0
  IL_0008:  ret
}
```

----------
## Unboxing
The reverse of this process, i.e., converting a reference type to a value type, is known as **Unboxing**:

```csharp
public static void Unboxing()
{
    object boxedNumber = 5;

    int number = (int)boxedNumber;
}
```

The result of which will be as follows:

```csharp
.method public hidebysig static void Unboxing() cil managed
{
  .locals init (object V_0, int32 V_1)

  IL_0001:  ldc.i4.5                                  // Stack is: [5]
  IL_0002:  box        [System.Runtime]System.Int32   // Stack is: [memory-address of 5 in heap]
  IL_0007:  stloc.0                                   // Stack is: []

  IL_0008:  ldloc.0                                   // Stack is: [memory-address of 5 in heap]
  IL_0009:  unbox.any  [System.Runtime]System.Int32   // Stack is: [5]
  IL_000e:  stloc.1                                   // Stack is: []

  IL_000f:  ret
}
```

<br>

Recent efforts by dotnet team have led to a remarkable improvement in performance in both .NET Core and ASP.NET Core. A key reason behind this enhanced performance is the significant reduction of memory allocations in the .NET codebase.

Unlike the stack, where the lifespan of variables ends at the conclusion of a method, variables allocated in the heap do **not** follow this pattern. If these variables are not manually deleted, they remain in memory for the duration of the program's execution. This is where the **Garbage Collector** in .NET comes into play.