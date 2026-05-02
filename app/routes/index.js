const { Router } = require('express');
const InfoTimestamps = require('./info/Timestamps');
const Game = require('./games/Game');
const Games = require('./games/Games');
const SgIds = require('./games/SgIds');
const Rcv = require('./games/Rcv');
const Ncv = require('./games/Ncv');
const Uh = require('./users/Uh');
const SettingsStats = require('./settings/Stats');
const Correction = require('./uts/Correction');
const TmdbImage = require('./uts/TmdbImage');

const esgstRoutes = Router();
const utsRoutes = Router();

esgstRoutes.get('/api/info/timestamps', InfoTimestamps.get);
esgstRoutes.get('/api/game/:type/:id', Game.get);
esgstRoutes.get('/api/games', Games.get);
esgstRoutes.get('/api/games/sgids', SgIds.get);
esgstRoutes.get('/api/games/rcv', Rcv.get);
esgstRoutes.get('/api/games/ncv', Ncv.get);
esgstRoutes.get('/api/user/\\+:steamid/uh', Uh.get);
esgstRoutes.get('/api/users/uh', Uh.get);
esgstRoutes.get('/api/settings/stats', SettingsStats.get);
esgstRoutes.post('/api/settings/stats', SettingsStats.post);
esgstRoutes.get('/esgst/info/timestamps', InfoTimestamps.get);
esgstRoutes.get('/esgst/game/:type/:id', Game.get);
esgstRoutes.get('/esgst/games', Games.get);
esgstRoutes.get('/esgst/games/sgids', SgIds.get);
esgstRoutes.get('/esgst/games/rcv', Rcv.get);
esgstRoutes.get('/esgst/games/ncv', Ncv.get);
esgstRoutes.get('/esgst/user/\\+:steamid/uh', Uh.get);
esgstRoutes.get('/esgst/users/uh', Uh.get);
esgstRoutes.get('/esgst/settings/stats', SettingsStats.get);
esgstRoutes.post('/esgst/settings/stats', SettingsStats.post);

esgstRoutes.get(/\/api\/((?!docs).)*/, (req, res) => {
	res.redirect('/api/docs');
});
esgstRoutes.get('/esgst/*', (req, res) => {
	res.redirect('/api/docs');
});

utsRoutes.get('/api/correction/suggestions', Correction.get);
utsRoutes.put('/api/correction/suggestions', Correction.put);
utsRoutes.put('/api/tmdb/images', TmdbImage.put);

module.exports = {
	esgst: esgstRoutes,
	uts: utsRoutes,
};
