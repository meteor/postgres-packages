Lists = new PG.Table('lists');

if (Meteor.isClient) {
  // Stuff below here is server-only
  return;
}

Meteor.methods({
  '/lists/add': function () {
    return Lists.knex().insert({}).returning("id").run()[0];
  },
  '/lists/updateName': function (listId, newName) {
    Lists.knex().update({name: newName}).where({id: listId}).run();
  },
  '/lists/togglePrivate': function (listId) {
    var list = Lists.knex().where({id: listId}).run()[0];

    if (! Meteor.userId()) {
      throw new Meteor.Error("not-logged-in");
    }

    if (list.user_id) {
      Lists.knex().where({id: listId}).update({user_id: null}).run();
    } else {
      // ensure the last public list cannot be made private
      if (! list.user_id && Lists.knex().count("*").whereNull("user_id").run()[0].count == 1) {
        throw new Meteor.Error("final-list-private");
      }

      Lists.knex().where({id: listId}).update({user_id: Meteor.userId()}).run();
    }
  },
  '/lists/delete': function (listId) {
    var list = Lists.knex().where({id: listId}).run()[0];

    // ensure the last public list cannot be deleted.
    if (! list.user_id && Lists.knex().count("*").whereNull("user_id").run()[0].count == 1) {
      throw new Meteor.Error("final-list-delete");
    }

    PG.inTransaction(() => {
      // Make sure to delete all of the items
      Todos.knex().where({list_id: listId}).delete().run();

      // Delete the list itself
      Lists.knex().where({id: listId}).delete().run();
    });
  },
  '/lists/addTask': function (listId, newTaskText) {
    Todos.knex().insert({
      list_id: listId,
      text: newTaskText,
      checked: false
    }).run();

    // Lists.update(listId, {$inc: {incompleteCount: 1}});
  }
});
