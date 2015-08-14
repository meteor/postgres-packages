#! /bin/sh
echo "Make sure you have created a DB called 'test'!"
export POSTGRESQL_URL="postgres://127.0.0.1/test"
export PACKAGE_DIRS="$(dirname $0)/packages/"

echo $PACKAGE_DIRS

meteor --release METEOR@1.2-rc.3 test-packages \
  "$PACKAGE_DIRS/accounts-base-pg-driver"
