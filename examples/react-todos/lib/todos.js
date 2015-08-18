// Stuff below here is server-only
Todos = new PG.Table('todos');

if (Meteor.isClient) {
  return;
}

Meteor.methods({
  '/todos/delete': function (todoId) {
    Todos.knex.delete().where({id: todoId}).run();
  },
  '/todos/setChecked': function (todoId, checked) {
    Todos.knex.update({checked: checked}).where({id: todoId}).run();
  },
  '/todos/setText': function (todoId, newText) {
    Todos.knex.update({text: newText}).where({id: todoId}).run();
  }
});
