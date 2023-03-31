import { describe, it, expect } from 'vitest';

describe("MyClass", () => {
	describe("#member()", () => {
		it('simple assertion should pass', () => {
			expect(true).to.be.equal(true);
		});
	});
});