/*
 * Copyright (c) Jan Dolejsi 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
'use strict';

import { describe, it, expect } from 'vitest';
import { Parameter } from '../src/language';

describe("Parameter", () => {
	describe("#createPddlString()", () => {
		it('no param', () => {
			// GIVEN
			// WHEN
			const actual = Parameter.createPddlString();
			// THEN
			expect(actual).to.be.equal('');
		});

		it('one param', () => {
			// GIVEN
			const param = new Parameter('t1', 'type1');
			// WHEN
			const actual = Parameter.createPddlString(param);
			// THEN
			expect(actual).to.be.equal(param.toPddlString());
		});

		it('two different params', () => {
			// GIVEN
			const param1 = new Parameter('t1', 'type1');
			const param2 = new Parameter('t2', 'type2');
			// WHEN
			const actual = Parameter.createPddlString(param1, param2);
			// THEN
			expect(actual).to.be.equal(param1.toPddlString() + ' ' + param2.toPddlString());
		});
		
		it('two params of the same type', () => {
			// GIVEN
			const param1 = new Parameter('t1', 'typeA');
			const param2 = new Parameter('t2', 'typeA');
			// WHEN
			const actual = Parameter.createPddlString(param1, param2);
			// THEN
			expect(actual).to.be.equal('?t1 ?t2 - typeA');
		});
		
		it('mix of param types', () => {
			// GIVEN
			const param1 = new Parameter('t1', 'type1');
			const param2 = new Parameter('t2', 'typeA');
			const param3 = new Parameter('t3', 'typeA');
			const param4 = new Parameter('t4', 'type4');
			// WHEN
			const actual = Parameter.createPddlString(param1, param2, param3, param4);
			// THEN
			expect(actual).to.be.equal(param1.toPddlString() + ' ?t2 ?t3 - typeA ' + param4.toPddlString());
		});
	});
});