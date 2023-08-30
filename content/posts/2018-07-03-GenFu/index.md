---
title: Generate random data using GenFu in C#
tags: ["GenFu", "data-generator", "random-data-generator", "fake-data-generator"]
date: "2018-07-03T00:00:00+03:30"
description: "Generate random data using GenFu in C#"
imageUrl: "/img/posts/2018-07-03-GenFu/GenFu.png"
weight: 1
---

{{< customImg src="GenFu.png" width="300px" >}}

Sometimes, a great deal of time is wasted and a large amount of redundant code is generated when creating random data, especially when writing tests. A library named **GenFu** has been created that takes on the responsibility of creating random data. This library is open source, and you can find its source code on [GitHub](https://github.com/MisterJames/GenFu).

In this post, we intend to create random data for the following class:

```csharp
public class Person
{
    public int ID { get; set; }

    public string Firstname { get; set; }

    public string Lastname { get; set; }

    public string Email { get; set; }

    public string PhoneNumber { get; set; }

    public override string ToString()
    {
        return $"{ID}: {Firstname} {Lastname} - {Email} - {PhoneNumber}";
    }
}
```

----------

**Installing GenFu**

To install the GenFu library, use the following command in the Package Manager Console:

```csharp
Install-Package GenFu
```

----------

**1. Creating a person**

To create a new person with random data, we do the following:

```csharp
var person = A.New<Person>();
Console.WriteLine(person);
```

The result of the above code will be:

```csharp
18: Diedra Morgan - Zachary.Garcia@telus.net - (531) 273-9001
```

If you look closely, you'll notice that GenFu has automatically created data relevant to the properties you've named. For the Email, a correctly formatted email has been generated, and for PhoneNumber, a phone number with the correct format has been generated.

----------

**2. Creating multiple people**

To create a list of people, we can use the `ListOf` method and send the number of items we need (default 25):

```csharp
var people = A.ListOf<Person>(5);
people.ForEach(Console.WriteLine);
```

The above code will result in the creation of 5 people with different random data:

```csharp
97: Maria MacKenzie - Alexandra.Johnson@rogers.ca - (670) 787-3053
34: Alexander Scott - Isaiah.Price@gmail.com - (730) 645-4946
66: Kevin Perez - Gabrielle.Alexander@hotmail.com - (230) 758-8233
81: Maria Evans - Vanessa.Bell@rogers.ca - (508) 572-4343
79: Tyler Parker - Alyssa.Taylor@telus.net - (297) 357-7617
```

Until this point, GenFu has well met our needs. But what if the defaults aren't sufficient, and we want to change the format of the generated data?

For this purpose, we can use the `Configure` method and change the way data is created for specific properties we define.

----------

**3. Creating multiple people and setting a property to a fixed value**

If we want to consider the generated data for a database, we need to set their IDs to 0, so the database won't have any problems storing them. To create a list of people with an ID of 0, we can configure GenFu like this:

```csharp
A.Configure<Person>().Fill(x => x.ID, 0);

var people = A.ListOf<Person>(5);
people.ForEach(Console.WriteLine);
```

Result:

```csharp
0: Darron Gonzalez - Benjamin.Daeninck@hotmail.com - (405) 418-7783
0: Melanie Garcia - Jennifer.Griffin@microsoft.com - (711) 277-8826
0: James Hughes - Tristan.Ward@live.com - (734) 400-8322
0: Miranda Torres - Ross.Davis@rogers.ca - (495) 479-8147
0: David Hughes - Jillian.Alexander@live.com - (361) 617-6642
```

In this case, you can store the generated data in the database without any problems.

----------

**4. Creating multiple people and setting the value of a property using a method**

Another way that we can set the value of a property is by using a method or lambda:

```csharp
var i = 1;

A.Configure<Person>()
    .Fill(c => c.ID, () => i++);

var people = A.ListOf<Person>(5);
people.ForEach(Console.WriteLine);
```
  

Result:

```csharp
1: Paul Long - Carlos.Kelly@telus.net - (202) 573-6278
2: Jesse Iginla - Liberty.Moore@gmail.com - (589) 791-3606
3: Raymundo Price - Ang.Taylor@live.com - (336) 400-1601
4: Elizabeth Getzlaff - Leslie.Campbell@att.com - (662) 582-9010
5: Abigail Bailey - Tristan.Ross@live.com - (225) 661-7023
```

As you see, the IDs of the people have been assigned incrementally.

----------

**5. Creating multiple People and setting a property with the values of other properties**

We can also use the values of other properties to set the value of another property:

```csharp
A.Configure<Person>()
    .Fill(c => c.ID, 0)
    .Fill(c => c.Email,
        c => $"{c.Firstname}.{c.Lastname}@gmail.com");

var people = A.ListOf<Person>(5);
people.ForEach(Console.WriteLine);
```

The above code results in generating people whose emails are equal to `{Firstname}`.`{Lastname}`:

```csharp
0: Patrick Perry - Patrick.Perry@gmail.com - (796) 460-6576
0: Rebecca Main - Rebecca.Main@gmail.com - (757) 472-3332
0: Kimberly Carter - Kimberly.Carter@gmail.com - (436) 484-8273
0: Sara Lewis - Sara.Lewis@gmail.com - (424) 717-7682
0: Lauren Ross - Lauren.Ross@gmail.com - (277) 294-5776
```

----------

**6. Using GenFu's built-in extensions for value generation**

GenFu also has some built-in extensions that cause a property's value to be filled with understandable and pre-defined values:
```csharp
A.Configure<Person>()
    .Fill(x => x.Firstname).AsPersonTitle();

var people = A.ListOf<Person>(5);
people.ForEach(Console.WriteLine);
```

Result:

```csharp
64: Miss. Ratzlaff - Bryce.Simmons@att.com - (386) 309-2414
7: Air Marshall Yarobi - Ariana.Russell@att.com - (459) 238-0717
96: Air Marshall Taylor - Luke.Olsen@gmail.com - (775) 401-5281
28: Doctor Cox - Leah.Diaz@att.com - (569) 464-7961
99: Master Phillips - Chloe.Scott@hotmail.com - (578) 221-9021
```

----------

**7. GenFu WireFrame**

Finally, GenFu has an auxiliary package called Wireframes, which includes HTML Helpers that you can use to create HTML elements such as P, Image, Table, etc., with values for testing as placeholders.

For installation and further reading about GenFu WireFrames, visit this [link](http://genfu.io/wireframe).