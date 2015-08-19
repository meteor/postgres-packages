# Migrations with Knex

To run migrations on our database, we will use the [Knex CLI](http://knexjs.org/#Migrations-CLI).

## Setting up

First, create a `.knex` directory in your repo. Putting a period at the beginning of the directory name will tell Meteor to ignore it, so that we can put custom scripts in here.

```sh
mkdir .knex
cd .knex
```

Then, install Knex and dependencies:

```sh
# Command line tool
npm install -g knex

# Local Knex and Postgres driver
npm install --save knex pg
```

Finally, initialize Knex:

```sh
knex init
```

XXX set up the `knexfile.js` with your database config - how is this supposed to work??
XXX create database

All Knex commands below should be run inside this `.knex` directory.

## Creating a migration

To create a migration, first create a timestamped migration file with Knex:

```sh
knex migrate:make my_migration_name
```

Then, edit the file to write your migration, using the [Knex schema builder API](http://knexjs.org/#Schema). Here's an example:

```js
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable("lists", function (table) {
      table.increments(); // integer id

      table.timestamp("created_at").defaultTo(knex.raw('now()')).notNullable();

      // It's null if the list is public
      table.integer("user_id").nullable();

      // The name will be the same as the ID
      table.string("name").defaultTo(knex.raw("'List '||currval('lists_id_seq')")).notNullable();
    }),

    knex.schema.createTable("todos", function (table) {
      table.increments(); // integer id

      table.timestamp("created_at").defaultTo(knex.raw('now()')).notNullable();

      // It's null if the list is public
      table.integer("list_id").notNullable();
      table.string("text").notNullable();
      table.boolean("checked").notNullable();
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("lists"),
    knex.schema.dropTable("todos")
  ]);
};
```

## Running migrations

Before running any migrations, make sure you have created a Postgres database for your app and specified the correct database name, username, and password in your configuration file.

To migrate to the latest version, run:

```sh
knex migrate:latest
```

To roll back the latest migration:

```sh
knex migrate:rollback
```

To print the most recent migration performed:

```sh
knex migrate:currentVersion
```



