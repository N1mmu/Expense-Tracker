const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const {uri} = require('../config.json')

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

client.connect();
const db = client.db('Finance');
// const db = req.app.locals.db;
const collection = db.collection('Expense');

// variables
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth()+1;
const startMonthDate = `${currentYear}-${currentMonth}-00`;
const endMonthDate = `${currentYear}-${currentMonth}-32`;
const startYearDate = `${currentYear}-01-00`;
const endYearate = `${currentYear}-12-32`;

// schema validation
function validateExpense(Details, Category, Price, date){
    return (Details!='' && Category!='' && Number(Price) && (new Date(date)).toString()!='Invalid Date')
}

// functions
async function DBget(limit,page,query){ 
    const expenses = await collection.find(query).sort({date : -1}).limit(limit??7).skip((page-1)*limit??0).toArray();
    return expenses;
};

async function DBdelete(id) {
    await collection.deleteOne(
        {
            "_id":new ObjectId(id)
        }
    );
};

async function DBinsert(Details, Category, Price, Date) {
    if (validateExpense(Details,Category, Price, Date))
    await collection
        .insertOne(
            {
                "details": Details ,
                 "amount":Price,
                 "type":Category,
                 "date": Date
                }
            );
    else console.log('invalid data for inserting');
};

async function DBsumAmount() {
    const sumObj = {};
    // Calculating Total
    const [{ total }]= await getAggregate(
        [
            {
                $group: {
                    _id:null,
                    total: {$sum : { $toDouble : "$amount"}}
                }
            }
        ]
    );
    // Calculating monthly total
    const[{monthTotal}] = await getAggregate(
        [
            {
                $match:{
                    date: {
                        $gte: startMonthDate,
                        $lt: endMonthDate
                    }
                }
            },
            {
                $group:{
                    _id:null,
                    monthTotal: {$sum :{ $toDouble : "$amount"}}
                }
            }
        ]
    );
    // Calculating yearly total 
    const[{yearTotal}] = await getAggregate([
        {
            $match:{
                date: {
                    $gte: startYearDate,
                    $lt: endYearate
                }
            }
        },
        {
            $group:{
                _id:null,
                yearTotal: {$sum :{ $toDouble : "$amount"}}
            }
        }
    ]);
    
    sumObj.total = total;
    sumObj.month = monthTotal;
    sumObj.year = yearTotal;

    return sumObj;
}

async function dashboardData(graphType, timespan ) {

    year = (timespan>0)?currentYear+(timespan-1): currentYear+Math.floor(Math.abs(timespan)/12);
    month = (timespan>0)?currentMonth : currentMonth+(timespan)%12; 
    if(graphType == 'category'){
        const pipeline =  [
            {
                $match:{
                    date: {
                        $gte: (timespan>1)?`${year}`: `${year}-${month}-00`,
                        $lt: (timespan>1)?`${year+1}`:`${year}-${month}-32`  
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
        return await getAggregate(pipeline);
        }
    else if(graphType=='bar'){
        // if its year then return an array with monthly expense
        if (timespan>0){
            return Promise.all( ['01','02','03','04','05','06','07','08','09','10','11','12']
            .map(month => getMonthlyExpense(month,`${year}`)));
        }
        else{
            const splitMonthArr = await splitMonthToWeeks(month,year);
            return getWeeklyExpense(splitMonthArr);
        }
    }
                
                
}

async function getMonthlyExpense( month ,year ) {
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
    const [result] = await getAggregate(pipeline);
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

async function getWeeklyExpense(splitMonthArr) {
    const data = splitMonthArr.map(async function (weekStart,i) {
        if(weekStart.slice(8)=='32'){
            return 0;
        }else{
            const [amountobj={amount:0}] = await getAggregate([
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

async function getAggregate(pipeline){
    return await collection.aggregate(pipeline).toArray();
    
}

// module.exports = { DBget , DBdelete , DBinsert , DBsumAmount ,dashboardData };