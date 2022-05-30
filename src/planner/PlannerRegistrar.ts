/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlannerProvider } from "./PlannerProvider";
import { StringifyingMap } from "../utils";

/** Keeps track of planner providers. */
export class PlannerRegistrar {
    private readonly providers = new PlannerProviderMap();

    /**
     * Extensions should call this method to register their planner wrapper.
     * @param kind planner kind this `provider` supports
     * @param provider planner provider
     */
    registerPlannerProvider(kind: PlannerKind, provider: PlannerProvider): void {
        if (this.providers.has(kind)) {
            throw new Error(`Planner provider for kind '${kind.kind}' is already registered.`);
        }
        this.providers.set(kind, provider);
    }

    getPlannerProviders(): PlannerProvider[] {
        return this.providers.valueList();
    }

    getPlannerProvider(kind: PlannerKind): PlannerProvider | undefined {
        return this.providers.get(kind);
    }
}

export class PlannerKind {
    constructor(public readonly kind: string) { }

    /**
     * Derives a kind of planner implementation/variant.
     * @param implementation implementation/variant name
     * @returns new planner kind
     */
    derive(implementation: string): PlannerKind {
        return new PlannerKind(this.kind + ':' + implementation);
    }
}

export class WellKnownPlannerKind {
    public static readonly EXECUTABLE = new PlannerKind("EXECUTABLE");
    public static readonly JAVA_JAR = new PlannerKind("JAVA_JAR");
    public static readonly NODE_JS_SCRIPT = new PlannerKind("NODE_JS_SCRIPT");
    public static readonly COMMAND = new PlannerKind("COMMAND");
    public static readonly SERVICE_SYNC = new PlannerKind("SERVICE_SYNC");
    public static readonly SERVICE_ASYNC = new PlannerKind("SERVICE_ASYNC");
    public static readonly PLANNING_AS_A_SERVICE = new PlannerKind("PLANNING_AS_A_SERVICE");
    public static readonly PLANNING_AS_A_SERVICE_PREVIEW = new PlannerKind("PLANNING_AS_A_SERVICE_PREVIEW");
}

class PlannerProviderMap extends StringifyingMap<PlannerKind, PlannerProvider> {
    protected stringifyKey(key: PlannerKind): string {
        return key.kind;
    }
}