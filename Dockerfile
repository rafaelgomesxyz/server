FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends cron \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chmod +x ./cron.sh ./docker/cron-entrypoint.sh

EXPOSE 3000

CMD ["npm", "start"]
