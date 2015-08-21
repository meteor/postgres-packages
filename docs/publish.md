<h1>Publishing data</h1>

You can publish pretty much any query you can run on your Postgres database, and it will be reactively re-run and updates pushed to the client. Depending on how complex your query is and whether you prefer to use a query builder or a raw SQL string, there are different ways to publish the data.

Since SQL queries can do joins and aggregates, it's very possible to end up with data on the client which has a different schema than the table on the server. We'll talk about how to deal with that in some of the more complex cases listed below.

## Publishing a simple select on a table

If you just have some rows in your database that you want to use on the client, publishing the data is very simple, and the schema on the client will be the same as on the server.

<h3>With Knex</h3>

```js
// Define the table
Todos = new PG.Table("todos");

// Publish the data
Meteor.publish('todos', function(listId) {
  // Check arguments - note that IDs are integers
  check(listId, Match.Integer);

  // Build a query with Knex and return it
  return Todos.where("list_id", listId);
});
```

<h3>With raw query</h3>

Notice that when you don't use the query builder, you need to manually specify
the name of the table with `publishAs` so that Meteor knows what table to put the data in on the
client.

Read more here: [Knex raw queries](http://knexjs.org/#Raw-Queries).

```js
// Define the table
Todos = new PG.Table("todos");

// Publish the data
Meteor.publish('todos', function(listId) {
  // Check arguments - note that IDs are integers
  check(listId, Match.Integer);

  // Build a query with Knex and return it; you need to set the name of the
  // table manually
  return PG.knex.raw(
    "SELECT * FROM todos WHERE list_id=?",
    [listId]
  ).publishAs("todos");
});
```

## Publishing data with aggregate columns

If you want to add some extra rows to your database that are aggregates or join results, the schema of your table on the client will be different from that of the server.

Consider the following query:

```sql
select "lists".*, count(todos.id)::integer as incomplete_count
from "lists"
left join "todos" on
  "todos"."list_id" = "lists"."id" and
  "todos"."checked" = FALSE
where "user_id" is null
group by "lists"."id"
```

This selects rows from the `lists` table, and then adds an extra column called `incomplete_count` which contains the number of `todos` that aren't checked off.

In this case, on the client the published data will have one more column than the table on the server, so you should consider this when making queries on the client or server.

<h3>Publishing with Knex</h3>

Here is how you could write this query with Knex (it's a little ugly, I know):

```js
Meteor.publish("publicLists", function () {
  return Lists
    .select("lists.*", PG.knex.raw("count(todos.id)::integer as incomplete_count"))
    .where({user_id: null})
    .leftJoin("todos", function () {
      this.on("todos.list_id", "lists.id")
        .andOn("todos.checked", "=", PG.knex.raw("FALSE"));
    })
    .groupBy("lists.id")
    .from("lists");
})
```

<h3>Publishing with raw SQL query</h3>

Note that you can use ES2015 template strings to write multiline queries nicely. Also, Knex handles writing `is null` for you based on the object you pass to `.where()`, but in raw SQL you have to know ahead of time if the argument is going to be null or not.

```js
Meteor.publish("publicLists", function () {
  return PG.knex.raw(`
select "lists".*, count(todos.id)::integer as incomplete_count
from "lists"
left join "todos" on
  "todos"."list_id" = "lists"."id" and
  "todos"."checked" = FALSE
where "user_id" is null
group by "lists"."id"
  `).publishAs("lists");
})
```

## Publishing two different views on the same table

// XXX use publishAs to specify different table names for the client

