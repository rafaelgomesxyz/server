const Sentry = require('../../../instrument');
const CustomError = require('../../class/CustomError');
const Pool = require('../../class/Connection');
const Request = require('../../class/Request');
const Utils = require('../../class/Utils');

/**
 * @api {SCHEMA} App App
 * @apiGroup Schemas
 * @apiName App
 * @apiDescription The optional properties are included based on the "filters" parameter. If the parameter isn't used, all of the optional properties are included, except where noted.
 * @apiVersion 1.0.0
 *
 * @apiParam (Schema) {Object} app
 * @apiParam (Schema) {String=app} [app.type=app] [NOT FILTERABLE] The type of the game.
 * This property is only available for the [GetGames](#api-Games-GetGames) method when used with the parameter "join_all".
 * @apiParam (Schema) {Integer} [app.app_id] [NOT FILTERABLE] The Steam ID of the game. This property is not available for the [GetGames](#api-Games-GetGames) method when used without the "join_all", "format_array" and "show_id" parameters.
 * @apiParam (Schema) {String} [app.name] The name of the game.
 * @apiParam (Schema) {Boolean} [app.released] Whether the game has been released to the Steam store or not.
 * @apiParam (Schema) {Boolean} [app.removed] Whether the game has been removed from the Steam store or not.
 * @apiParam (Schema) {Boolean} [app.steam_cloud] Whether the game has Steam cloud or not.
 * @apiParam (Schema) {Boolean} [app.trading_cards] Whether the game has trading cards or not.
 * @apiParam (Schema) {Boolean/NULL} [app.learning] A boolean indicating whether Steam is learning about the game or not, or NULL if the information is not accessible.
 * @apiParam (Schema) {Boolean} [app.multiplayer] Whether the game is multiplayer or not.
 * @apiParam (Schema) {Boolean} [app.singleplayer] Whether the game is singleplayer or not.
 * @apiParam (Schema) {Boolean} [app.linux] Whether the game runs on Linux or not.
 * @apiParam (Schema) {Boolean} [app.mac] Whether the game runs on Mac or not.
 * @apiParam (Schema) {Boolean} [app.windows] Whether the game runs on Windows or not.
 * @apiParam (Schema) {Integer} [app.achievements] The number of achievements that the game has, or 0 if it doesn't have any.
 * @apiParam (Schema) {Integer} [app.price] The price of the game in USD ($9.99 is represented as 999), or 0 if it's free.
 * @apiParam (Schema) {Object/NULL} [app.metacritic] Information about the Metacritic score of the game, or NULL if it doesn't have a Metacritic page.
 * @apiParam (Schema) {Integer} app.metacritic.score The Metacritic score of the game.
 * @apiParam (Schema) {String} app.metacritic.id The Metacritic ID of the game, useful for building its Metacritic URL (https://www.metacritic.com/game/pc/{id}).
 * @apiParam (Schema) {Object/NULL} [app.rating] Information about the Steam rating of the game, or NULL if it doesn't have enough ratings.
 * @apiParam (Schema) {Integer} app.rating.percentage The percentage of positive ratings that the game has.
 * @apiParam (Schema) {Integer} app.rating.count The total number of ratings that the game has.
 * @apiParam (Schema) {String/NULL} [app.release_date] When the game was released or is going to be released in the format YYYY-MM-DD, or NULL if there's no release date.
 * @apiParam (Schema) {String[]} [app.genres] The genres of the game (according to the developers). Can be empty.
 * @apiParam (Schema) {String[]} [app.tags] The user-defined tags of the game (according to the players). Can be empty.
 * @apiParam (Schema) {Integer/NULL} [app.base] The Steam ID of the base game, or NULL if the game isn't a DLC.
 * @apiParam (Schema) {Integer[]} [app.dlcs] The Steam IDs of the DLCs that the game has. Can be empty.
 * @apiParam (Schema) {Integer[]} [app.subs] The Steam IDs of the subs that include the game. Can be empty.
 * @apiParam (Schema) {Integer[]} [app.bundles] The Steam IDs of the bundles that include the game. Can be empty.
 * @apiParam (Schema) {String} app.last_update When the information was last updated in the format YYYY/MM/DD HH:mm:SS (UTC timezone).
 *
 * @apiSampleRequest off
 */

class TmdbImage {
	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async put(req, res) {
		/** @type {import('mysql').PoolConnection} */
		let connection = null;
		try {
			connection = await Pool.getConnection();
			const result = await TmdbImage._save(connection, req);
			if (connection) {
				connection.release();
			}
			res.status(200).json({
				error: null,
				result: result ? result : null,
			});
		} catch (err) {
			if (connection) {
				connection.release();
			}
			Sentry.captureException(err);
			console.log(
				`PUT ${req.route.path} failed with params ${JSON.stringify(
					req.params
				)} and query ${JSON.stringify(req.query)}: ${err.message} ${
					err.stack ? err.stack.replace(/\n/g, ' ') : ''
				}`
			);
			if (!err.status) {
				err.status = 500;
				err.message = CustomError.COMMON_MESSAGES.internal;
			}
			res.status(err.status).json({
				error: err.message,
				result: null,
			});
		}
	}

	/**
	 * @param {import('mysql').PoolConnection} connection
	 * @param {import('express').Request} req
	 */
	static async _save(connection, req) {
		const items = req.body.items;
		if (!Array.isArray(items)) {
			throw new Error('Invalid items. Must be an array.');
		}

		const allGood = items.every(
			(item) =>
				typeof item.id === 'number' &&
				typeof item.tmdbId === 'number' &&
				(item.type === 'episode' || item.type === 'movie')
		);
		if (!allGood) {
			throw new Error('Invalid items. Each item must have an ID, a TMDB ID and a type.');
		}

		const preparedItems = items
			.map((item) => `(${connection.escape(item.id)}, ${connection.escape(item.type)})`)
			.join(',');
		const rows = await Pool.query(
			connection,
			`
				SELECT trakt_id, trakt_type, image_url
				FROM uts__trakt_items
				WHERE (trakt_id, trakt_type) IN (${preparedItems})
			`
		);

		const result = {};
		for (const row of rows) {
			const key = `${row.trakt_type}_${row.trakt_id}`;
			result[key] = row.image_url;
		}
		return result;
	}
}

module.exports = TmdbImage;
