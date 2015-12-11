JiraApi = require('jira').JiraApi;
config = require('./config');
csv = require('csv');
fs = require('fs');
moment = require('moment');
util = require('util');
queries = config.queries;
async = require('async');
var args = process.argv.slice(2);

var jira = new JiraApi('https', config.host, config.port, config.user, config.password, '2', true, false);

var daysLimit = 0;

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

function printCombined(data) {
	console.log('Storm ticket: https://customer.tdchosting.com/tickets/tickets-details/?id=' + data.storm.ticketId);
	console.log('Jira: https://support.systematic.com/browse/' + data.jira.key);
	console.log('Issue ref: TODO');
	console.log('Status Storm: ' + data.storm.status);
	console.log('Status Jira: ' + data.jira.fields.status.name);
}

var parser = csv.parse({delimiter: ';'}, function(err, data){
	if (err) {
		console.log(err);
		return;
	}
	var x = 0;
	var output = [];
	var notFoundInJira = [];
	var multipleFoundInJira = [];
	var totalStormCasesWithinDaysLimit = 0;
	var waitingInStorm = [];
	var closedInStormOpenInJira = [];
	async.whilst(
		function() { return x < data.length - 1; },
		function(callback) {
			x++;
			var updated = moment(data[x][5]);
			if (moment() < updated.add(daysLimit, 'days')) {
				totalStormCasesWithinDaysLimit++;
				//console.log('within ' + daysLimit + ' days');
				jira.searchJira('"Customer Issue Reference" ~ "#' + data[x][0] 
											+ '" and issuetype != bug', {}, function(error, result) {
					if (error) console.error(error);
					else {
						var stormObj = extractStormObj(data[x]);
						if (result.issues.length == 0) {
							notFoundInJira.push({
								storm: stormObj,
								jira: null
							});
							callback();
							return;
						}
						if (result.issues.length > 1) {
							multipleFoundInJira.push(extractStormObj(data[x]));
							callback();
							return;
						}
						for (var i in result.issues) {
							// closed in storm and !closed in jira
							var jiraStatus = result.issues[i].fields.status.name;
							//console.log(result.issues[i]);
							if (stormObj.status == 'Closed' && jiraStatus != 'Closed') {
								closedInStormOpenInJira.push({
									storm: stormObj,
									jira: result.issues[i]
								});
							} else if (stormObj.status == 'Pending external consultant'
												&& !(jiraStatus == 'Waiting for Support'
														|| jiraStatus == 'New'
														|| jiraStatus == 'In Progress')) {
								waitingInStorm.push({
									storm: stormObj,
									jira: result.issues[i]
								});
							}
						}
					}
					callback();
				});
			} else {
				//console.log('not within ' + daysLimit + ' days');
				callback();
			}
		},
		function() {
			if (closedInStormOpenInJira.length > 0) {
				console.log('Following cases are closed in storm but open in Jira');
				for (var i in closedInStormOpenInJira) {
					//var subticket = closedInStormOpenInJira[i].masterTicketId ? true : false;
					printCombined(closedInStormOpenInJira[i]);
					console.log('-----------------------');
				}
			}
			if (waitingInStorm.length > 0) {
				console.log('Following cases are pending SSE in storm but not new/waiting in Jira');
				for (var i in waitingInStorm) {
					//var subticket = closedInStormOpenInJira[i].masterTicketId ? true : false;
					printCombined(waitingInStorm[i]);
					console.log('-----------------------');
				}
			}
			if (notFoundInJira.length > 0) {
				console.log('Following cases could not be found in Jira');
				for (var i in notFoundInJira) {
					console.log('Storm: https://customer.tdchosting.com/tickets/tickets-details/?id=' + notFoundInJira[i].storm.ticketId);
					console.log('Status Storm: ' + notFoundInJira[i].storm.status);
					console.log('----------------------')
				}
			} else {
				console.log('All analyzed cases where found in Jira');
			}
			if (multipleFoundInJira.length > 0) {
				console.log('Following cases could not be isolated to a single Jira issue');
				for (var i in multipleFoundInJira) {
					var subticket = multipleFoundInJira[i].masterTicketId ? true : false;
					console.log('https://customer.tdchosting.com/tickets/tickets-details/?id=' + multipleFoundInJira[i].ticketId
											+ ' subticket: ' + subticket);
				}
			} else {
				console.log('All analyzed cases could be linked to a single Jira issue');
			}
			console.log('Total cases analyzed: ' + totalStormCasesWithinDaysLimit + ' (updated within ' + daysLimit + ' days)');
			console.log('Total cases not analyzed: ' + (x - totalStormCasesWithinDaysLimit));
		}
	);
});

if (args[0] == null) {
	console.log('Supply filename of csv excluding extension, e.g. myFile for a file named myFile.csv');
} else if (args[1] == null) {
	console.log('Supply number of days to limit queries (days since latest update in Storm)');
}else {
	daysLimit = args[1];
	fs.createReadStream(__dirname+'/' + args[0] + '.csv').pipe(parser);
}
