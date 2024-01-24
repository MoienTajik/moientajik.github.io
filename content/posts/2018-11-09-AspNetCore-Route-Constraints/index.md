---
title: Route constraints in ASP.NET Core
tags: ["AspNet", "AspNetCore", "Routing"]
date: "2018-11-09T00:00:00+03:30"
description: "In ASP.NET Core, Route constraints prevent invalid values from reaching the parameters of a controller's action."
imageUrl: "./routing.png"
weight: 1
summary: "This article covers implementing **route constraints** in ASP.NET Core to validate route parameter values. It highlights two methods: 

<ol>
    <li>Inline constraints: using route templates directly</li>
    <li>MapRoute constraints: using classes that follow the <code>IRouteConstraint</code> interface</li>
</ol>

The article also describes creating custom constraints for specific validation needs, such as checking if a string starts with a particular value. This feature in ASP.NET Core ensures that only valid values are passed to action methods, enhancing API reliability and functionality."
---

Route constraints in ASP.NET Core allow you to prevent invalid values from reaching the parameters of an action method within a controller.

For instance, you can impose a constraint such that routing only occurs when the parameter entered by the user is of type `int`:

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

By setting a breakpoint at the beginning of the action method, if you try to invoke this action with an alpha string, you'll notice that it doesn't hit the breakpoint, and routing doesn't occur. However, if called with a number, the routing successfully takes place and returns the input value, confirming that the constraint is functioning correctly.

✖  api/values/hi

✓ api/values/7

You might wonder, how is this different from the following code?
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

In this scenario, if you pass an alpha string as a parameter, routing **does occur**. However, since the input isn't an `int`, the `id` will default to **0**.

✓ api/values/hi

✓ api/values/7

----------

There are two ways to apply Route Constraints to URL parameters:

### 1- Inline constraints

These constraints are placed immediately after the URL parameter and are separated using a colon:

```csharp
app.UseMvc(routes =>
{
    routes.MapRoute("Values",
        "api/values/{id:int}",
        new { controller = "Values", action = "Get" });
});
```

Additionally, you can combine multiple constraints, and you aren't limited to just one:

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

### 2- MapRoute's constraints

All constraints are classes that implement the IRouteConstraint interface. Within `MapRoute`, you can directly use those classes as constraints:

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

**\*** This way of using constraints is not possible in Attribute Routing.
  
----------

### Creating a custom constraint

As mentioned before, all constraints are classes implementing the `IRouteConstraint` interface. Hence, we can create a custom constraint by implementing this interface.

For instance, we aim to develop a constraint that takes a string input, applies the `StartsWith` method on it, and executes routing if the result is `true`:

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

After creating your custom constraint, you need to register it in your DI container:

```csharp
services.Configure<RouteOptions>(opt =>
    opt.ConstraintMap.Add("startsWith", typeof(StartsWithConstraint)));
```

Finally, use the name you gave during registration (in this case, `startsWith`) as your routing constraint:

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

✖ api/values/John

✓ api/values/Moien

✓ api/values/Michael  

----------

**\*** You can view the list of default constraints in ASP.NET Core [here](https://gist.github.com/MoienTajik/5c5962dba7fb2de278c7eece944f3d85#aspnet-core-default-route-constraints-list).