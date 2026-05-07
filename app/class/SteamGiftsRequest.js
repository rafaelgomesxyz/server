const fs = require('fs');
const path = require('path');

const { chromium } = require('playwright');
const { JSDOM } = require('jsdom');

class SteamGiftsRequest {
	static get(url, config = {}) {
		return SteamGiftsRequest.send(url, Object.assign({}, config, { method: 'GET' }));
	}

	static head(url, config = {}) {
		return SteamGiftsRequest.send(url, Object.assign({}, config, { method: 'HEAD' }));
	}

	static async send(url, config = {}) {
		const page = await SteamGiftsRequest.getPage();
		const method = config.method || 'GET';
		let response = null;
		try {
			response = await page.goto(url, {
				waitUntil: 'domcontentloaded',
				timeout: SteamGiftsRequest.NAVIGATION_TIMEOUT,
			});
			await SteamGiftsRequest.waitForCloudflare(page);

			const pageText = await page.evaluate(() => document.body.innerText);
			const text = method === 'HEAD' ? '' : pageText;
			const result = {
				status: response ? response.status() : null,
				/** @type {HTMLElement} */
				html: null,
				/** @type {Object} */
				json: null,
				redirected: page.url() !== url,
				text,
				url: page.url(),
			};

			if (SteamGiftsRequest.isCloudflareCheck(pageText)) {
				throw new Error(
					'SteamGifts Cloudflare verification did not complete. Run the cron script through xvfb-run with STEAMGIFTS_PLAYWRIGHT_HEADLESS=false.'
				);
			}

			if (result.status && result.status >= 400) {
				throw new Error(pageText);
			}

			if (result.text) {
				try {
					result.json = JSON.parse(result.text);
				} catch (error) {}
				if (!result.json) {
					try {
						result.html = new JSDOM(result.text).window.document;
					} catch (err) {
						console.log(`${method} request to ${url} could not parse HTML: ${err}`);
					}
				}
			}

			return result;
		} catch (err) {
			console.log(`${method} request to ${url} failed with ${response && response.status()}`);
			err.status = response ? response.status() : null;
			throw err;
		}
	}

	static async getPage() {
		if (!SteamGiftsRequest.contextPromise) {
			SteamGiftsRequest.contextPromise = SteamGiftsRequest.createContext();
		}
		const context = await SteamGiftsRequest.contextPromise;
		if (!SteamGiftsRequest.page || SteamGiftsRequest.page.isClosed()) {
			SteamGiftsRequest.page = context.pages()[0] || (await context.newPage());
			SteamGiftsRequest.page.setDefaultTimeout(SteamGiftsRequest.NAVIGATION_TIMEOUT);
		}
		return SteamGiftsRequest.page;
	}

	static async createContext() {
		fs.mkdirSync(SteamGiftsRequest.USER_DATA_DIR, { recursive: true });
		const launchOptions = {
			headless: SteamGiftsRequest.HEADLESS,
			chromiumSandbox: false,
		};
		if (SteamGiftsRequest.CHANNEL) {
			launchOptions.channel = SteamGiftsRequest.CHANNEL;
		}
		let context = null;
		try {
			context = await chromium.launchPersistentContext(
				SteamGiftsRequest.USER_DATA_DIR,
				launchOptions
			);
		} catch (err) {
			if (!SteamGiftsRequest.CHANNEL || process.env.STEAMGIFTS_PLAYWRIGHT_CHANNEL) {
				throw err;
			}
			delete launchOptions.channel;
			context = await chromium.launchPersistentContext(
				SteamGiftsRequest.USER_DATA_DIR,
				launchOptions
			);
		}
		context.setDefaultNavigationTimeout(SteamGiftsRequest.NAVIGATION_TIMEOUT);
		return context;
	}

	static async waitForCloudflare(page) {
		await page
			.waitForFunction(
				() => {
					const title = document.title || '';
					const text = document.body ? document.body.innerText : '';
					return (
						!title.includes('Just a moment') &&
						!text.includes('Checking your browser') &&
						!text.includes('Performing security verification') &&
						!text.includes('Verifying you are human')
					);
				},
				null,
				{ timeout: SteamGiftsRequest.CLOUDFLARE_TIMEOUT }
			)
			.catch(() => {});
	}

	static isCloudflareCheck(text) {
		return (
			text &&
			(text.includes('Checking your browser') ||
				text.includes('Performing security verification') ||
				text.includes('Verifying you are human'))
		);
	}

	static async close() {
		if (!SteamGiftsRequest.contextPromise) {
			return;
		}
		try {
			const context = await SteamGiftsRequest.contextPromise;
			await context.close();
		} finally {
			SteamGiftsRequest.contextPromise = null;
			SteamGiftsRequest.page = null;
		}
	}
}

SteamGiftsRequest.HEADLESS =
	process.env.STEAMGIFTS_PLAYWRIGHT_HEADLESS === undefined
		? !process.env.DISPLAY
		: process.env.STEAMGIFTS_PLAYWRIGHT_HEADLESS !== 'false';
SteamGiftsRequest.CHANNEL = process.env.STEAMGIFTS_PLAYWRIGHT_CHANNEL || 'chrome';
if (SteamGiftsRequest.CHANNEL === 'none') {
	SteamGiftsRequest.CHANNEL = null;
}
SteamGiftsRequest.USER_DATA_DIR =
	process.env.STEAMGIFTS_PLAYWRIGHT_USER_DATA_DIR ||
	path.resolve(
		__dirname,
		`../../.cache/steamgifts-playwright-${SteamGiftsRequest.CHANNEL || 'chromium'}`
	);
SteamGiftsRequest.NAVIGATION_TIMEOUT = parseInt(
	process.env.STEAMGIFTS_PLAYWRIGHT_NAVIGATION_TIMEOUT || '60000',
	10
);
SteamGiftsRequest.CLOUDFLARE_TIMEOUT = parseInt(
	process.env.STEAMGIFTS_PLAYWRIGHT_CLOUDFLARE_TIMEOUT || '30000',
	10
);
SteamGiftsRequest.contextPromise = null;
SteamGiftsRequest.page = null;

module.exports = SteamGiftsRequest;
