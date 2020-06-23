const {expect} = require('chai');
const doorbird = require('../lib');

describe('doorbird', () => {
    it('the library should be defined', () => {
        expect(doorbird).to.not.equal(undefined);
    });
});
