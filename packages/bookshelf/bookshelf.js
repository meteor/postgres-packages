if (Meteor.isServer) {
  Bookshelf = Npm.require('bookshelf');
} else {
  Bookshelf = BrowserifyBookshelf;
}
