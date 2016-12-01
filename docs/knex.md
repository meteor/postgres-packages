<h1>Running SQL queries with Knex</h1>

We expect that most people will want to write queries using a JavaScript query builder rather than raw SQL strings. This gives you a few benefits:

1. It can work on the server and the client - our [client-side cache](client.md) doesn't know how to run raw SQL
2. You don't need to write `SELECT` and the name of the table every time
3. You can get syntax highlighting and more structure to your queries
4. You can use the chaining syntax to create partial queries, then pass them around and add more clauses as you go

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

You can print out all the records from the cursor:
```
var records = Todos.fetch();
for (var x in records) {
  console.log(records[x]);
}
```

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

### run() and fetch()

The `run` and `fetch` methods are new. They always run synchronously using Fibers on the server. (The default Knex API uses promises).

On the client, `run` and `fetch` generate Minimongo queries under the hood and run them synchronously.

We have implemented all relevant Mongo cursor methods, so you can pass around Knex queries just like you would a cursor. This means that if you are using Blaze to render your views, you can have your helper just return the cursor without calling `run` or `fetch`:

    Template.myTemplate.helpers({
      states: function() {
        return States.select('state', 'capital', 'abbr').orderBy('state', 'desc');
      }
    });

Then, in your template:

    <template name="myTemplate">
      <ul>
      {{#each states}}
        <div>({{abbr}}) - {{state}} - {{capital}}</div>
      {{/each}}
      </ul>
    </template>

### fetchOne()

`fetchOne()` fetches the first row of a query:

    States.select('state', 'capital', 'abbr').orderBy('state', 'desc').fetch();

(Equivalent to `SELECT state, capital, abbr FROM states ORDER BY state DESC`) which
returns:

    [
      {state: 'Wyoming', capital: 'Cheyenne', abbr: 'WY'},
      {state: 'Wisconsin', capital: 'Madison', abbr: 'WI'},
      {state: 'West Virginia', capital: 'Charleston', abbr: 'WV'},
      {state: 'Washington', capital: 'Olympia', abbr: 'WA'},
      ...
    ]

Then, `States.select('state', 'capital', 'abbr').orderBy('state', 'desc').fetchOne();`

returns `{state: 'Wyoming', capital: 'Cheyenne', abbr: 'WY'}`

#### fetchOne Exceptions

Exceptions may be thrown by this method. Any exceptions will be of the standard Javascript form of an Error
object containing `name` and `message` properties, as produced with `throw new Error()`. Some exceptions may
be thrown by methods called by `fetchOne`.

| name | message |
|----- | ------- |
| PG: fetch must be select | Can only call fetch/fetchOne/fetchValue on select queries. |

`fetchOne` will return `undefined` if the select returns no rows or if the subscription is not ready.

### fetchValue([column])

`fetchValue(column)` returns the value of the specified column of a `fetchOne()`, so based on the `fetchOne()`
example, above:

    States.select('state', 'capital', 'abbr').orderBy('state', 'desc').fetchValue('abbr');

returns `'WY'`.

`fetchValue()` may be used to get the value of a query which returns a single, possibly "column-less" result:

    States.count('*').fetchValue();

returns `'50'` (note that `count()` in Postgres returns a BIGINT, which is cast to a string to ensure precision).
If your counts lie in the representable range for integers in Javascript (integers with an absolute value below
9007199254740993), you can cast these as numbers:

    const numStates = +States.count('*').fetchValue(); // numStates = 50

#### fetchValue Exceptions

Exceptions may be thrown by this method. Any exceptions will be of the standard Javascript form of an Error
object containing `name` and `message` properties, as produced with `throw new Error()`. Some exceptions may
be thrown by methods called by `fetchValue`.

| name | message |
|----- | ------- |
| PG: fetch must be select | Can only call fetch/fetchOne/fetchValue on select queries. |
| PG: fetchValue too many columns | fetchValue(): query returned more than one column. |
| PG: fetchValue parameter not string | fetchValue(column): column must be a string. |

`fetchValue` will return `undefined` if the select returns no rows, or the column name cannot be found or
if the subscription is not ready.

## Knex docs

Read more about how to use Knex in the [Knex docs](http://knexjs.org/). Let us know if there are some thing that don't work, or if we failed to document some differences.
