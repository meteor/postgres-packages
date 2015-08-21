class List extends PG.Model {
  todos() {
    return Todos.where({list_id: this.id});
  }
}

Lists = new PG.Table('lists', {
  modelClass: List
});

Meteor.methods({
  '/lists/add': function () {
    return Lists.insert({}).returning("id").run()[0];
  },
  '/lists/updateName': function (listId, newName) {
    Lists.update({name: newName}).where({id: listId}).run();
  },
  '/lists/addTask': function (listId, newTaskText) {
    const todo = {
      list_id: listId,
      text: newTaskText,
      checked: false
    };

    if (this.isSimulation) {
      // Since the database generates the timestamp, we need to do it manually
      // in the simulation
      todo.created_at = new Date();

      // Since this field is generated via a join, we have to update it manually
      // on the client
      Lists.where("id", listId).increment("incomplete_count", 1).run();
    }

    Todos.insert(todo).run();
  }
});

if (Meteor.isClient) {
  // Stuff below here is server-only
  return;
}

Meteor.methods({
  '/lists/togglePrivate': function (listId) {
    var list = Lists.where({id: listId}).run()[0];

    if (! Meteor.userId()) {
      throw new Meteor.Error("not-logged-in");
    }

    if (list.user_id) {
      Lists.where({id: listId}).update({user_id: null}).run();
    } else {
      // ensure the last public list cannot be made private
      if (! list.user_id && Lists.count("*").whereNull("user_id").run()[0].count == 1) {
        throw new Meteor.Error("final-list-private");
      }

      Lists.where({id: listId}).update({user_id: Meteor.userId()}).run();
    }
  },
  '/lists/delete': function (listId) {
    var list = Lists.where({id: listId}).run()[0];

    // ensure the last public list cannot be deleted.
    if (! list.user_id && Lists.count("*").whereNull("user_id").run()[0].count == 1) {
      throw new Meteor.Error("final-list-delete");
    }

    PG.inTransaction(() => {
      // Make sure to delete all of the items
      Todos.where({list_id: listId}).delete().run();

      // Delete the list itself
      Lists.where({id: listId}).delete().run();
    });
  }
});
