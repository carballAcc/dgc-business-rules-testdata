import { writeFileSync } from "fs"
import { format as prettify } from "prettier"
import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { CertLogicRendering } from "./CertLogic"
import { gatherRuleSets, RuleSet } from "./rule-sets"
import { Rule } from "./typings"


const RuleRendering = ({ rule }: { rule: Rule }) => <div className="row">
    <div className="cell"><span>{rule.Identifier}</span></div>
    <div className="cell"><span>{rule.Description[0].desc}</span></div>
    <div className="cell">
        <CertLogicRendering expr={rule.Logic} />
    </div>
</div>


const RuleSetRendering = ({ ruleSetId, ruleSet }: { ruleSetId: string, ruleSet: RuleSet }) => {
    return <html lang="en">
        <head>
            <meta charSet="utf-8"/>
            <link href="styling.css" rel="stylesheet"/>
            <title>Rule set: {ruleSetId}</title>
        </head>
        <body>
        <h1>Rule set: {ruleSetId}</h1>
        <div className="table">
            <div className="table-body">
                <div className="row header">
                    <div className="cell"><span>Identifier</span></div>
                    <div className="cell"><span>Description (EN)</span></div>
                    <div className="cell"><span>Logic (compactified notation)</span></div>
                </div>
                {Object.keys(ruleSet).map((ruleId, index) => <RuleRendering rule={ruleSet[ruleId].def} key={index}/>)}
            </div>
        </div>
        </body>
    </html>
}


const ruleSets = gatherRuleSets()

for (const [ ruleSetId, ruleSet ] of Object.entries(ruleSets)) {
    const htmlPath = `../html/${ruleSetId}.html`
    writeFileSync(
        htmlPath,
        prettify(
            "<!DOCTYPE html>" + renderToStaticMarkup(<RuleSetRendering ruleSetId={ruleSetId} ruleSet={ruleSet} />),
            { parser: "html" }
        )
    )
    console.log(`wrote HTML for rule set "${ruleSetId}"`)
}

