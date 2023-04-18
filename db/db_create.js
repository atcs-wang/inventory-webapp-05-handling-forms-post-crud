const db = require("./db_connection");

/**** Drop existing tables, if any ****/

const drop_assignments_table_sql = "DROP TABLE IF EXISTS assignments;"

db.execute(drop_assignments_table_sql);

const drop_subjects_table_sql = "DROP TABLE IF EXISTS subjects;"

db.execute(drop_subjects_table_sql);

/**** Create tables ****/

const create_subjects_table_sql = `
    CREATE TABLE subjects (
        subjectId INT NOT NULL AUTO_INCREMENT,
        subjectName VARCHAR(45) NOT NULL,
        PRIMARY KEY (subjectId));
`
db.execute(create_subjects_table_sql);

const create_assignments_table_sql = `
    CREATE TABLE assignments (
        assignmentId INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(45) NOT NULL,
        priority INT NULL,
        subjectId INT NOT NULL,
        dueDate DATE NULL,
        description VARCHAR(150) NULL,
        PRIMARY KEY (assignmentId),
        INDEX assignmentSubject_idx (subjectId ASC),
        CONSTRAINT assignmentSubject
            FOREIGN KEY (subjectId)
            REFERENCES subjects (subjectId)
            ON DELETE RESTRICT
            ON UPDATE CASCADE);
`

db.execute(create_assignments_table_sql);

db.end();
