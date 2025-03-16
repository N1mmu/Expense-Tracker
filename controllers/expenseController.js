const{ObjectId } = require('mongodb');
const { mapMonthWeek , getCurrentMonth } =require('../utils/utilities');

// Variable declaration
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth()+1;
const startMonthDate = `${currentYear}-${currentMonth<10?'0'+currentMonth:currentMonth}-00`;
const endMonthDate = `${currentYear}-${currentMonth<10?'0'+currentMonth:currentMonth}-32`;
const startYearDate = `${currentYear}-01-00`;
const endYearate = `${currentYear}-12-32`;

exports.expense = async (req,res)=>{
    const db = req.app.locals.db;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const { pg = 1 } = req.query ;
    const { Details , Category , Price , Date } = req.query;
    const query = {};
    if(Details) query.details = Details;
    if(Category) query.type = Category;
    if(Price) query.amount = Price;
    if(Date) query.date = Date;
    const expenseArr = await DBget(db,8,Number(pg),query);
    const expensetotals = await DBsumAmount(db);
    res.render('pages/expense',{
        expenses: expenseArr ,
        page : Number(pg),
        query: query,
        totals : expensetotals
    });
};

exports.add =  async(req,res)=>{
    const db = req.app.locals.db;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const {Details, Category, Price, Date} = req.body;
    await DBinsert(db,Details, Category, Price, Date);
    return res.redirect('/expense');
};

exports.remove = async(req,res)=>{
    const db = req.app.locals.db;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const { id } = req.query;
    await DBdelete(db,id);
    return res.redirect('/expense');
};


async function DBget(collection,limit,page,query){ 
    const expenses = await collection.find(query).sort({date : -1}).limit(limit??7).skip((page-1)*limit??0).toArray();
    return expenses;
};

async function DBdelete(collection,id) {
    await collection.deleteOne(
        {
            "_id":new ObjectId(id)
        }
    );
};

async function DBinsert(collection,Details, Category, Price, Date) {
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

async function DBsumAmount(collection) {
    const sumObj = {};
    // Calculating Total
    const [{ total }]= await getAggregate(collection,
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
    const[{ monthTotal }] = await getAggregate(collection,
        [
            {
                $match:{
                    date: {
                        $gt: startMonthDate,
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
    ) ?? [{monthTotal:0}];
    // Calculating yearly total 
    const[{yearTotal}] = await getAggregate(collection,[
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
    ]) ?? [{yearTotal:0}];
    
    sumObj.total = total ;
    sumObj.month = monthTotal ;
    sumObj.year = yearTotal ;

    return sumObj;
};

async function getAggregate(collection,pipeline){
    let result = await collection.aggregate(pipeline).toArray();
    result = result.length? result : null;
    return result;
    
};

function validateExpense(Details, Category, Price, date){
    return (Details!='' && Category!='' && Number(Price) && (new Date(date)).toString()!='Invalid Date')
};