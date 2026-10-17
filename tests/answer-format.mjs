import assert from 'node:assert/strict';
import { formatAnswer } from '../public/answer-format.mjs';

assert.equal(formatAnswer('**例文：** *I took off.*'), '<strong>例文：</strong> <em>I took off.</em>');
assert.equal(formatAnswer('first\nsecond'), 'first<br>second');
const escaped = formatAnswer('**<img src=x onerror=alert(1)>** & "quoted"');
assert.equal(escaped, '<strong>&lt;img src=x onerror=alert(1)&gt;</strong> &amp; &quot;quoted&quot;');
assert.equal(/<(?:img|script)\b/i.test(escaped), false);
const tags = [...escaped.matchAll(/<\/?([a-z]+)(?:\s[^>]*)?>/gi)].map(match => match[1].toLowerCase());
assert.deepEqual(tags, ['strong', 'strong']);

console.log('answer-format: 5 checks passed');
