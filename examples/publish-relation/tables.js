Comments = new PG.Table("comments");

Posts = new PG.Table("posts", {
  modelClass: class Post extends PG.Model {
    comments() {
      return Comments.knex().where({post_id: this.id});
    }
  }
});

if (Meteor.isServer) {
  Meteor.publish("users-posts-and-their-comments", function() {
    const userId = parseInt(this.userId, 10);

    if (!userId) {
      return null;
    }

    // the user -> their posts -> the posts' comments

    const postsQuery = Posts.knex()
      .select("posts.*")
      .innerJoin("users", "posts.user_id", userId);

    const commentsQuery = Comments.knex()
      .select("comments.*")
      .innerJoin("posts", "comments.post_id", "posts.id")
      .innerJoin("users", "posts.user_id", userId);

    return [
      postsQuery,
      commentsQuery
    ];
  });
} else {
  Meteor.subscribe("users-posts-and-their-comments");
}
