Package.describe({
  name: 'simple:pg',
  version: '0.0.1',
  summary: 'XXX it almost does what you would expect',
  documentation: null
});

Npm.depends({
  'pg-live-select': 'https://github.com/Slava/pg-live-select/tarball/fc443165b070572238a124d100ca7fe6dbb7313e',
  'pg': '4.4.1',
  'bookshelf': '0.8.1',
  'knex': '0.8.6'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  api.use([
    'random',
    'ejson',
    'underscore',
    'jsx'
  ], 'server');

  api.addFiles([
    'pg.js',
    'collection.jsx'
  ], 'server');

  api.export('PG', 'server');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('simple:pg');
  api.addFiles('pg-tests.js');
});
