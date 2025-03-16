function mapMonthWeek(amountArr,isMonthly) {
    if(isMonthly)
        return ['January','February','March','April','May','June','July','August','September','October','November','December']
            .map((month,i) =>( {segment: month, amount: amountArr[i]?.amount??0}) );
    return amountArr.map((amt,i)=>({segment: i+1,amount:amt.amount}));
}

function getCurrentMonth(month){
    const monthArr =['January','February','March','April','May','June','July','August','September','October','November','December'];
    return monthArr[month-1];
}

module.exports = { mapMonthWeek , getCurrentMonth };