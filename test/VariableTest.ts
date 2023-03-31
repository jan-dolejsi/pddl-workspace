/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import { describe, it, expect } from 'vitest';
import { Variable, Parameter, ObjectInstance } from './src';

describe('Variable', () => {

    describe('#constructor', () => {

        it('constructs-lifted', () => {
            // GIVEN
            const variableName = "predicate1 ?p1 - type1";
    
            // WHEN
            const variable = new Variable(variableName, [new Parameter("p1", "type1")]);
    
            // THEN
            assert.equal(variable.getFullName(), variableName, "full name should be...");
            assert.equal(variable.declaredName, variableName, "declared name should be...");
            assert.equal(variable.name, "predicate1");
            assert.equal(variable.declaredNameWithoutTypes, "predicate1 ?p1");
            assert.equal(variable.isGrounded(), false, "should NOT be grounded");
            expect(variable.parameters).to.have.length(1);
        });
    
        it('constructs-grounded', () => {
            // GIVEN
            const variableName = "predicate1 ?p1 - type1";
    
            // WHEN
            const variable = new Variable(variableName, [new ObjectInstance("o1", "type1")]);
    
            // THEN
            assert.equal(variable.getFullName(), "predicate1 o1", "full name should be...");
            assert.equal(variable.declaredNameWithoutTypes, "predicate1 ?p1", "declared name without types should be...");
            assert.equal(variable.declaredName, variableName, "declared name should be...");
            assert.equal(variable.name, "predicate1");
            expect(variable.parameters).to.have.length(1);
            assert.equal(variable.isGrounded(), true, "should be grounded");
        });

        it('accepts names with dashes', () => {
            // GIVEN
            const variableName = "predi-cate1";
    
            // WHEN
            const variable = new Variable(variableName, []);
    
            // THEN
            assert.equal(variable.getFullName(), variableName, "full name should be...");
            assert.equal(variable.declaredName, variableName, "declared name should be...");
            assert.equal(variable.name, variableName, "the short un-parameterised name should be...");
            assert.equal(variable.declaredNameWithoutTypes, variableName, "the declared name without types should be...");
            expect(variable.parameters).to.have.length(0);
            assert.equal(variable.isGrounded(), true, "should be grounded");
        });
    });

    describe('#from', () => {

        it('from-lifted', () => {
            // GIVEN
            const variableName = "predicate1";
    
            // WHEN
            const variable = Variable.from(variableName, [new Parameter("t1", "type1"), new Parameter("t2", "type2")]);
    
            // THEN
            assert.equal(variable.getFullName(), variableName + ' ?t1 - type1 ?t2 - type2', "full name should be...");
            assert.equal(variable.name, variableName);
            assert.equal(variable.declaredNameWithoutTypes, "predicate1 ?t1 ?t2");
            assert.equal(variable.isGrounded(), false, "should NOT be grounded");
            expect(variable.parameters).to.have.length(2);
        });
    
        it('constructs-grounded', () => {
            // GIVEN
            const variableName = "predicate1";
    
            // WHEN
            const variable = Variable.from(variableName, [new ObjectInstance("o1", "type1"), new ObjectInstance("o2", "type1")]);
    
            // THEN
            assert.equal(variable.getFullName(), "predicate1 o1 o2", "full name should be...");
            assert.equal(variable.declaredNameWithoutTypes, "predicate1 o1 o2", "declared name without types should be...");
            // assert.equal(variable.declaredName, variableName, "declared name should be...");
            assert.equal(variable.name, variableName);
            expect(variable.parameters).to.have.length(2);
            assert.equal(variable.isGrounded(), true, "should be grounded");
        });
    });

    describe("#ground()", () => {
		it('Grounds to one object', () => {
			// GIVEN
            const variableName = "predicate1 ?p1 - type1";
            const p1 = new Parameter("p1", "type1");
            const variable = new Variable(variableName, [p1]);
			
			// WHEN
            const o1 = p1.object("o1");
            const groundedVariable = variable.ground([o1]);

			expect(groundedVariable.getFullName()).to.be.equal('predicate1 o1');
		});
	});

    describe("#bind()", () => {
		it('Binds to an action parameter', () => {
			// GIVEN
            const variableName = "predicate1 ?p1 - type1";
            const type1 = "type1";
            const p1 = new Parameter("p1", type1);
            const variable = new Variable(variableName, [p1]);
			
			// WHEN
            const p2 = new Parameter("p2", type1);
            const groundedVariable = variable.bind([p2]);

			expect(groundedVariable.getFullName()).to.be.equal('predicate1 ?p2 - type1');
			expect(groundedVariable.declaredNameWithoutTypes).to.be.equal('predicate1 ?p2');
			expect(groundedVariable.parameters).to.deep.equal([p2]);
		});
	});
});
