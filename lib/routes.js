const schemas = require('./schemas');
const info = require('../package.json');
const doorbird = require('./doorbird');

module.exports = [
    // Add api version and ecv check
    {
        method: 'GET',
        path:'/',
        handler: function (request, reply) {
            return reply('shinobi-doorbird-plugin v' + info.version);
        }
    },
    // Webhook for doorbird
    {
        method: 'GET',
        path:'/doorbird/event/{event}/monitor/{monitor}/group/{group}',
        handler: function (request, reply) {
            doorbird.relay({
                monitor: request.params.monitor,
                event: request.params.event,
                group: request.params.group
            }, function(err){
                if(err){
                    return reply(err);
                } else {
                    return reply().code(200);
                }
            });
        },
        config: {
            validate: {
                params: schemas.notificationParams
            }
        }
    }
];