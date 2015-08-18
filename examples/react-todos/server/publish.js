Meteor.publish('publicLists', function() {
  return getListWhere({user_id: null});
});

Meteor.publish('privateLists', function() {
  if (this.userId) {
    return getListWhere({user_id: parseInt(this.userId, 10)});
  } else {
    this.ready();
  }
});

Meteor.publish('todos', function(listId) {
  check(listId, Match.Integer);

  return new PG.Query(
    PG.knex
      .select("*")
      .from("todos")
      .where("list_id", listId)
      .toString(),
    'todos');
});

function getListWhere(where) {
  return new PG.Query(
    PG.knex
      .select("lists.*", PG.knex.raw("count(todos.id)::integer as incomplete_count"))
      .where(where)
      .leftJoin("todos", function () {
        this.on("todos.list_id", "lists.id")
          .andOn("todos.checked", "=", PG.knex.raw("FALSE"));
      })
      .groupBy("lists.id")
      .from("lists")
      .toString(),
    'lists');
}
