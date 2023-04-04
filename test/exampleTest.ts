/*
 * Copyright (c) Jan Dolejsi 2023. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
'use strict';

import { describe, it, expect } from 'vitest';

describe("MyClass", () => {
	describe("#member()", () => {
		it('simple assertion should pass', () => {
			expect(true).to.be.equal(true);
		});
	});
});