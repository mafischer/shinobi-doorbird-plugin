const Code = require('code');   // assertion library
const Lab = require('lab');
const lab = exports.lab = Lab.script();

//const server = require('../lib');
//const routes = require('../lib/routes');

//TODO: need to mock database
// lab.test('server module exists', (done) => {
//     Code.expect(server).to.exist();
//     done();
// });

// lab.test('routes module exists', (done) => {
//     Code.expect(routes).to.exist();
//     done();
// });

lab.test('fake test', (done) => {
    Code.expect(lab).to.exist();
    done();
});