var config = {
	host: "",
	port: 443,
	user: "",
	password: "",
	projectKey: "MYPROJ",
	queries: [
		{
			'issuetype': 'Incident',
			'label': 'Closed by SKAT',
			'query': 'issuetype = Incident and resolutiondate > startOfDay(-1d) and resolutiondate < startOfDay(-0d) and status = Closed and project = "SKAT DIAS"'
		}
	]
};

module.exports = config;