"use strict";
var Core = require('LiteMol-core');
var Version_1 = require('./Version');
var Queries = require('./Queries');
var docs = undefined;
function getHTMLDocs(appPrefix) {
    if (docs)
        return docs;
    return (docs = createDocumentationHTML(appPrefix));
}
exports.getHTMLDocs = getHTMLDocs;
function createDocumentationHTML(appPrefix) {
    var html = [];
    var logoData = "data:image/png;base64,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";
    html.push("<!DOCTYPE html>", "<html xmlns=\"http://www.w3.org/1999/xhtml\">", "<head>", "<meta charset=\"utf-8\" />", "<title>CoordinateServer (" + Version_1.default + ")</title>", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css\" integrity=\"sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7\" crossorigin=\"anonymous\">", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css\" integrity=\"sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r\" crossorigin=\"anonymous\">", "<script>", "   function toggle(id, event) { if (typeof event !== 'undefined' && event.preventDefault) { event.preventDefault(); }; var e = document.getElementById(id); e.style.display = e.style.display !== 'none' ? 'none' : 'block' }", "</script>", "<style>", ".cs-docs-query-wrap { padding: 24px 0; border-bottom: 1px solid #eee } ", ".cs-docs-query-wrap > h2 { margin: 0; color: black; cursor: pointer } ", ".cs-docs-query-wrap > h2 > span { color: #DE4D4E; font-family: Menlo,Monaco,Consolas,\"Courier New\",monospace; font-size: 90% } ", ".cs-docs-query-wrap > h2:hover, .cs-docs-query-wrap > h2:hover > small, .cs-docs-query-wrap > h2:hover > span { color: #DE4D4E; }", ".cs-docs-param-name, .cs-docs-template-link { color: #DE4D4E; font-family: Menlo,Monaco,Consolas,\"Courier New\",monospace }", "</style>", "</head>", "<body>", "<div class=\"container\">");
    html.push("<div style='text-align: center; margin-top: 48px'><img src='" + logoData + "' alt='Coordinate Server' /></div>");
    html.push("<div style='text-align: center; margin-top: 12px;'><b>" + Version_1.default + "</b>, powered by <a href='https://github.com/dsehnal/LiteMol' target='_blank' style='font-weight: bold; color: black'>LiteMol</a></div>");
    html.push("<div style='text-align: justify; padding: 24px 0; border-bottom: 1px solid #eee'>CoordinateServer is a fast, web-based tool for returning a subset of mmCIF coordinate data for a PDB entry held in the PDB archive. The server is able to return the specific portions of the structure that are relevant, as specified in your query. For example, the coordinates of the atoms within a 5\u00C5 radius around the ligand binding site, including symmetry mates. As a result, it greatly reduces the time needed to transmit and manipulate the data.</div>");
    //html.push("<hr>");
    //html.push(Queries.QueryList.map(q => `<a href="#${q.name}">${q.name}</a>`).join(` | `));
    //html.push("<hr>");
    //html.push("<i>Note:</i><br/>");
    //html.push("<ul>");
    //html.push("<li>Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.</li>");
    //html.push("<li>Names of residues/chains/entities/etc. are case sensitive.</li>");
    //html.push("</ul>");
    //html.push("<hr>");
    for (var _i = 0, _a = Queries.QueryList; _i < _a.length; _i++) {
        var entry = _a[_i];
        var id = entry.name;
        var q = entry.description;
        html.push("<div class='cs-docs-query-wrap'>");
        html.push("<a name=\"" + id + "\"></a>");
        html.push("<h2 onclick='javascript:toggle(\"coordserver-documentation-" + id + "-body\", event)'>" + q.niceName + " <span>/" + id + "</span><br/> <small>" + q.description + "</small></h2>");
        //<button class='btn' onclick='javascript:toggle("coordserver-documentation-${id}-params")'>Show Parameters</button>
        //html.push(`<i>${q.description}</i><br/>`);
        var url = "", params = q.queryParams.concat(Queries.CommonQueryParamsInfo);
        html.push("<div id='coordserver-documentation-" + id + "-body' style='display: none; margin: 24px 24px 0 24px'>");
        html.push("<h4>Example</h4>");
        var exampleParams = params.filter(function (p) { return p.exampleValue !== void 0; });
        var examplePdbId = entry.description.exampleId ? entry.description.exampleId : '1cbs';
        var exampleUrl = !exampleParams.length
            ? "/" + examplePdbId + "/" + id
            : "/" + examplePdbId + "/" + id + "?" + exampleParams.map(function (p) { return p.name + "=" + p.exampleValue; }).join('&');
        html.push("<a href=\"" + appPrefix + exampleUrl + "\" class=\"cs-docs-template-link\" target=\"_blank\" rel=\"nofollow\">" + exampleUrl + "</a>");
        if (params.length > 0) {
            html.push("<h4>Parameters</h4>");
            html.push("<ul class='list-unstyled'>");
            for (var _b = 0, params_1 = params; _b < params_1.length; _b++) {
                var p = params_1[_b];
                html.push("<li style='margin-bottom: 3px'><span class='cs-docs-param-name'>" + p.name + "</span> <span style='font-size: smaller; color: #666'>:: " + Queries.QueryParamType[p.type] + "</span>");
                if (p.defaultValue !== void 0) {
                    html.push("(<span style='font-size:smaller'>= <span title='Default value'>" + p.defaultValue + ")</span></span>");
                }
                if (p.description) {
                    html.push("&ndash; " + p.description + " ");
                }
                html.push("</li>");
            }
            html.push("</ul>");
            html.push("<h4>Included mmCIF Categories</h4>");
            html.push("<div>" + (q.includedCategories || Queries.DefaultCategories).concat('_atom_site').join(', ') + "</div>");
            //html.push(`</div>`);
            url = "/PDBID/" + id + "?" + params.map(function (p) { return p.name + "="; }).join('&');
        }
        else {
            url = "/PDBID/" + id;
        }
        html.push("<h4>Query Template</h4>");
        html.push("<div>", "<a href=\"" + appPrefix + url + "\" title=\"Fill in the desired values. Empty-string parameters are ignored by the server.\" class=\"cs-docs-template-link\" target=\"_blank\" rel=\"nofollow\">" + url + "</a>", "<div style='color: #424242; font-size: 85%; margin: 10px'>Fill in <i>PDBID</i> and other parameters to customize the query.<br/>", "Empty-string values of parameters are ignored by the server, e.g. <span class='cs-docs-template-link'>/entities?entityId=&type=water</span> is the same as <span class='cs-docs-template-link'>/entities?type=water</span>.</br>", "Names of residues/chains/entities/etc. are case sensitive.</div>", "</div>");
        html.push("</div>");
        html.push("</div>");
    }
    html.push("<div class='pull-right' style='color: #999;font-size:smaller;margin: 20px 0'>&copy; 2016 David Sehnal | LiteMol Core " + Core.VERSION.number + " - " + Core.VERSION.date + ", Node " + process.version + "</div>");
    html.push("</div>", "</body>", "</html>");
    return html.join('\n');
}
