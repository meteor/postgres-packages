if (Meteor.isClient) {
  // Stuff below here is server-only
  Lists = new Mongo.Collection('lists');
  return;
}

Meteor.methods({
  '/lists/add': function () {
    return PG.await(PG.knex("lists").insert({}).returning("id"))[0];
  },
  '/lists/updateName': function (listId, newName) {
    PG.await(PG.knex("lists").update({name: newName}).where({id: listId}));
  },
  '/lists/togglePrivate': function (listId) {
    var list = PG.await(PG.knex("lists").where({id: listId}))[0];

    if (! Meteor.userId()) {
      throw new Meteor.Error("not-logged-in");
    }

    console.log(list);
    if (list.user_id) {
      console.log("setting user id to null");
      PG.await(PG.knex("lists").where({id: listId}).update({user_id: null}));
    } else {
      // ensure the last public list cannot be made private
      if (! list.user_id && PG.await(PG.knex("lists").count("*").whereNull("user_id"))[0].count == 1) {
        throw new Meteor.Error("final-list-private");
      }

      PG.await(PG.knex("lists").where({id: listId}).update({user_id: Meteor.userId()}));
    }
  },
  '/lists/delete': function (listId) {
    var list = PG.await(PG.knex("lists").where({id: listId}))[0];

    // ensure the last public list cannot be deleted.
    if (! list.user_id && PG.await(PG.knex("lists").count("*").whereNull("user_id"))[0].count == 1) {
      throw new Meteor.Error("final-list-delete");
    }

    PG.inTransaction(() => {
      // Make sure to delete all of the items
      PG.await(PG.knex("todos").where({list_id: listId}).delete());

      // Delete the list itself
      PG.await(PG.knex("lists").where({id: listId}).delete());
    });
  },
  '/lists/addTask': function (listId, newTaskText) {
    PG.await(PG.knex("todos").insert({
      list_id: listId,
      text: newTaskText,
      checked: false
    }));

    // Lists.update(listId, {$inc: {incompleteCount: 1}});
  }
});
