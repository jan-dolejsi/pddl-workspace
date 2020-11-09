/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as assert from 'assert';
import { expect } from 'chai';
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
});
