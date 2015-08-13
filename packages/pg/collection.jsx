const Future = Npm.require('fibers/future');

const knex = Npm.require('knex')({
  client: 'pg',
  connection: PG.defaultConnectionUrl
});

const bookshelf = Npm.require('bookshelf')(knex);

PG.Table = class Table {
  constructor(tableName, schemaFunc, relations) {
    this.model = bookshelf.Model.extend({
      tableName: tableName,
      ...relations
    });

    const exists = await(knex.schema.hasTable(tableName));

    if (!exists) {
      await(knex.schema.createTable(tableName, schemaFunc));
    }
  }
}

PG.knex = knex;

function await(promise) {
  var f = new Future();
  promise.then(
    Meteor.bindEnvironment(res => f.return(res)),
    Meteor.bindEnvironment(err => f.throw(err))
  );

  return f.wait();
}
