import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanImageMetadata } from '../lib/travel/image-metadata';

test('créditos e licenças mantêm o texto legítimo sem a marcação do Wikimedia', () => {
  assert.equal(cleanImageMetadata('<a href="https://example.org">Ana &amp; João</a>'), 'Ana & João');
  assert.equal(cleanImageMetadata('<span>CC BY&nbsp;2.0</span>'), 'CC BY 2.0');
  assert.equal(cleanImageMetadata('<b><i>Maria</i></b>'), 'Maria');
  assert.equal(cleanImageMetadata('Ana > João'), 'Ana > João');
  assert.equal(cleanImageMetadata(null), '');
  assert.equal(cleanImageMetadata('a'.repeat(200)).length, 180);
});

test('marcação malformada não deixa abertura de tag HTML no texto', () => {
  for (const value of ['Foto <script', '<scr<script>ipt>alert(1)</script>', 'Ana > João', '&lt;script&gt;alert(1)&lt;/script&gt;']) {
    const cleaned = cleanImageMetadata(value);
    assert.doesNotMatch(cleaned, /</);
    const rendered = renderToStaticMarkup(createElement('span', null, cleaned));
    assert.doesNotMatch(rendered, /<script/i);
  }
  assert.equal(cleanImageMetadata('Foto <script'), 'Foto script');
});
