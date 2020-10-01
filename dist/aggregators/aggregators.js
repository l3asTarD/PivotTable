import { defaultFormat } from "../../dist/utilities/numberOperations.js";
import { getSort, naturalSort } from "../../dist/utilities/sorter.js";
let aggregatorTemplates = {
    count: function (formatter = defaultFormat.usFormatInt) {
        return function () {
            return function (data, rowKey, colKey) {
                return {
                    count: 0,
                    push: function () { return this.count++; },
                    value: function () { return this.count; },
                    format: formatter
                };
            };
        };
    },
    uniques: function (fn, formatter = defaultFormat.usFormatInt) {
        return function ([attr]) {
            return function (data, rowKey, colKey) {
                return {
                    uniq: [],
                    push: function (record) {
                        if (this.uniq.indexOf(record[attr]) < 0) {
                            return this.uniq.push(record[attr]);
                        }
                    },
                    value: function () {
                        return fn(this.uniq);
                    },
                    format: formatter,
                    numInputs: attr != null ? 0 : 1
                };
            };
        };
    },
    sum: function (formatter = defaultFormat.usFormat) {
        return function ([attr]) {
            return function (data, rowKey, colKey) {
                return {
                    sum: 0,
                    push: function (record) {
                        if (!isNaN(+record[attr])) {
                            return this.sum += +record[attr];
                        }
                    },
                    value: function () {
                        return this.sum;
                    },
                    format: formatter,
                    numInputs: attr != null ? 0 : 1
                };
            };
        };
    },
    extremes: function (mode, formatter = defaultFormat.usFormat) {
        return function ([attr]) {
            return function (data, rowKey, colKey) {
                return {
                    val: null,
                    sorter: getSort(data === null || data === void 0 ? void 0 : data.sorters, attr),
                    push: function (record) {
                        let x = record[attr];
                        if (["min", "max"].indexOf(mode) > -1) {
                            x = +x;
                            if (!isNaN(x)) {
                                this.val = Math[mode](x, this.val != null ? this.val : x);
                            }
                            if (mode === "first") {
                                if (this.sorter(x, this.val != null ? this.val : x) <= 0) {
                                    this.val = x;
                                }
                            }
                            if (mode === "last") {
                                if (this.sorter(x, this.val != null ? this.val : x) >= 0) {
                                    this.val = x;
                                }
                            }
                        }
                    },
                    value: function () { return this.val; },
                    format: function (x) {
                        return isNaN(x) ? x : formatter(x);
                    },
                    numInputs: attr != null ? 0 : 1
                };
            };
        };
    },
    quantile: function (q, formatter = defaultFormat.usFormat) {
        return function ([attr]) {
            return function (data, rowKey, colKey) {
                return {
                    vals: [],
                    push: function (record) {
                        let x = +record[attr];
                        if (!isNaN(x)) {
                            this.vals.push(x);
                        }
                    },
                    value: function () {
                        if (this.vals.length === 0) {
                            return null;
                        }
                        this.vals.sort(function (a, b) { return a - b; });
                        let i = (this.vals.length - 1) * q;
                        return (this.vals[Math.floor(i)] + this.vals[Math.ceil(i)]) / 2.0;
                    },
                    format: formatter,
                    numInputs: attr != null ? 0 : 1
                };
            };
        };
    },
    runningStat: function (mode = "mean", ddof = 1, formatter = defaultFormat.usFormat) {
        return function ([attr]) {
            return function (data, rowKey, colKey) {
                return {
                    n: 0.0,
                    m: 0.0,
                    s: 0.0,
                    push: function (record) {
                        let x = +record[attr];
                        if (isNaN(x)) {
                            return;
                        }
                        this.n += 1.0;
                        if (this.n == 1.0) {
                            this.m = x;
                        }
                        else {
                            let m_new = this.m + (x - this.m) / this.n;
                            this.s = this.s + (x - this.m) * (x - m_new);
                            this.m = m_new;
                        }
                    },
                    value: function () {
                        if (mode === "mean") {
                            return this.n == 0 ? 0 / 0 : this.m;
                        }
                        if (this.n <= ddof) {
                            return 0;
                        }
                        switch (mode) {
                            case "var":
                                return this.s / (this.n - ddof);
                            case "stdev":
                                return Math.sqrt(this.s / (this.n - ddof));
                        }
                    },
                    format: formatter,
                    numInputs: attr != null ? 0 : 1
                };
            };
        };
    },
    sumOverSum: function (formatter = defaultFormat.usFormat) {
        return function ([num, denom]) {
            return function (data, rowKey, colKey) {
                return {
                    sumNum: 0,
                    sumNumDenom: 0,
                    push: function (record) {
                        if (!isNaN(+record[num])) {
                            this.sumNum += +record[num];
                        }
                        if (!isNaN(+record[denom])) {
                            this.sumNumDenom += +record[denom];
                        }
                    },
                    value: function () {
                        return this.sumNum / this.sumNumDenom;
                    },
                    format: formatter,
                    numInputs: num != null && denom != null ? 0 : 2
                };
            };
        };
    },
    sumOverSumBound80: function (upper = true, formatter = defaultFormat.usFormat) {
        return function ([num, denom]) {
            return function (data, rowKey, colKey) {
                return {
                    sumNum: 0,
                    sumDenom: 0,
                    push: function (record) {
                        if (!isNaN(+record[num])) {
                            this.sumNum += +record[num];
                        }
                        if (!isNaN(+record[denom])) {
                            this.sumDenom += +record[denom];
                        }
                    },
                    value: function () {
                        let sign = upper ? 1 : -1;
                        return (0.821187207574908 / this.sumDenom + this.sumNum / this.sumDenom + 1.2815515655446004 * sign *
                            Math.sqrt(0.410593603787454 / (this.sumDenom * this.sumDenom) + (this.sumNum * (1 - this.sumNum / this.sumDenom)) / (this.sumDenom * this.sumDenom))) / (1 + 1.642374415149816 / this.sumDenom);
                    },
                    format: formatter,
                    numInputs: num != null && denom != null ? 0 : 2
                };
            };
        };
    },
    //TODO: getAggegator()
    fractionOf: function (wrapped, type = "total", formatter = defaultFormat.usFormat) {
        return function (...x) {
            return function (data, rowKey, colKey) {
                return {
                    selector: {
                        total: [[], []],
                        row: [rowKey, []],
                        col: [[], colKey]
                    }[type],
                    inner: wrapped(...x)(data, rowKey, colKey),
                    push: function (record) { this.inner.push(record); },
                    format: formatter,
                    value: function () {
                        return this.inner.value() / data.getAggregator(...this.selector).inner.value();
                    },
                    numInputs: wrapped(...x)().numInputs
                };
            };
        };
    }
};
aggregatorTemplates.countUnique = function (f) { return aggregatorTemplates.uniques((function (x) { return x.length; }), f); };
aggregatorTemplates.listUnique = function (s) {
    return aggregatorTemplates.uniques((function (x) { return x.sort(naturalSort).join(s); }), (function (x) { return x; }));
};
aggregatorTemplates.max = function (f) { return aggregatorTemplates.extremes("max", f); };
aggregatorTemplates.min = function (f) { return aggregatorTemplates.extremes("min", f); };
aggregatorTemplates.first = function (f) { return aggregatorTemplates.extremes("first", f); };
aggregatorTemplates.last = function (f) { return aggregatorTemplates.extremes("last", f); };
aggregatorTemplates.median = function (f) { return aggregatorTemplates.quantile(0.5, f); };
aggregatorTemplates.average = function (f) { return aggregatorTemplates.runningStat("mean", 1, f); };
aggregatorTemplates.var = function (ddof, f) { return aggregatorTemplates.runningStat("mean", ddof, f); };
aggregatorTemplates.stdev = function (ddof, f) { return aggregatorTemplates.runningStat("stdev", ddof, f); };
export { aggregatorTemplates };
