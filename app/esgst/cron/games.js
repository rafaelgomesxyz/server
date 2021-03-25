const Pool = require('../class/Connection');
const Utils = require('../class/Utils');
const App = require('../routes/games/App');
const Bundle = require('../routes/games/Bundle');
const Sub = require('../routes/games/Sub');

doGamesCronJob();

async function doGamesCronJob() {
	/** @type {import('mysql').PoolConnection} */
	let connection = null;
	try {
		connection = await Pool.getConnection();
		await updateGames(connection);
		if (connection) {
			connection.release();
		}
	} catch (err) {
		if (connection) {
			connection.release();
		}
		console.log(`Games update failed: ${err}`);
	}
	process.exit();
}

/**
 * @param {import('mysql').PoolConnection} connection
 */
async function updateGames(connection) {
	console.log('Initializing...');

	const now = Math.trunc(Date.now() / 1e3);

	const appRows = await Pool.query(
		connection,
		`
      SELECT app_id, release_date, last_update
      FROM games__app
      WHERE queued_for_update = TRUE
      ORDER BY last_update
      LIMIT 200
    `
	);
	console.log(`${appRows.length} apps found!`);
	for (const [i, appRow] of appRows.entries()) {
		if (appRow.release_date) {
			const releaseDate = Math.trunc(new Date(parseInt(appRow.release_date) * 1e3).getTime() / 1e3);
			const lastUpdate = Math.trunc(new Date(parseInt(appRow.last_update) * 1e3).getTime() / 1e3);
			const differenceInSeconds = now - lastUpdate;
			if (now - releaseDate > 60 * 60 * 24 * 180 && differenceInSeconds < 60 * 60 * 24 * 30) {
				await Pool.beginTransaction(connection);
				try {
					await Pool.query(
						connection,
						`
							UPDATE games__app
							SET queued_for_update = FALSE
							WHERE app_id = ${connection.escape(appRow.app_id)}
						`
					);
					await Pool.commit(connection);
				} catch (err) {
					await Pool.rollback(connection);
					throw err;
				}
				continue;
			}
		}
		console.log(`[${i + 1}] Updating app ${appRow.app_id}...`);
		await App.fetch(connection, appRow.app_id);
		await Utils.timeout(1);
	}

	const bundleRows = await Pool.query(
		connection,
		`
      SELECT bundle_id
      FROM games__bundle
      WHERE queued_for_update = TRUE
      ORDER BY last_update
      LIMIT 200
    `
	);
	console.log(`${bundleRows.length} bundles found!`);
	for (const [i, bundleRow] of bundleRows.entries()) {
		console.log(`[${i + 1}] Updating bundle ${bundleRow.bundle_id}...`);
		await Bundle.fetch(connection, bundleRow.bundle_id);
		await Utils.timeout(1);
	}

	const subRows = await Pool.query(
		connection,
		`
			SELECT sub_id, release_date, last_update
      FROM games__sub
      WHERE queued_for_update = TRUE
      ORDER BY last_update
      LIMIT 200
    `
	);
	console.log(`${subRows.length} subs found!`);
	for (const [i, subRow] of subRows.entries()) {
		if (subRow.release_date) {
			const releaseDate = Math.trunc(new Date(parseInt(subRow.release_date) * 1e3).getTime() / 1e3);
			const lastUpdate = Math.trunc(new Date(parseInt(subRow.last_update) * 1e3).getTime() / 1e3);
			const differenceInSeconds = now - lastUpdate;
			if (now - releaseDate > 60 * 60 * 24 * 180 && differenceInSeconds < 60 * 60 * 24 * 30) {
				await Pool.beginTransaction(connection);
				try {
					await Pool.query(
						connection,
						`
							UPDATE games__sub
							SET queued_for_update = FALSE
							WHERE sub_id = ${connection.escape(subRow.sub_id)}
						`
					);
					await Pool.commit(connection);
				} catch (err) {
					await Pool.rollback(connection);
					throw err;
				}
				continue;
			}
		}
		console.log(`[${i + 1}] Updating sub ${subRow.sub_id}...`);
		await Sub.fetch(connection, subRow.sub_id);
		await Utils.timeout(1);
	}

	console.log('Done!');
}
