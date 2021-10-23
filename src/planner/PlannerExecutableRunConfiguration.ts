/* --------------------------------------------------------------------------------------------
 * Copyright (c) Jan Dolejsi 2021. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { PlannerRunConfiguration } from "./PlannerProvider";

/** PlannerExecutable run configuration. */
export interface PlannerExecutableRunConfiguration extends PlannerRunConfiguration {
    /** @deprecated use the syntax in the PlannerConfiguration */
    plannerSyntax?: string | undefined;
    workingDirectory: string;
}
