function deepMerge(deep, ...args) {
    let extended = {};
    let i = 0;
    function merge(obj) {
        for (let prop in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
                    extended[prop] = deepMerge(true, extended[prop], obj[prop]);
                }
                else if (deep && Array.isArray(obj[prop])) {
                    if (extended[prop] == undefined) {
                        extended[prop] = obj[prop];
                    }
                    else {
                        extended[prop].splice(0, obj[prop].length, ...obj[prop]);
                    }
                }
                else {
                    extended[prop] = obj[prop];
                }
            }
        }
    }
    while (i < args.length) {
        let objInput = args[i];
        merge(objInput);
        i++;
    }
    return extended;
}
export { deepMerge };
