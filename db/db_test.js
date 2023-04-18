const db = require("./db_connection");

// Execute query, print results or error 
db.execute('SELECT 1 + 1 AS solution', 
    (error, results) => {
        if (error)
            throw error;
        console.log(results);
    }
);

//Optional: close the connection after query queue is empty.
db.end();