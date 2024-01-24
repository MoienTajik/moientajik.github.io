---
title: Getting Started with DebuggerTypeProxy in Visual Studio
tags: ["VisualStudio", "Debug", "Debugger"]
date: "2018-07-05T00:00:00+03:30"
description:  "Getting Started with DebuggerTypeProxy in Visual Studio"
imageUrl: "/img/posts/2018-07-05-DebuggerTypeProxy/2.png"
weight: 1
summary: "The article explains the use of `DebuggerTypeProxy` in Visual Studio for enhancing debugging. It illustrates how to display complex or less readable properties (like **Hex** values) in a more understandable format using a proxy class. By applying the `DebuggerTypeProxy` attribute to a class, the values are shown in the debugger in a customized way, as defined in the proxy class. This feature significantly improves the **debugging experience** by providing clearer insights into the data structures being inspected."
---

The [DebuggerDisplay](https://learn.microsoft.com/en-us/visualstudio/debugger/using-the-debuggerdisplay-attribute) feature in Visual Studio has been introduced before. Another feature similar to this one is named **DebuggerTypeProxy**, which we will explore it below.

----------

Consider the class below:

```csharp
public class Data
{
    public string Name { get; set; }
    public string ValueInHex { get; set; }
}
```

After executing the program, the values of the created class will be as follows:

<img src="./1.png" width="400px" alt="DebuggerTypeProxy" style="margin:auto;">
<br>

Here, the Hex value is not understandable for us. Imagine a scenario where values need to be stored in the database in Hex format, but during debugging, we want to display the HexValue property in an understandable decimal form.

To do this, we can use the **DebuggerTypeProxy** feature. First, we create a class that acts as a proxy, displaying the values the way we need them. This class receives the original object in its constructor, and the values we're interested in are accessible through the properties we define in it:

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
            bool isValidHex = int.TryParse(_data.HexValue, NumberStyles.HexNumber, null, out var value);
            return isValidHex ? value.ToString() : "INVALID HEX STRING";
        }
    }
}
```

Finally, to apply this proxy class, we use the **DebuggerTypeProxy** attribute on the main class:

```csharp
[DebuggerTypeProxy(typeof(DataDebugView))]
public class Data
{
    public string Name { get; set; }

    public string HexValue { get; set; }
}
```

After making the changes and rerunning the program, the way the class values are displayed during debugging session will change:

<img src="./2.png" width="400px" alt="DebuggerTypeProxy" style="margin:auto;">