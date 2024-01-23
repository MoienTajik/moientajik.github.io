---
title: C# Internals - Single and SingleOrDefault
tags: ["CSharp", "C#", "Internals", "Single", "SingleOrDefault", "First", "FirstOrDefault"]
date: 2019-10-16
description: "C# Internals - Single and SingleOrDefault"
imageUrl: "./WrongAssumption.jpg"
weight: 1
summary: "This article demystifies the LINQ methods `Single` and `SingleOrDefault` in C#, addressing the misconception that they always traverse an entire `Enumerable`. It explains the actual behavior of these methods, both with and without a predicate, contrasting them with `First` and `FirstOrDefault`. The article clarifies that `SingleOrDefault` efficiently handles different scenarios, such as returning a default value, the only item, or throwing an error when multiple items exist. It emphasizes the operational differences and efficiency **O(1)** without predicate and **O(N)** with predicate of these methods, offering valuable insights for C# developers seeking to optimize their code."
---

Many developers occasionally use the LINQ methods `First` and `FirstOrDefault` as substitutes for `Single` and `SingleOrDefault`. This practice stems from the belief that `Single` traverses "all" items in an Enumerable to find the result, whereas `First` and `FirstOrDefault` do not need to traverse the entire Enumerable, making them faster.

However, replacing `Single` with `First` is not always feasible, as these two methods serve different purposes and cannot always be interchanged. Despite their distinct functionalities, there are instances where they can be swapped.

![Wrong Assumptions](./WrongAssumption.jpg)

---
The `SingleOrDefault` method does not always traverse "all" items of an Enumerable. ❌

If we call `Single<T>` or `SingleOrDefault<T>` without passing any *Predicate*, three scenarios can occur:

 - If there are zero items, the default value of type **T** is returned.
 - If there is exactly one item, item **[0]** of the Enumerable is returned.
 - If there are more than one items, an error is thrown.

<br>

```csharp
public static TSource SingleOrDefault<TSource>(this IEnumerable<TSource> source)
{
  if (source == null)
    throw Error.ArgumentNull(nameof (source));
    
  if (source is IList<TSource> sourceList)
  {
    switch (sourceList.Count)
    {
      case 0:
        return default (TSource);
        
      case 1:
        return sourceList[0];
    }
  }
  else
  {
    using (IEnumerator<TSource> enumerator = source.GetEnumerator())
    {
      if (!enumerator.MoveNext())
        return default (TSource);
        
      TSource current = enumerator.Current;
      
      if (!enumerator.MoveNext())
        return current;
    }
  }
  
  throw Error.MoreThanOneElement();
}
```

---

When these methods are called with a Predicate, they traverse the Enumerable and during this process, three situations can arise:

- If no item matches the Predicate, the default value of **T** is returned.
- If one item is found, the traversal continues. If another matching item is found, an **error** is thrown immediately. This second item could be the next one (1+) or any subsequent item (N+1).
- If no additional matching items are found, the first matching item is returned.

<br>

```csharp
public static TSource SingleOrDefault<TSource>(
      this IEnumerable<TSource> source,
      Func<TSource, bool> predicate)
{
  if (source == null)
    throw Error.ArgumentNull(nameof (source));
    
  if (predicate == null)
    throw Error.ArgumentNull(nameof (predicate));
    
  using (IEnumerator<TSource> enumerator = source.GetEnumerator())
  {
    while (enumerator.MoveNext())
    {
      TSource current = enumerator.Current;
      
      if (predicate(current))
      {
        while (enumerator.MoveNext())
        {
          if (predicate(enumerator.Current))
            throw Error.MoreThanOneMatch();
        }
        
        return current;
      }
    }
  }
  
  return default (TSource);
}
```

---

In conclusion ✅ :

```csharp
SingleOrDefault<TSource>(this IEnumerable<TSource> source) → O(1)
    
SingleOrDefault<TSource>(
  this IEnumerable<TSource> source, Func<TSource, bool> predicate) → O(N)
```

Microsoft's CoreFX Repo: [Single.cs](https://github.com/dotnet/corefx/blob/master/src/System.Linq/src/System/Linq/Single.cs)