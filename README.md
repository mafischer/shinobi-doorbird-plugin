# Shinobi Doorbird Plugin

[![Build Status](https://travis-ci.org/mafischer/shinobi-doorbird-plugin.svg?branch=master)](http://travis-ci.org/hapijs/code)

## Requirements

- [**Shinobi**](http://shinobi.video) (Needs to be installed and running your system)
- [**node.js**](http://nodejs.org) and [**npm**](https://www.npmjs.com/) (also required by Shinobi, should be there already)
- [**pm2**](http://pm2.keymetrics.io/) (also required by Shinobi, should be there already)

## Installation
### Plugin Auth
Within your shinobi config, you will need to add a random string as a key for the doorbird plugin.
```
"pluginKeys": {
  "Doorbird": "change_this_to_something_very_random"
}
```

Copy the sample config file and adjust the values to fit your needs.
```
cp conf.sample.json conf.json
vim conf.json
```

Be sure to change the value of `key` to match the key in the first step.
```
"key": "change_this_to_match_doorbird_plugin_key"
 ```

### The easiest way:

This method assumes you are using the default setup for Shinobi:
```
./INSTALL.sh
```

### An easy alternative:

Install required libraries
```
npm install
```

Daemonize the plugin with pm2
```
pm2 start lib/index.js --name doorbird
```

Save the daemon
```
pm2 save
```

## Updating

Run the update script
```
./UPDATE.sh
```
Verify that your conf.json is correct

Run the install script
```
./INSTALL.sh
```