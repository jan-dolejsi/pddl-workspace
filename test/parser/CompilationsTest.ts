/*
 * Copyright (c) Jan Dolejsi 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
'use strict';

import { describe, it, expect } from 'vitest';
import { Compilations, CodeInjection, CodeReplacement } from '../src';

describe("Compilations", () => {
	describe("#applyAll()", () => {
		it('no compilation', () => {
			const compilations = new Compilations()

			// GIVEN
			compilations.addAll(3, []);
			const orig = "12345";

			// WHEN
			const compiled = compilations.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal(orig);
		});

		it('one insertion in the middle', () => {
			const compilations = new Compilations()

			// GIVEN
			const orig = "12345";
			const injection = new CodeInjection({
				code: '_a_',
				documentation: { title: 'hover' },
				offset: orig.indexOf('3'),
				doesNotRequireWhitespaceSurrounding: true,
			});
			compilations.add(injection);

			// WHEN
			const compiled = compilations.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal('12_a_345');
		});

		it('one insertion at start of', () => {
			const injections = new Compilations()

			// GIVEN
			const orig = "12345";
			const compilations = new CodeInjection({
				code: '_a_',
				documentation: { title: 'hover' },
				offset: 0,
				doesNotRequireWhitespaceSurrounding: true,
			});
			injections.add(compilations);

			// WHEN
			const compiled = injections.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal('_a_12345');
		});

		it('one insertion at end of', () => {
			const compilations = new Compilations()

			// GIVEN
			const orig = "12345";
			const injection = new CodeInjection({
				code: '_a_',
				documentation: { title: 'hover' },
				offset: orig.length,
				doesNotRequireWhitespaceSurrounding: true,
			});
			compilations.add(injection);

			// WHEN
			const compiled = compilations.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal('12345_a_');
		});

		it('one replacement', () => {
			const compilations = new Compilations()

			// GIVEN
			const orig = "12345";
			const replacement = new CodeReplacement({
				origCode: '3',
				newCode: 'aaa',
				documentation: { title: 'hover' },
				offset: orig.indexOf('3'),
			});
			compilations.add(replacement);

			// WHEN
			const compiled = compilations.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal('12aaa45');
		});

		it('replacement followed by insertion', () => {
			const compilations = new Compilations()

			// GIVEN
			const orig = "12345";
			const replacement = new CodeReplacement({
				origCode: '3',
				newCode: 'aaa',
				documentation: { title: 'hover' },
				offset: orig.indexOf('3'),
			});
			compilations.add(replacement);

			const injection = new CodeInjection({
				code: 'B',
				offset: orig.indexOf('4'),
				documentation: { title: 'hover' },
				doesNotRequireWhitespaceSurrounding: true,
			});
			compilations.add(injection);

			// WHEN
			const compiled = compilations.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal('12aaaB45');
		});

		it('replacement and insertion at the same place', () => {
			const compilations = new Compilations()

			// GIVEN
			const orig = "12345";
			const offset = orig.indexOf('3');
			const replacement = new CodeReplacement({
				origCode: '3',
				newCode: 'aaa',
				documentation: { title: 'hover' },
				offset: offset,
			});
			compilations.add(replacement);

			const injection = new CodeInjection({
				code: 'B',
				offset: offset,
				documentation: {title: 'hover'},
				doesNotRequireWhitespaceSurrounding: true,
			});
			compilations.add(injection);

			// WHEN
			const compiled = compilations.applyAll(orig);

			// THEN
			expect(compiled).to.be.equal('12Baaa45');
		});
	});
});