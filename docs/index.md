# Use PostgreSQL with Meteor

Welcome to the first full-stack implementation of SQL for Meteor.

This is still a work in progress, and there is [a lot left to do](contribute.md), but we're really excited about what we have so far and wanted to share it. Some parts of the implementation are more reliable and stable than others, and we would love to have more help to add tests, detailed documentation, and new features.

## Concepts

This is the simplest possible implementation of using a SQL database, specifically PostgreSQL, that we could come up with. The experience is not yet 100% seamless, and you have to put in some manual work for migrations, etc. Here are some core aspects to the design:

1. It is currently built around a monkey-patched and extended version of the excellent [Knex query builder library](http://knexjs.org/).
1. You can **publish any SQL query** from the server to the client using `Meteor.publish`. The data that ends up on the client is exactly the rows that are returned from the query. Read more here: [publishing data](publish.md)
1. You can only **run queries on the client** using the Knex query builder, which we have patched to enable specific query operators only. Read more here: [client-side queries](client.md)
1. For simple Meteor methods, you can **write your code once using Knex**, and you will get automatic optimistic UI. For complex methods, you will need to write separate code for the optimistic UI update, or just have your method run only on the server. Read more here: [methods](methods.md)

## Running the react-todos example app

First, [install PostgreSQL](migrations.md#installing-and-running-postgresql). Then, run the commands below:

```bash
# Clone this repository
git clone https://github.com/meteor/postgres-packages.git

# Set up Knex CLI tool
cd postgres-packages/examples/react-todos/.knex/
npm install -g knex
npm install

# Create database and run migrations
createdb todos
knex migrate:latest

# Run the app
cd ..
./run-app.sh
```

## Setting up an app startup script

Our example apps each contain a script called `run-app.sh`, which sets up some of the environment variables you need. You will probably want to create your own script if you are starting a new app, with a different `POSTGRESQL_URL`.

Here's the script explained:

```bash
#! /bin/sh

# Remind the user to set up the database
echo "Make sure you have created a DB called 'todos', and that you have run the migrations in .knex/"

# Set up environment variables:

# URL for the database
export POSTGRESQL_URL="postgres://127.0.0.1/todos"

# Directory with cloned Postgres packages from this repo
export PACKAGE_DIRS="$(dirname $0)/../../packages/"

# Fake MONGO_URL so that Meteor doesn't start MongoDB for us
export MONGO_URL="nope"

# Go to the app's directory in case we ran the script from somewhere else
cd "$(dirname $0)"

# Run the app, and pass through any arguments passed to the script
meteor "$@"
```

