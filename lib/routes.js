const schemas = require('./schemas');
const info = require('../package.json');
const doorbird = require('./doorbird');

module.exports = [
    // Add api version and ecv check
    {
        method: 'GET',
        path:'/',
        handler: function (request, h) {
            const response = h.response(`shinobi-doorbird-plugin v${info.version}`);
            return response;
        }
    },
    // Webhook for doorbird
    {
        method: 'GET',
        path:'/doorbird/event/{event}/monitor/{monitor}/group/{group}',
        handler: async (request, h) => {
            try {
                await doorbird.relay({
                    monitor: request.params.monitor,
                    event: request.params.event,
                    group: request.params.group
                });
                return h.continue;
            } catch(err) {
                return err;
            }
        },
        config: {
            validate: {
                params: schemas.notificationParams
            }
        }
    }
];