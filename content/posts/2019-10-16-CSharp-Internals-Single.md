---
title: C# Internals - Single and SingleOrDefault
tags: ["CSharp", "C#", "Internals", "Single", "SingleOrDefault", "First", "FirstOrDefault"]
date: 2019-10-16
description: "C# Internals - Single and SingleOrDefault"
imageUrl: "/img/posts/2019-10-16-CSharp-Internals-Single/WrongAssumption.jpg"
weight: 1
---

بسیاری از افراد ، گاهی اوقات از متدهای First و FirstOrDefault در LINQ بعنوان جایگزین Single و SingleOrDefault استفاده میکنند ، با این منطق که Single "تمام" آیتم های یک Enumerable را پیمایش میکند تا نتیجه را یافت کند ، اما First و FirstOrDefault نیاز به پیمایش تمام آیتم های یک Enumerable را ندارند ، در نتیجه سریع تر هستند.

جدا از اینکه جابه‌جایی استفاده از Single و First در اکثر مواقع امکان پذیر نیست و این دو متد ، نمیتوانند جایگزین یکدیگر باشند و کارایی متفاوتی دارند ، اما بعضی اوقات قابل جابه‌جا شدن نیز هستند.

![Wrong Assumptions](/img/posts/2019-10-16-CSharp-Internals-Single/WrongAssumption.jpg)

---
متد SingleOrDefault صرفا "تمام" یک Enumerable را پیمایش نمیکند. ❌

اگر به متد <Single<**T** یا <SingleOrDefault<**T**  هیچ Predicate پاس ندهیم ، سه حالت بوجود خواهد آمد :

 - در صورتی که تعداد آیتم ها صفر باشد ، مقدار پیشفرض نوع **T** برگشت داده میشود.
 - در صورتی که تعداد آیتم ها برابر یک باشد ، آیتم **[0]** اون Enumerable برگشت داده میشود.
 - در صورتی که تعداد آیتم ها بیشتر از یک باشد ، خطا صادر میشود.

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

اگر به این متدها Predicate پاس بدهیم ، بر روی Enumerable پیمایش صورت گرفته و در حین پیمایش ،  سه حالت بوجود خواهد آمد :

 - در صورتی که آیتمی مطابق با Predicate پیدا نشود ، مقدار پیشفرض T برگشت داده میشود.
 - اگر یک آیتم پیدا شود ، پیمایش ادامه پیدا میکند. اگر آیتم مشابه دیگری یافت شود ، به محض رسیدن به آن آیتم ، خطا صادر میشود. ممکن است آیتم مشابه ، آیتم بعدی بوده ( 1+ ) و یا آیتم N ام از Enumerable در حال پیمایش باشد ( N+1 ).
 - در صورتی که آیتمی مشابه با آیتم اول پیدا نشود ، همان آیتم اول برگشت داده خواهد شد.

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

در نتیجه ✅ :

    SingleOrDefault<TSource>(this IEnumerable<TSource> source) → O(1)
    
    SingleOrDefault<TSource>(this IEnumerable<TSource> source, Func<TSource, bool> predicate) → O(1) || O(N)

Microsoft's CoreFX Repo: [Single.cs](https://github.com/dotnet/corefx/blob/master/src/System.Linq/src/System/Linq/Single.cs)

