if (Meteor.isClient) {
  Template.body.helpers({
    posts() {
      return Posts.knex().run();
    }
  });

  Template.body.events({
    "click .add-post"() {
      Meteor.call("/posts/insertPost", (err) => { err && alert(err) });
    },
    "click .add-comment"() {
      Meteor.call("/comments/insertComment", this.id, (err) => { err && alert(err) });
    }
  });
} else {
  Meteor.methods({
    "/posts/insertPost"() {
      if (! Meteor.userId()) { throw new Meteor.Error("must-log-in") }

      Posts.knex().insert({
        content: "This is a post!",
        user_id: Meteor.userId()
      }).run();
    },
    "/comments/insertComment"(post_id) {
      if (! Meteor.userId()) { throw new Meteor.Error("must-log-in") }

      Comments.knex().insert({
        content: "This is a comment!",
        user_id: Meteor.userId(),
        post_id: post_id
      }).run();
    }
  })
}
