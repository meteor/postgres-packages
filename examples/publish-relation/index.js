if (Meteor.isClient) {
  Template.body.helpers({
    posts() {
      return Posts.select();
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
}

Meteor.methods({
  "/posts/insertPost"() {
    if (! Meteor.userId()) { throw new Meteor.Error("must-log-in") }
    if (Meteor.isServer) {
      console.log('here');
      Meteor._sleepForMs(1000);
    }

    Posts.insert({
      content: Meteor.isServer ? "This is a post!" : "SIMULATION!!!11!!one",
      user_id: Meteor.userId()
    }).run();
  },
  "/comments/insertComment"(post_id) {
    if (! Meteor.userId()) { throw new Meteor.Error("must-log-in") }

    Comments.insert({
      content: "This is a comment!",
      user_id: Meteor.userId(),
      post_id: post_id
    }).run();
  }
});
