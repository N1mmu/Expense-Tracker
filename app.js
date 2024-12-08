const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const port = 3000;
const connectDB = require('./config/database');
// Custom modules
const { DBget , DBdelete , DBinsert , DBsumAmount, dashboardData } = require('./controllers/connection');
const { mapMonthWeek , getCurrentMonth } =require('./utils/utilities');

// Routes
const expense  = require('./routes/expenseRoutes');
const dashboard  = require('./routes/dashboardRoutes');
// To Create Session

app.use(session({
    secret: 'n1mmu',
    resave: false, // Prevents session from being saved back to the store if it wasn’t modified
    saveUninitialized: true, // Forces a session to be saved even if it's new and not modified
    cookie: { 
        maxAge: 6000000 // Sets cookie expiration (1 minute in milliseconds)
    }
}));

// Express.js pre-defining stuffs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Statics
app.use(express.static(path.join(__dirname, 'public')));
app.use('/chartjs', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));
 
///////////////////////////////////////////////////////////////////////
//                     Listener
///////////////////////////////////////////////////////////////////////

connectDB().then((db) => {
    app.locals.db = db;

    app.use('/expense',expense);
    app.use('/dashboard',dashboard);

    app.listen(port, () => console.log('Server running on http://localhost:3000'));
  });
