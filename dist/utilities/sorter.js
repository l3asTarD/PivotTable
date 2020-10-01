let rx = /(\d+)|(\D+)/g;
let rd = /\d/;
let rz = /^0/;
function naturalSort(val1, val2) {
    //nulls first
    if (val2 != null && val1 == null) {
        return -1;
    }
    if (val1 != null && val2 == null) {
        return 1;
    }
    //then raw NaNs
    if (typeof val1 === "number" && isNaN(val1)) {
        return -1;
    }
    if (typeof val2 === "number" && isNaN(val2)) {
        return 1;
    }
    //numbers and numbery strings group together
    let numVal1 = +val1;
    let numVal2 = +val2;
    if (numVal1 < numVal2) {
        return -1;
    }
    if (numVal1 > numVal2) {
        return 1;
    }
    //within that, true numbers before numbery strings
    if (typeof val1 === "number" && typeof val2 !== "number") {
        return -1;
    }
    if (typeof val1 !== "number" && typeof val2 === "number") {
        return 1;
    }
    if (typeof val1 === "number" && typeof val2 === "number") {
        return 0;
    }
    //'Infinity' is a textual number, so less than 'A'
    if (isNaN(numVal2) && !isNaN(numVal1)) {
        return -1;
    }
    if (isNaN(numVal1) && !isNaN(numVal2)) {
        return 1;
    }
    //finally, "smart" string sorting
    let stringVal1 = "" + val1;
    let stringVal2 = "" + val2;
    if (stringVal1 === stringVal2) {
        return 0;
    }
    if (rd.test(stringVal1) && rd.test(stringVal2)) {
        return stringVal1 > stringVal2 ? 1 : -1;
    }
    //special treatment for strings containing digits
    let stringDig1 = stringVal1.match(rx); //create digits vs non-digit chucks and iterate through
    let stringDig2 = stringVal2.match(rx);
    while ((stringDig1 === null || stringDig1 === void 0 ? void 0 : stringDig1.length) && (stringDig2 === null || stringDig2 === void 0 ? void 0 : stringDig2.length)) {
        let charFromVal1 = stringDig1.shift();
        let charFromVal2 = stringDig2.shift();
        if (charFromVal1 !== charFromVal2) {
            if (rd.test("" + charFromVal1) && rd.test("" + charFromVal2)) {
                return +charFromVal1.replace(rz, ".0") - +charFromVal2.replace(rz, ".0");
            }
            else {
                return charFromVal1 > charFromVal2 ? 1 : -1;
            }
        }
    }
    return stringVal1.length - stringVal2.length;
}
function getSort(sorters, attr) {
    if (sorters != null) {
        if (sorters instanceof Function) {
            let sort = sorters(attr);
            if (sort instanceof Function) {
                return sort;
            }
        }
        else if (sorters[attr] != null) {
            return sorters[attr];
        }
    }
    return naturalSort;
}
export { naturalSort, getSort };
