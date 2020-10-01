function addSeparators(numToConvert, thousandsSep, decimalSep) {
    let numParts = numToConvert.toString().split('.');
    let wholePart = numParts[0];
    let decimalPart = numParts.length > 1 ? decimalSep + numParts[1] : '';
    let rgx = /(\d+)(\d{3})/;
    while (rgx.test(wholePart)) {
        wholePart = wholePart.replace(rgx, '$1' + thousandsSep + '$2');
    }
    return wholePart + decimalPart;
}
function numberFormat(options) {
    let defaults = {
        digitsAfterDecimal: 2,
        scaler: 1,
        thousandsSep: ",",
        decimalSep: ".",
        prefix: "",
        suffix: ""
    };
    options = Object.assign(Object.assign({}, defaults), options);
    return function (x) {
        if (isNaN(x) || !isFinite(x)) {
            return "";
        }
        else {
            let result = addSeparators((options.scaler * x).toFixed(options.digitsAfterDecimal), options.thousandsSep, options.decimalSep);
            return options.prefix + result + options.suffix;
        }
    };
}
let defaultFormat = {
    usFormat: numberFormat(),
    usFormatInt: numberFormat({ digitsAfterDecimal: 0 }),
    usFormatPct: numberFormat({
        digitsAfterDecimal: 1,
        scaler: 100,
        suffix: "%"
    })
};
export { numberFormat, defaultFormat };
