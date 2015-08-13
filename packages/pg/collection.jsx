const Future = Npm.require('fibers/future');

const Knex = Npm.require('knex');
const knex = Knex({
  client: 'pg',
  connection: PG.defaultConnectionUrl
});

// the prototype of the chained query builder from knex
const QBProto = Knex.Client.prototype.QueryBuilder.prototype;
QBProto._publishCursor = function (sub) {
  const queryStr = this.toString();
  const tableName = this._single.table;
  return new PG.Query(queryStr, tableName)._publishCursor(sub);
};

const bookshelf = Npm.require('bookshelf')(knex);
const origModelForge = bookshelf.Model.forge;
bookshelf.Model.forge = function () {
  const ret = origModelForge.apply(this, arguments);
  // monkey-patch forge, so we can make simple queries
  // originated from Model publishable
  ret._publishCursor = function (sub) {
    return this._knex._publishCursor(sub);
  };
  return ret;
};

PG.Table = class Table {
  constructor(tableName, relations) {
    this.model = bookshelf.Model.extend({
      tableName: tableName,
      ...relations
    });

    const exists = await(knex.schema.hasTable(tableName));

    if (!exists) {
      throw new Error(`Table '${tableName}' doesn't exist. Please create it in a migration.`);
    }
  }
}

PG.knex = knex;
PG.await = await;

function await(promise) {
  var f = new Future();
  promise.then(
    Meteor.bindEnvironment(res => f.return(res)),
    Meteor.bindEnvironment(err => f.throw(err))
  );

  return f.wait();
}
