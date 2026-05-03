#!/bin/bash
source ~/.nvm/nvm.sh
DB_HOST=127.0.0.1 $(nvm which node) $@ >> ./cron.log 2>&1
