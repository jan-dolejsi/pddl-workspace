/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { ModelHierarchy, VariableReferenceKind } from './src';
import { createPddlDomainParser } from './parser/PddlDomainParserTest';
import { UnrecognizedStructure } from '../src/DomainInfo';

describe('ModelHierarchy', () => {

    describe('#getReferenceInfo', () => {
        it('should get predicate used in pre-condition', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:predicates (p))
            
            (:action a1
                :parameters ()
                :precondition (and (p))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const p = domainInfo?.getPredicates()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(p, pddlText.lastIndexOf('(p)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "condition", "part");
            assert.strictEqual(actual.relevantCode, "(p)", "relevant code");
        });

        it('should get predicate used in effect', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:predicates (p))
            
            (:action a1
                :parameters ()
                :effect (p)
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const p = domainInfo?.getPredicates()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(p, pddlText.lastIndexOf('(p)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.WRITE, "read/write kind");
            assert.strictEqual(actual.part, "effect", "part");
            assert.strictEqual(actual.relevantCode, "(p)", "relevant code");
        });

        it('should get negative predicate precondition', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:predicates (p))
            
            (:action a1
                :parameters ()
                :precondition (not (p))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const p = domainInfo?.getPredicates()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(p, pddlText.lastIndexOf('(p)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "condition", "part");
            assert.strictEqual(actual.relevantCode, "(not (p))", "relevant code");
        });
        
        it('should get predicate used in a not effect', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:predicates (p))
            
            (:action a1
                :parameters ()
                :effect (not (p))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const p = domainInfo?.getPredicates()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(p, pddlText.lastIndexOf('(p)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.WRITE, "read/write kind");
            assert.strictEqual(actual.part, "effect", "part");
            assert.strictEqual(actual.relevantCode, "(not (p))", "relevant code");
        });

        it('should get inequality precondition', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f))
            
            (:action a1
                :parameters ()
                :precondition (> (f) 0)
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const f = domainInfo?.getFunctions()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(f, pddlText.lastIndexOf('(f)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "condition", "part");
            assert.strictEqual(actual.relevantCode, "(> (f) 0)", "relevant code");
        });
        
        it('should get increase effect', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f))
            
            (:action a1
                :parameters ()
                :effect (increase (f) 3.14)
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const f = domainInfo?.getFunctions()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(f, pddlText.lastIndexOf('(f)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.WRITE, "read/write kind");
            assert.strictEqual(actual.part, "effect", "part");
            assert.strictEqual(actual.relevantCode, "(increase (f) 3.14)", "relevant code");
        });

        it('should get inequality at start condition', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f))
            
            (:durative-action a1
                :parameters ()
                :duration(= ?duration 1)
                :condition (at start (> (f) 0))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const f = domainInfo?.getFunctions()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(f, pddlText.lastIndexOf('(f)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "at start", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "condition", "part");
            assert.strictEqual(actual.relevantCode, "(> (f) 0)", "relevant code");
        });
        
        it('should get continuous effect', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f))
            
            (:durative-action a1
                :parameters ()
                :effect (increase (f) (* #t 3.14))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const f = domainInfo?.getFunctions()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(f, pddlText.lastIndexOf('(f)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.WRITE, "read/write kind");
            assert.strictEqual(actual.part, "effect", "part");
            assert.strictEqual(actual.relevantCode, "(increase (f) (* #t 3.14))", "relevant code");
        });

        it('should get duration', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f))
            
            (:durative-action a1
                :parameters ()
                :duration(= ?duration (f))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const f = domainInfo?.getFunctions()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(f, pddlText.lastIndexOf('(f)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "duration", "part");
            assert.strictEqual(actual.relevantCode, "(= ?duration (f))", "relevant code");
        });

        it('should get decrease right-hand side', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f)(g))
            
            (:durative-action a1
                :parameters ()
                :effect (at end (decrease (f) (g)))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const g = domainInfo?.getFunctions().find(f => f.name === 'g');
            if (!g) {
                throw new Error(`Could not find function (g).`);
            }

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(g, pddlText.lastIndexOf('(g)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "a1", "action name");
            assert.strictEqual(actual.getTimeQualifier(), "at end", "action time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "effect", "part");
            assert.strictEqual(actual.relevantCode, "(decrease (f) (g))", "relevant code");
        });

        it('should get predicate used in event pre-condition', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:predicates (p))
            
            (:event e1
                :parameters ()
                :precondition (and (p))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const p = domainInfo?.getPredicates()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(p, pddlText.lastIndexOf('(p)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "e1", "event name");
            assert.strictEqual(actual.getTimeQualifier(), "", "time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.READ, "read/write kind");
            assert.strictEqual(actual.part, "condition", "part");
            assert.strictEqual(actual.relevantCode, "(p)", "relevant code");
        });

        it('should get process effect effect', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:functions (f))
            
            (:process p1
                :parameters ()
                :effect (increase (f) (* #t 3.14))
            )
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const f = domainInfo?.getFunctions()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(f, pddlText.lastIndexOf('(f)') + 1);

            // THEN
            assert.strictEqual(actual.structure.getNameOrEmpty(), "p1", "process name");
            assert.strictEqual(actual.getTimeQualifier(), "", "time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.WRITE, "read/write kind");
            assert.strictEqual(actual.part, "effect", "part");
            assert.strictEqual(actual.relevantCode, "(increase (f) (* #t 3.14))", "relevant code");
        });

        it('should get predicate used in constraint', () => {
            // GIVEN
            const pddlText = `(define (domain d)

            (:predicates (p))
            
            (:constraints (and
                (sometime (p))
            ))
            )`;
            
            const domainInfo = createPddlDomainParser(pddlText);
            
            if (!domainInfo) { assert.fail("could not parse test PDDL"); }

            const p = domainInfo?.getPredicates()[0];

            // WHEN
            const actual = new ModelHierarchy(domainInfo).getReferenceInfo(p, pddlText.lastIndexOf('(p)') + 1);

            // THEN
            assert.ok(actual);
            assert.ok(actual.structure instanceof UnrecognizedStructure, "enclosing structure type should be UnrecognizedStructure");
            assert.strictEqual(actual.getTimeQualifier(), "", "time qualifier");
            assert.strictEqual(actual.kind, VariableReferenceKind.UNRECOGNIZED, "read/write kind"); // this should eventually by a READ
            assert.strictEqual(actual.part, "", "part");
            assert.strictEqual(actual.relevantCode, undefined, "relevant code"); // should be (sometime (p))
        });

    });
});
