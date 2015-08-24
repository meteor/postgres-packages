# Setting up the database and running migrations

With MongoDB, Meteor automatically sets up and runs the database for you, and you don't need any migrations because there is no schema. With Postgres, we haven't yet built functionality to install and run the database for you, and you will definitely need migrations.

## Installing and running PostgreSQL

Currently, we only have directions for Mac OS and Windows. Please add more for other systems!

### On Mac

The easiest way to install Postgres on a Mac is with [Homebrew](http://brew.sh/):

```sh
brew install postgresql
```

Initialize postgres with a data directory:

```sh
initdb /usr/local/var/postgres -E utf8
```

Running the database:

```sh
postgres -D /usr/local/var/postgres
```

### On Windows

The officially recommended installation method for PostgreSQL on Windows is with the installer from [EnterpriseDB](http://www.enterprisedb.com/products-services-training/pgdownload#windows).

The installer automatically initializes the data directory and registers PostgreSQL as a Windows Service.

You can also install the graphical management interface PGAdmin III using the same installer.

## Creating and deleting databases

You will want to create a new database for each new app. Do this with the `createdb` command:

```sh
createdb todos
```

You can drop the database if you screw something up or want to free disk space:

```sh
dropdb todos
```

## Running Postgres console

To connect to your database with a SQL console, run:

```sh
psql todos
```

For this command to work, your local Postgres server needs to be running, as described in "Running the database" above.

## Migrations

To run migrations on our database, we will use the [Knex CLI](http://knexjs.org/#Migrations-CLI).

### Setting up

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

Now, you can either set up `knexfile.js` with your database information, or replace it with a file that just loads the information from an environment variable, like so:

```js
// knexfile.js
module.exports = {
  client: 'pg',
  connection: process.env.POSTGRESQL_URL
};
```

This is the same environment variable that Meteor uses to find your database.

All Knex commands below should be run inside the `.knex` directory we just created.

### Creating a migration

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

### Running migrations

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



