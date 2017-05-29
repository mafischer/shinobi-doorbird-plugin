# Shinobi Doorbird Plugin

## Requirements

- [**Shinobi**](http://shinobi.video) (Needs to be installed and running your system)
- [**node.js**](http://nodejs.org) and [**npm**](https://www.npmjs.com/) (also required by Shinobi, should be there already)
- [**pm2**](http://pm2.keymetrics.io/) (also required by Shinobi, should be there already)

## Installation

### The easiest way:

This method assumes you are using the default setup for Shinobi:
```
./INSTALL.sh
```

### An easy alternative:

Copy the sample config file and adjust the values to fit your needs.
```
cp conf.sample.json conf.json
vim conf.json
```

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