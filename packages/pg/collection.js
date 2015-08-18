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
                Knex.QueryBuilder.prototype;

QBProto._publishCursor = function (sub) {
  const queryStr = this.toString();
  const tableName = this._single.table;
  return new PG.Query(queryStr, tableName)._publishCursor(sub);
};

// a way for the Knex queries to actually run w/o promises
QBProto.run = function () {
  if (Meteor.isServer) {
    return PG.await(this);
  }

  const {
    collection,
    method,
    selector,
    modifier,
    projection,
    sort,
    limit,
    skip
  } = this.toMongoQuery();

  const options = {
    sort, limit, skip,
    fields: projection
  };

  if (! collection) {
    throw new Error('Specify the table to query. E.g.: PG.knex("table")...');
  }

  // run this query against local minimongo
  const minimongo = Mongo.Collection.get(collection);
  const args = [];

  if (! minimongo) {
    throw new Error('Specified table "' + collection + '" is not registered on the Client');
  }

  if (method === 'find') {
    args.push(selector, options);
  }
  if (method === 'insert') {
    args.push(modifier);
  }
  if (method === 'update') {
    args.push(selector, modifier, {multi: true});
  }
  if (method === 'remove') {
    args.push(selector);
  }

  // XXX will not work for things like "insert V into T returning *"
  const ret = minimongo[method](...args);
  return (method === 'find') ? ret.fetch() : ret;
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
    if (Meteor.isClient) {
      // XXX the client-side code doesn't support the relations
      relations = {};
    }

    this.model = bookshelf.Model.extend({
      tableName: tableName,
      ...relations
    });

    this.knex = function () {
      return PG.knex(tableName)
    };

    if (Meteor.isClient) {
      // register a minimongo store for this table
      this.minimongo = new Mongo.Collection(tableName);
    } else {
      const exists = PG.await(knex.schema.hasTable(tableName));

      if (!exists) {
        throw new Error(`Table '${tableName}' doesn't exist. Please create it in a migration.`);
      }
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
