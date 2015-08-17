#! /bin/sh
echo "Make sure you have created a DB called 'todos'!"
export POSTGRESQL_URL="postgres://127.0.0.1/todos"
export PACKAGE_DIRS="$(dirname $0)/../../packages/"

cd "$(dirname $0)"

meteor "$@"
