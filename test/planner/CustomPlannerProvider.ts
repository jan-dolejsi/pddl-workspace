/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2020. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { PddlWorkspaceExtension, planner, OutputAdaptor } from '../../src';
import { URI } from 'vscode-uri';

export const plannerKind = planner.WellKnownPlannerKind.SERVICE_SYNC.derive("my-planning-service");

/**
 * Wrapper for a PDDL planning service.
 */
export class SolveServicePlannerProvider implements planner.PlannerProvider {
    get kind(): planner.PlannerKind {
        return plannerKind;
    }
    getNewPlannerLabel(): string {
        return "$(cloud-upload) Input a sync. service URL...";
    }

    async configurePlanner(previousConfiguration?: planner.PlannerConfiguration): Promise<planner.PlannerConfiguration | undefined> {
        const existingValue = previousConfiguration?.url ?? "http://solver.planning.domains/solve";

        const previouslyUsedUri = URI.parse(existingValue);

        /*
        Following snippet would ask the user inside VS Code to provide the URL.

        const indexOf = existingValue.indexOf(existingUri.authority);
        const existingHostAndPort: [number, number] | undefined
            = indexOf > -1 ? [indexOf, indexOf + existingUri.authority.length] : undefined;

        const newPlannerUrl = await window.showInputBox({
            prompt: "Enter synchronous service URL",
            placeHolder: `http://host:port/solve`,
            valueSelection: existingHostAndPort,
            value: existingValue,
            ignoreFocusOut: true
        });
        */

        console.log(`Previously, you configured ${previouslyUsedUri.toString()}, what do you want to change it to?`);

        // let's pretend the user entered 'http://solver.planning.domains/solve'

        const newPlannerUrl = 'http://solver.planning.domains/solve';

        return this.createPlannerConfiguration(newPlannerUrl);
    }

    createPlannerConfiguration(newPlannerUrl: string): planner.PlannerConfiguration {
        return {
            kind: this.kind.kind,
            url: newPlannerUrl,
            title: newPlannerUrl,
            canConfigure: true
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    showHelp(_output: OutputAdaptor): void {
        // this is reserved for later
    }
    createPlanner(): planner.Planner {
        // this is reserved for later
        throw new Error("Method not implemented.");
    }
}


/**
 * Example custom Planner Provider extension.
 */
export class CustomPlannerProviderExtension implements PddlWorkspaceExtension {
    getPlannerProvider(): planner.PlannerProvider[] | undefined {
        return [new SolveServicePlannerProvider()];
    }
}
