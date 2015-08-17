if (Meteor.isClient) {
  // Stuff below here is server-only
  Todos = new Mongo.Collection('todos');
  return;
}

Meteor.methods({
  '/todos/delete': function (todoId) {
    PG.await(PG.knex("todos").delete().where({id: todoId}));

    // We would want the below for optimistic UI
    // if (! todo.checked) {
    //   Lists.update(todo.listId, {$inc: {incompleteCount: -1}});
    // }
  },
  '/todos/setChecked': function (todoId, checked) {
    PG.await(PG.knex("todos").update({checked: checked}).where({id: todoId}));

    // We would want the below for optimistic UI
    // Lists.update(todo.listId, {$inc: {incompleteCount: checked ? -1 : 1}});
  },
  '/todos/setText': function (todoId, newText) {
    PG.await(PG.knex("todos").update({text: newText}).where({id: todoId}));
  }
});
