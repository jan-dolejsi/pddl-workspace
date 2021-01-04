/* --------------------------------------------------------------------------------------------
* Copyright (c) Jan Dolejsi. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.
* ------------------------------------------------------------------------------------------ */

/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ProblemParserPreProcessor } from "../ProblemParserPreProcessor";
import { dirname } from "path";
import { DocumentPositionResolver, SimpleDocumentPositionResolver, PddlRange } from "../DocumentPositionResolver";
import { PddlSyntaxTree } from "./PddlSyntaxTree";
import { ParsingProblem, stripComments } from "../FileInfo";
import { PreProcessingError, PreProcessor } from "../PreProcessors";
import { PddlExtensionContext } from "../PddlExtensionContext";
import { ProblemInfo, TimedVariableValue, VariableValue, SupplyDemand, UnsupportedVariableValue, Metric } from "../ProblemInfo";
import { PddlDomainParser } from "./PddlDomainParser";
import { PddlSyntaxNode } from "./PddlSyntaxNode";
import { PddlTokenType, isOpenBracket } from "./PddlTokenizer";
import { PddlInheritanceParser } from "./PddlInheritanceParser";
import { PddlConstraintsParser } from "./PddlConstraintsParser";
import { PddlSyntaxTreeBuilder } from "./PddlSyntaxTreeBuilder";
import { PddlFileParser } from "./PddlFileParser";
import { URI } from "vscode-uri";
import { MetricParser } from "./MetricParser";

/**
 * Planning Problem parser.
 */
export class PddlProblemParser extends PddlFileParser<ProblemInfo> {

    private problemPreParser: ProblemParserPreProcessor | undefined;
    private problemPattern = /^\s*\(define\s*\(problem\s+(\S+)\s*\)\s*\(:domain\s+([^\r\n\t\f\v \)]+)\s*\)/gi;

    constructor(context?: PddlExtensionContext) {
        super();
        if (context) {
            this.problemPreParser = new ProblemParserPreProcessor(context);
        }
    }

    static async parseText(problemText: string, fileNameOrIdentifier = URI.parse('file:///noname'), version = -1): Promise<ProblemInfo | undefined> {
        const parser = new PddlSyntaxTreeBuilder(problemText);
        const syntaxTree = parser.getTree();

        const positionResolver = new SimpleDocumentPositionResolver(problemText);

        return await new PddlProblemParser()
            .tryParse(fileNameOrIdentifier, version, problemText, syntaxTree, positionResolver);
    }

    async tryParse(fileUri: URI, fileVersion: number, fileText: string, syntaxTree: PddlSyntaxTree, positionResolver: DocumentPositionResolver): Promise<ProblemInfo | undefined> {
        let preProcessor: PreProcessor | undefined;

        if (this.problemPreParser) {
            try {
                preProcessor = this.problemPreParser.createPreProcessor(fileText);
                const filePath = fileUri.fsPath;
                const workingDirectory = dirname(filePath);
                fileText = await this.problemPreParser.process(preProcessor!, fileText, workingDirectory);
            } catch (ex) {
                const problemInfo = new ProblemInfo(fileUri, fileVersion, "unknown", "unknown", PddlSyntaxTree.EMPTY, positionResolver);
                problemInfo.setText(fileText);
                if (ex instanceof PreProcessingError) {
                    const parsingError = ex as PreProcessingError;
                    problemInfo.addProblems([new ParsingProblem(parsingError.message, "error", PddlRange.createSingleCharacterRange({ line: parsingError.line, character: parsingError.column }))]);
                }
                else {
                    const line = positionResolver.resolveToPosition(preProcessor?.metaDataLineOffset || 0).line;
                    problemInfo.addProblems([new ParsingProblem(ex.message || ex, "error", PddlRange.createFullLineRange(line))]);
                }
                if (preProcessor) { problemInfo.setPreParsingPreProcessor(preProcessor); }
                return problemInfo;
            }
        }

        const pddlText = stripComments(fileText);

        this.problemPattern.lastIndex = 0;
        const matchGroups = this.problemPattern.exec(pddlText);

        if (matchGroups) {
            const problemName = matchGroups[1];
            const domainName = matchGroups[2];

            const problemInfo = new ProblemInfo(fileUri, fileVersion, problemName, domainName, syntaxTree, positionResolver);
            problemInfo.setText(fileText);
            this.getProblemStructure(problemInfo);
            if (preProcessor) { problemInfo.setPreParsingPreProcessor(preProcessor); }
            return problemInfo;
        }
        else {
            return undefined;
        }
    }

    getProblemStructure(problemInfo: ProblemInfo): void {
        const defineNode = problemInfo.syntaxTree.getDefineNodeOrThrow();
        PddlDomainParser.parseRequirements(defineNode, problemInfo);

        const objectsNode = defineNode.getFirstOpenBracket(':objects');
        if (objectsNode) {
            const objectsText = objectsNode.getNestedNonCommentText();
            problemInfo.setObjects(PddlInheritanceParser.toTypeObjects(PddlInheritanceParser.parseInheritance(objectsText)));
        }

        const initNode = defineNode.getFirstOpenBracket(':init');
        if (initNode) {
            const [values, supplyDemands] = this.parseInitSection(initNode);
            problemInfo.setInits(values);
            problemInfo.setSupplyDemands(supplyDemands);
        }

        const constraintsNode = defineNode.getFirstOpenBracket(':constraints');
        if (constraintsNode) {
            const constraints = new PddlConstraintsParser().parseConstraints(constraintsNode);
            problemInfo.setConstraints(constraints);
        }

        const metrics = this.parseMetrics(defineNode, problemInfo.getDocumentPositionResolver());
        problemInfo.setMetrics(metrics);
    }

    /**
     * Parses problem :init section.
     * @param initNode init syntax node
     */
    parseInitSection(initNode: PddlSyntaxNode): [TimedVariableValue[], SupplyDemand[]] {
        const timedVariableValues = initNode.getChildren()
            .filter(node => isOpenBracket(node.getToken()))
            .filter(node => node.getToken().tokenText.match(/\(\s*supply-demand/i) === null)
            .map(bracket => this.parseInit(bracket))
            .filter(init => !!init).map(init => init!);

        const supplyDemands = initNode.getChildrenOfType(PddlTokenType.OpenBracketOperator, /\(\s*supply-demand/i)
            .map(bracket => this.parseSupplyDemand(bracket))
            .filter(sd => !!sd).map(sd => sd!);

        return [timedVariableValues, supplyDemands];
    }

    parseInit(bracket: PddlSyntaxNode): TimedVariableValue | undefined {

        if (bracket.getToken().tokenText === '(at') {
            const tokens = bracket.getNonWhitespaceChildren()
                .filter(n => n.isNotType(PddlTokenType.Comment));

            if (tokens.length > 1) {
                const time = parseFloat(tokens[0].getText());
                if (!Number.isNaN(time)) {
                    const variableValue = this.parseVariableValue(tokens[1]);
                    if (variableValue) {
                        return TimedVariableValue.from(time, variableValue);
                    }
                }
            }
        }

        const variableValue = this.parseVariableValue(bracket);
        if (variableValue) {
            return TimedVariableValue.from(0, variableValue);
        }

        return undefined;
    }

    parseVariableValue(node: PddlSyntaxNode): VariableValue | undefined {
        if (node === undefined) {
            return undefined;
        }
        else if (node.getToken().tokenText === '(=') {
            const tokens = node.getNonWhitespaceChildren()
                .filter(n => n.isNotType(PddlTokenType.Comment));

            if (tokens.length > 1) {
                if (tokens[0].isType(PddlTokenType.OpenBracket) && tokens[1].isType(PddlTokenType.Other)) {
                    const variableName = tokens[0].getNestedText();
                    const value = parseFloat(tokens[1].getText());
                    return new VariableValue(variableName, value);
                }
            }
            return undefined;
        }
        else if (node.getToken().tokenText === '(not') {
            const nested = node.getFirstChild(PddlTokenType.OpenBracket, /.*/) ?? node.getFirstChild(PddlTokenType.OpenBracketOperator, /.*/);
            if (!nested) {
                return undefined;
            }
            else {
                return this.parseVariableValue(nested)?.negate();
            }
        }
        else if (['(forall', '(assign', '(increase', '(decrease'].includes(node.getToken().tokenText)) {
            return new UnsupportedVariableValue(node.getText());
        }
        else {
            if (node.getChildren().some(child => isOpenBracket(child.getToken()))) { return undefined; }
            const variableName = node.getToken().tokenText.substr(1) + node.getNestedText();
            return new VariableValue(variableName, true);
        }
    }

    parseSupplyDemand(node: PddlSyntaxNode): SupplyDemand | undefined {
        const tokens = node.getNonWhitespaceChildren();
        if (tokens.length > 0 && tokens[0].isType(PddlTokenType.Other)) {
            return new SupplyDemand(tokens[0].getText());
        }
        else {
            return undefined;
        }
    }

    parseMetrics(defineNode: PddlSyntaxNode, positionResolver: DocumentPositionResolver): Metric[] {
        return defineNode.getChildrenOfType(PddlTokenType.OpenBracketOperator, new RegExp("\\(\\s*:metric$"))
            .map(metricNode => new MetricParser(metricNode, positionResolver).getMetric())
            .filter(metric => !!metric)
            .map(metric => metric!);
    }
}