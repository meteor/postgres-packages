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

      if (!exists) {
        throw new Error(`Table '${tableName}' doesn't exist. Please create it in a migration.`);
      }
    }
  }
}
