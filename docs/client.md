<h1>Client-side data cache</h1>

In Meteor, the primary way of using data from your database is to "publish" it from the server, then "subscribe" to it from the client. This puts the data in a client-side version of your database table, which can be accessed with zero roundtrip time.

We have implemented a subset of the Knex query builder to work against Minimongo, Meteor's client-side data cache. With this technology, you can use the exact same query builder syntax to get data on the client and server.

```js
// Declare a table
Lists = new PG.Table("lists");

// Get the list with a specific ID
Lists.where({ id: listId }).run()[0]
```

The above code will return the real row from the database if called on the server, or the client-side cached copy of the row if called from the client.

## Relations

Read about how to use relations on the client here: [Relations](relations.md)

## Minimongo-compatible

Currently, calling the Knex query builder on the client actually generates Minimongo queries, and the client-side data cache is Minimongo under the hood. This has some desirable properties - it will be compatible with any UI packages that rely on Minimongo or Minimongo cursors to function!

Currently, it's not easy to extract a cursor, but we'll be working on that in the future.

## _id field

Rows you extract from the client-side cache will, in addition to all of the fields you expect, have an extra `_id` field which is a stringified version of the row's `id`. This is due to an internal implementation detail in DDP that requires every document to have a string `_id`.
