const { json } = require('express');
const { mapMonthWeek , getCurrentMonth } =require('../utils/utilities');

// variables
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth()+1;
const startMonthDate = `${currentYear}-${currentMonth}-00`;
const endMonthDate = `${currentYear}-${currentMonth}-32`;
const startYearDate = `${currentYear}-01-00`;
const endYearate = `${currentYear}-12-32`;
const dateData = {month:0,year:0}
exports.dashboard=async(req,res) => {
    // console.log(`${(Math.floor((ele.amount)/100000))?Math.floor((ele.amount)/100000):''}${(Math.floor(ele.amount/100000))?','+(Math.floor((ele.amount%100000)/1000)):Math.floor((ele.amount%100000)/1000)?((Math.floor((ele.amount%100000)/1000))?Math.floor((ele.amount%100000)/1000):'00'):''}${Math.floor(ele.amount/1000)?`,${(ele.amount%1000)?(ele.amount%1000):'000'}`:(ele.amount%1000)?(ele.amount%1000):'000'}`)
    // const db = req.app.locals.expenseDb;
    const { type='' } = req.query;
    db = (type=='credits')? req.app.locals.creditsDb : req.app.locals.expenseDb;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const { timespan = 0 } = req.query;
    const timespanNum = Number(timespan);
    let month = (timespanNum>0)?currentMonth : ((currentMonth+timespanNum)+12)%12;
    const year = (timespanNum>0)?currentYear-(timespanNum-1): currentYear-Math.floor(Math.abs(currentMonth+timespanNum-12)/12);
    month = (month<0)?month*-1:month==0?12:month;
    dateData.month = month;
    dateData.year = year;
    if(type == 'expense' || type == '' || type == 'credits'){
       
        let categoryData = await dashboardData(db,'category',timespanNum);
        const monthlyDataRaw = await dashboardData(db,'bar',timespanNum);
        const monthlyData = mapMonthWeek(monthlyDataRaw,timespanNum>0);
        const monthName = (timespanNum>0)?'':getCurrentMonth(month);
        categoryData = categoryData.map(ele => {
            return {
                _id : ele._id,
                type: type,
                amount : ele.amount
            }
        })
        res.render('pages/dashboard',
            {
            expenseCategoryCanvas: JSON.stringify(categoryData),
            monthlyExpenseCanvas: JSON.stringify(monthlyData),
            monthlyCreditCanvas: JSON.stringify({1:1}),
            timespan: timespanNum,
            month: monthName,
            year: year,
            type : type
        });
    }else if(type=='total'){
        const db2= req.app.locals.creditsDb;
        // expense
        let categoryDataExpense = await dashboardData(db,'category',timespanNum);
        const monthlyDataRawExpense = await dashboardData(db,'bar',timespanNum);
        const monthlyDataExpense = mapMonthWeek(monthlyDataRawExpense,timespanNum>0);
        categoryDataExpense = categoryDataExpense.map(ele => {
            return {
                _id : ele._id,
                type: 'expense',
                amount : ele.amount
            }
        })
        // credit
        let categoryDataCredit = await dashboardData(db2,'category',timespanNum);
        const monthlyDataRawCredit = await dashboardData(db2,'bar',timespanNum);
        const monthlyDataCredit = mapMonthWeek(monthlyDataRawCredit,timespanNum>0);
        categoryDataCredit = categoryDataCredit.map(ele => {
            return {
                _id : ele._id,
                type: 'credits',
                amount : ele.amount
            }
        })

        const monthName = (timespanNum>0)?'':getCurrentMonth(month);

        res.render('pages/dashboard',
            {
            expenseCategoryCanvas: JSON.stringify([...categoryDataExpense,...categoryDataCredit]),
            monthlyExpenseCanvas: JSON.stringify(monthlyDataExpense),
            monthlyCreditCanvas: JSON.stringify(monthlyDataCredit),
            timespan: timespanNum,
            month: monthName,
            year: year,
            type : type
        })

    }
};


async function dashboardData(collection,graphType, timespan ) {
    // month = (timespan>0)?currentMonth : ((currentMonth+timespan)+12)%12; 
    // year = (timespan>0)?currentYear+(timespan-1): currentYear-Math.floor(Math.abs(currentMonth+timespan-12)/12);
    // month = (month<0)?month*-1:month==0?12:month;
    const month = dateData.month;
    const year = dateData.year;
    if(graphType == 'category'){
        const pipeline =  [
            {
                $match:{
                    date: {
                        $gte: (timespan>=1)?`${year}`: `${year}-${month<10?'0'+month:month}-00`,
                        $lt: (timespan>=1)?`${year+1}`:`${year}-${month<10?'0'+month:month}-32`  
                    }
                }
            },{
                $group: {
                    _id: {$toLower: "$category"}, 
                    amount: {$sum : { $multiply: [
                        {$toDouble : "$price"} ,
                        { 
                            $cond: { 
                                if: { $not: ["$quantity"] }, 
                                then: 1, 
                                else: { $toDouble: "$quantity" } 
                            } 
                        }
                    ]}}
                }
            },{
                $sort: {_id: 1}
            }]
        return await getAggregate(collection,pipeline);
        }
    else if(graphType=='bar'){
        // if its year then return an array with monthly expense
        if (timespan>0){
            return Promise.all( ['01','02','03','04','05','06','07','08','09','10','11','12']
            .map(month => getMonthlyExpense(collection,month,`${year}`)));
        }
        else{
            const splitMonthArr = await splitMonthToWeeks(month,year);
            return getWeeklyExpense(collection,splitMonthArr);
        }
    }
                
                
}

async function getMonthlyExpense(collection, month ,year ) {
    const pipeline = [
        {
        $match:{
            date: {
                $gte:`${year}-${month}-00`,
                $lt: `${year}-${month}-32` 
            }
        }
    },{
        $group: {
            _id: null, 
            amount: {$sum : { $multiply: [
                {$toDouble : "$price"} ,
                { 
                    $cond: { 
                        if: { $not: ["$quantity"] }, 
                        then: 1, 
                        else: { $toDouble: "$quantity" } 
                    } 
                } 
            ]}}
        }
    }
]
    const [result] = await getAggregate(collection,pipeline);
    return result;
}


function splitMonthToWeeks(month,year){
    const q = 1; // day
    const m = (month==1 || month==2)? month+12:month; // month
    const y = (month==1 || month==2)? year-1:year; // year
    const k = y%100;  // last 2 digit of year
    const j = Math.floor(y/100); // first 2 digit of year
    const h = Math.floor(q+Math.floor((13*(m+1))/5)+k+Math.floor(k/4)+Math.floor(j/4)-(2*j)-1)%7;
    // remaining day in week
    let remainingDays= 7-h ?? 7;
    // first day on 2nd week
    remainingDays += 1;
    const splitMonthArr = [`${year}-${(month<9)?0:''}${month}-01`];
    while(remainingDays<31){
        splitMonthArr.push( `${year}-${(month<=9)?0:''}${month}-${remainingDays<=9?0:''}${remainingDays}`);
        remainingDays+=7;
    }
    splitMonthArr.push(`${year}-${(month<9)?0:''}${month}-32`)
    return splitMonthArr;
}

async function getWeeklyExpense(collection,splitMonthArr) {
    const data = splitMonthArr.map(async function (weekStart,i) {
        if(weekStart.slice(8)=='32'){
            return 0;
        }else{
            const [amountobj={amount:0}] = await getAggregate(collection,[
                {
                $match:{
                    date: {
                        $gte:weekStart,
                        $lte: splitMonthArr[i+1] 
                    }
                }
            },{
                $group: {
                    _id: null, 
                    amount: {$sum : { $multiply: [
                        {$toDouble : "$price"} ,
                        { $toDouble: "$quantity" } 
                    ]}}
                }
            }
        ]);
            return amountobj;
        }
    });
    const result = await Promise.all(data);
    return result.slice(0,-1);
}

async function getAggregate(collection,pipeline){
    return await collection.aggregate(pipeline).toArray();
    
}