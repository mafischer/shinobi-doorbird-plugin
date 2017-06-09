//TODO: Validate config inputs
const config = require('../conf.json');
const Boom = require('boom');
const pool = require('mysql').createPool(Object.assign(config.db, {connectionLimit: 10}));
const async = require('async');
const request = require('request');

//TODO: figure out external ip automagically
let hostname = config.host;

// Shinobi initializations
let Shinobi = {};
const socket = require('socket.io-client')('ws://localhost:' + config["shinobi-port"]);
Shinobi.cx = function(x){
    x.pluginKey = config.key;
    x.plug = "Doorbird";
    return socket.emit('ocv',x)
};
process.send = process.send || function () {};
// socket connect callback
socket.on('connect', function(d){
    process.send('ready');
    Shinobi.cx({f:'init'});
});
socket.on('disconnect',function(d){
    socket.connect();
});
socket.on('f', function(d){
    console.log(d);
});

// Doorbird initializations
const rstpQuery = "select mid, ke, host, details, mode from `ccio`.`Monitors` where path = '/mpeg/media.amp';";
const httpQuery = "select mid, ke, host, details, mode from `ccio`.`Monitors` where path = '/bha-api/video.cgi';";
let doorbirds = {};
// Get Doorbird monitors from shinobi db
async.parallel({
    rstp: function(callback) {
        pool.query(rstpQuery, function (err, results, fields) {
            if (err) {
                throw err;
            }
            async.each(results, function (result, callback) {
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
            }, function(err){
                if(err){
                    return callback(err);
                }
                return callback();
            });
        });
    },
    http: function(callback){
        pool.query(httpQuery, function (err, results, fields) {
            if (err) {
                throw err;
            }
            async.each(results, function (result, callback) {
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
            }, function(err){
                if(err){
                    return callback(err);
                }
                return callback();
            });
        });
    }
}, function(err){
    if(err){
        throw err;
    }
    //register webhooks with doorbird monitors
    async.each(doorbirds, function (doorbird, callback){
        console.log("Registering webhook for monitor: " + doorbird.id);
        async.each(config.events, function(event, callback){
            let subscribe = 0;
            if(doorbird.mode !== 'disabled'){
                subscribe = 1;
            }
            request('http://' + doorbird.host + '/bha-api/notification.cgi?url=http://' + hostname + ':3000/doorbird/event/' + event + '/monitor/' +
                doorbird.id + '/group/' + doorbird.group + '&subscribe=' + subscribe + '&relaxation=10&event=' + event,
                function(err, response, body){
                    if(err){
                        return callback(err);
                    }
                    if(response.statusCode === 401){
                        return callback(Boom.unauthorized(response.statusMessage + ": check userid and password for doorbird device."));
                    } else if(response.statusCode !== 200){
                        return callback(Boom.wrap(new Error('Doorbird subscription failed with error: ' + response.statusMessage), response.statusCode, response.statusMessage));
                    }
                }).auth(doorbird.user, doorbird.password, false);
        }, function(err){
            if(err){
                return callback(err);
            }
        });
    }, function(err){
        if(err){
            throw err;
        }
    });
});


// relay event to shinobi via websocket
exports.relay = function relay(message, callback){

    Shinobi.cx({
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

//TODO: unsubscribe to doorbird events upon error

exports.doorbirds = doorbirds;