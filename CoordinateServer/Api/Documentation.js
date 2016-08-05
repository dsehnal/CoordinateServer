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
    html.push("<!DOCTYPE html>", "<html xmlns=\"http://www.w3.org/1999/xhtml\">", "<head>", "<meta charset=\"utf-8\" />", "<title>LiteMol Coordinate Server (" + Version_1.default + ")</title>", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css\" integrity=\"sha384-1q8mTJOASx8j1Au+a5WDVnPi2lkFfwwEAa8hDDdjZlpLegxhjVME1fgjWPGmkzs7\" crossorigin=\"anonymous\">", "<link rel=\"stylesheet\" href=\"https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap-theme.min.css\" integrity=\"sha384-fLW2N01lMqjakBkx3l/M9EahuwpSfeNvV63J5ezn3uZzapT0u7EYsXMjQV+0En5r\" crossorigin=\"anonymous\">", 
    //`<style> h2 { margin-bottom: 5px } </style>`,
    "</head>", "<body>", "<div class=\"container\">");
    html.push("<h1>LiteMol Coordinate Server <small>" + Version_1.default + "</small></h1>");
    html.push("<hr>");
    html.push(Queries.QueryList.map(function (q) { return ("<a href=\"#" + q.name + "\">" + q.name + "</a>"); }).join(" | "));
    html.push("<hr>");
    html.push("<i>Note:</i><br/>");
    html.push("<ul>");
    html.push("<li>Empty-string values of parameters are ignored by the server, e.g. <code>/entities?entityId=&type=water</code> is the same as <code>/entities?type=water</code>.</li>");
    html.push("<li>Names of residues/chains/entities/etc. are case sensitive.</li>");
    html.push("</ul>");
    html.push("<hr>");
    for (var _i = 0, _a = Queries.QueryList; _i < _a.length; _i++) {
        var entry = _a[_i];
        var id = entry.name;
        var q = entry.description;
        html.push("<a name=\"" + id + "\"></a>");
        html.push("<h2>" + id + "</h2>");
        html.push("<i>" + q.description + "</i><br/>");
        var url = "", params = q.queryParams.concat(Queries.CommonQueryParamsInfo);
        if (params.length > 0) {
            html.push("<br/>", "<ul>");
            for (var _b = 0, params_1 = params; _b < params_1.length; _b++) {
                var p = params_1[_b];
                html.push("<li><b>" + p.name + "</b> [ " + Queries.QueryParamType[p.type] + " ] <i>Default value:</i> " + (p.defaultValue === undefined ? 'n/a' : p.defaultValue) + " </li>");
            }
            html.push("</ul>");
            url = appPrefix + "/pdbid/" + id + "?" + params.map(function (p) { return p.name + "="; }).join('&');
        }
        else {
            url = appPrefix + "/pdbid/" + id;
        }
        html.push("<a href=\"" + url + "\" title=\"Fill in the desired values. Empty-string parameters are ignored by the server.\" target=\"_blank\"><code>" + url + "</code></a>");
        html.push("<div style='color: #424242; margin-top: 10px'><small style='color: #424242'><b>Included categories:</b><br/>" + (q.includedCategories || Queries.DefaultCategories).concat('_atom_site').join(', ') + "</small></div>");
        html.push("<hr>");
    }
    html.push("<div class='pull-right' style='color: #999;font-size:smaller;margin-bottom: 20px'>LiteMol Core " + Core.VERSION.number + " - " + Core.VERSION.date + ", Node " + process.version + "</div>");
    html.push("</div>", "</body>", "</html>");
    return html.join('\n');
}
