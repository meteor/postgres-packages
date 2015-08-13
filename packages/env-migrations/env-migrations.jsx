Migrations.runIfEnvSet = function () {
  if (process.env.RUN_MIGRATIONS) {
    Migrations.migrateTo(process.env.RUN_MIGRATIONS);
    console.log("=> Done running migrations. Kill your app manually and restart without the RUN_MIGRATIONS env var.");
    process.exit(0);
  } else {
    const lastMigrationVersion = _.last(Migrations._list).version;
    if (Migrations.getVersion() < lastMigrationVersion) {
      console.log(`=> You have some migrations that haven't been run yet.
   Most recent version run: ${lastMigrationVersion}.

   You should consider running migrations with the following command:
     RUN_MIGRATIONS=latest meteor`);
    }
  }
}
