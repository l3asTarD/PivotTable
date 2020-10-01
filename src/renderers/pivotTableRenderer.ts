import {deepMerge} from "../../dist/utilities/deepMerge.js"

let pivotTableRenderer = function(pivotData, opts1){
    let defaults = {
        table: {
            rowTotals: true,
            colTotals: true
        },
        localeStrings: {totals: "Totals"}
    }
    let opts = deepMerge(true, defaults, opts1)
    let colAttrs = pivotData.colAttrs
    let rowAttrs = pivotData.rowAttrs
    let rowKeys = pivotData.getRowKeys()
    let colKeys = pivotData.getColKeys()

    let spanSize = function(arr, i, j){
        var k, l, len, noDraw, ref, ref1, stop, x;
        if(i !== 0){
            noDraw = true
            for (x = k = 0, ref = j; (0 <= ref ? k <= ref : k >= ref); x = 0 <= ref ? ++k : --k){
                if(arr[i-1][x] !== arr[i][x]){
                    noDraw = false
                }
            }
            if(noDraw){
                return -1
            }
        }
        len = 0
        while(i+len < arr.length){
            stop = false
            for (x = l = 0, ref1 = j; (0 <= ref1 ? l <= ref1 : l >= ref1); x = 0 <= ref1 ? ++l : --l){
                stop = (arr[i][x] !== arr[i+len][x]) ? true : false
            }
            if(stop){break;}
            len++
        }
        return len
    }

    //the first few rows are col headers
    let result = document.createElement("table")
    result.className = "pvtTable"
    let thead = document.createElement("thead")
    let theadFrag = document.createDocumentFragment()
    for(let j in colAttrs){
        let tr = document.createElement("tr")
        let c = colAttrs[j]
        let th: string
        if(parseInt(j) === 0 && rowAttrs.length !== 0){
            th = `<th colspan=\"${rowAttrs.length}\" rowspan=\"${colAttrs.length}\"></th>`
            tr.insertAdjacentHTML("beforeend",th)
        }
        th = `<th class=\"pvtAxisLabel\">${c}</th>`
        tr.insertAdjacentHTML("beforeend",th)
        for(let i in colKeys){
            let colKey = colKeys[i]
            let x = spanSize(colKeys, parseInt(i), parseInt(j))
            if(x !== -1){
                th = `<th class=\"pvtColLabel\" colspan=\"${x}\">${colKey[j]}</th>`
                if(parseInt(j) === colAttrs.length-1 && rowAttrs.length !== 0){
                    th = `<th class=\"pvtColLabel\" colspan=\"${x}\" rowspan=\"2\">${colKey[j]}</th>`
                }
                tr.insertAdjacentHTML("beforeend",th)
            }
        }
        if(parseInt(j) === 0 && opts.table.rowTotals){
            let rSpan = colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)
            th = `<th class=\"pvtTotalLabel pvtRowTotalLabel\" rowspan=\"${rSpan}\"> ${opts.localeStrings.totals}</th>`
            tr.insertAdjacentHTML("beforeend", th)
        }
        theadFrag.appendChild(tr)
    }

    //then a row for row header headers
    if(rowAttrs.length !== 0){
        let tr = document.createElement("tr")
        let th: string
        for(let r of rowAttrs){
            th = `<th class=\"pvtAxisLabel\">${r}</th>`
            tr.insertAdjacentHTML("beforeend",th)
        }
        th = "<th></th>"
        if(colAttrs.length === 0){
            th = `<th class=\"pvtTotalLabel pvtRowTotalLabel\">${opts.localeStrings.totals}</th>`
        }
        tr.insertAdjacentHTML("beforeend",th)
        theadFrag.appendChild(tr)
    }
    thead.appendChild(theadFrag)
    result.appendChild(thead)

    //now the actual data rows, with their row headers and totals
    let tbody = document.createElement("tbody")
    let tbodyFrag = document.createDocumentFragment()
    let th: string
    for(let i in rowKeys){
        let rowKey = rowKeys[i]
        let tr = document.createElement("tr")
        for(let j in rowKey){
            let txt = rowKey[j]
            let x = spanSize(rowKeys, parseInt(i), parseInt(j))
            if(x !== -1){
                th = `<th class=\"pvtRowLabel\" rowspan=\"${x}\" colspan=\"2\">${txt}</th>`
                if(parseInt(j) === rowAttrs.length-1 && colAttrs.length !== 0){
                    th = `<th class=\"pvtRowLabel\" rowspan=\"${x}\" colspan=\"2\">${txt}</th>`
                }
                tr.insertAdjacentHTML("beforeend", th)
            }
        }
        for(let j in colKeys){
            let colKey = colKeys[j]
            let aggregator = pivotData.getAggregator(rowKey, colKey)
            let val = aggregator.value()
            let td = `<td class=\"pvtVal row${i} col${j}\" data-value=\"${val}\">${aggregator.format(val)}</td>`
            tr.insertAdjacentHTML("beforeend",td)
        }
        if(opts.table.rowTotals || colAttrs.length == 0){
            let totalAggregator = pivotData.getAggregator(rowKey, [])
            let val = totalAggregator.value()
            let td = `<td class=\"pvtTotal rowTotal\" data-value=\"${val}\">${totalAggregator.format(val)}</td>`
            tr.insertAdjacentHTML("beforeend",td)
        }
        tbodyFrag.appendChild(tr)
    }

    //finally, the row for col totals, and a grand total
    if(opts.table.colTotals || rowAttrs.length === 0){
        let tr = document.createElement("tr")
        if(opts.table.colTotals || rowAttrs.length === 0){
            let cSpan = rowAttrs.length + (colAttrs.length == 0 ? 0 : 1)
            let th = `<th class=\"pvtTotalLabel pvtColTotalLabel\" colspan=\"${cSpan}\">${opts.localeStrings.totals}</th>`
            tr.insertAdjacentHTML("beforeend",th)
        }
        for(let j in colKeys){
            let colKey = colKeys[j]
            let totalAggregator = pivotData.getAggregator([], colKey)
            let val = totalAggregator.value()
            let td = `<td class=\"pvtTotal colTotal\" data-value=\"${val}\" data-for=\"col${j}\">
            ${totalAggregator.format(val)}</td>`
            tr.insertAdjacentHTML("beforeend", td)
        }
        if(opts.table.rowTotals || colAttrs.length === 0){
            let totalAggregator = pivotData.getAggregator([],[])
            let val = totalAggregator.value()
            let td = `<td class=\"pvtGrandTotal\" data-value=\"${val}\">${totalAggregator.format(val)}</td>`
            tr.insertAdjacentHTML("beforeend",td)
        }
        tbodyFrag.appendChild(tr)
    }
    tbody.appendChild(tbodyFrag)
    result.appendChild(tbody)

    //squirrel this away for later
    result.setAttribute("data-numrows", rowKeys.length)
    result.setAttribute("data-numcols", colKeys.length)
    return result
}

export {pivotTableRenderer}