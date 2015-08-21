Todos = new PG.Table('todos');

// Stuff below here is server-only
if (Meteor.isClient) {
  return;
}

Meteor.methods({
  '/todos/delete': function (todoId) {
    Todos.delete().where({id: todoId}).run();
  },
  '/todos/setChecked': function (todoId, checked) {
    Todos.update({checked: checked}).where({id: todoId}).run();
  },
  '/todos/setText': function (todoId, newText) {
    Todos.update({text: newText}).where({id: todoId}).run();
  }
});
