Migrations.add({
  version: 2,
  name: 'Create lists and todos',
  up: PG.wrapWithTransaction(() => {
    PG.await(PG.knex.schema.createTable("lists", (table) => {
      table.increments(); // integer id

      // XXX POSTGRES
      table.timestamp("created_at").defaultTo(PG.knex.raw('now()')).notNullable();

      // It's null if the list is public
      table.integer("user_id").nullable();
      table.string("name").defaultTo(PG.knex.raw("'List '||nextval('lists_id_seq')")).notNullable();
    }));

    PG.await(PG.knex.schema.createTable("todos", (table) => {
      table.increments(); // integer id

      // XXX POSTGRES
      table.timestamp("created_at").defaultTo(PG.knex.raw('now()')).notNullable();

      // It's null if the list is public
      table.integer("list_id").notNullable();
      table.string("text").notNullable();
      table.boolean("checked").notNullable();
    }));
  }),
  down: PG.wrapWithTransaction(() => {
    PG.await(PG.knex.schema.dropTable("lists"));
    PG.await(PG.knex.schema.dropTable("todos"));
  })
});

Migrations.runIfEnvSet();
