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
        throw new Error(`PG: no such table`, `Table '${tableName}' doesn't exist. Please create it in a migration.`);
      }
    }
  }
}

// Get the prototype of the query builder
const QBProto = Meteor.isClient ?
  Knex.QueryBuilder.prototype :
  Knex.Client.prototype.QueryBuilder.prototype;

// Addresses https://github.com/meteor/postgres-packages/issues/9
// Fetches the first row of a select query.
QBProto.fetchOne = function fetchOne() {
  const rows = QBProto.fetch.call(this);
  if (rows.length === 0) {
    return; //                                            It may not be ready yet, so return undefined
  } else {
    return rows[0];
  }
};

// Addresses https://github.com/meteor/postgres-packages/issues/9
// If one column is returned by the query fetchValue() gets it.
// If more than one column is returned, use fetchValue(columnName) to get it.
QBProto.fetchValue = function fetchValue(column) {
  const row = QBProto.fetchOne.call(this);
  if (_.isUndefined(row)) {
    return; //                                            Early return if undefined.
  }
  if (_.isUndefined(column)) { //                         If no column was requested ...
    const keys = Object.keys(row);
    if (keys.length === 1) { //                           we only expect one in the response.
      return row[keys[0]];
    } else {
      throw new Error(`PG: fetchValue too many columns`, `fetchValue(): query returned more than one column.`);
    }
  } else if (_.isString(column)) { //                     If a column was requested ...
    if (_.isUndefined(row[column])) { //                  we expect it to be there
      return; //                                          It may not be ready yet, so return undefined.
    } else {
      return row[column]; //                              and we return it if it is.
    }
  } else {
    throw new Error(`PG: fetchValue parameter not string`, `fetchValue(column): column must be a string.`);
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
