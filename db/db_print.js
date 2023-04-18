const db = require("./db_connection");

/**** Read and print the subjects table ****/

const select_subjects_sql = "SELECT * FROM subjects";

db.execute(select_subjects_sql, 
    (error, results) => {
        if (error) 
            throw error;

        console.log("Table 'subjects' contents:")
        console.log(results);
    }
);

/**** Read the assignments table, joined with subjects table ****/

const select_assignments_sql = `
SELECT *
FROM assignments
JOIN subjects
    ON assignments.subjectId = subjects.subjectId
ORDER BY
    assignments.assignmentId;
`;

db.execute(select_assignments_sql, 
    (error, results) => {
        if (error) 
            throw error;

        console.log("Table 'assignments' contents:")
        console.log(results);
    }
);

db.end();
