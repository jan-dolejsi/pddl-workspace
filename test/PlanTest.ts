/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { URI } from "vscode-uri";
import { PddlSyntaxTree, } from "./parser/src";
import {
    Plan, PlanStep, HelpfulAction, HappeningType, PddlRange, InstantAction, DomainInfo,
    TypeObjectMap, ProblemInfo, DocumentPositionResolver, SimpleDocumentPositionResolver
} from "./src";
import { DirectionalGraph } from './utils/src';
const expect = require('chai').expect;

function createPositionResolver(): DocumentPositionResolver {
    return new SimpleDocumentPositionResolver('');
}

describe("Plan", () => {
    describe("#metric", () => {
        it("returns makespan if metric undefined", () => {
            const planStep = new PlanStep(0.001, 'action1', true, 10, undefined);
            const helpfulAction: HelpfulAction = {
                actionName: "Helpful",
                kind: HappeningType.INSTANTANEOUS
            };
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            domain.setActions([new InstantAction("action1", [], PddlRange.createFullLineRange(0))]);
            domain.setTypeInheritance(new DirectionalGraph().addEdge("type1", "object"));
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            problem.setObjects(new TypeObjectMap().add("type1", "obj1"));

            const statesEvaluated = 111;

            // WHEN
            const plan = new Plan([planStep], domain, problem, 13, [helpfulAction]);
            plan.statesEvaluated = statesEvaluated;

            // THEN
            expect(plan.makespan).to.be.equal(10.001);
            expect(plan.metric).to.equal(plan.makespan);
            expect(plan.steps).to.be.deep.equal([planStep]);
        });
    });

    describe("#clone", () => {
        it('clones', () => {
            const planStep = new PlanStep(0.001, 'action1', true, 10, undefined);
            const helpfulAction: HelpfulAction = {
                actionName: "Helpful",
                kind: HappeningType.INSTANTANEOUS
            };
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            domain.setActions([new InstantAction("action1", [], PddlRange.createFullLineRange(0))]);
            domain.setTypeInheritance(new DirectionalGraph().addEdge("type1", "object"));
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            problem.setObjects(new TypeObjectMap().add("type1", "obj1"));

            const metric = 123.456;
            const statesEvaluated = 111;

            const plan = new Plan([planStep], domain, problem, 13, [helpfulAction]);
            plan.metric = metric;
            plan.statesEvaluated = statesEvaluated;

            const wiredPlan = JSON.parse(JSON.stringify(plan));

            // WHEN

            const actual = Plan.clone(wiredPlan);

            // THEN
            expect(actual).to.not.be.undefined;
            expect(actual.metric).to.equal(metric);
            expect(actual.steps).to.be.deep.equal([planStep]);
            expect(actual.helpfulActions).to.be.deep.equal([helpfulAction]);
            expect(actual.makespan).to.be.equal(plan.makespan);
            expect(actual.statesEvaluated).to.be.equal(plan.statesEvaluated);
            expect(actual.domain?.getActions().map(a => a.getNameOrEmpty())).to.deep.equal(plan.domain?.getActions().map(a => a.getNameOrEmpty()));
            expect(actual.domain?.getTypes()).to.deep.equal(["type1"]);
            // expect(actual.problem?.getObjectsTypeMap()).to.be.deep.equal(plan.problem?.getObjectsTypeMap());
            expect(actual.problem?.getObjects("type1")).to.deep.equal(["obj1"]);

            const allTypeObjects = actual.problem && actual.domain?.getConstants().merge(actual.problem.getObjectsTypeMap());
            expect(allTypeObjects).to.not.be.undefined;
            expect(allTypeObjects?.getTypeOf("obj1")?.type).to.equal('type1');
        });

        it('clones plan with metric=0', () => {
            const planStep = new PlanStep(0.001, 'action1', true, 10, undefined);
            const helpfulAction: HelpfulAction = {
                actionName: "Helpful",
                kind: HappeningType.INSTANTANEOUS
            };
            const domain = new DomainInfo(URI.parse("file:///fake"), 1, "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            domain.setActions([new InstantAction("action1", [], PddlRange.createFullLineRange(0))]);
            domain.setTypeInheritance(new DirectionalGraph().addEdge("type1", "object"));
            const problem = new ProblemInfo(URI.parse("file:///fake"), 1, "problem1", "domain1", PddlSyntaxTree.EMPTY, createPositionResolver());
            problem.setObjects(new TypeObjectMap().add("type1", "obj1"));

            const metric = 0;
            const statesEvaluated = 111;

            const plan = new Plan([planStep], domain, problem, 13, [helpfulAction]);
            plan.metric = metric;
            plan.statesEvaluated = statesEvaluated;

            const wiredPlan = JSON.parse(JSON.stringify(plan));

            // WHEN

            const actual = Plan.clone(wiredPlan);

            // THEN
            expect(actual).to.not.be.undefined;
            expect(actual.metric).to.equal(metric);
            expect(actual.steps).to.be.deep.equal([planStep]);
            expect(actual.helpfulActions).to.be.deep.equal([helpfulAction]);
            expect(actual.makespan).to.be.equal(plan.makespan);
            expect(actual.statesEvaluated).to.be.equal(plan.statesEvaluated);
            expect(actual.domain?.getActions().map(a => a.getNameOrEmpty())).to.deep.equal(plan.domain?.getActions().map(a => a.getNameOrEmpty()));
            expect(actual.domain?.getTypes()).to.deep.equal(["type1"]);
            // expect(actual.problem?.getObjectsTypeMap()).to.be.deep.equal(plan.problem?.getObjectsTypeMap());
            expect(actual.problem?.getObjects("type1")).to.deep.equal(["obj1"]);

            const allTypeObjects = actual.problem && actual.domain?.getConstants().merge(actual.problem.getObjectsTypeMap());
            expect(allTypeObjects).to.not.be.undefined;
            expect(allTypeObjects?.getTypeOf("obj1")?.type).to.equal('type1');
        });
    });
});