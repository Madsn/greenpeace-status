JiraApi = require('jira').JiraApi;
config = require('./config');

var jira = new JiraApi('https', config.host, config.port, config.user, config.password, '2');

jira.findIssue(config.projectKey + "-1234", function(error, issue) {
	if (error) console.error(error);
	else console.log('Status: ' + issue.fields.status.name);
});

