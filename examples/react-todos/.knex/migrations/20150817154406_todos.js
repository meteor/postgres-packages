
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable("lists", function (table) {
      table.increments(); // integer id

      // XXX POSTGRES
      table.timestamp("created_at").defaultTo(knex.raw('now()')).notNullable();

      // It's null if the list is public
      table.integer("user_id").nullable();

      // The name will be the same as the ID
      table.string("name").defaultTo(knex.raw("'List '||currval('lists_id_seq')")).notNullable();
    }),

    knex.schema.createTable("todos", function (table) {
      table.increments(); // integer id

      // XXX POSTGRES
      table.timestamp("created_at").defaultTo(knex.raw('now()')).notNullable();

      // It's null if the list is public
      table.integer("list_id").notNullable();
      table.string("text").notNullable();
      table.boolean("checked").notNullable();
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("lists"),
    knex.schema.dropTable("todos")
  ]);
};
