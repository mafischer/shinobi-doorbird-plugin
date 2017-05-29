//TODO: Validate config inputs
const config = require('../conf.json');
const socket = require('socket.io-client')('ws://' + config.host + ':' + config["shinobi-port"]);
const Boom = require('boom');
const pool = require('mysql').createPool(Object.assign(config.db, {connectionLimit: 10}));
const async = require('async');
const request = require('request');

const rstpQuery = "select mid, host, details from `ccio`.`Monitors` where path = '/mpeg/media.amp';";
//TODO: Figure out how to get http doorbird monitors from db
//const httpQuery = "select mid, host, details from `ccio`.`Monitors` where path = '/mpeg/media.amp';";
let doorbirds = {};

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
                    host: result.host,
                    user: details.muser,
                    password: details.mpass
                });
                return callback();
            }, function(err){
                if(err){
                    return callback(err);
                }
                return callback();
            });
        });
    }//,
    // http: function(callback){
    //
    // }
}, function(err){
    if(err){
        throw err;
    }
    //register webhooks with doorbirds
    async.each(doorbirds, function (doorbird, callback){
        console.log("Registering webhook for monitor: " + doorbird.id);
        async.each(config.events, function(event, callback){
            request('http://' + doorbird.host + '/bha-api/notification.cgi?url=http://192.168.1.254:3000/doorbird/event/' + event + '/monitor/' +
                doorbird.id + '&user=&password=&subscribe=1&relaxation=10&event=' + event,
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

exports.relay = function relay(message, callback){
    // console.log("relay message: " + message);
    //
    // // socket connect callback
    // socket.on('connect', function(d){
    //
    // });
    //
    // socket.on('disconnect',function(d){
    //     socket.connect();
    // });
    //
    // // register plugin with Shinobi
    // s.cx=function(x){return io.emit('ocv',x)}

    return callback(Boom.notImplemented(message));
};

//TODO: unsubscribe to doorbird events upon error

exports.doorbirds = doorbirds;