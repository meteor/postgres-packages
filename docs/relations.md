<h1>Working with relational data</h1>

## Publishing relational data

// XXX explanation

```js
Meteor.publish("users-posts-and-their-comments", function() {
  const userId = this.userId;

  const postsQuery = Posts.knex()
    .innerJoin("users", "posts.user_id", "users.id")
    .select(["x", "y", "z"])
    .where({some: condition});

  const commentsQuery = Comments.knex()
    .innerJoin("posts", "comments.post_id", "posts.id")
    .innerJoin("users", "posts.user_id", "users.id")
    .where({other: condition});

  return [
    postsQuery,
    commentsQuery
  ];
});
```

Note that we don't have ORM-style relations for the server since they tend to generate inefficient queries, especially in publications. Thankfully doing relations in code on the client is basically free!

## Using relational data on the client

When you declare a table, you can also specify methods that will be attached to every row retrieved from the table on the client. You do this by declaring a class, and then passing it as an option to `PG.Table`, like so:

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

// Get the todo items from the list, sorted by timestamp
const todos = list.todos().orderBy("created_at", "DESC").run(),
```

Note that since the `todos()` method returns a partially built query but doesn't call `run()` on it, you can add additional sorting and filtering before finally executing the query.
