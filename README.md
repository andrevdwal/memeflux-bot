# memeflux-bot

Scrapes images on a forum thread and pushes them to a Telegram channel.

## Setup

Create a ./data/config.json file by copy pasting the rename.config.json file in the same location.

## Raspberry Pi

On a Pi and other lightweight distros Chromium is probably not installed. Install it using `sudo apt-get install chromium-browser`.

Once installed set the `browserExecutablePath` to it's location (you can find it using `which`). The default/most likely path can be found in the `rename.config.json` file.

## Cron
A sample crontab entry
```
*/20 * * * * (cd /root/repos/memeflux-bot; /usr/local/bin/node index.js) > /var/log/memeflux.log 2>&1
```
