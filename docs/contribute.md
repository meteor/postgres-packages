<h1>Contributing to the project</h1>

There's a lot more work left before SQL and Meteor is ready for general use. We could use your help to get it done faster!

## Try it out

It will be hard to figure out what improvements to focus on without feedback. If you're an enterprising developer, try building some stuff with it and tell us what breaks. File issues [on GitHub](https://github.com/meteor/postgres-packages).

## Code to be written

### Accounts

Currently, this repository contains sketchy versions of Meteor's `accounts-base` and `accounts-password` packages that are modified to work with SQL. They have just enough functionality for super basic password login to work so that you can run the Todos example app, but there's a lot more to do here.

In addition to building the functionality of the accounts packages, there is also some design to do about how a single package can work across different databases.

See the [GitHub issues tagged `accounts`](https://github.com/meteor/postgres-packages/labels/accounts) for more details.

### Client-side cache

Right now, there is a query builder that converts chained Knex queries into Minimongo queries, that lives [here](https://github.com/meteor/postgres-packages/blob/master/packages/bookshelf/knex.js). It could be improved to support more different kinds of queries.

There are also other improvements that could be made. See more [on GitHub](https://github.com/meteor/postgres-packages/labels/client-cache).

### Relations and ORM

Currently all of the support is build around the Knex query builder, but we haven't done that much about modeling relations, or supporting its ORM sibling, [Bookshelf](http://bookshelfjs.org/#).

There's a [Quip document](https://quip.com/vsFjAQFIRdMs) about different ideas for publishing relational data from the server. It might be good to implement some of those ideas.


