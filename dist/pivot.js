import { aggregatorTemplates } from "../dist/aggregators/aggregators.js";
import { pivotTableRenderer } from "../dist/renderers/pivotTableRenderer.js";
import { deepMerge } from "../dist/utilities/deepMerge.js";
import { PivotData } from "../dist/classes/pivotData.js";
import { getSort } from "../dist/utilities/sorter.js";
import { locales } from "../dist/locales/en.js";
import { Sortable } from "../src/sortablejs/modular/sortable.core.esm.js";
//Pivot table core
Element.prototype.pivot = function (input, inputOpts, locale = "en") {
    if (locales[locale] == null) {
        locale = "en";
    }
    let defaults = {
        cols: [],
        rows: [],
        vals: [],
        rowOrder: "key_a_to_z",
        colOrder: "key_a_to_z",
        dataClass: PivotData,
        filter: function () { return true; },
        aggregator: aggregatorTemplates.count()(),
        aggregatorName: "Count",
        sorters: {},
        derivedAttributes: {},
        renderer: pivotTableRenderer
    };
    //Locale override
    let localeStrings = deepMerge(true, locales.en.localeStrings, locales[locale].localeStrings);
    let localeDefaults = {
        rendererOptions: { localeStrings },
        localeStrings: localeStrings
    };
    let opts = deepMerge(true, localeDefaults, Object.assign(Object.assign({}, defaults), inputOpts));
    let result;
    let tmp;
    try {
        let pivotData = new opts.dataClass(input, opts);
        try {
            result = opts.renderer(pivotData, opts.rendererOptions);
        }
        catch (error) {
            if (typeof console !== "undefined" && console !== null) {
                console.error(error.stack);
            }
            tmp = document.getElementsByTagName("span");
            result = tmp.textContent(opts.localeStrings.renderError);
        }
    }
    catch (error) {
        if (typeof console !== "undefined" && console !== null) {
            console.error(error.stack);
        }
        tmp = document.getElementsByTagName("span");
        result = tmp.textContent(opts.localeStrings.computeError);
    }
    let x = this;
    while (x.hasChildNodes()) {
        if (x.lastChild != null) {
            x.removeChild(x.lastChild);
        }
    }
    return this.append(result);
};
//Pivot table core with UI
Element.prototype.pivotUI = function (input, inputOpts, overwrite = false, locale = "en") {
    if (locales[locale] == null) {
        locale = "en";
    }
    let defaults = {
        derivedAttributes: {},
        aggregators: locales[locale].aggregators,
        renderers: locales[locale].renderers,
        hiddenAttributes: [],
        hiddenFromAggregators: [],
        hiddenFromDragDrop: [],
        menuLimit: 500,
        cols: [],
        rows: [],
        vals: [],
        rowOrder: "key_a_to_z",
        colOrder: "key_a_to_z",
        dataClass: PivotData,
        exclusions: {},
        inclusions: {},
        unusedAttrsVertical: 85,
        autoSortUnusedAttrs: false,
        onRefresh: null,
        showUI: true,
        filter: function () { return true; },
        sorters: {}
    };
    let localeStrings = deepMerge(true, locales.en.localeStrings, locales[locale].localeStrings);
    let localeDefaults = {
        rendererOptions: { localeStrings },
        localeStrings: localeStrings
    };
    let existingOpts = this.dataPivotUIOptions;
    let opts;
    if (existingOpts == null || existingOpts === "undefined" || overwrite) {
        opts = deepMerge(true, localeDefaults, Object.assign(Object.assign({}, defaults), inputOpts));
    }
    else {
        opts = existingOpts;
    }
    try {
        let attrValues = {};
        let materializedInput = [];
        let recordsProcessed = 0;
        PivotData.forEachRecord(input, opts.derivedAttributes, function (record) {
            if (!opts.filter(record)) {
                return;
            }
            materializedInput.push(record);
            for (let attr of Object.keys(record)) {
                if (attrValues[attr] == null) {
                    attrValues[attr] = {};
                    if (recordsProcessed > 0) {
                        attrValues[attr]["null"] = recordsProcessed;
                    }
                }
            }
            for (let attr in attrValues) {
                let value = record[attr] != null ? record[attr] : "null";
                if (attrValues[attr][value] == null) {
                    attrValues[attr][value] = 0;
                }
                attrValues[attr][value]++;
            }
            return recordsProcessed++;
        });
        //Start building the output
        let uiTable = document.createElement("table");
        uiTable.className = "pvtUi";
        let rendererControl = "<td class=\"pvtUiCell\">";
        let renderer = "<select class=\"pvtRenderer\" id=\"renderer\">";
        let selOpts = "";
        for (let x of Object.keys(opts.renderers)) {
            selOpts = selOpts + `<option value=\"${x}\">${x}</option>`;
        }
        renderer += selOpts + "</select>";
        rendererControl += renderer + "</td>";
        //Axis list, including the double-click menu
        let shownAttributes = (function () {
            let results = [];
            for (let a in attrValues) {
                if (opts.hiddenAttributes.indexOf(attrValues[a]) < 0) {
                    results.push(a);
                }
            }
            return results;
        })();
        let shownInAggregators = (function () {
            let results = [];
            for (let c of shownAttributes) {
                if (opts.hiddenFromAggregators.indexOf(c) < 0) {
                    results.push(c);
                }
            }
            return results;
        })();
        let shownInDragDrop = (function () {
            let results = [];
            for (let c of shownAttributes) {
                if (opts.hiddenFromDragDrop.indexOf(c) < 0) {
                    results.push(c);
                }
            }
            return results;
        })();
        let unusedAttrsVerticalAutoOverride = false;
        let unusedAttrsVerticalAutoCutoff;
        if (opts.unusedAttrsVertical === "auto") {
            unusedAttrsVerticalAutoCutoff = 120;
        }
        else {
            unusedAttrsVerticalAutoCutoff = parseInt(opts.unusedAttrsVertical);
        }
        if (!isNaN(unusedAttrsVerticalAutoCutoff)) {
            let attrLength = 0;
            for (let a of shownInDragDrop) {
                attrLength += a.length;
            }
            unusedAttrsVerticalAutoOverride = attrLength > unusedAttrsVerticalAutoCutoff;
        }
        let unused = document.createElement("td");
        if (opts.unusedAttrsVertical == true || unusedAttrsVerticalAutoOverride) {
            unused.className = "pvtAxisContainer pvtUnused pvtUiCell pvtVertList";
        }
        else {
            unused.className = "pvtAxisContainer pvtUnused pvtUiCell pvtHorizList";
        }
        //toggle class name of checkboxes
        let altToggleClass = function () {
            if (this.className === "pvtFilter") {
                return this.className = "pvtFilter changed";
            }
            else {
                return this.className = "pvtFilter";
            }
        };
        //for triangle link distinction
        let triId = 1;
        for (let attr in Object.keys(shownInDragDrop)) {
            (function () {
                let ai = attr;
                let checkContainer;
                let values = (function () {
                    let results = [];
                    for (let v in attrValues[shownInDragDrop[attr]]) {
                        results.push(v);
                    }
                    return results;
                })();
                let hasExcludedItem = false;
                let valueList = document.createElement("div");
                valueList.className = "pvtFilterBox";
                valueList.style.display = "none";
                let valueListStr = `<h4> <span>${shownInDragDrop[attr]}</span> <span class=\"count\">\"(${values.length})\"</span> </h4>`;
                valueList.insertAdjacentHTML("beforeend", valueListStr);
                if (values.length > opts.menuLimit) {
                    valueListStr = `<p>${opts.localeStrings.tooMany}</p>`;
                    valueList.insertAdjacentHTML("beforeend", valueListStr);
                }
                else {
                    if (values.length > 5) {
                        let controls = "<p>";
                        let sorter = getSort(opts.sorters, shownInDragDrop[attr]);
                        let placeholder = opts.localeStrings.filterResults;
                        //onkeyup event for text input
                        let inputListener = function () {
                            let inputFilter = this.value.toLowerCase().trim();
                            let accept_gen = function (prefix, accepted) {
                                return function (v) {
                                    let real_filter = inputFilter.substring(prefix.length).trim();
                                    if (real_filter.length === 0) {
                                        return true;
                                    }
                                    let tmp = Math.sign(sorter(v.toLowerCase(), real_filter));
                                    if (accepted.indexOf(tmp) >= 0) {
                                        return tmp;
                                    }
                                };
                            };
                            let accept;
                            if (inputFilter.indexOf(">=") === 0) {
                                accept = accept_gen(">=", [1, 0]);
                            }
                            else if (inputFilter.indexOf("<=") === 0) {
                                accept = accept_gen("<=", [-1, 0]);
                            }
                            else if (inputFilter.indexOf(">") === 0) {
                                accept = accept_gen(">", [1]);
                            }
                            else if (inputFilter.indexOf("<") === 0) {
                                accept = accept_gen("<", [-1]);
                            }
                            else if (inputFilter.indexOf("~") === 0) {
                                accept = function (v) {
                                    if (inputFilter.substring(1).trim().length === 0) {
                                        return true;
                                    }
                                    return v.toLowerCase().match(inputFilter.substring(1));
                                };
                            }
                            else {
                                accept = function (v) { return v.toLowerCase().indexOf(inputFilter) !== -1; };
                            }
                            let spanValQuery = valueList.querySelectorAll('.pvtCheckContainer .value');
                            for (let spanElem of spanValQuery) {
                                if (accept(spanElem.textContent)) {
                                    spanElem.parentElement.parentElement.style.display = "block";
                                }
                                else {
                                    spanElem.parentElement.parentElement.style.display = "none";
                                }
                            }
                        };
                        controls += `<input type=\"text\" placeholder=\"${placeholder}\" 
                        class=\"pvtSearch\" data-target=\"axis_${ai}\"></p><br>`;
                        //click listeners for select-all and select-none buttons
                        let selAllLstnr = function () {
                            var _a;
                            let selQuery = checkContainer.querySelectorAll('.pvtFilter');
                            if (selQuery.length !== 0) {
                                for (let elem of selQuery) {
                                    if (((_a = elem.parentNode) === null || _a === void 0 ? void 0 : _a.parentNode.style.display) !== "none") {
                                        if (!elem.checked) {
                                            elem.checked = true;
                                        }
                                        if (elem.className === "pvtFilter") {
                                            elem.className = "pvtFilter changed";
                                        }
                                        else {
                                            elem.className = "pvtFilter";
                                        }
                                    }
                                }
                            }
                            return false;
                        };
                        let selNoneLstnr = function () {
                            var _a;
                            let selQuery = checkContainer.querySelectorAll('.pvtFilter');
                            if (selQuery.length !== 0) {
                                for (let elem of selQuery) {
                                    if (((_a = elem.parentElement) === null || _a === void 0 ? void 0 : _a.parentElement.style.display) !== "none") {
                                        if (elem.checked) {
                                            elem.checked = false;
                                        }
                                        if (elem.className === "pvtFilter") {
                                            elem.className = "pvtFilter changed";
                                        }
                                        else {
                                            elem.className = "pvtFilter";
                                        }
                                    }
                                }
                            }
                            return false;
                        };
                        controls += `<button type=\"button\" id=\"selAll\">${opts.localeStrings.selectAll}</button>`;
                        controls += `<button type=\"button\" id=\"selNone\">${opts.localeStrings.selectNone}</button>`;
                        valueList.insertAdjacentHTML("beforeend", controls);
                        //Add event listeners to select-all, select-none and search filters
                        let searchFilter = valueList.querySelectorAll('.pvtSearch');
                        for (let el of searchFilter) {
                            el.addEventListener("keyup", inputListener);
                        }
                        let selAll = valueList.querySelector("#selAll");
                        selAll === null || selAll === void 0 ? void 0 : selAll.addEventListener("click", selAllLstnr);
                        let selNone = valueList.querySelector("#selNone");
                        selNone === null || selNone === void 0 ? void 0 : selNone.addEventListener("click", selNoneLstnr);
                    }
                    checkContainer = "<div class=\"pvtCheckContainer\" id=\"chckContainer\">";
                    for (let value of values.sort(getSort(opts.sorters, shownInDragDrop[attr]))) {
                        let valueCount = attrValues[shownInDragDrop[attr]][value];
                        let filterItem = "<p><label>";
                        let filterItemExcluded = false;
                        if (opts.inclusions[shownInDragDrop[attr]]) {
                            filterItemExcluded = opts.inclusions[shownInDragDrop[attr]].indexOf(value) < 0;
                        }
                        else if (opts.exclusions[shownInDragDrop[attr]]) {
                            filterItemExcluded = opts.inclusions[shownInDragDrop[attr]].indexOf(value) >= 0;
                        }
                        hasExcludedItem = hasExcludedItem || filterItemExcluded;
                        let defaultState;
                        if (!filterItemExcluded) {
                            defaultState = "checked";
                        }
                        else {
                            defaultState = "";
                        }
                        filterItem += `<input type=\"checkbox\" class=\"pvtFilter\" data-filter=\"${shownInDragDrop[attr] + "," + value}\" ${defaultState}>`;
                        filterItem += `<span class=\"value\">${value}</span>`;
                        filterItem += `<span class=\"count\">\"(\"${valueCount}\")\"</span></label></p>`;
                        checkContainer += filterItem;
                    }
                    valueList.insertAdjacentHTML("beforeend", checkContainer);
                    checkContainer = valueList.querySelector("#chckContainer");
                    let filterBoxList = valueList.querySelectorAll('.pvtFilter');
                    for (let el of filterBoxList) {
                        el.addEventListener("change", altToggleClass);
                    }
                }
                let closeFilterBox = function (target) {
                    let checked = 0;
                    let cBoxes = valueList.querySelectorAll('[type="checkbox"]');
                    let targetAxis = document.querySelector(`.${target}`);
                    for (let el of cBoxes) {
                        if (el.checked) {
                            checked++;
                        }
                    }
                    if (cBoxes.length > checked) {
                        targetAxis === null || targetAxis === void 0 ? void 0 : targetAxis.classList.add("pvtFilteredAttribute");
                    }
                    else {
                        targetAxis === null || targetAxis === void 0 ? void 0 : targetAxis.classList.remove("pvtFilteredAttribute");
                    }
                    let pvtSearchList = valueList.querySelectorAll(".pvtSearch");
                    for (let el of pvtSearchList) {
                        el.value = "";
                    }
                    let containerList = valueList.querySelectorAll(".pvtCheckContainer p");
                    for (let el of containerList) {
                        el.style.display = "block";
                    }
                    valueList.style.display = "none";
                };
                let finalButtons = "<p>";
                let attrElem;
                if (hasExcludedItem) {
                    attrElem = `<li class=\"axis_${ai} pvtFilteredAttribute\">`;
                }
                else {
                    attrElem = `<li class=\"axis_${ai}\">`;
                }
                let applyLstnr = function () {
                    let applyQuery = valueList.querySelectorAll('.changed');
                    for (let el of applyQuery) {
                        el.classList.remove("changed");
                    }
                    if (applyQuery.length !== 0) {
                        refresh();
                    }
                    closeFilterBox(this.dataset.target);
                };
                if (values.length <= opts.menuLimit) {
                    finalButtons += `<button type=\"button\" id=\"applyBtn\" 
                    data-target=\"axis_${ai}\">${opts.localeStrings.apply}</button>`;
                }
                let cancelLstnr = function () {
                    let cancelQuery = valueList.querySelectorAll('.changed');
                    for (let el of cancelQuery) {
                        el.checked = el.checked ? false : true;
                        el.classList.remove("change");
                    }
                    closeFilterBox(this.dataset.target);
                };
                finalButtons += `<button type\"button\" id=\"cancelBtn\" 
                data-target=\"axis_${ai}\">${opts.localeStrings.cancel}</button></p>`;
                valueList.insertAdjacentHTML("beforeend", finalButtons);
                let cancelBtn = valueList.querySelector("#cancelBtn");
                let applyBtn = valueList.querySelector("#applyBtn");
                cancelBtn === null || cancelBtn === void 0 ? void 0 : cancelBtn.addEventListener("click", cancelLstnr);
                applyBtn === null || applyBtn === void 0 ? void 0 : applyBtn.addEventListener("click", applyLstnr);
                let triangleLinkLstnr = function () {
                    let position = {
                        left: this.offsetLeft,
                        top: this.offsetTop
                    };
                    valueList.style.top = position.top + 10;
                    valueList.style.left = position.left + 10;
                    valueList.style.display = "block";
                };
                let triangleLink = `<span class=\"pvtTriangle\" id=\"tri_${triId}\">&#x25BE;</span>`;
                attrElem += `<span class=\"pvtAttr\" data-attrname=\"${shownInDragDrop[attr]}\">${shownInDragDrop[attr] + triangleLink}</span></li>`;
                unused.insertAdjacentHTML("beforeend", attrElem);
                unused.appendChild(valueList);
                let triLink = unused.querySelector(`#tri_${triId}`);
                triLink === null || triLink === void 0 ? void 0 : triLink.addEventListener("click", triangleLinkLstnr);
                triId++;
            })();
        }
        //aggregator menu and value area
        let aggregator = "<select class=\"pvtAggregator\" id=\"aggr\">";
        for (let x of Object.keys(opts.aggregators)) {
            aggregator += `<option value=\"${x}\">${x}</option>`;
        }
        aggregator += "</select>";
        let ordering = {
            key_a_to_z: {
                rowSymbol: "\u2195",
                colSymbol: "\u2194",
                next: "value_a_to_z"
            },
            value_a_to_z: {
                rowSymbol: "\u2193",
                colSymbol: "\u2192",
                next: "value_z_to_a"
            },
            value_z_to_a: {
                rowSymbol: "\u2191",
                colSymbol: "\u2190",
                next: "key_a_to_z"
            }
        };
        let rowOrderLstnr = function () {
            this.dataset.order = ordering[this.dataset.order].next;
            this.textContent = ordering[this.dataset.order].rowSymbol;
            return refresh();
        };
        let rowOrderArrow = `<a role=\"button\" class=\"pvtRowOrder\" data-order=\"${opts.rowOrder}\" 
        id=\"rowOrder\">${ordering[opts.rowOrder].rowSymbol}</a>`;
        let colOrderLstnr = function () {
            this.dataset.order = ordering[this.dataset.order].next;
            this.textContent = ordering[this.dataset.order].colSymbol;
            return refresh();
        };
        let colOrderArrow = `<a role=\"button\" class=\"pvtColOrder\" data-order=\"${opts.colOrder}\" 
        id=\"colOrder\">${ordering[opts.colOrder].colSymbol}</a>`;
        let tr1 = "<tr id=\"tr1\">";
        let menu = `<td class=\"pvtVals pvtUiCell\"> ${aggregator + rowOrderArrow + colOrderArrow}<br></td>`;
        tr1 += menu + "<td class=\"pvtAxisContainer pvtHorizList pvtUiCell pvtCols\" id=\"pvtCol\"></td></tr>";
        uiTable.insertAdjacentHTML("beforeend", tr1);
        aggregator = uiTable.querySelector("#aggr");
        rowOrderArrow = uiTable.querySelector("#rowOrder");
        rowOrderArrow.addEventListener("click", rowOrderLstnr);
        colOrderArrow = uiTable.querySelector("#colOrder");
        colOrderArrow.addEventListener("click", colOrderLstnr);
        uiTable = uiTable.querySelector("tbody");
        aggregator.addEventListener("change", function () { return refresh(); });
        let tr2 = "<tr><td class=\"pvtAxisContainer pvtUiCell pvtRows\" id=\"pvtRow\" style=\"vertical-align: top;\"></td>";
        //the actual pivot table container
        let pivotTable = "<td class=\"pvtRendererArea\" style=\"vertical-align:top;\" id=\"pivotTable\"></td></tr>";
        tr2 += pivotTable;
        uiTable.insertAdjacentHTML("beforeend", tr2);
        pivotTable = uiTable.querySelector("#pivotTable");
        //finally the renderer dropdown and unused attributes are inserted at the requested location
        if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
            let fChild = uiTable.querySelector('tr:nth-child(1)');
            fChild.insertAdjacentHTML("afterbegin", rendererControl);
            let sChild = uiTable.querySelector('tr:nth-child(2)');
            sChild.prepend(unused);
        }
        else {
            let ctrlContainer = document.createElement("tr");
            ctrlContainer.insertAdjacentHTML("beforeend", rendererControl);
            ctrlContainer.appendChild(unused);
            uiTable.prepend(ctrlContainer);
        }
        renderer = uiTable.querySelector("#renderer");
        renderer.addEventListener("change", function () { return refresh(); });
        //render the UI in its default state
        this.appendChild(uiTable);
        //setup the UI initial state as requested by moving elements around
        let colElems = this.querySelector("#pvtCol");
        let colElemsFrag = document.createDocumentFragment();
        let rowElems = this.querySelector("#pvtRow");
        let rowElemsFrag = document.createDocumentFragment();
        for (let x of opts.cols) {
            //console.log(shownInDragDrop)
            let axisElems = this.querySelector(`.axis_${shownInDragDrop.indexOf(x)}`);
            colElemsFrag.appendChild(axisElems);
        }
        for (let x of opts.rows) {
            let axisElems = this.querySelector(`.axis_${shownInDragDrop.indexOf(x)}`);
            rowElemsFrag.appendChild(axisElems);
        }
        colElems === null || colElems === void 0 ? void 0 : colElems.appendChild(colElemsFrag);
        rowElems === null || rowElems === void 0 ? void 0 : rowElems.appendChild(rowElemsFrag);
        if (opts.aggregatorName != null) {
            let aggEl = this.querySelector("#aggr");
            aggEl.value = opts.aggregatorName;
        }
        if (opts.rendererName != null) {
            let renEl = this.querySelector("#renderer");
            renEl.value = opts.rendererName;
        }
        let uiCellList = this.querySelectorAll(".pvtUiCell");
        if (!opts.showUI) {
            for (let el of uiCellList) {
                el.style.display = "none";
            }
        }
        let initialRender = true;
        //setup for refreshing
        let refreshDelayed = () => {
            var _a;
            //startTime = performance.now()
            let subopts = {
                derivedAttributes: opts.derivedAttributes,
                localeStrings: opts.localeStrings,
                rendererOptions: opts.rendererOptions,
                sorters: opts.sorters,
                cols: [],
                rows: [],
                dataClass: opts.dataClass
            };
            let tmp = opts.aggregators[aggregator.value]([])().numInputs;
            let numInputsToProcess = tmp != null ? tmp : 0;
            let vals = [];
            let pvtRowList = this.querySelectorAll('#pvtRow .pvtAttr');
            for (let el of pvtRowList) {
                subopts.rows.push(el.dataset.attrname);
            }
            let pvtColList = this.querySelectorAll('#pvtCol .pvtAttr');
            for (let el of pvtColList) {
                subopts.cols.push(el.dataset.attrname);
            }
            let dDownList = this.querySelectorAll('.pvtAttrDropdown');
            for (let el of dDownList) {
                if (numInputsToProcess === 0) {
                    (_a = el.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(el);
                }
                else {
                    numInputsToProcess--;
                    if (el.value !== "") {
                        vals.push(el.value);
                    }
                }
            }
            if (numInputsToProcess !== 0) {
                let pvtVals = this.querySelectorAll('.pvtVals');
                let newDropdown = "<select class=\"pvtAttrDropdown\" id=\"newDropDown\">";
                for (let x in Array.from(Array(numInputsToProcess).keys())) {
                    for (let attr of shownInAggregators) {
                        newDropdown += `<option value=\"${attr}\">${attr}</option>`;
                    }
                }
                pvtVals[0].insertAdjacentHTML("beforeend", newDropdown + "</select>");
                let dDown = pvtVals[0].querySelector("#newDropDown");
                dDown === null || dDown === void 0 ? void 0 : dDown.addEventListener("change", function () { return refresh(); });
            }
            if (initialRender) {
                vals = opts.vals;
                let i = 0;
                let elList = this.querySelectorAll(".pvtAttrDropdown");
                for (let el of elList) {
                    el.value = vals[i];
                    i++;
                }
                initialRender = false;
            }
            subopts.aggregatorName = aggregator.value;
            subopts.vals = vals;
            subopts.aggregator = opts.aggregators[aggregator.value](vals);
            subopts.renderer = opts.renderers[renderer.value];
            subopts.rowOrder = rowOrderArrow.dataset.order;
            subopts.colOrder = colOrderArrow.dataset.order;
            //construct filter here
            let exclusions = {};
            let inclusions = {};
            let elList = this.querySelectorAll('.pvtFilter');
            for (let el of elList) {
                let filter;
                if (!el.checked) {
                    filter = el.dataset.filter;
                    filter = filter.split(',');
                    if (exclusions[filter[0]] != null) {
                        exclusions[filter[0]].push(filter[1]);
                    }
                    else {
                        exclusions[filter[0]] = [filter[1]];
                    }
                }
                else {
                    filter = el.dataset.filter;
                    filter = filter.split(',');
                    if (exclusions[filter[0]] != null) {
                        if (inclusions[filter[0]] != null) {
                            inclusions[filter[0]].push(filter[1]);
                        }
                        else {
                            inclusions[filter[0]] = [filter[1]];
                        }
                    }
                }
            }
            subopts.filter = function (record) {
                if (!opts.filter(record)) {
                    return false;
                }
                for (let k in exclusions) {
                    let excludedItems = exclusions[k];
                    let tmp = record[k] != null ? record[k] : 'null';
                    if (excludedItems.indexOf(tmp) >= 0) {
                        return false;
                    }
                }
                return true;
            };
            pivotTable.pivot(materializedInput, subopts);
            let uiOpts = {
                cols: subopts.cols,
                rows: subopts.rows,
                colOrder: subopts.colOrder,
                rowOrder: subopts.rowOrder,
                vals: vals,
                exclusions: exclusions,
                inclusions: inclusions,
                inclusionsInfo: inclusions,
                aggregatorName: aggregator.value,
                rendererName: renderer.value
            };
            let pivotUIOptions = Object.assign(Object.assign({}, opts), { uiOpts });
            this.dataPivotUIOptions = pivotUIOptions;
            //if requested make sure unused columns are in alphabetical order
            //To be implemented: Usage still undetermined
            if (opts.autoSortUnusedAttrs) {
                alert("Found use of property: autoSortUnusedAttrs");
            }
            pivotTable.style.opacity = 1;
            if (opts.onRefresh != null) {
                opts.onRefresh(pivotUIOptions);
            }
            //endTime = performance.now()
            //console.log(endTime-startTime)
        };
        let refresh = () => {
            pivotTable.style.opacity = 0.5;
            return setTimeout(refreshDelayed, 10);
        };
        //the very first refresh will display the table
        refresh();
        let sortableContainers = document.querySelectorAll(".pvtAxisContainer");
        for (let el of sortableContainers) {
            Sortable.create(el, {
                group: 'sortables',
                onAdd: function () {
                    return refresh();
                },
                ghostClass: 'pvtPlaceHolder'
            });
        }
    }
    catch (error) {
        if (typeof console !== "undefined" && console !== null) {
            console.error(error.stack);
        }
        this.textContent = opts.localeStrings.uiRendererError;
    }
};
