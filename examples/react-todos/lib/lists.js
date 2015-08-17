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
    var list = Lists.findOne(listId);

    if (! Meteor.user()) {
      throw new Meteor.Error("not-logged-in");
    }

    if (list.userId) {
      Lists.update(list._id, {$unset: {userId: true}});
    } else {
      // ensure the last public list cannot be made private
      if (Lists.find({userId: {$exists: false}}).count() === 1) {
        throw new Meteor.Error("final-list-private");
      }

      Lists.update(list._id, {$set: {userId: Meteor.userId()}});
    }
  },
  '/lists/delete': function (listId) {
    var list = Lists.findOne(listId);

    // ensure the last public list cannot be deleted.
    if (! list.userId && Lists.find({userId: {$exists: false}}).count() === 1) {
      throw new Meteor.Error("final-list-delete");
    }

    // Make sure to delete all of the items
    Todos.remove({listId: list._id});

    // Delete the list itself
    Lists.remove(list._id);
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
