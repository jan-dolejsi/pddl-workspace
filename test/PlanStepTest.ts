import { PlanStep, PlanStepCommitment } from "./src";

const expect = require('chai').expect;

describe("PlanStep", () => {
    describe("#constructor", () => {
        it('defaults to 1 iteration', () => {
            const planStep = new PlanStep(0.001, 'action1', true, 10, undefined);
            expect(planStep.isDurative).to.be.equal(true);
            expect(planStep.getDuration()).to.be.equal(10);
            expect(planStep.getIterations()).to.be.equal(1);
        });
    });

    describe("#getIterations", () => {
        it('returns n iterations', () => {
            const iterations = 2;
            const commitment = PlanStepCommitment.StartsInRelaxedPlan;

            const planStep = new PlanStep(0.001, 'action1', true, 10, undefined, commitment, iterations);

            expect(planStep.commitment).to.be.equal(commitment);
            expect(planStep.getIterations()).to.be.equal(iterations);
        });
    });

    describe("#clone", () => {
        it('clones', () => {
            const iterations = 2;
            const commitment = PlanStepCommitment.StartsInRelaxedPlan;

            const planStep = new PlanStep(0.001, 'action1', true, 10, undefined, commitment, iterations);

            const actual = PlanStep.clone(planStep);

            expect(actual).to.not.be.undefined;
            expect(actual.commitment).to.be.equal(commitment);
            expect(planStep.getIterations()).to.be.equal(iterations);
        });
    });
});