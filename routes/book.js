let express = require('express');
let router = express.Router();

const fs = require('fs');

/* GET home page. */
//let book = new Array(); 

//Показване на Login форма
router.get('/login', function(req, res) {
	res.render('login', {info: 'When in doubt go to the library!!'});
});

//Създаване на сесия след успешен Login
session = require('express-session'); 
router.use(session({
    secret: 'random string',
    resave: true,
    saveUninitialized: true,
}));

sqlite3 = require('sqlite3');

db = new sqlite3.Database('book.sqlitedb');

db.serialize();

db.run(`CREATE TABLE IF NOT EXISTS book(

    id INTEGER PRIMARY KEY,

    user TEXT NOT NULL,

    author TEXT,

	title TEXT,

    url TEXT,

    date_taken TEXT,

    date_return TEXT)`

);

db.parallelize();


fileUpload = require('express-fileupload');

router.use(fileUpload());

bcrypt = require('bcryptjs');
users = require('./passwd.json');

router.post('/login', function(req, res){
	bcrypt.compare(req.body.password, users[req.body.username] || "", function(err, is_match) {
		if(err) throw err;
		if(is_match === true) {
			req.session.username = req.body.username;
			req.session.count = 0;
			res.redirect("/book/");
		} else {
			res.render('login', {warn: 'TRY AGAIN'});
		}
	});
});

//Logout - унищожаване на сесия
router.get('/logout', (req, res) => {
	req.session.destroy();
	res.redirect("/book/");
});

//Всеки потребител със собствен файл
//let filename = "";

router.all('*', function(req, res, next) {
	if(!req.session.username) {
		res.redirect("/book/login");
		return;
	}
    
	next();

});

router.get('/', function(req, res, next) {
	req.session.count++;
	db.all('SELECT * FROM book where user = ? ORDER BY date_return DESC;',req.session.username, function(err, rows) {
			if(err) throw err;
			res.render('book', { info:"Library", rows: rows, user:req.session.username });
	});
});


//CREATErud + Picture upload

router.post('/upload',(req, res) => {

    url = "";

    if(req.files && req.files.file) {

        req.files.file.mv('./public/images/' + req.files.file.name, (err) => {

            if (err) throw err;

        });

        url = '/images/' + req.files.file.name;

    }

       

    db.run(`

        INSERT INTO book(

            user,

            author,

			title,

            url,

            date_taken,

            date_return

        ) VALUES (

            ?,

            ?,

            ?,

			?,

            DATETIME('now','localtime'),

            DATETIME('now','+30 days'));

        `,

        [req.session.username, req.body.author,req.body.title || "", url],

        (err) => {

            if(err) throw err;

            res.redirect('/book/');

        });

});


//cruDELETE
router.post('/delete', (req, res) => {

	db.all('SELECT * FROM book WHERE id = ? AND user = ?;',req.body.id,req.session.username, function(err, rows) {
		if(err) throw err;
		if(rows.length > 0) {
			db.run('DELETE FROM book WHERE id = ?', req.body.id, (err) => {
				if(err) throw err;
				res.redirect('/book/');
			});
		} else {
			db.all('SELECT * FROM book', function(err, rows) {
				if(err) throw err;
				res.render('book', {user: req.session.username, info: 'ERROR!!!', rows: rows})
			});
		};
			
	});	
});


//crUPDATEd

router.post('/update', (req, res) => {

    db.run(`UPDATE book

            SET user = ?,

                author = ?,

				title = ?,

                url = ?,

                date_taken = DATETIME('now','localtime'),

				date_return = DATETIME('now','+30 days')

            WHERE id = ?;`,

        req.session.username,

        req.body.author,

		req.body.title,

        req.body.url,

        req.body.id,

        (err) => {

            if(err) throw err;

            res.redirect('/book/');

    });

});


router.all('*', function(req, res) {

    res.send("No such page or action! Go to: <a href='/book/'>main page</a>");

});

module.exports = router;
