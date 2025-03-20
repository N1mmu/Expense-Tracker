const{ObjectId } = require('mongodb');
const { mapMonthWeek , getCurrentMonth } =require('../utils/utilities');
const productsJSON = require('../public/json/products.json')
// Variable declaration
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth()+1;
const startMonthDate = `${currentYear}-${currentMonth<10?'0'+currentMonth:currentMonth}-00`;
const endMonthDate = `${currentYear}-${currentMonth<10?'0'+currentMonth:currentMonth}-32`;
const startYearDate = `${currentYear}-01-00`;
const endYearate = `${currentYear}-12-32`;

exports.credits = async (req,res)=>{
    const db = req.app.locals.creditsDb;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const { pg = 1 } = req.query ;
    const { Details , Category , Price , FromDate, ToDate , ProductId, isSafe } = req.query;
    const query = {};
    if(Details) query.details = Details;
    if(Category) query.category = Category;
    if(Price) query.price = Price;
    if(!(FromDate && ToDate) && (FromDate || ToDate)) query.date = FromDate || ToDate;
    else if(FromDate && ToDate){
        query.date = {
                $gte: FromDate,
                $lte: ToDate
        }
    }
    if(ProductId) query.product = ProductId;
    const creditArrRaw = await DBget(db,8,Number(pg),query);
    const creditArr = creditArrRaw.map(element=>{
        const temp = {
            _id: element._id,
            details: element.details,
            category: element.category,
            price: element.price,
            date: element.date,
        }
        if(element.product){
            temp.product = productsJSON[element.product-101].name;
            temp.quantity = element.quantity;
        }
        return temp;
    })
    // console.log(creditArrRaw);
    // console.log(creditArr);
    query.toDate=ToDate || FromDate;
    query.fromDate=FromDate || ToDate;
    const creditsTotals = await DBsumAmount(db);
    res.render('pages/credits',{
        credits: creditArr ,
        page : Number(pg),
        query: query,
        totals : creditsTotals,
        isSafe : (isSafe)?false:true
    });
};

exports.add =  async(req,res)=>{
    const db = req.app.locals.creditsDb;
    const inv = req.app.locals.inventoryDb;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const {Details, Category, Price, Date, ProductId, Quantity} = req.body;
    await DBinsert(db,Details, Category,  Number(Price), Number(ProductId), Number(Quantity), Date);
    if(ProductId && ProductId!=''){
        if(Category=='Sales'){
            await inventoryChange(inv,Number(ProductId),Number(Quantity),'remove');
        }
        // else if(Category=='Import' || Category=='RTO'){
        //     await inventoryChange(inv,Number(ProductId),Number(Quantity),'add')
        // }
    }
    return res.redirect('/credits');
};

exports.remove = async(req,res)=>{
    const db = req.app.locals.creditsDb;
    const inv = req.app.locals.inventoryDb;
    if (!db) {
        return res.status(500).send('Database not connected');
      }
    const { id } = req.query;
    await DBdelete(db,id,inv);
    return res.redirect('/credits?isSafe=no');
};


async function DBget(collection,limit,page,query){ 
    const credits = await collection.find(query).sort({date : -1}).limit(limit??7).skip((page-1)*limit??0).toArray();
    return credits;
};

async function DBdelete(collection,id,inv) {
    const [element] = await collection.find({
            "_id":new ObjectId(id)
        }).toArray();
        if(element.product && element.product != ''){
            if(element.category=='Sales'){
                await inventoryChange(inv,Number(element.product),Number(element.quantity),'add');
            }
            // else if(element.category=='Import' || element.category=='RTO'){
            //     await inventoryChange(inv,Number(element.product),Number(element.quantity),'remove')
            // }
        }
    await collection.deleteOne(
        {
            "_id":new ObjectId(id)
        }
    );
};

async function DBinsert(collection,Details, Category, Price, Product, Quantity, Date) {
    if (validateCredit(Details,Category, Price, Product, Date)){
        const querry = {
            "id": 150,
            "category":Category,
            "details": Details ,
            "price":Price,
            "date": Date,
            "quantity": 1
        }
        if(Product) {
            querry.product = Product;
            querry.quantity = Quantity ?? 1;
        }
        await collection
            .insertOne(
                querry
                );
    }
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
                    total: {$sum : { $multiply: [
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
                    monthTotal: {$sum : { $multiply: [
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
                yearTotal: {$sum :{$sum : { $multiply: [
                    {$toDouble : "$price"} ,
                    { 
                        $cond: { 
                            if: { $not: ["$quantity"] }, 
                            then: 1, 
                            else: { $toDouble: "$quantity" } 
                        } 
                    }
                ]}}}
            }
        }
    ]) ?? [{yearTotal:0}];
    
    sumObj.total = total ;
    sumObj.month = monthTotal ;
    sumObj.year = yearTotal ;

    return sumObj;
};

async function inventoryChange(db,productId,quantity,action){
    if (action == 'add')
    await db.updateOne(
        {
            ProductId:productId,
        },
        {
            $inc: { stock: quantity }
        }
    )
    else if(action == 'remove')
        await db.updateOne(
            {
                ProductId:productId,
            },
            {
                $inc: { stock: -quantity }
            }
        )
}

async function getAggregate(collection,pipeline){
    let result = await collection.aggregate(pipeline).toArray();
    result = result.length? result : null;
    return result;
    
};

function validateCredit(Details, Category, Price, Product, date){
    return ((Details!='' || Product!='') && Category!='' && (Number(Price) || Number(Price)==0) && (new Date(date)).toString()!='Invalid Date')
};