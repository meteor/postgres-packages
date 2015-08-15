#! /bin/sh
export PACKAGE_DIRS="$(dirname $0)/packages/"

meteor --release METEOR@1.2-rc.3 test-packages \
  "$PACKAGE_DIRS/bookshelf"
