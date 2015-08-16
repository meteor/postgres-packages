if (Meteor.isServer) {
  Bookshelf = Npm.require('bookshelf');
} else {
  Bookeshelf = BrowserifyBookshelf;
}
