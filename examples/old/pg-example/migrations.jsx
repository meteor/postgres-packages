if (Meteor.isServer) {
  Migrations.add({
    version: 1,
    name: 'Create posts and comments table',
    up: PG.wrapWithTransaction(function() {
      PG.await(PG.knex.schema.createTable("posts", (table) => {
        table.increments(); // id
        table.string("title");
      }));

      PG.await(PG.knex.schema.createTable("comments", (table) => {
        table.increments(); // id
        table.string("text");
        table.integer("post_id");
      }));
    }),
    down: PG.wrapWithTransaction(function() {
      PG.await(PG.knex.schema.dropTable("posts"));
      PG.await(PG.knex.schema.dropTable("comments"));
    })
  });

  Migrations.add({
    version: 2,
    name: 'Create fake posts and comments data',
    up: PG.wrapWithTransaction(function() {
      _.range(1, 5).forEach((postIndex) => {
        const ids = PG.await(PG.knex.table("posts")
          .insert({title: `Fake post ${postIndex}`}, "id"));

        _.range(1, 5).forEach((commentIndex) => {
          PG.await(PG.knex.table("comments")
            .insert({
              text: `Fake comment ${commentIndex} on post ${postIndex}`,
              post_id: ids[0]
            }));
        });
      });
    }),
    down: function() {
      // LOL not implemented
    }
  });

  Migrations.runIfEnvSet();
}
