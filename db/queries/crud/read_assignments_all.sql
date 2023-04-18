-- Read readable summary of rows of assignments table
-- in order of most recently created first
SELECT 
    assignmentId, title, priority, subjectName, 
    assignments.subjectId as subjectId,
    DATE_FORMAT(dueDate, "%m/%d/%Y (%W)") AS dueDateFormatted
FROM assignments
JOIN subjects
    ON assignments.subjectId = subjects.subjectId
ORDER BY assignments.assignmentId DESC

-- For DATE_FORMAT usage see: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_date-format
