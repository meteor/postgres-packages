<h1>Client-side data cache</h1>

In Meteor, the primary way of using data from your database is to "publish" it from the server, then "subscribe" to it from the client. This puts the data in a client-side version of your database table, which can be accessed with zero roundtrip time.

We have implemented a subset of the Knex query builder to work against Minimongo, Meteor's client-side data cache. With this technology, you can use the exact same query builder syntax to get data on the client and server.

```js
// Declare a table
Lists = new PG.Table("lists");

// Get the list with a specific ID
Lists.knex().where({ id: listId }).run()[0]
```

The above code will return the real row from the database if called on the server, or the client-side cached copy of the row if called from the client.

## Relations

When you declare a table, you can also specify methods that will be attached to every row retrieved from the table. You do this by declaring a class, and then passing it as an option to `PG.Table`, like so:

```js
// Declare class
class List extends PG.Model {
  todos() {
    // Partially built query that encodes the relation
    return Todos.knex().where({list_id: this._id});
  }
}

// Define table, passing in the class as an option
Lists = new PG.Table('lists', {
  modelClass: List
});
```

Now, you can call methods on the rows you retrieve to do simple relations:

```js
// Get a list from the table
const list = Lists.knex().where({ id: listId }).run()[0];

// Get the todo items from the lists, sorted by timestamp
const todos = list.todos().orderBy("created_at", "DESC").run(),
```

Note that since the `todos()` method returns a partially built query but doesn't call `run()` on it, you can add additional sorting and filtering before finally executing the query.
