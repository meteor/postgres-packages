if (Meteor.isServer) {
  // hack so Knex from simple:bookshelf doesn't try to load 'pg'
  Knex.Client.prototype.initializeDriver = function () {
    this.driver = PG._npmModule;
  };
}

const knex = Knex(Meteor.isServer ? {
  client: 'pg',
  connection: PG.defaultConnectionUrl
} : null);

// the prototype of the chained query builder from knex
const QBProto = Meteor.isServer ?
                Knex.Client.prototype.QueryBuilder.prototype :
                Knex.QueryBuilder;

QBProto._publishCursor = function (sub) {
  const queryStr = this.toString();
  const tableName = this._single.table;
  return new PG.Query(queryStr, tableName)._publishCursor(sub);
};

const bookshelf = Bookshelf(knex);
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

    if (Meteor.isClient) return this;

    const exists = PG.await(knex.schema.hasTable(tableName));

    if (!exists) {
      throw new Error(`Table '${tableName}' doesn't exist. Please create it in a migration.`);
    }
  }
}

PG.knex = knex;
PG.await = null;

if (Meteor.isServer) {
  const Future = Npm.require('fibers/future');
  function await(promise) {
    var f = new Future();
    promise.then(
      Meteor.bindEnvironment(res => f.return(res)),
      Meteor.bindEnvironment(err => f.throw(err))
    );

    return f.wait();
  }
  PG.await = await;
} else {
  // XXX will only work with the methods of Bookshelf as they use the
  // version of BlueBird that we supplied over a transform with exposify.
  PG.await = window.__Sync_BlueBird.await;
}
