
exports.up = function(knex, Promise) {
  return Promise.all([
    knex.schema.createTable("comments", function (table) {
      table.increments();
      table.timestamps();

      table.integer("user_id");
      table.integer("post_id");

      table.string("content");
    }),
    knex.schema.createTable("posts", function (table) {
      table.increments();
      table.timestamps();

      table.integer("user_id");

      table.string("content");
    })
  ]);
};

exports.down = function(knex, Promise) {
  return Promise.all([
    knex.schema.dropTable("comments"),
    knex.schema.dropTable("posts")
  ]);
};
