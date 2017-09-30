//TODO: Validate config inputs
const config = require('../conf.json');
const Boom = require('boom');
const pool = require('mysql').createPool(Object.assign(config.db, {connectionLimit: 4}));
const async = require('async');
const request = require('request');
const Probe = require('pmx').probe();
const moment = require('moment');

//pool events
pool.on('connection', (connection) => {
    connection.on('error', (err) => {
        console.error(err.code);
    });
});

pool.on('acquire', (connection) => {
    console.log(moment().format() + ' - Connection %d acquired', connection.threadId);
});

pool.on('enqueue', () => {
    console.log(moment().format() + ' - waiting for available db connection..');
});

pool.on('release', (connection) => {
    console.log(moment().format() + ' - Connection %d released', connection.threadId);
});

//TODO: figure out external ip automagically
let hostname = config.host;

// Shinobi initializations
let Shinobi = {};
    Shinobi.init = false;
    Shinobi.disconnects = 0;
const socket = require('socket.io-client')('ws://localhost:' + config["shinobi-port"]);
Shinobi.ocv = (x) => {
    x.pluginKey = config.key;
    x.plug = "Doorbird";
    return socket.emit('ocv',x);
};
socket.on('connect', (d) => {
    console.log('Connected to Shinobi');
    // init ocv
    Shinobi.ocv({f:'init'});
    Shinobi.init = true;
});
socket.on('disconnect', (d) => {
    Shinobi.disconnects++;
    Shinobi.init = false;
    console.log(moment().format() + ' - Shinobi connection interrupted.');
    init();
});
socket.on('f', (d) => {
    if(typeof d.f === 'string'){
        switch(d.f) {
            case 'frame':
                break;
            case 'monitor_starting':
            case 'spawn':
            case 'init_monitor':
            default:
                if(typeof d.id === 'string' && doorbirds.hasOwnProperty(d.id)){
                    console.log(d.id + ': ' + moment().format() + ' - ' +d.f);
                }
                break;
        }

    }
});
//TODO: What's this for?
socket.on('ping', (d) =>{

});
//TODO: What's this for?
socket.on('data', (d) => {

});

// Doorbird initializations
process.send = process.send || function () {};
let initialized = false;
init();


const rstpQuery = "select mid, ke, host, details, mode from `ccio`.`Monitors` where path = '/mpeg/media.amp';";
const httpQuery = "select mid, ke, host, details, mode from `ccio`.`Monitors` where path = '/bha-api/video.cgi';";
let doorbirds = {};
// Get Doorbird monitors from shinobi db
async.parallel({
    rstp: (callback) => {
        pool.query(rstpQuery, (err, results, fields) => {
            if (err) {
                throw err;
            }
            async.each(results, (result, callback) => {
                let details = JSON.parse(result.details);
                doorbirds[result.mid] = ({
                    id: result.mid,
                    group: result.ke,
                    host: result.host,
                    user: details.muser,
                    password: details.mpass,
                    mode: result.mode
                });
                return callback();
            }, (err) => {
                if(err){
                    return callback(err);
                }
                return callback();
            });
        });
    },
    http: (callback) => {
        pool.query(httpQuery, (err, results, fields) => {
            if (err) {
                throw err;
            }
            async.each(results, (result, callback) => {
                let details = JSON.parse(result.details);
                doorbirds[result.mid] = ({
                    id: result.mid,
                    group: result.ke,
                    host: result.host,
                    user: details.muser,
                    password: details.mpass,
                    mode: result.mode
                });
                return callback();
            }, (err) => {
                if(err){
                    return callback(err);
                }
                return callback();
            });
        });
    }
}, (err) => {
    if(err){
        throw err;
    }
    //register webhooks with doorbird monitors
    async.each(doorbirds, (doorbird, callback) => {
        console.log(moment().format() + ' - Registering webhook for monitor: ' + doorbird.id);
        async.each(config.events, (event, callback) => {
            let subscribe = 0;
            if(doorbird.mode !== 'disabled'){
                subscribe = 1;
            }
            request('http://' + doorbird.host + '/bha-api/notification.cgi?url=http://' + hostname + ':3000/doorbird/event/' + event + '/monitor/' +
                doorbird.id + '/group/' + doorbird.group + '&subscribe=' + subscribe + '&relaxation=10&event=' + event,
                (err, response, body) => {
                    if(err){
                        return callback(err);
                    }
                    if(response.statusCode === 401){
                        return callback(Boom.unauthorized(response.statusMessage + ": check userid and password for doorbird device."));
                    } else if(response.statusCode !== 200){
                        return callback(Boom.wrap(new Error('Doorbird subscription failed with error: ' + response.statusMessage), response.statusCode, response.statusMessage));
                    } else {
                        return callback();
                    }
                }).auth(doorbird.user, doorbird.password, false);
        }, (err) => {
            if(err){
                return callback(err);
            } else {
                return callback();
            }
        });
    }, (err) => {
        if(err){
            throw err;
        } else {
            initialized = true;
        }
    });
});

function init(){
    let initializer = setInterval(() => {
        if(initialized && Shinobi.init){
            process.send('ready');
            console.log('initialization done');
            return clearInterval(initializer);
        } else if(!Shinobi.init) {
            socket.connect();
        }
    }, 250);
}

// relay event to shinobi via websocket
exports.relay = function relay(message, callback){

    console.log('Relaying event: ' + moment().format() + ' - ' + message.event);

    //TODO: move hue integration into separate module
    //turn on hue light during trigger event
    if(config.hasOwnProperty('hue') && config.hue.enabled){

        //clear previous timeout
        if(doorbirds[message.monitor].hasOwnProperty('timeout')) {
            clearTimeout(doorbirds[message.monitor].timeout);
            delete doorbirds[message.monitor].timeout;
        }

        //turn on hue light
        console.log("Turning on Hue light: " + config.hue.light);
        request(
            {
                method: 'PUT',
                uri: 'http://' + config.hue.host + '/api/' + config.hue.userid + '/lights/' + config.hue.light + '/state',
                body: JSON.stringify({
                    on: true,
                    bri: 254
                }),
                headers: JSON.stringify({
                    "Content-Type": "application/json"
                })
            }, (err, response, body) => {
                if(err){
                    //return callback(err);
                    // not catastrophic, just going to log for now
                    console.log(err);
                }
            }
        );

        //set light off timeout
        doorbirds[message.monitor].timeout = setTimeout(() => {
            console.log("Turning off Hue light: " + config.hue.light);
            request(
                {
                    method: 'PUT',
                    uri: 'http://' + config.hue.host + '/api/' + config.hue.userid + '/lights/' + config.hue.light + '/state',
                    body: JSON.stringify({
                        on: false,
                        bri: 254
                    }),
                    headers: JSON.stringify({
                        "Content-Type": "application/json"
                    })
                }, (err, response, body) => {
                    if(err){
                        //return callback(err);
                        // not catastrophic, just going to log for now
                        console.log(err);
                }
            });
        }, 5000 + config.concurrencyThreshold * 1000)
    }
    Shinobi.ocv({
        f:'trigger',
        id:message.monitor,
        ke: message.group,
        details:{
            plug:'Doorbird',
            reason: message.event,
            confidence: 1
        }
    });

    return callback();
};

// process info
const metric = Probe.metric({
    name    : 'Disconnects',
    value   : () => {
        return Shinobi.disconnects;
    }
});