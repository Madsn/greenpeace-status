JiraApi = require('jira').JiraApi;
config = require('./config');
csv = require('csv');
fs = require('fs');
moment = require('moment');
util = require('util');
queries = config.queries;
async = require('async');

var jira = new JiraApi('https', config.host, config.port, config.user, config.password, '2');

var daysLimit = 21;

function extractStormObj(data) {
	return {
		ticketId: data[0],
		created: moment(data[1]),
		solved: moment(data[3]),
		status: data[4],
		lastUpdated: data[5],
		problem: data[6],
		type: data[7],
		serviceLevel: data[8],
		priority: data[9],
		masterTicketId: data[10],
		pending: data[11]
	};
}

var parser = csv.parse({delimiter: ';'}, function(err, data){
	console.log('called');
	if (err) {
		console.log(err);
		return;
	}
	var x = 0;
	var output = [];
	var notFoundInJira = [];
	var multipleFoundInJira = [];
	var totalStormCasesWithinDaysLimit = 0;
	async.whilst(
		function() { return x < data.length - 1; },
		function(callback) {
			x++;
			var updated = moment(data[x][5]);
			if (moment() < updated.add(daysLimit, 'days')) {
				totalStormCasesWithinDaysLimit++;
				console.log('within ' + daysLimit + ' days');
				jira.searchJira('"Customer Issue Reference" ~ "#' + data[x][0] + '"', {}, function(error, result) {
					if (error) console.error(error);
					else {
						if (result.issues.length == 0) {
							notFoundInJira.push(extractStormObj(data[x]));
							callback();
							return;
						}
						if (result.issues.length > 1) {
							multipleFoundInJira.push(extractStormObj(data[x]));
							callback();
							return;
						}
						for (var i in result.issues) {
							var stormObj = extractStormObj(data[x]);
						}
					}
					callback();
				});
			} else {
				console.log('not within ' + daysLimit + ' days');
				callback();
			}
		},
		function() {
			if (notFoundInJira.length > 0) {
				console.log('Following cases could not be found in Jira');
				for (var i in notFoundInJira) {
					console.log('https://customer.tdchosting.com/tickets/tickets-details/?id=' + notFoundInJira[i].ticketId);
				}
			} else {
				console.log('All analyzed cases where found in Jira');
			}
			if (multipleFoundInJira.length > 0) {
				console.log('Following cases could not be isolated to a single Jira issue');
				for (var i in multipleFoundInJira) {
					console.log('https://customer.tdchosting.com/tickets/tickets-details/?id=' + multipleFoundInJira[i].ticketId);
				}
			} else {
				console.log('All analyzed cases could be linked to a single Jira issue');
			}
			console.log('Total cases analyzed: ' + totalStormCasesWithinDaysLimit + ' (updated within ' + daysLimit + ' days)');
			console.log('Total cases not analyzed: ' + (x - totalStormCasesWithinDaysLimit));
		}
	);
});

fs.createReadStream(__dirname+'/0002900.csv').pipe(parser);
