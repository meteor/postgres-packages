if (Meteor.isClient) {
  var Things = new Mongo.Collection('things');
  Template.hello.helpers({
    posts: function () {
      return Things.find();
    },
    post: function () {
      return JSON.stringify(this, null, 2);
    }
  });

  Meteor.subscribe('mypub');
}

if (Meteor.isServer) {
  Meteor.publish('mypub', function () {
    return new PG.Query([
      'SELECT posts.*, array_to_json(array_agg(comments.*)) as comments',
      'FROM posts',
      'LEFT JOIN comments ON comments.post_id = posts.id',
      'GROUP BY posts.id'
    ].join(' '), 'things');
  });
}
