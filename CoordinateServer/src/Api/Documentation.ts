

import * as Core from 'LiteMol-core'
import ApiVersion from './Version'
import * as Queries from './Queries'

let docs: string | undefined = undefined;

export function getHTMLDocs(appPrefix: string) {
    if (docs) return docs;
    return (docs = createDocumentationHTML(appPrefix));
}

function createDocumentationHTML(appPrefix: string) {
    let html: string[] = [];

    html.push(
        `<!DOCTYPE html>`,
        `<html xmlns="http://www.w3.org/1999/xhtml">`,
        `<head>`,
        `<meta charset="utf-8" />`,
        `<title>LiteMol Coordinate Server (${ApiVersion})</title>`,
        `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" integrity="sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7" crossorigin="anonymous">`,
        `<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css" integrity="sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r" crossorigin="anonymous">`,
        `<script>`,
        `   function toggle(id, event) { if (typeof event !== 'undefined' && event.preventDefault) { event.preventDefault(); }; var e = document.getElementById(id); e.style.display = e.style.display !== 'none' ? 'none' : 'block' }`,
        `</script>`,
        `<style>`,
        `.cs-docs-query-wrap { padding: 24px 0; border-bottom: 1px solid #eee } `,
        `.cs-docs-query-wrap > h2 { margin: 0; color: black; cursor: pointer } `,
        `.cs-docs-query-wrap > h2 > span { color: #DE4D4E; font-family: Menlo,Monaco,Consolas,"Courier New",monospace; font-size: 90% } `,
        `.cs-docs-query-wrap > h2:hover { color: #337AB7; } `,
        `.cs-docs-param-name, .cs-docs-template-link { color: #DE4D4E; font-family: Menlo,Monaco,Consolas,"Courier New",monospace }`,
        //`.cs-docs-query-wrap { padding: 24px 24px } `,
        //`.cs-docs-query-wrap:nth-child(odd) { background: #e6e6e6 }`,
        //`.cs-docs-query-wrap:nth-child(even) { background: #ededed }`,
        //`.cs-docs-query-wrap { background: #ededed }`,
        `</style>`,
        `</head>`,
        `<body>`,
        `<div class="container">`
    );

    html.push(`<h1>LiteMol Coordinate Server <small>${ApiVersion}</small></h1>`);
    html.push(`<div>The Coordinate Server is a fast, web-based tool for returning a subset of mmCIF coordinate data for a PDB entry held in the PDB archive.</div>`);
    html.push("<hr>");

    //html.push(Queries.QueryList.map(q => `<a href="#${q.name}">${q.name}</a>`).join(` | `));

    //html.push("<hr>");

    //html.push("<i>Note:</i><br/>");
    //html.push("<ul>");
    //html.push("<li>Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.</li>");
    //html.push("<li>Names of residues/chains/entities/etc. are case sensitive.</li>");
    //html.push("</ul>");

    //html.push("<hr>");
    
    for (let entry of Queries.QueryList) {
        let id = entry.name;
        let q = entry.description;

        html.push(`<div class='cs-docs-query-wrap'>`)
        html.push(`<a name="${id}"></a>`)
        html.push(`<h2 onclick='javascript:toggle("coordserver-documentation-${id}-body", event)'>${q.niceName} <span>/${id}</span><br/> <small>${q.description}</small></h2>`);

        //<button class='btn' onclick='javascript:toggle("coordserver-documentation-${id}-params")'>Show Parameters</button>
        //html.push(`<i>${q.description}</i><br/>`);
        
        let url = "",
            params = q.queryParams.concat(Queries.CommonQueryParamsInfo);

        html.push(`<div id='coordserver-documentation-${id}-body' style='display: none; margin: 24px 24px 0 24px'>`);
        html.push(`<h4>Example</h4>`);
        let exampleParams = params.filter(p => p.exampleValue !== void 0);
        let examplePdbId = entry.description.exampleId ? entry.description.exampleId : '1cbs';
        let exampleUrl = !exampleParams.length
            ? `/${examplePdbId}/${id}`
            : `/${examplePdbId}/${id}?${exampleParams.map(p => p.name + "=" + p.exampleValue).join('&')}`
        html.push(`<a href="${appPrefix}${exampleUrl}" class="cs-docs-template-link" target="_blank" rel="nofollow">${exampleUrl}</a>`);

        if (params.length > 0) {                      
            html.push(`<h4>Parameters</h4>`);
            html.push(`<ul class='list-unstyled'>`);
            for (let p of params) {
                html.push(`<li style='margin-bottom: 3px'><span class='cs-docs-param-name'>${p.name}</span> <span style='font-size: smaller; color: #666'>:: ${Queries.QueryParamType[p.type]}</span>`);
                if (p.defaultValue !== void 0) {
                    html.push(`(<span style='font-size:smaller'>= <span title='Default value'>${p.defaultValue})</span></span>`);
                }
                if (p.description) {
                    html.push(`&ndash; ${p.description} `);
                }
                html.push(`</li>`);
            }
            html.push(`</ul>`);
            html.push(`<h4>Included mmCIF Categories</h4>`);
            html.push(`<div>${(q.includedCategories || Queries.DefaultCategories).concat('_atom_site').join(', ')}</div>`);
            //html.push(`</div>`);

            url = `/PDBID/${id}?${params.map(p => p.name + "=").join('&')}`;
        } else {
            url = `/PDBID/${id}`;
        }

        html.push(`<h4>Query Template</h4>`);
        html.push(
            `<div>`,
            `<a href="${appPrefix}${url}" title="Fill in the desired values. Empty-string parameters are ignored by the server." class="cs-docs-template-link" target="_blank" rel="nofollow">${url}</a>`,
            `<div style='color: #424242; font-size: 85%; margin: 10px'>Fill in <i>PDBID</i> and other parameters to customize the query.<br/>`,
            `Empty-string values of parameters are ignored by the server, e.g. <span class='cs-docs-template-link'>/entities?entityId=&type=water</span> is the same as <span class='cs-docs-template-link'>/entities?type=water</span>.</br>`,
            `Names of residues/chains/entities/etc. are case sensitive.</div>`,
            `</div>`);

        html.push(`</div>`); 
        html.push(`</div>`);
    }
   
    html.push(`<div class='pull-right' style='color: #999;font-size:smaller;margin: 20px 0'>LiteMol Core ${Core.VERSION.number} - ${Core.VERSION.date}, Node ${process.version}</div>`);
    

    html.push(
        `</div>`,
        `</body>`,
        `</html>`);

    return html.join('\n');
}