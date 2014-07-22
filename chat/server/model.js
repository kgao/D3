
var crypto 		= require('crypto');
//Env is already logged in router.js
var confEnv		= require('./conf').env(log = false);
var jwt 		  = require('./jwt');
var sec 		  = require('./secret');
var mysql     = require('mysql');
//Default pool size is 10 concurrent and infinite queue
var pool  		= mysql.createPool(confEnv.mysql);
//Get encryption key once
var enckey 		= '';
var MongoClient = require('mongodb').MongoClient;
var MONGODB_URI = confEnv.mongo.url;
var mongoPool;

pool.getConnection(function(err, connection) {
	connection.query("SELECT string_value FROM nym_membership.params where param_name='enc_key'"
	, function(err, rows) {
		if(err || rows.length == 0){
			if(err) console.error(err);
			else console.error('FATAL: No enc_key found in mysql');
			connection.release();
			//That's critical problem
			process.exit(1);
		}
		else{
			enckey = rows[0].string_value;
			connection.release();
		}
	});
});

MongoClient.connect(MONGODB_URI, function(err, db) {
	if(err){
		console.error(err);
		db.close();
	}else{
		mongoPool=db;
	}
});


exports.getPageView = function(callback)
{		
	 //db.articles.aggregate({ "$group":{"_id":"$blogName", "lastDay_view_count":{"$sum":"$lastDay_view_count"},"lastDays_view_count":{"$sum":"$lastDays_view_count"},"articles":{"$sum":1}}})
		var data = [0,0,1931,1901,852214,3069942,1145284,2829950,68,2570,403,1099,944918,3110455,370969,887516];
		mongoPool.collection('articles').aggregate({ "$group":{"_id":"$blogName", "lastDay_view_count":{"$sum":"$lastDay_view_count"},"lastDays_view_count":{"$sum":"$lastDays_view_count"},"articles":{"$sum":1}}}, function(err, doc) {
			  if (!doc) {
					//console.dir("No document updated");
					callback({'code': 422});
				}else if(err) {
					console.error(err);
					callback({'code': 500});
				}else{
					//get doc
					for(int d:doc){
						data.append(d.lastDay_view_count)
						data.append(d.lastDays_view_count)
					}
					callback({'code': 200,'data': data});
				}
			});
}


