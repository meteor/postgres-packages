Package.describe({
  name: 'env-migrations',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');
  api.addFiles('env-migrations.jsx', "server");
  api.use([
    'percolate:migrations@0.7.5',
    'jsx@0.1.5',
    'underscore'
  ], "server");

  api.export("Migrations");
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('env-migrations');
  api.addFiles('env-migrations-tests.js');
});
