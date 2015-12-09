JiraApi = require('jira').JiraApi;
config = require('./config');
util = require('util');
queries = config.queries;

var jira = new JiraApi('https', config.host, config.port, config.user, config.password, '2');

for (var i in queries) {
	(function(i) {
		var label = queries[i].label;
		var issuetype = queries[i].issuetype;
		jira.searchJira(queries[i].query, {}, function(error, result) {
			if (error) console.error(error);
			else console.log(result.total + ' ' + label + ' ' + issuetype); 
			//console.log(util.inspect(result, false, null));
		});
	})(i);
}
