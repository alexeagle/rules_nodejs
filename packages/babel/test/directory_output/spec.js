const fs = require('fs');

describe('babel directory output', () => {
  it('should produce a file for each source', () => {
    expect(fs.existsSync(require.resolve(__dirname + '/transpiled/input1.js'))).toBeTruthy();
    expect(fs.existsSync(require.resolve(__dirname + '/transpiled/input2.js'))).toBeTruthy();
  });
});
