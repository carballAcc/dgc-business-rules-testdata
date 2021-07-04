import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { evaluate } from "certlogic-js"
const { fail, isTrue } = require("chai").assert
const deepEqual = require("deep-equal")

import { writeHtml, writeJson } from "./file-utils"
import { mapValues } from "./func-utils"
import { fromRepoRoot } from "./paths"
import { ruleSets } from "./rule-sets"
import { TestResults } from "./typings"
import { validateRule } from "./validate"
import { AllRuleSetsWithTestsResults } from "./all-rule-sets-with-tests-results"


const asPrettyText = (json: any) => JSON.stringify(json, null, 2)


const testResults: TestResults =
    mapValues(ruleSets, (ruleSetId, ruleSet) =>
        mapValues(ruleSet, (ruleId, ruleWithTests) => {
            const rule = ruleWithTests.def
            return mapValues(ruleWithTests.tests, (testId, test) => {
                const { payload, external, expected } = test
                try {
                    const actual = evaluate(rule.Logic, { payload, external })
                    return { actual, asExpected: deepEqual(actual, expected) }
                } catch (e) {
                    return {
                        evaluationErrorMessage: e.message
                    }
                }
            })
        })
    )

writeJson(fromRepoRoot("out", "results-all-rules-tests.json"), testResults)


for (const [ ruleSetId, ruleSet ] of Object.entries(ruleSets)) {
    for (const [ ruleId, ruleWithTests ] of Object.entries(ruleSet)) {
        const ruleText = `rule "${ruleId}" in set "${ruleSetId}"`
        describe(ruleText, () => {
            const rule = ruleWithTests.def
            it("validates against rule's JSON Schema, other checks, and CertLogic spec", () => {
                const {
                    schemaValidationsErrors,
                    affectedFields,
                    logicValidationErrors,
                    metaDataErrors
                } = validateRule(rule)
                isTrue(
                    schemaValidationsErrors.length === 0,
                    `${ruleText} has schema validation errors: ${schemaValidationsErrors.join(", ")}`
                )
                if (affectedFields) {
                    isTrue(
                        deepEqual(affectedFields.actual, affectedFields.computed),
                        `${ruleText} specifies other affected fields than computed from its CertLogic expression (actual vs. computed)`
                    )
                }
                isTrue(
                    logicValidationErrors.length === 0,
                    `CertLogic expression in ${ruleText} has validation errors: ${asPrettyText(logicValidationErrors)}`
                )
                isTrue(
                    metaDataErrors.length === 0,
                    `meta data of ${ruleText} has validation errors: ${metaDataErrors.join(", ")}`
                )
            })
            for (const [ testId, test ] of Object.entries(ruleWithTests.tests)) {
                const { name } = test
                const testResult = testResults[ruleSetId][ruleId][testId]
                it(`${(name || "<no name>")} (test-ID=${testId})`, () => {
                    if ("evaluationErrorMessage" in testResult) {
                        fail(`exception occurred during evaluation of CertLogic expression: ${testResult.evaluationErrorMessage}`)
                    } else {
                        isTrue(
                            testResult.asExpected,
                            `test with ID "${testId}" of ${ruleText} doesn't evaluate to expected value`
                        )
                    }
                })
            }
        })
    }
}


describe.only(`writing HTML for all rules' tests`, () => {

    it(`done`, () => {
        writeHtml(
            fromRepoRoot("html", "all-rule-sets-with-tests-results.html"),
            renderToStaticMarkup(<AllRuleSetsWithTestsResults ruleSets={ruleSets} testResults={testResults} />)
        )
    })

})

