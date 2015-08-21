Package.describe({
  name: 'simple:pg',
  version: '0.0.1',
  summary: 'XXX it almost does what you would expect',
  documentation: null
});

Npm.depends({
  'pg-live-select': 'https://github.com/Slava/pg-live-select/tarball/fc443165b070572238a124d100ca7fe6dbb7313e',
  'pg': '4.4.1',
  'murmurhash-js': '1.0.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  // PACKAGE DEPENDENCIES
  api.use([
    'ecmascript',
    'simple:bookshelf'
  ]);

  api.use([
    'random',
    'ejson',
    'underscore',
    'jsx'
  ], 'server');

  api.use([
    'dburles:mongo-collection-instances',
    'mongo'
  ], 'client');

  // ADD FILES
  api.addFiles([
    'pre.js',
    'transaction.js'
  ]);

  api.addFiles([
    'pg.js',
    'collection-server.js'
  ], 'server');

  api.addFiles([
    'collection-client.js'
  ], 'client')

  // Needs to be loaded last, uses setup from client or server
  api.addFiles([
    'collection.js'
  ]);

  // EXPORT
  api.export('PG');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('simple:pg');
  api.addFiles('pg-tests.js');

  api.use('ecmascript');

  api.use('random');
  api.use('underscore');
  api.addFiles(['observe-driver/polling-driver.js'], 'server');
  api.addFiles(['observe-driver/tests.js'], 'server');
  api.addFiles([
    'observe-driver/setup-triggers.sql',
    'observe-driver/poll-n-diff.sql',
    'observe-driver/poll.sql'
  ], 'server', {isAsset: true});
});
