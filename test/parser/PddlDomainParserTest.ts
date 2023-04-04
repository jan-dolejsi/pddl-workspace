/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { describe, it, expect } from 'vitest';

import { PddlSyntaxTreeBuilder } from './src';
import { SimpleDocumentPositionResolver, PddlRange } from '../src';
import { PddlDomainParser } from './src';
import { URI } from 'vscode-uri';
import { createPddlDomainParser } from './testUtils';

describe('PddlDomainParser', () => {

    describe('#constructor', () => {
        it('should parse domain from snippet template', () => {
            // GIVEN
            const domainPddl = `;Header and description

            (define (domain domain_name)
            
            ;remove requirements that are not needed
            (:requirements :strips :fluents :durative-actions :timed-initial-literals :typing :conditional-effects :negative-preconditions :duration-inequalities :equality)
            
            (:types ;todo: enumerate types and their hierarchy here, e.g. car truck bus - vehicle
            )
            
            ; un-comment following line if constants are needed e.g. red blue - car
            ;(:constants )
            
            (:predicates ;todo: define predicates here
            )
            
            
            (:functions ;todo: define numeric functions here
            )
            
            ;define actions here
            
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            assert.strictEqual(domainInfo?.name, 'domain_name');
            assert.ok(domainInfo?.getRequirements().length ?? 0 > 0, 'there should be requirements');
            assert.deepStrictEqual(domainInfo?.getTypes(), [], 'there should be no types');
            expect(domainInfo?.getConstants()).to.have.length(0, 'there should be no constants');
            assert.deepStrictEqual(domainInfo?.getPredicates(), [], 'there should be no predicates');
            assert.deepStrictEqual(domainInfo?.getFunctions(), [], 'there should be no functions');
            assert.deepStrictEqual(domainInfo?.getActions(), [], 'there should be no actions');
        });
    });

    describe('#tryDomain', () => {
        it('should parse domain meta', async () => {
            // GIVEN
            const fileText = `;Header and description

            (define (domain domain_name)
            ...
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(fileText).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(fileText);

            // WHEN
            const domainInfo = await new PddlDomainParser().tryParse(URI.parse('file:///file'), 0, fileText, syntaxTree, positionResolver);

            // THEN
            assert.notStrictEqual(domainInfo, null, 'domain should not be null');
            if (domainInfo === null) { return; }
            assert.strictEqual(domainInfo?.name, 'domain_name');
        });

        it('should return null on non-domain PDDL', async () => {
            // GIVEN
            const fileText = `;Header and description

            (define (problem name)
            ...
            `;
            const syntaxTree = new PddlSyntaxTreeBuilder(fileText).getTree();
            const positionResolver = new SimpleDocumentPositionResolver(fileText);

            // WHEN
            const domainInfo = await new PddlDomainParser().tryParse(URI.parse('file:///file'), 0, fileText, syntaxTree, positionResolver);

            // THEN
            assert.strictEqual(domainInfo, undefined, 'domain should be null');
        });
    });

    describe('#parseDerived', () => {
        const domainPddl = `(define (domain Depot-Derived)
        (:requirements :typing :durative-actions)
        (:types place locatable - object
                depot distributor - place
                truck hoist surface - locatable
                pallet crate - surface)
        
        (:predicates (at ?x - locatable ?y - place) 
                     (on ?x - crate ?y - surface)
                     (in ?x - crate ?y - truck)
                     (lifting ?x - hoist ?y - crate)
                     (available ?x - hoist)
                     (clear ?x - surface))
        
        ; can lift crate from the surface
        (:derived (can-lift ?c - crate ?s - surface) ; some additional comment within
           (and (clear ?c) (on ?c ?s)))
        
        (:derived (c) (+ (a) (b))
        ; simulate unfinished document)`;

        it('extracts one derived predicate', () => {
            // GIVEN
            const defineNode = new PddlSyntaxTreeBuilder(domainPddl).getTree().getDefineNodeOrThrow();

            // WHEN
            const derived = PddlDomainParser.parseDerived(defineNode, new SimpleDocumentPositionResolver(domainPddl));

            // THEN
            expect(derived).to.have.length(2, 'there should be 2 derived variables');
            assert.equal(derived[0].name, 'can-lift');
            assert.equal(derived[0].parameters.length, 2);
            assert.ok(derived[0].getDocumentation().join('\n').startsWith('can lift'));
            assert.equal(derived[1].name, 'c');
        });
    });

    describe('#parseDomainStructure', () => {
        it('extracts structure even when the :types section is not defined', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
            (:requirements :strips :negative-preconditions )
            (:predicates 
                (said_hello)
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getPredicates()).to.have.length(1, 'there should be 1 predicate');
            expect(domainInfo?.getTypes()).to.have.length(0, 'there should be 0 types');
            expect(domainInfo?.getFunctions()).to.have.length(0, 'there should be 0 functions');
        });

        it('extracts predicate', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
            (:requirements :strips :negative-preconditions )
            (:predicates 
                (said_hello)
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getPredicates()).to.have.length(1, 'there should be 1 predicate');
            expect(domainInfo?.getPredicates()[0].getFullName()).to.equal("said_hello", 'the predicate should be "said_hello"');
        });

        it('injects :job-scheduling types, predicates and functions', () => {
            // GIVEN
            const actionName = 'say_hello';
            const domainPddl = `(define (domain helloworld)
            (:requirements :job-scheduling )
            (:types other)
            (:predicates 
                (ready ?r - resource)
            )
            (:functions)
            (:job ${actionName}
                :parameters (?l - location ?r - resource ?o - other)
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo.getTypes(), "all domain types").to.deep.equal(["other", "available", "location", "resource"]);
            expect(domainInfo?.getPredicates().map(p => p.getFullName())).to.deep.equal([
                'ready ?r - resource',
                'is_available ?a - available',
                'located_at ?r - resource ?l - location',
                'busy ?r - resource',
                actionName + '_job_started ?l - location ?o - other',
                actionName + '_job_done ?l - location ?o - other'], 'there should be 1+5 predicates');
            expect(domainInfo?.getFunctions().map(p => p.getFullName())).to.deep.equal([
                'travel_time ?r - resource ?from - location ?to - location',
                actionName + '_job_duration ?l - location ?o - other',
            ], 'there should be 1+1 functions');
            
            const outputPddl = domainInfo.getCompilations().applyAll(domainPddl);
            expect(outputPddl, 'should remove :job-scheduling').to.not.match(/:job-scheduling/);
            expect(outputPddl, 'should require :durative-actions').to.match(/:durative-actions/);
            expect(outputPddl, 'injected :predicates').toMatch(/\(ready \?r - resource\)\s*\(is_available \?a/gm);
            expect(outputPddl, 'injected :functions').toMatch(/\(:functions\s*\(travel_time \?r - resource \?from - location \?to - location\) \(say_hello_job_duration \?l - location \?o - other\)\)/gm);
            expect(outputPddl, 'injected :types').toMatch(/\(:types location resource - available other/gm);
            expect(outputPddl, 'replaced :job by :durative-action').toMatch(/\(:durative-action say_hello\s+/gm);
            expect(outputPddl, 'injected :job duration').toMatch(/\(:durative-action say_hello\s+:parameters\s*\(\?l - location \?r - resource \?o - other\)\s*\:duration\s*\(=\s*\?duration\s*\(say_hello_job_duration \?l \?o\)\)/gm);
            expect(outputPddl, 'injected :job conditions').toMatch(/:condition \(and \(over all \(is_available \?l\)/gm);
            expect(outputPddl, 'injected :job effects').toMatch(/:effect \(and \(at start \(say_hello_job_started \?l \?o\)/gm);
            expect(outputPddl, 'injected move action').toMatch(/\(:durative-action move/gm);

            const jobCount = 1;
            expect(domainInfo.getCompilations().getAll(), "injections").toHaveLength(1 /* requirement */ + 3 + jobCount * 2 + 1 /* move action */);
        });

        it('extracts 2 predicates without whitespace', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
            (:requirements :strips )
            (:predicates 
                (p1)(p2)
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getPredicates()).to.have.length(2, 'there should be 2 predicate');
            assert.equal(domainInfo?.getPredicates()[0].getFullName(), "p1", 'the predicate should be "p1"');
            assert.equal(domainInfo?.getPredicates()[1].getFullName(), "p2", 'the predicate should be "p2"');
        });

        it('extracts function', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
            (:requirements :strips :negative-preconditions )
            (:functions 
                (count)
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getFunctions()).to.have.length(1, 'there should be 1 function');
            assert.equal(domainInfo?.getFunctions()[0].getFullName(), "count", 'the function should be "count"');
        });

        it('extracts types', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
            (:requirements :strips :negative-preconditions )
            (:types 
                type1
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getTypes()).to.have.length(1, 'there should be 1 type');
            expect(domainInfo?.getTypes()[0]).to.equal("type1", 'the function should be "count"');
            expect(domainInfo?.getTypeLocation('type1')).to.deep.equal(PddlRange.createSingleLineRange({ line: 3, start: 16, length: 'type1'.length }));
        });

        it('extracts types with dashes', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
            (:requirements :strips :negative-preconditions )
            (:types 
                some-type1
            )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getTypes()).to.have.length(1, 'there should be 1 type');
            expect(domainInfo?.getTypes()[0]).to.equal("some-type1", 'the function should be "count"');
        });

        it('extracts action', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
                (:action action1
                    :parameters (?p - type)
                    :precondition (and (not (p)))
                    :effect (and (p))
                )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getActions()).to.have.length(1, 'there should be 1 action');
            assert.equal(domainInfo?.getActions()[0].name, "action1", 'action name');
            assert.ok(!domainInfo?.getActions()[0].isDurative(), 'action should be durative');
        });

        it('extracts durative action', () => {
            // GIVEN
            const domainPddl = `(define (domain helloworld)
                (:durative-action action1
                    :parameters (?p - type)
                    :duration (= ?duration 1)
                    :condition (and (at start (not (p))))
                    :effect (and (at end (p)))
                )
            )`;

            // WHEN
            const domainInfo = createPddlDomainParser(domainPddl);

            // THEN
            expect(domainInfo).to.not.be.undefined;
            expect(domainInfo?.getActions()).to.have.length(1, 'there should be 1 action');
            assert.equal(domainInfo?.getActions()[0].name, "action1", 'action name');
            assert.ok(domainInfo?.getActions()[0].isDurative(), 'action should be durative');
        });
    });
});

