# Deploying Fruit Fly World

This package is the complete site. You don't need the old checkout.

## What you need on the server

- Linux with `systemd`, `nginx`, `curl`, `tar`
- Node.js 20 or newer (`node -v`)
- Internet access to `registry.npmjs.org` (for `npm ci`)
- Optional: `/etc/fruit-fly-world.env` (copy of `.env.example`, filled in). The new
  homepage, `/fly/dusty` and the replay pages work without it. Passport mint, wallet
  login and the weekly race need it (they use Postgres and keys).

## Deploy (one command)

```bash
# 1. upload the zip to the server, then:
unzip fruit-fly-world-deploy.zip -d ~/ffw-deploy
cd ~/ffw-deploy/fruit-fly-world
sudo bash deploy/deploy.sh
```

The script builds and tests first and only then switches the live site. If the
new version doesn't answer correctly, it switches back to the previous one by itself.
Details are at the top of `deploy/deploy.sh`.

## Check it

```bash
curl -s "https://fruitfly.world/api/fly/dusty?season=0&tick=2000"   # "chain":"003ad503"
```

Then open https://fruitfly.world, press **Verify a random past tick**, and look for **IDENTICAL**.

## Roll back

```bash
ls -1t /srv/fruit-fly-world/releases/
sudo ln -sfn /srv/fruit-fly-world/releases/<older> /srv/fruit-fly-world/current
sudo systemctl restart fruit-fly-world
```

## Not in this package

`media/` (the launch-film masters and audio, ~52 MB) is source material, not
served by the site, so it was left out to keep the package small. Keep your own
copy if you need to re-edit the film.
