const productJSON = require('../public/json/products.json')


exports.inventory=async(req,res) => {
    const db = req.app.locals.inventoryDb;
    const rawData = await db.find().toArray();
    data = rawData.map(ele => {
        return {
            _id : ele._id,
            id : ele.ProductId,
            name: ele.name,
            stock:ele.stock,
            img: productJSON[ele.ProductId-101].img
        }
    });
    res.render('pages/inventory',{
        productData : data
    });
}

