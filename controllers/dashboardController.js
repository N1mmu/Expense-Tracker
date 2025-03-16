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
    const db = req.app.locals.db;
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
    const categoryData = await dashboardData(db,'category',timespanNum);
    const monthlyDataRaw = await dashboardData(db,'bar',timespanNum);
    const monthlyData = mapMonthWeek(monthlyDataRaw,timespanNum>0);
    const monthName = (timespanNum>0)?'':getCurrentMonth(month);
    res.render('pages/dashboard',
        {
        expenseCategoryCanvas: JSON.stringify(categoryData),
        monthlyExpenseCanvas: JSON.stringify(monthlyData),
        timespan: timespanNum,
        month: monthName,
        year: year
    });
};


async function dashboardData(collection,graphType, timespan ) {
    // month = (timespan>0)?currentMonth : ((currentMonth+timespan)+12)%12; 
    // year = (timespan>0)?currentYear+(timespan-1): currentYear-Math.floor(Math.abs(currentMonth+timespan-12)/12);
    // month = (month<0)?month*-1:month==0?12:month;
    const month = dateData.month;
    const year = dateData.year;
    console.log(year,month);
    if(graphType == 'category'){
        const pipeline =  [
            {
                $match:{
                    date: {
                        $gte: (timespan>1)?`${year}`: `${year}-${month<10?'0'+month:month}-00`,
                        $lt: (timespan>1)?`${year+1}`:`${year}-${month<10?'0'+month:month}-32`  
                    }
                }
            },{
                $group: {
                    _id: {$toLower: "$type"}, 
                    amount: { $sum: { $toDouble : "$amount"}}
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
            amount: { $sum: { $toDouble : "$amount"}}
        }
    }
]
    const [result] = await getAggregate(collection,pipeline);
    return result;
}


function splitMonthToWeeks(month,year){
    const q = 1;
    const m = (month==2 || month==3)? month+12:month;
    const y = (month==2 || month==3)? year-1:year;
    const k = y%100;
    const j = Math.floor(y/100);
    const h = Math.floor(q+Math.floor((13*(m+1))/5)+k+Math.floor(k/4)+Math.floor(j/4)-(2*j)-1)%7;
    // remaining day in week
    let remainingDays= 7-h ?? 7;
    // first day on 2nd week
    remainingDays += 1;
    const splitMonthArr = [`${year}-${(month<9)?0:''}${month}-01`];
    while(remainingDays<31){
        splitMonthArr.push( `${year}-${(month<9)?0:''}${month}-${remainingDays<9?0:''}${remainingDays}`);
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
                    amount: { $sum: { $toDouble : "$amount"}}
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