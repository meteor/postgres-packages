<h1>Running SQL queries with Knex</h1>

We expect that most people will want to write queries using a JavaScript query builder rather than raw SQL strings. This gives you a few benefits:

1. It can work on the server and the client - our [client-side cache](client.md) doesn't know how to run raw SQL
2. You don't need to write `SELECT` and the name of the table every time
3. You can get syntax highlighting and more structure to your queries
4. You can use the chaning syntax to create partial queries, then pass them around and add more clauses as you go

## Defining a Table

Just like Meteor has `Mongo.Collection` for MongoDB collections, we have built `PG.Table`:

```js
// Works on client and server
Todos = new PG.Table("todos");
```

This will represent a single table either in your server-side Postgres database, or in your client cache.

## Running simple queries with Knex

A basic select on id:

```js
Todos.where("id", 3).fetch();
// SELECT * FROM todos WHERE id=3;
```

Note that the default operator is `SELECT`. So if you want to just get all of the items in a table, you can simply run `Todos.fetch()`.

A basic insert:

```js
Todos.insert({ text: "This is a todo item."}).run();
```

Note that `fetch` and `run` both execute queries. You can just use `run` everywhere if you choose, but `fetch` will throw an error if you are about to modify the database. Use `fetch` for reads to avoid accidentally writing to the database.

## Getting back the ID of inserted items with .returning()

```js
// Only works on the server
const ids = Todos.insert([
  { text: "This is a todo item."},
  { text: "This is another todo item."},
  { text: "This is one more todo item."}
]).returning("id").run();

console.log(ids);
// [1, 2, 3]
```

## Summary of additions to Knex

2. The `run` and `fetch` methods are new. They always run synchronously using Fibers on the server. (The default Knex API uses promises)
3. On the client, `run` and `fetch` generate Minimongo queries under the hood and run them synchronously.
3. We have implemented all relevant Mongo cursor methods, so you can pass around Knex queries just like you would a cursor. This means that if you are using Blaze to render your views, you can have your helper just return the cursor without calling `run` or `fetch`.

## Knex docs

Read more about how to use Knex in the [Knex docs](http://knexjs.org/). Let us know if there are some thing that don't work, or if we failed to document some differences.
