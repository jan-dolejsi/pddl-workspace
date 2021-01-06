/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { SearchHappening } from "./SearchHappening";
import { HelpfulAction } from '..';

/** State generated in the process of the plan search. */
export class SearchState {

    /** Heuristic value. If the state was evaluated. */
    public h: number | undefined;

    /** Total (planhead + relaxed plan) makespan. If the state was evaluated. */
    public totalMakespan: number | undefined;

    /** Relaxed plan makespan. If the state was evaluated. */
    public relaxedPlan: SearchHappening[] | undefined;

    /** Helpful actions for this state. If the state was evaluated. */
    public helpfulActions: HelpfulAction[] | undefined;

    /** Is dead-end. If the state was evaluated. */
    public isDeadEnd: boolean | undefined;

    /** 
     * State was already visited, or is worse than another state already visited. 
     * If the state was actually created and validated by the memoisation. States that are deemed visited/worse are trimmed in the search tree. 
     */
    public wasVisitedOrIsWorse: boolean | undefined;
    
    /** This state meets the goal criteria and other applicable criteria to represent the end-state of a plan. */
    public isPlan = false;

    private _isEvaluated = false;

    /**
     * Search state constructor.
     * @param id state ID (assigned when received from the planner)
     * @param origId original/external state ID (by which the planner refers to it)
     * @param g generation (initial state is gen 0)
     * @param earliestTime earliest time this state may be scheduled
     * @param planHead plan head (list of happening starting from the initial state)
     * @param landmarks number of landmarks encountered up to this state
     * @param parentId parent state id
     * @param actionName action applied to create this state
     */
    constructor(public readonly id: number, public readonly origId: string, public readonly g: number,
        public readonly earliestTime: number, public readonly planHead: SearchHappening[],
        public readonly landmarks: number,
        public readonly parentId?: number, public readonly actionName?: string) {

    }

    /** Creates initial search state. */
    static createInitial(): SearchState {
        return new SearchState(0, "0", 0, 0, [], 0);
    }

    get isEvaluated(): boolean {
        return this._isEvaluated;
    }

    /**
     * Records state evaluation.
     * @param h heuristic value
     * @param totalMakespan total plan makespan (plan head plus relaxed plan makespan)
     * @param helpfulActions helpful action list
     * @param relaxedPlan relaxed plan
     */
    evaluate(h: number, totalMakespan: number, helpfulActions: HelpfulAction[], relaxedPlan: SearchHappening[]): SearchState {
        this.h = h;
        this.totalMakespan = totalMakespan;
        this.helpfulActions = helpfulActions;
        this.relaxedPlan = relaxedPlan;
        this.isDeadEnd = false;
        this._isEvaluated = true;

        return this;
    }

    /**
     * Makes this state a search dead-end.
     */
    setDeadEnd(): SearchState {
        this.h = Number.POSITIVE_INFINITY;
        this.totalMakespan = Number.POSITIVE_INFINITY;
        this.helpfulActions = [];
        this.relaxedPlan = [];
        this.isDeadEnd = true;
        this._isEvaluated = true;

        return this;
    }

    /**
     * Makes this state trimmed by state memoisation.
     */
    setVisitedOrIsWorse(): SearchState {
        this.wasVisitedOrIsWorse = true;
        return this;
    }

    /** Returns the plan head, and if present, the actions from the relaxed plan. */
    getTotalPlan(): SearchHappening[] {
        if (this.relaxedPlan) {
            return this.planHead.concat(this.relaxedPlan);
        }
        else {
            return this.planHead;
        }
    }

    toString(): string {
        return `State={origId: ${this.origId}, G: ${this.g}, Action: ${this.actionName}, O: ${this.id}, Time: ${this.earliestTime}, parent: ${this.parentId} H: ${this.h}, Makespan: ${this.totalMakespan}}`;
    }
}