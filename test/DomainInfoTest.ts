/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { describe, it, expect } from 'vitest';

import { PddlRange } from './src';
import { createPddlDomainParser } from './parser/PddlDomainParserTest';

describe('DomainInfo', () => {

    describe('#getTypeLocation', () => {
        it('finds type location in multi-line declaration', () => {
            // GIVEN
            const domainPddl = `(define (domain generator)
            (:requirements :fluents :durative-actions :duration-inequalities
                    :negative-preconditions :typing)
            
            (:types generator tankstelle ; comment
            tank)
            `;

            const domainInfo = createPddlDomainParser(domainPddl);
            if (domainInfo === undefined) {
                assert.fail("could not parse domain");
            }

            // WHEN
            const range = domainInfo.getTypeLocation('tank');

            // THEN
            expect(range, "range should not be null").to.not.be.undefined;
            expect(range).to.deep.equal(PddlRange.createSingleLineRange({ line: 5, start: 12, end: 16 }));
        });

        it('finds type location in single line declaration', () => {
            // GIVEN
            const domainPddl = `(define (domain generator) (:types generator tankstelle tank)`;
            const domainInfo = createPddlDomainParser(domainPddl);
            if (domainInfo === undefined) { assert.fail('should parse'); }

            // WHEN
            const range = domainInfo.getTypeLocation('tank');

            // THEN
            expect(range, "range should not be null").to.not.be.undefined;
            expect(range).to.deep.equal(PddlRange.createSingleLineRange({ line: 0, start: 56, length: 4 }));
        });
    });

    describe('#getTypeReferences', () => {
        it('finds all references', () => {
            // GIVEN
            const domainPddl = `(define (domain generator)
            (:requirements :fluents :durative-actions :duration-inequalities
                    :negative-preconditions :typing)
            
            (:types tank - generator)
            
            (:predicates 
                (generator-ran) ; Flags that the generator ran
                (used ?t - tank) ; To force the planner to empty the entire tank in one action (rather than bit by bit), we mark the tank as 'used'
            )
            
            (:functions 
                (fuel-level ?t - generator) ; Fuel level in the generator
                (fuel-reserve ?t - tank) ; Fuel reserve in the tank
                (refuel-rate ?g - generator) ; Refuel rate of the generator
                (capacity ?g - generator) ; Total fuel-capacity of the generator
            )
            
            (:durative-action generate
                :parameters (?g - generator)
                :duration (= ?duration  100) ; arbitrarily the duration is set to 100 time-units
                :condition 
                    (over all (>= (fuel-level ?g) 0))
                :effect (and 
                    (decrease (fuel-level ?g) (* #t 1))
                    (at end (generator-ran))
                )
            )
            `;
            const domainInfo = createPddlDomainParser(domainPddl);
            if (domainInfo === undefined) { assert.fail('should parse'); }

            const typeName = 'generator';

            // WHEN
            const ranges = domainInfo.getTypeReferences(typeName);

            // THEN
            expect(ranges).to.have.length(5, "there should be N hits");
            const range = ranges[0];
            expect(range).to.deep.equal(PddlRange.createSingleLineRange({ line: 4, start: 27, length: typeName.length }));
        });
    });

    describe('#getVariableReferences', () => {
        it('find all predicate references', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name)

(:requirements :typing)

(:types 
    tt1
)

(:constants 
    o1 - tt1
)

(:predicates 
    (p3 - tt1)
)


(:functions 
    (f11 - tt1)
)

(:action t11
    :parameters (?t1 - tt1)
    :precondition (and (p3 ?t1) (p3 ?t1) (p3 o1))
    :effect (and (increase (f11 ?t1) 1))
)
)`;
            const domainInfo = createPddlDomainParser(domainPddl);
            if (domainInfo === undefined) { assert.fail('should parse'); }
            assert.deepStrictEqual(domainInfo.getTypes(), ['tt1'], 'there should be 1 type');
            assert.deepStrictEqual(domainInfo.getPredicates().map(p => p.name), ['p3'], 'there should be 1 predicate');
            const p3 = domainInfo.getPredicates()[0];

            // WHEN
            const p3ReferenceRanges = domainInfo.getVariableReferences(p3);

            // THEN
            expect(p3ReferenceRanges).to.have.length(4, 'there should be 3 references to predicate p3');
            expect(p3ReferenceRanges[0]).to.deep.equal(PddlRange.createSingleLineRange({ line: 13, start: 4, end: 14 }), "the first reference location should be");
        });

        it('find no predicate references', () => {
            // GIVEN
            const domainPddl = `(define (domain domain_name)

(:predicates 
    (p0)
)

(:functions 
    (f11 - tt1)
)
; (p0) appears in a comment
(:action t11
    :parameters (?t1 - tt1)
    :precondition (and (p3 ?t1) (p3 ?t1) (p3 o1))
    :effect (and (increase (f11 ?t1) 1))
)
)`;
            const domainInfo = createPddlDomainParser(domainPddl);
            if (domainInfo === undefined) { assert.fail('should parse'); }
            assert.deepStrictEqual(domainInfo.getPredicates().map(p => p.name), ['p0'], 'there should be 1 predicate');
            const p0 = domainInfo.getPredicates()[0];

            // WHEN
            const p0ReferenceRanges = domainInfo.getVariableReferences(p0);

            // THEN
            expect(p0ReferenceRanges).to.have.length(1, 'there should be ONE references to predicate p0 - its declaration');
        });

    });
});