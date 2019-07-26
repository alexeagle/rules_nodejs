const fs = require('fs');
const sm = require('source-map');
const DIR = 'build_bazel_rules_nodejs/packages/terser/test/sourcemap';

describe('terser sourcemap handling', () => {
  it('should produce a sourcemap output', async () => {
    const file = require.resolve(DIR + '/case1.js.map');
    const rawSourceMap = JSON.parse(fs.readFileSync(file, 'utf-8'));
    await sm.SourceMapConsumer.with(rawSourceMap, null, consumer => {
      const pos = consumer.originalPositionFor({
        // FIXME: this data doesn't seem right. src1.js doesn't have this on line 1
        line: 1,
        column: 17
      });
      expect(pos.name).toBe('MyClass');
    });
  });
});