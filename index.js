require('dotenv').config();

const Sentry = require('./instrument');
const cors = require('cors');
const express = require('express');
const routes = require('./app/routes');

const app = express();
const port = process.env.PORT || 8000;

app.enable('trust proxy');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use((req, res, next) => {
	const subdomain = req.subdomains[0]; // Get the first subdomain (e.g., 'esgst', 'uts', etc.)

	if (subdomain === 'esgst') {
		routes.esgst(req, res, next);
	} else if (subdomain === 'uts') {
		routes.uts(req, res, next);
	} else {
		// Handle default behavior or show an error page
		res.status(404).send('Page not found');
	}
});

Sentry.setupExpressErrorHandler(app);

app.use((err, req, res, next) => {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.listen(port, () => {
	console.log(`Server started on port ${port}...`);
});
