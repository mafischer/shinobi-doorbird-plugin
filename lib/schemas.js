const Joi = require ('joi');

exports.notificationParams = Joi.object({
    event: Joi.string().regex(/\b(doorbell|motionsensor|dooropen)\b/).required(),
    monitor: Joi.string().required(),
    group: Joi.string().required()
});