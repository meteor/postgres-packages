if (Meteor.isClient) {
  // Stuff below here is server-only
  Lists = new PG.Table('lists');
  return;
}

Meteor.methods({
  '/lists/add': function () {
    return PG.knex("lists").insert({}).returning("id").run()[0];
  },
  '/lists/updateName': function (listId, newName) {
    PG.knex("lists").update({name: newName}).where({id: listId}).run();
  },
  '/lists/togglePrivate': function (listId) {
    var list = PG.knex("lists").where({id: listId}).run()[0];

    if (! Meteor.userId()) {
      throw new Meteor.Error("not-logged-in");
    }

    console.log(list);
    if (list.user_id) {
      console.log("setting user id to null");
      PG.knex("lists").where({id: listId}).update({user_id: null}).run();
    } else {
      // ensure the last public list cannot be made private
      if (! list.user_id && PG.knex("lists").count("*").whereNull("user_id").run()[0].count == 1) {
        throw new Meteor.Error("final-list-private");
      }

      PG.knex("lists").where({id: listId}).update({user_id: Meteor.userId()}).run();
    }
  },
  '/lists/delete': function (listId) {
    var list = PG.knex("lists").where({id: listId}).run()[0];

    // ensure the last public list cannot be deleted.
    if (! list.user_id && PG.knex("lists").count("*").whereNull("user_id").run()[0].count == 1) {
      throw new Meteor.Error("final-list-delete");
    }

    PG.inTransaction(() => {
      // Make sure to delete all of the items
      PG.knex("todos").where({list_id: listId}).delete().run();

      // Delete the list itself
      PG.knex("lists").where({id: listId}).delete().run();
    });
  },
  '/lists/addTask': function (listId, newTaskText) {
    PG.knex("todos").insert({
      list_id: listId,
      text: newTaskText,
      checked: false
    }).run();

    // Lists.update(listId, {$inc: {incompleteCount: 1}});
  }
});
