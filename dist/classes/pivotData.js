import { aggregatorTemplates } from "../../dist/aggregators/aggregators.js";
import { getSort, naturalSort } from "../../dist/utilities/sorter.js";
let PivotData = class PivotData {
    constructor(input, opts = {}) {
        this.arrSort = this.arrSort.bind(this);
        this.sortKeys = this.sortKeys.bind(this);
        this.getColKeys = this.getColKeys.bind(this);
        this.getRowKeys = this.getRowKeys.bind(this);
        this.getAggregator = this.getAggregator.bind(this);
        this.input = input;
        this.aggregator = opts.aggregator != null ? opts.aggregator : aggregatorTemplates.count()();
        this.aggregatorName = opts.aggregatorName != null ? opts.aggregatorName : "Count";
        this.colAttrs = opts.cols != null ? opts.cols : [];
        this.rowAttrs = opts.rows != null ? opts.rows : [];
        this.valAttrs = opts.vals != null ? opts.vals : [];
        this.sorters = opts.sorters != null ? opts.sorters : {};
        this.rowOrder = opts.rowOrder != null ? opts.rowOrder : "key_a_to_z";
        this.colOrder = opts.colOrder != null ? opts.colOrder : "key_a_to_z";
        this.derivedAttributes = opts.derivedAttributes != null ? opts.derivedAttributes : {};
        this.filter = opts.filter != null ? opts.filter : (function () { return true; });
        this.tree = {};
        this.rowKeys = [];
        this.colKeys = [];
        this.rowTotals = {};
        this.colTotals = {};
        this.allTotal = this.aggregator(this, [], []);
        this.sorted = false;
        //iterate through input, accumulating data for cells
        PivotData.forEachRecord(this.input, this.derivedAttributes, (record) => {
            if (this.filter(record)) {
                return this.processRecord(record);
            }
        });
    }
    static forEachRecord(input, derivedAttributes, f) {
        let addRecord;
        if (Object.keys(derivedAttributes).length === 0 && derivedAttributes.constructor === Object) {
            addRecord = f;
        }
        else {
            addRecord = function (record) {
                for (let [k, v] of derivedAttributes) {
                    record[k] = v(record) != null ? v(record) : record[k];
                }
                return f(record);
            };
        }
        if (input instanceof Function) {
            return input(addRecord);
        }
        else if (Array.isArray(input)) {
            let results = [];
            if (Array.isArray(input[0])) { //array of arrays
                console.log("array of arrays");
                for (let i in input) {
                    let compactRecord = input[i];
                    let record = {};
                    for (let j in input[0]) {
                        let k = input[0][j];
                        record[k] = compactRecord[j];
                    }
                    results.push(addRecord(record));
                }
                return results;
            }
            else { //array of objects
                for (let record in input) {
                    results.push(addRecord(input[record]));
                }
                return results;
            }
        }
        else {
            throw new Error("unknown input format");
        }
    }
    arrSort(attrs) {
        let s = this.sorters;
        let sortersArr = (function () {
            let results = [];
            for (let a of attrs) {
                results.push(getSort(s, a));
            }
            return results;
        }).call(this);
        return function (a, b) {
            let sorter;
            let comparison;
            for (let i in sortersArr) {
                sorter = sortersArr[i];
                comparison = sorter(a[i], b[i]);
                if (comparison !== 0) {
                    return comparison;
                }
            }
            return 0;
        };
    }
    sortKeys() {
        if (!this.sorted) {
            this.sorted = true;
            let v = (r, c) => {
                return this.getAggregator(r, c).value;
            };
            switch (this.rowOrder) {
                case "value_a_to_z":
                    this.rowKeys.sort((a, b) => {
                        return naturalSort(v(a, []), v(b, []));
                    });
                    break;
                case "value_z_to_a":
                    this.rowKeys.sort((a, b) => {
                        return naturalSort(v(a, []), v(b, []));
                    });
                    break;
                default:
                    this.rowKeys.sort(this.arrSort(this.rowAttrs));
            }
            switch (this.colOrder) {
                case "value_a_to_z":
                    return this.colKeys.sort((a, b) => {
                        return naturalSort(v([], a), v([], b));
                    });
                    break;
                case "value_z_to_a":
                    return this.colKeys.sort((a, b) => {
                        return naturalSort(v([], a), v([], b));
                    });
                    break;
                default:
                    this.colKeys.sort(this.arrSort(this.colAttrs));
            }
        }
    }
    getColKeys() {
        this.sortKeys();
        return this.colKeys;
    }
    getRowKeys() {
        this.sortKeys;
        return this.rowKeys;
    }
    processRecord(record) {
        let colKey = [];
        let rowKey = [];
        for (let x of this.colAttrs) {
            colKey.push(record[x] != null ? record[x] : "null");
        }
        for (let x of this.rowAttrs) {
            rowKey.push(record[x] != null ? record[x] : "null");
        }
        let flatRowKey = rowKey.join(String.fromCharCode(0));
        let flatColKey = colKey.join(String.fromCharCode(0));
        this.allTotal.push(record);
        if (rowKey.length !== 0) {
            if (!this.rowTotals[flatRowKey]) {
                this.rowKeys.push(rowKey);
                this.rowTotals[flatRowKey] = this.aggregator(this, rowKey, []);
            }
            this.rowTotals[flatRowKey].push(record);
        }
        if (colKey.length !== 0) {
            if (!this.colTotals[flatColKey]) {
                this.colKeys.push(colKey);
                this.colTotals[flatColKey] = this.aggregator(this, colKey, []);
            }
            this.colTotals[flatColKey].push(record);
        }
        if (rowKey.length !== 0 && rowKey.length !== 0) {
            if (!this.tree[flatRowKey]) {
                this.tree[flatRowKey] = {};
            }
            if (!this.tree[flatRowKey][flatColKey]) {
                this.tree[flatRowKey][flatColKey] = this.aggregator(this, rowKey, colKey);
            }
            return this.tree[flatRowKey][flatColKey].push(record);
        }
    }
    getAggregator(rowKey, colKey) {
        let agg;
        let flatRowKey = rowKey.join(String.fromCharCode(0));
        let flatColKey = colKey.join(String.fromCharCode(0));
        if (rowKey.length === 0 && colKey.length === 0) {
            agg = this.allTotal;
        }
        else if (rowKey.length === 0) {
            agg = this.colTotals[flatColKey];
        }
        else if (colKey.length === 0) {
            agg = this.rowTotals[flatRowKey];
        }
        else {
            agg = this.tree[flatRowKey][flatColKey];
        }
        return (agg != null) ? agg : {
            value: (function () { return null; }),
            format: function () { return ""; }
        };
    }
};
export { PivotData };
