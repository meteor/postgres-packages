Meteor.publish('publicLists', function() {
  return Lists.find({userId: {$exists: false}});
});

Meteor.publish('privateLists', function() {
  if (this.userId) {
    return Lists.find({userId: parseInt(this.userId, 10)});
  } else {
    this.ready();
  }
});

Meteor.publish('todos', function(listId) {
  check(listId, String);

  return Todos.find({listId: listId});
});
