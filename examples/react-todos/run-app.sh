#! /bin/sh
echo "Make sure you have created a DB called 'todos', and that you have run the migrations in .knex/"
export POSTGRESQL_URL="postgres://127.0.0.1/todos"
export PACKAGE_DIRS="$(dirname $0)/../../packages/"
export MONGO_URL="nope"

cd "$(dirname $0)"

meteor "$@"
