const {
  Navigation,
  State
} = ReactRouter;

TodoListPage = React.createClass({
  mixins: [ReactMeteorData, Navigation, State],

  getMeteorData() {
    // Get list ID from ReactRouter
    const listId = parseInt(this.getParams().listId, 10);

    // Subscribe to the tasks we need to render this component
    const tasksSubHandle = Meteor.subscribe("todos", listId);

    const list = Lists.where({ id: listId }).fetch()[0];

    if (tasksSubHandle.ready()) {
      return {
        tasks: list && list.todos().orderBy("created_at", "DESC").fetch(),
        list: list,
        tasksLoading: false
      };
    } else {
      return {
        list: list,
        tasksLoading: true,
      };
    }
  },

  render() {
    const list = this.data.list;
    const tasks = this.data.tasks;

    if (! list) {
      return <AppNotFound />;
    }

    return (
      <div className="page lists-show">
        <TodoListHeader
          list={list}
          showLoadingIndicator={this.data.tasksLoading} />

        { this.data.tasksLoading ? "" :
          <TodoListItems tasks={this.data.tasks} />
        }
      </div>
    );
  }
});
