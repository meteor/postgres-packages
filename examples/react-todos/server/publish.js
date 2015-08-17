Meteor.publish('publicLists', function() {
  return new PG.Query(
    PG.knex
      .select("*")
      .from("lists")
      .where("user_id", null)
      .toString(),
    'lists');
});

Meteor.publish('privateLists', function() {
  if (this.userId) {
    return new PG.Query(
      PG.knex
        .select("*")
        .from("lists")
        .where("user_id", parseInt(this.userId, 10))
        .toString(),
      'lists');
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
