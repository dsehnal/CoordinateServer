/*
 * Copyright (c) 2016 - now, David Sehnal, licensed under Apache 2.0, See LICENSE file for more info.
 */

import * as Core from '../lib/LiteMol-core'
import ApiVersion from './version'
import * as Queries from './queries'

let docs: string | undefined = undefined;

export function getHTMLDocs(appPrefix: string) {
    if (docs) return docs;
    return (docs = createDocumentationHTML(appPrefix));
}

function createDocumentationHTML(appPrefix: string) {
    const html: string[] = [];

    const logoData = "data:image/png;base64,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";

    html.push(
        `<!DOCTYPE html>`,
        `<html xmlns="http://www.w3.org/1999/xhtml">`,
        `<head>`,
        `<meta charset="utf-8" />`,
        `<link rel='shortcut icon' href='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAB+UExURQAAANNvJ2yAgiyfXHpGlNNvJ1JkdH5GlRASIxATJSyMzrMtKIh2aLwpICw7RrspHyEuO02ObyyMziqTWCyfXA8SJNFvJxYdLHxIlCEvOdFvJ9JvKH1FlrsoH31FlSyfXLopHyufXbwpICuVWRETJX5GltNwKCygXSIvOyyNzipPD1kAAAAkdFJOUwB89tRmrgu9h5svWhX+K9jlKOZORWsoy0+jfP6IyZ3+ktOsTazTZ3EAAACcSURBVDjLzdPJEoIwDIBh3FKsqFSlxV3B9f1f0BkzlSZNL574rv0JDIQs660CJc/NEJl/gkUHQDiH8uVtxeHgSo8HsPlq16iIbmDOz1D8fOY6CoVBPeZqeq26c4oGB8WdaFDlXEUDd+McmzDlcukd2gkRf2q7f4RsvCO7QSi1LHBcehc5mP808ohZR1wYpFdIJ4M3SgagEfTjJ/wAbZUWKjfD1fQAAAAASUVORK5CYII=' />`,
        `<title>CoordinateServer (${ApiVersion})</title>`,
        `<script>`,
        `   function toggle(id, event) { if (typeof event !== 'undefined' && event.preventDefault) { event.preventDefault(); }; var e = document.getElementById(id); e.style.display = e.style.display !== 'none' ? 'none' : 'block' }`,
        `</script>`,
        `<style>`,
        `html { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }`,
        `body { margin: 0; font-family: "Helvetica Neue",Helvetica,Arial,sans-serif; font-weight: 300; color: #333; line-height: 1.42857143; font-size: 14px }`,
        `.container { padding: 0 15px; max-width: 970px; margin: 0 auto; }`,
        `small { font-size: 80% }`,
        `h2, h4 { font-weight: 500; line-height: 1.1; }`,
        `h2 { color: black; font-size: 24px; }`,
        `h4 { font-size: 18px; margin: 20px 0 10px 0 }`,
        `h2 small { color: #777; font-weight: 300 }`,
        `hr { box-sizing: content-box; height: 0; overflow: visible; }`,
        `a { background-color: transparent; -webkit-text-decoration-skip: objects; text-decoration: none }`,
        `a:active, a:hover { outline-width: 0; }`,
        `a:focus, a:hover { text-decoration: underline; color: #23527c }`,
        `.list-unstyled { padding: 0; list-style: none; margin: 0 0 10px 0 }`,
        `.cs-docs-query-wrap { padding: 24px 0; border-bottom: 1px solid #eee } `,
        `.cs-docs-query-wrap > h2 { margin: 0; color: black; cursor: pointer } `,
        `.cs-docs-query-wrap > h2 > span { color: #DE4D4E; font-family: Menlo,Monaco,Consolas,"Courier New",monospace; font-size: 90% } `,
        `.cs-docs-query-wrap > h2:hover, .cs-docs-query-wrap > h2:hover > small, .cs-docs-query-wrap > h2:hover > span { color: #DE4D4E; }`,
        `.cs-docs-param-name, .cs-docs-template-link { color: #DE4D4E; font-family: Menlo,Monaco,Consolas,"Courier New",monospace }`,
        `table {margin: 0; padding: 0; }`,
        `table th { font-weight: bold; border-bottom: none; text-align: left; padding: 6px 12px }`,
        `td { padding: 6px 12px }`,
        `td:not(:last-child), th:not(:last-child) { border-right: 1px dotted #ccc }`,
        `tr:nth-child(even) { background: #f9f9f9 }`,
        `</style>`,
        `</head>`,
        `<body>`,
        `<div class="container">`
    );

    html.push(`<div style='text-align: center; margin-top: 48px'><img style='max-width: 100%' src='${logoData}' alt='Coordinate Server' /></div>`);
    html.push(`<div style='text-align: center; margin-top: 12px;'><span style='font-weight: bold'>${ApiVersion}</span>, powered by <a href='https://github.com/dsehnal/LiteMol' target='_blank' style='font-weight: bold; color: black'>LiteMol</a></div>`);
    html.push(
`<div style='text-align: justify; padding: 24px 0; border-bottom: 1px solid #eee'>
    <p>
        CoordinateServer is a fast, web-based tool for returning a subset of mmCIF coordinate data for a PDB entry held in the PDB archive. 
        The server is able to return the specific portions of the structure that are relevant, as specified in your query. For example, the coordinates 
        of the atoms within a 5Å radius around the ligand binding site, including symmetry mates. As a result, it greatly reduces the time needed 
        to transmit and manipulate the data.
    </p>
    <p>
        The server uses the text based <a href='https://en.wikipedia.org/wiki/Crystallographic_Information_File'>CIF</a> and binary 
        <a href='https://github.com/dsehnal/BinaryCIF' style='font-weight: bold'>BinaryCIF</a> 
        formats to deliver the data to the client. 
        The server support is integrated into the <a href='https://github.com/dsehnal/LiteMol' style='font-weight: bold'>LiteMol Viewer</a>.
    </p>
</div>`);
    
    for (const entry of Queries.QueryList) {
        const id = entry.name;
        const q = entry.description;

        html.push(`<div class='cs-docs-query-wrap'>`)
        html.push(`<a name="${id}"></a>`)
        html.push(`<h2 onclick='javascript:toggle("coordserver-documentation-${id}-body", event)'>${q.niceName} <span>/${id}</span><br/> <small>${q.description}</small></h2>`);
                
        let url = "";
        const params = q.queryParams.concat(Queries.CommonQueryParamsInfo);

        html.push(`<div id='coordserver-documentation-${id}-body' style='display: none; margin: 24px 24px 0 24px'>`);
        html.push(`<h4>Example</h4>`);
        const exampleParams = params.filter(p => p.exampleValue !== void 0);
        const examplePdbId = entry.description.exampleId ? entry.description.exampleId : '1cbs';
        const exampleUrl = !exampleParams.length
            ? `/${examplePdbId}/${id}`
            : `/${examplePdbId}/${id}?${exampleParams.map(p => p.name + "=" + p.exampleValue).join('&')}`
        html.push(`<a href="${appPrefix}${exampleUrl}" class="cs-docs-template-link" target="_blank" rel="nofollow">${exampleUrl}</a>`);

        if (params.length > 0) {                      
            html.push(`<h4>Parameters</h4>`);
            //html.push(`<ul class='list-unstyled'>`);
            //for (const p of params) {
            //    html.push(`<li style='margin-bottom: 3px'><span class='cs-docs-param-name'>${p.name}</span> <span style='font-size: smaller; color: #666'>:: ${Queries.QueryParamType[p.type]}</span>`);
            //    if (p.defaultValue !== void 0) {
            //        html.push(`(<span style='font-size:smaller'>= <span title='Default value'>${p.defaultValue})</span></span>`);
            //    }
            //    if (p.description) {
            //        html.push(`&ndash; ${p.description} `);
            //    }
            //    html.push(`</li>`);
            //}
            //html.push(`</ul>`);

            html.push(`<table cellpadding='0' cellspacing='0'>`);
            html.push(`<tr><th>Name</th><th>Type</th><th>Default</th><th>Description</th></tr>`);
            for (const p of params) {
                html.push(`<tr>`);
                html.push(
                    `<td class='cs-docs-param-name'>${p.name}</td>`,
                    `<td>${Queries.QueryParamType[p.type]}</td>`,
                    `<td>${p.defaultValue !== void 0 ? p.defaultValue : ''}</td>`,
                    `<td>${p.description}</td>`
                );                
                html.push(`</tr>`);
            }
            html.push(`</table>`);

            html.push(`<h4>Included mmCIF Categories</h4>`);
            html.push(`<div>${(q.includedCategories || Queries.DefaultCategories).concat('_atom_site').join(', ')}</div>`);

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
   
    html.push(`<div style='color: #999;font-size:smaller;margin: 20px 0; text-align: right'>&copy; 2016 &ndash; now, David Sehnal | LiteMol Core ${Core.VERSION.number} - ${Core.VERSION.date} | Node ${process.version}</div>`);
    

    html.push(
        `</div>`,
        `</body>`,
        `</html>`);

    return html.join('\n');
}

export function createAPIrefMarkdown() {
    const markdown: string[] = [];

    markdown.push(`# CoordinateServer API reference\n`);
    
    for (const entry of Queries.QueryList) {
        const id = entry.name;
        const q = entry.description;

        markdown.push(`## ${q.niceName} \`\`/${id}\`\`\n`);
        markdown.push(`${q.description}\n`);
                
        const params = q.queryParams.concat(Queries.CommonQueryParamsInfo);

        markdown.push(`### Example\n`);
        const exampleParams = params.filter(p => p.exampleValue !== void 0);
        const examplePdbId = entry.description.exampleId ? entry.description.exampleId : '1cbs';
        const exampleUrl = !exampleParams.length
            ? `/${examplePdbId}/${id}`
            : `/${examplePdbId}/${id}?${exampleParams.map(p => p.name + "=" + p.exampleValue).join('&')}`
        markdown.push(`\`\`${exampleUrl}\`\`\n`);

        if (params.length > 0) {                      
            markdown.push(`### Parameters\n`);

            markdown.push(`|Name|Type|Default|Description|\n`);
            markdown.push(`|----|----|-------|-----------|\n`);
            for (const p of params) {
                markdown.push(
                    `|\`\`${p.name}\`\``,
                    `|${Queries.QueryParamType[p.type]}`,
                    `|${p.defaultValue !== void 0 ? p.defaultValue : ''}`,
                    `|${p.description}`,
                    `|\n`
                );                
            }

            markdown.push(`### Included mmCIF Categories\n`);
            markdown.push(`${(q.includedCategories || Queries.DefaultCategories).concat('_atom_site').join(', ')}\n`);
            markdown.push(`\n___\n\n`);
        } 
    }
   
    markdown.push(`Generated for CoordinateServer ${ApiVersion}, LiteMol Core ${Core.VERSION.number} - ${Core.VERSION.date}\n`);

    return markdown.join('');
}

console.log(createAPIrefMarkdown())