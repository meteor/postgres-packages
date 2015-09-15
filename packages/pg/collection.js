const bookshelf = Bookshelf(PG.knex);
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
  constructor(tableName, options = {}) {
    this.knex = function () {
      return PG.knex(tableName)
    };

    // Should be applied via transform
    // Not sure how to do this on the server
    this.modelClass = options.modelClass;

    if (Meteor.isClient) {
      const minimongoOptions = {};
      if (this.modelClass) {
        minimongoOptions.transform = (doc) => {
          // Maybe we can make this more efficient later, now that we know the
          // transform is specific
          return new this.modelClass(doc);
        };
      }

      // register a minimongo store for this table
      this.minimongo = new Mongo.Collection(tableName, minimongoOptions);
    } else {
      const exists = PG.await(PG.knex.schema.hasTable(tableName));

      if (exists) {
        // autopublish (options._preventAutopublish for possible future use)
        if (Package.autopublish && !options._preventAutopublish) {
          Meteor.publish(null, () => {
            return this.knex();
          }, {
            is_auto: true
          });
        }
      } else {
        throw new Error(`Table '${tableName}' doesn't exist. Please create it in a migration.`);
      }
    }
  }
}

// Get the prototype of the query builder
const QBProto = Meteor.isClient ?
  Knex.QueryBuilder.prototype :
  Knex.Client.prototype.QueryBuilder.prototype;

// Addresses https://github.com/meteor/postgres-packages/issues/9
QBProto.fetchOne = function fetchOne() {
  return QBProto.fetch.call(this)[0];
};

// Addresses https://github.com/meteor/postgres-packages/issues/9
QBProto.fetchValue = function fetchValue(column) {
  const row = QBProto.fetch.call(this)[0];
  if ('undefined' === typeof column) {
    let keys = Object.keys(row);
    if (keys.length === 1) {
      return row[keys[0]];
    } else {
      throw new Error("fetchValue(): query returned more than one column.");
    }
  } else if ('string' === typeof column) {
    if ('undefined' === typeof row[column]) {
      throw new Error("fetchValue(column): column '" + column + "' does not exist.");
    } else {
      return row[column];
    }
  } else {
    throw new Error("fetchValue(column): column must be a string.");
  }
};

// Proxy all query builder methods; so when you type MyTable.select() it does
// MyTable.knex().select()
const methods = Object.getOwnPropertyNames(QBProto);
methods.forEach((methodName) => {
  PG.Table.prototype[methodName] = function (...args) {
    const qb = this.knex();
    return qb[methodName].apply(qb, args);
  };
});
