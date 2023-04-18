-- Update a row in the assignments table
UPDATE
    assignments
SET
    title = ?,
    priority = ?,
    subjectId = ?,
    dueDate = ?,
    description = ?
WHERE
    assignmentId = ?