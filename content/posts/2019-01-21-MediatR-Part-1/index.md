---
title: Implementing CQRS with MediatR - Part 1
tags: ["MediatR", "Mediator", "DesignPatterns", "CQRS", "EventSourcing"]
date: "2019-01-21T00:00:00+03:30"
description: "This series explores the implementation of the CQRS design pattern using the MediatR library."
imageUrl: "/Mediator.jpg"
weight: 1
summary: "This article dives into the implementation of the **CQRS** design pattern using the MediatR library in .NET, simplifying its complexity. It explains the division of application methods into `Command` and `Query` functions, highlighting the benefits of this separation for technology choice and scalability. The piece also touches on the concept of events and **Event Sourcing**, showcasing their roles in maintaining system states and facilitating troubleshooting. The use of the **Event Store** database for implementing Event Sourcing is briefly introduced, offering a comprehensive view of the CQRS pattern and its practical application."
---

<img src="./Mediator.jpg" width="400px" alt="Mediator" style="margin:auto;">

Implementing the CQRS pattern, although possible with ready-to-use libraries like [SimpleCQRS](https://github.com/tyronegroves/SimpleCQRS), can be complex and code-intensive.

The [MediatR](https://github.com/jbogard/MediatR) library, created by the developer of the popular AutoMapper library, offers a full implementation of the [Mediator design pattern](https://moien.dev/posts/2019-01-19-mediator-design-pattern) in .NET. This library abstracts the complexities of CQRS implementation, allowing you to incorporate CQRS into your projects with minimal code.

In this series, we will comprehensively review the CQRS pattern, discuss its pros and cons, and demonstrate its implementation using the MediatR library.

----------

### CQRS

In CQRS, application methods are divided into two categories: **Read** and **Write**. Commands modify the overall state of the application, including the database, cookies, sessions, local storage, memory, etc. Queries, on the other hand, merely read the system state without altering it.  
  
**Note:** Commands usually have imperative naming conventions, e.g., RegisterUser, SendForgottenPasswordEmail, PlaceOrder.

**Advantages:**

1- You can easily separate the technologies used for the Command and Query sides of your application. For example, Apache Cassandra is a reliable (Write Side), while ElasticSearch excels in data retrieval due to its exceptional speed and complex query capabilities.

2- In typical applications, the Read Side is often utilized more than the Write Side. This allows you to scale the Read Side by allocating more resources or systems (Horizontal Scaling, Vertical Scaling).

3- The separation enables you to focus on different parts of your application more distinctly. Each side, Command and Query, can be modified without affecting the other.  

**Drawbacks:**

The main criticisms of this pattern is its implementation complexity. However, we aim to simplify this complexity using MediatR.

----------

### Events

Events are occurrences that inform their consumers about a task **previously** completed in the system. For example, after a user successfully registers, you may want to send a notification or email. An event called `UserRegistered` can be raised, containing the username and email.
  
Events can have multiple consumers; therefore, you could write one EventHandler for `UserRegistered` to send an email and another to send a notification.

**Note:** The naming convention for events is usually in the past tense, e.g., UserRegistered, OrderPlaced.

----------

### Event Sourcing

Event Sourcing refers to the storage of all occurred events in an append-only database within a program. In these types of databases, we can only add new events and are not capable of editing or deleting events; because the logic of an event is based on actions that have occurred in the past, and we cannot change something that has already happened!

The advantage of Event Sourcing is that we keep the state of the program at different times and can find the state of the system at a specific date. If there is an issue in the system, we can investigate its state prior to the problem occurring.  

For example, consider the balance of a bank account. One way to keep this amount updated after each transaction is to have a field for the balance and directly update it after each transaction. In this method, due to directly updating this field in the database, we will lose the previous state (previous balance), and we must run multiple database queries to reach the previous state of the system.  

Another approach exists where instead of constantly updating the current state, we add all events affecting that transaction within the system to a database. In this case, because we have all the occurred events in the program, we can simulate and understand the current state of the system.  

**\*** In this tutorial series, we will use the Event Store database for implementing Event Sourcing.