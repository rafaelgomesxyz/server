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

class Correction {
	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async get(req, res) {
		/** @type {import('mysql').PoolConnection} */
		let connection = null;
		try {
			connection = await Pool.getConnection();
			const result = await Correction._find(connection, req);
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
			console.log(
				`GET ${req.route.path} failed with params ${JSON.stringify(
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
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	static async put(req, res) {
		/** @type {import('mysql').PoolConnection} */
		let connection = null;
		try {
			connection = await Pool.getConnection();
			await Correction._save(connection, req);
			if (connection) {
				connection.release();
			}
			res.status(200).json({
				error: null,
				result: null,
			});
		} catch (err) {
			if (connection) {
				connection.release();
			}
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
	static async _find(connection, req) {
		const ids = req.query.ids.split(',');

		const preparedIds = ids
			.map((id) => {
				const [service, itemId] = id.split('_');
				return `(${connection.escape(service)}, ${connection.escape(itemId)})`;
			})
			.join(',');
		const rows = await Pool.query(
			connection,
			`
				SELECT service, item_id, trakt_id, trakt_title, trakt_type, count
				FROM uts__corrections
				WHERE (service, item_id) IN (${preparedIds})
			`
		);

		const result = {};
		for (const row of rows) {
			const key = `${row.service}_${row.item_id}`;
			if (!result[key]) {
				result[key] = [];
			}
			result[key].push({
				count: row.count,
				id: row.trakt_id,
				title: row.trakt_title,
				type: row.trakt_type,
			});
		}
		return result;
	}

	/**
	 * @param {import('mysql').PoolConnection} connection
	 * @param {import('express').Request} req
	 */
	static async _save(connection, req) {
		const corrections = req.body.corrections;
		if (!Array.isArray(corrections)) {
			throw new Error('Invalid corrections. Must be an array.');
		}

		const allGood = corrections.every(
			(correction) =>
				typeof correction.id === 'string' &&
				/^[A-Za-z0-9-_]+$/.test(correction.id) &&
				Array.isArray(correction.suggestions) &&
				correction.suggestions.every(
					(suggestion) =>
						(suggestion.type === 'episode' || suggestion.type === 'movie') &&
						typeof suggestion.id === 'number' &&
						typeof suggestion.title === 'string'
				)
		);
		if (!allGood) {
			throw new Error(
				'Invalid corrections. Each correction must have an ID and an array of suggestions, and each suggestion must have a type, an ID and a title.'
			);
		}

		await Pool.beginTransaction(connection);
		try {
			for (const correction of corrections) {
				const [service, itemId] = correction.id.split('_');
				for (const suggestion of correction.suggestions) {
					await Pool.query(
						connection,
						`
							INSERT INTO uts__corrections (service, item_id, trakt_id, trakt_title, trakt_type, count, last_update)
							VALUES (${connection.escape(service)}, ${connection.escape(itemId)}, ${connection.escape(
							suggestion.id
						)}, ${connection.escape(suggestion.title)}, ${connection.escape(
							suggestion.type
						)}, 1, ${connection.escape(Math.trunc(Date.now() / 1e3))})
							ON DUPLICATE KEY UPDATE count = count + 1, last_update = VALUES(last_update)
						`
					);
				}
			}
			await Pool.commit(connection);
		} catch (err) {
			await Pool.rollback(connection);
			throw err;
		}
	}
}

module.exports = Correction;
