const {runGenerator, check, files} = require('./check');
const {printPackage} = require('../generate_build_file');

describe('build file generator', () => {
  describe('integration test', () => {
    runGenerator();
    files.forEach(file => {
      it(`should produce a BUILD file for ${file}`, () => {
        check(file);
      });
    });
  });

  it('should exclude empty bin entries', () => {
    expect(printPackage({_dir: 'some_pkg', _files: [], _dependencies: [], _executables: ['']}))
        .not.toContain('nodejs_binary');
  });
});
