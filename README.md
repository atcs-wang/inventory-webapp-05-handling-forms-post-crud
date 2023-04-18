# Part 05: Implementing CRUD operations: Using Forms and POST requests

This tutorial follows after:
[Part 04: Connecting the Layers: Rendering templates with data](https://github.com/atcs-wang/inventory-webapp-04-connecting-layers-templates-read)

In this tutorial, we will continue to work across all 3 layers (Browser, Web Server, Database) to implement a standard suite of "CRUD" data operations for the homework assignments. In the process, we will learn to use HTML forms and HTTP POST requests to upload user-entered data to the server.

## (5.0) The big picture for CRUD operations

CRUD is an acronym for the 4 basic data storage operations: CREATE, READ, UPDATE, and DELETE. SQL queries have 4 commands that map onto these operations (`INSERT`, `SELECT`, `UPDATE`, `DELETE`).

Data-based web-applications typically provide interactive ways for users to perform various CRUD operations for the various kinds of data from the browser.

> In most cases, of course, not *every* user should be allowed to do *every* kind of CRUD operation on *every* kind of data. We will explore ways to differentiate between different user *roles* and how to authorize specific operations later.

Recall from last tutorial that our web-app's "flow" generally follows this pattern: 

>```
> Browser --- HTTP request ---> App Server
>                               App Server --- SQL query --> Database
>                               App Server <-- results ---- Database
> Browser <-- HTTP response --- App Server
>```

1. **The web server receives an HTTP request from a browser**
2. **The web server makes a query to the database**
3. **The web server waits for results of the query**
4. **The web server uses the query results to form and send the HTTP response back to the browser**

The exact details of how each of the 4 steps works can vary, but every operation we implement in this tutorial follows this pattern.

By the end of this tutorial, we will have implemented a total of 5 different routes that operate on the `assignments` table. Each follows the above pattern, but the details vary at each step. 

Here's a table that summarizes each operation:

| Operation           | HTTP Request + URL           | SQL Command   | HTTP response                    |
|---------------------|------------------------------|---------------|----------------------------------|
| READ full hw list   | GET  /assignments            | `SELECT`      | render assignments.ejs           |
| READ  hw details    | GET  /assignments/:id        | `SELECT`      | render details.ejs               |
| CREATE hw           | POST /assignments            | `INSERT`      | redirect to GET /assignments/:id |
| UPDATE hw           | POST /assignments/:id        | `UPDATE`      | redirect to GET /assignments/:id |
| DELETE hw           | GET  /assignments/:id/delete | `DELETE`      | redirect to GET /assignments     |


The first two routes (both READ operations) were already implemented in the last tutorial. After reviewing them, we'll implement the remaining 3 routes that use the other 3 operations (CREATE, UPDATE, DELETE).

## (5.1)  Review: The READ hw list and READ hw details operations

In the last tutorial, we already implemented the first 2 READ operations. Its worth reviewing how both fit the 4-step pattern. Here's the code in `app.js` that defines the two Read operation routes:

```js

// define a route for the assignment list page
const read_assignments_all_sql = `
    SELECT 
        assignmentId, title, priority, subjectName, 
        assignments.subjectId as subjectId,
        DATE_FORMAT(dueDate, "%m/%d/%Y (%W)") AS dueDateFormatted
    FROM assignments
    JOIN subjects
        ON assignments.subjectId = subjects.subjectId
    ORDER BY assignments.assignmentId DESC
`
app.get( "/assignments", ( req, res ) => {
    db.execute(read_assignments_all_sql, (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            let data = { hwlist : results };
            res.render('assignments', data);
            // What's passed to the rendered view: 
            //  hwlist: [
            //     {  id: __ , title: __ , priority: __ , subjectName: __ , subjectId: __ ,  dueDateFormatted: __ },
            //     {  id: __ , title: __ , priority: __ , subjectName: __ , subjectId: __ ,   dueDateFormatted: __ },
            //     ...
            //  ]
            
        }
    });
});

// define a route for the assignment detail page
const read_assignment_detail_sql = `
    SELECT
        assignmentId, title, priority, subjectName,
        assignments.subjectId as subjectId,
        DATE_FORMAT(dueDate, "%W, %M %D %Y") AS dueDateExtended, 
        DATE_FORMAT(dueDate, "%Y-%m-%d") AS dueDateYMD, 
        description
    FROM assignments
    JOIN subjects
        ON assignments.subjectId = subjects.subjectId
    WHERE assignmentId = ?
`
app.get( "/assignments/:id", ( req, res ) => {
    db.execute(read_assignment_detail_sql, [req.params.id], (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else if (results.length == 0)
            res.status(404).send(`No assignment found with id = "${req.params.id}"` ); // NOT FOUND
        else {

            let data = {hw: results[0]}; // results is still an array, get first (only) element
            res.render('detail', data); 
            // What's passed to the rendered view: 
            //  hw: { id: ___ , title: ___ , priority: ___ , 
            //    subjectName: ___ , subjectId: ___, 
            //    dueDateExtended: ___ , dueDateYMD: ___ , description: ___ 
            //  }
        }
    });
});
```

Here's the 4 steps again, but broken down specifically for each of the Read operations:

>```
> Browser --- request: GET URL -------> App Server
>                                       App Server --- SELECT query--> Database
>                                       App Server <-- results ARRAY ---- Database
> Browser <- response: RENDERED PAGE -- App Server
>```

1. **The web server receives a GET HTTP request from a browser** - either by entering the URL into their browser, or clicking a hyperlink.
2. **The web server makes a SELECT query to the database**. If the URL is `/assignments`, we SELECT for all rows in the `assignments` table. If the URL is `/assignments/:id`, we only SELECT for the one row in `assignment` where the `assignmentId` column matches the URL parameter `id`.
3. **The web server waits for results of the query**; if successful, the results are an *array* of objects representing a set of row entries. If unsuccessful, an error is returned.
4. **The web server uses the query results to RENDER a page and sends it in the HTTP response back to the browser**; for both routes, HTML pages are rendered from an EJS template (either `assignments.ejs` or `detail.ejs`) using the query results as data injected into the template. The browser receives the HTML and displays it. 



## (5.2) Implementing the DELETE Operation

Although it is last in the CRUD acronym, the DELETE operation is most similar to the flow of the READ operation. So let's begin there:
  

| Operation        | HTTP Request + URL     | SQL Command | HTTP response              |
|------------------|------------------------|-------------|----------------------------|
| DELETE hw        | GET  /assignments/:id/delete | `DELETE`      | redirect to GET /assignments     |


Similar to how our app interprets to GET requests to the URL `/assignments/:id` as a READ operation for the entry with given `id`, our app will interpret GET requests to the URL `assignments/:id/delete` as a DELETE operation for the entry with given `id`.

### (5.2.1) Making the "Delete" button send a GET request

In **both** the hw list page (template `assignments.ejs`) and the hw detail page (template `detail.ejs`), there are currently nonfunctional "Delete" buttons.

Recall that, in the previous tutorial, we set the `href` attribute of each of the "Edit/Info" buttons (in `assignments.ejs`) to a unique URL, composed from the `assignmentId` of the corresponding assignment/row (`hwlist[i]`), thus linking specific assignment detail page for that assignment: 

```ejs
<tbody>
    <% for (let i = 0; i < hwlist.length; i++) { %>
    <tr>
        ...
        <td>
            <a class="btn-small waves-effect waves-light" href="/assignments/<%= hwlist[i].assignmentId %>">
                <i class="material-icons right">edit</i>
                Info/Edit
            </a>
            <a class="btn-small waves-effect waves-light red">
                <i class="material-icons right">delete</i>
                Delete
            </a>
        </td>
    </tr>
    <% } %>
</tbody>
```

As a result, each "Edit/Info" button on each table row was associated with a unique URL. Clicking the button sends a GET request to the app server, "following the link".

In a very similar manner, we can also give the "Delete" buttons in `assignments.ejs` unique URLs based on the same `assignmentId`: 

```ejs
    <a class="btn-small waves-effect waves-light red" href="/assignments/<%= hwlist[i].assignmentId %>/delete">
        <i class="material-icons right">delete</i>
        Delete
    </a>
```

Similarly, the "Delete" button on the assignment detail page (template `detail.ejs`) needs to similarly link to a URL which matches the `assignmentId` of the assignment's data being rendered on that page: 

```ejs
    <a class="btn-large waves-effect waves-light red right" href="/assignments/<%= hw.assignmentId %>/delete">
        <i class="material-icons right">delete</i>
        Delete
    </a>
```

If you test these buttons now, they should result in a 404 error response, since no route handlers exist to handle these kinds of GET requests yet. That's up next!

### (5.2.1) Writing the DELETE assignment SQL query:

Let's write the SQL query we wish to trigger upon a DELETE button being clicked. 

To delete an entry from the `assignments` table, matching a given `assignmentId`, we can write a generalized query like this:

```sql
DELETE 
FROM
    assignments
WHERE
    assignmentId = ?
```
> This is recorded in `db/queries/crud/delete_assignment.sql`. Although we will not directly use this file in this tutorial, we'll refer to it later on.

### (5.2.2) Handling a DELETE assignment GET request:

Add the following code to `app.js`, below the existing routes:

```js
// define a route for assignment DELETE
const delete_assignment_sql = `
    DELETE 
    FROM
        assignments
    WHERE
        assignmentId = ?
`
app.get("/assignments/:id/delete", ( req, res ) => {
    db.execute(delete_assignment_sql, [req.params.id], (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            res.redirect("/assignments");
        }
    });
});
```


Let's breakdown what the new code does:
>```
> Browser --- request: GET URL ------> App Server
>                                      App Server --- DELETE query ---> Database
>                                      App Server <-- confirmation ---- Database
> Browser <- response: REDIRECT------> App Server
>```

1. **The web server receives a GET HTTP request from a browser** - either by entering a URL into their browser, or clicking a hyperlink.
2. **The web server makes a DELETE query to the database**, using the `id` in the URL to fill in the `?` in the query, specifying the `assignmentId` of the row to be deleted. 
3. **The web server waits for results of the query**; the contents of the results returned are not particularly important, but we want to know when the request is complete and that there was no error. The `DELETE` SQL command can provide confirmation of how many rows get deleted, but since since `assignmentId` is the unique primary key, it should be just 1 or 0.

4. **The web server uses the query results to send a "redirect" HTTP response back to the browser**; rather than rendering a page, the server response is a *redirect* (HTTP status code 302) - essentially an instruction for the browser to send *another* GET request to a different URL. In this case, a redirect to the `/assignments` URL navigates the user back to the hw list page, where the user can visually confirm the removal of the hw.  
    > Alternatively, the server could respond by rendering a special page with a message confirming the success of the deletion, perhaps with a link returning the user back to the `/assignments` page. Such a page could communicate a successful DELETE operation more clearly, but a redirect is simpler and cuts out what might be a tedious extra click for the user.

### (5.2.2) Testing the DELETE assignment operation:

Confirm that clicking these updated "Delete" buttons on both the list and detail pages trigger GET requests for URLs of the pattern `/assignments/:id/delete`, where `:id` matches the `assignmentId` of the corresponding hw, and that you are redirected back to the `/assignments` page, where you can visually confirm the removal of the corresponding assignment.

>The server logs should report a status code of 302 (REDIRECT) for `GET /assignments/:id/delete`, followed by a `GET /assignments`.

> We can also test out the route handler by directly entering URLs into your browser of the format `/assignments/:id/delete`, replacing `:id` with the `assignmentId` values of entries in the database's `assignments` table (e.g. 1, 2, etc.).  Obviously, we don't really intend for users to type raw URLs into their browser to trigger a Delete... but it is possible.

You can re-run your `db_insert_sample_data.js` script to re-populate your database afterwards:

```
> node db/db_insert_sample_data.js
```
or if your `package.json` has a convenience script set up, like:
```
> npm run dbsample
```

>Again, the server logs should report a status code of 302 (REDIRECT) for `GET /assignments/:id/delete`, followed by a `GET /assignments`.


>*Side Note:* GET requests are generally intended for *accessing* data, not usually requesting *changes* to data.  There are better (and more complex) ways to implement DELETE operations, but for now using GET requests is functional enough, if awkward.


## (5.3) POST requests and HTML forms

So far, all of the interaction between the user and the web server have been through GET requests sent by the browser. HTTP GET requests are typically associated with *downloading* data, and commonly triggered by

1. A URL being entered into the browser's URL bar
2. A hyperlink being clicked
3. A link to an external resource on an HTML page (e.g. CSS, images, scripts, etc.) 
4. Being redirected to a URL by the server

Browsers can also send a different kind of HTTP request known as a POST requests, which are typically are used for *uploading* data. 

Like GET requests, POST requests are sent to a URL, but *also* include a request **body**, containing the data to be uploaded to the server.

Most commonly, POST requests are triggered via **HTML forms**, where users enter values into various inputs, then click a button that will "Submit" the request. 

Here is a simple (hypothetical) example of a standard HTML form designed to send a POST request:

```html
<form method="post" action="/sample/url">
    <input type="text" name="name">
    <input type="number" name="age">
    <select name="gender">
        <option value="1">Male</option>
        <option value="2">Female</option>
        <option value="3">Nonbinary</option>
    </select>
    <textarea name="bio">Fill me!</textarea>
    <button type="submit">
</form>
```
> Don't put this code anywhere; its just a hypothetical example.


Note the following details about standard form usage for POST requests, as visible in this example:

- To make `<form>` element send POST requests, its must have the attribute `method="post"`. 

- The attribute `action` is set to the URL to which the post requests should be sent.  If `action` is not defined, the form sends its POST request to the URL of the current page.

- Each form input (`<input>`, `<select>`, `<textarea>`) includes a `name` attribute, which describes the meaning of the input.  

- The values entered into the form inputs will be sent as the **body** of the POST request. For `<select>` inputs, the `value` of the option selected (not the content) will be used. For `<textarea>`, the contents of the element are used as the value.

- A `<button>` element with attribute `type="submit"` is included in the form too; clicking this button triggers the POST request.

Our prototypes already have two forms that are mostly set up; the only thing that needs to be changed is setting `method="post"`. Then, we need to set up POST routes (which work similarly to GET routes) on the server to handle the requests. See the sections below for step by step instructions.

> ***Side note about forms and GET requests***: If you click submit on our web app's forms as they are currently (without setting `method="post"`), they appear to refresh the page. But if you look at the URL bar, you'll see a new URL with a `?` symbol, followed by the various form input names and values. What's going on?
> 
> If a `<form>` has no `method` attribute (like our prototype's forms currently) or has `method="get"`, the form will send a special GET request instead, constructing a special URL from the input values. 
> For example, if the above example form was submitted with name as "`John`", age as "`27`", selected gender as "`Female`", and the bio as "`sup`",  the GET request would be to this URL: 
> ```/sample/url?name=John&age=27&gender=2&bio=sup```
> Express typically ignores the part of the URL after the `?` when resolving the matching GET route path, but those values can be retrieved as **URL query parameters** via the property `req.query`. This makes them act a bit like a customizable hyperlink. **Search bars** are a common application of this kind of form and parameterized GET request. We will add such a feature in a later tutorial! 
>
> POST requests use a similar "URL-encoding" scheme to encode the inputs into the request body. 
> However, POST requests do not update the URL bar of the browser. This is by design; while you might want to bookmark/share a URL to open a page, you probably wouldn't want someone to bookmark/share a URL that causes a database to be changed.

### (5.3.1) Configuring Express to parse form-sent POST request bodies

In order for Express to handle POST requests sent from forms, we need to add some built-in middleware. (no `npm install` needed!)

Add this line to the middleware section of `app.js` (around the other `app.use` lines):
```js
// Configure Express to parse URL-encoded POST request bodies (traditional forms)
app.use( express.urlencoded({ extended: false }) );
```

With this middleware installed, we can now use a (hypothetical) POST route definition like this:
```js
app.post("/sample/url", ( req, res ) => {
    //access to form values via req.body's properties:
    // For example:
    // req.body.name
    // req.body.age
    ...
}
```
> Again, don't put this code above anywhere; its just a hypothetical example.

The middleware parses any incoming POST requests, and attaches a property called `body` to the Request object `req`. `body` has sub-properties for each input in the form, matching the `name` and value of the corresponding input. For example, if a form contains `<input name=entry>`, the post handler can access the user-entered value via `req.body.entry`.


## (5.4) Implementing the CREATE hw operation 

Now that we know a bit about POST requests, and have configured Express middleware to parse POST request bodies, let's implement the CREATE operation for new hw assignments.

Here's the summary of what we'll do:

| Operation        | HTTP Request + URL     | SQL Command | HTTP response              |
|------------------|------------------------|-------------|----------------------------|
| CREATE hw        | POST /assignments      | `INSERT`    | redirect to GET /assignments/:id |


### (5.4.1) Sending a CREATE hw POST request: - the "Add an Assignment" form

You've already created the "Add an Assignment" `<form>` in the `assignments.ejs`, which is clearly intended to create new hw assignments. First, we need to make it send POST requests!

1. First, update the opening `<form>` tag with the attributes `method="post"`, and (optionally) `action="/assignments"`

2. Next, make sure that there is a `name` attribute of each of your various form's `<input>` elements (and also the `<select>`) with values that describe what the input should contain. 

3. Lastly, make sure that you have a `<button>` in the form with the attribute `type=submit`.

Here's the essential parts of the "Add an Assignment" `<form>`:
```html
<form id="addForm" method="post" action="/assignments"> 
    ...
    <input type="text" id="titleInput" name="title" ...>
    ...
    <input type="number" id="priorityInput" name="priority" ...>
    ...
    <select id="subjectInput" name="subject" ...> ... </select>
    ...
    <input type="date" id="dueDateInput" name="dueDate">
    ...
    <button type="submit">...</button>
</form>
```

> It is not strictly necessary to define `action` explicitly here since, by default, the action is the URL of the current page, which is also `/assignments`. 

### (5.4.2) Writing the INSERT hw query:
Let's start by writing the relevant SQL query for the CREATE operation.

We can use an INSERT statement to add a new entry to the `assignment` table, given initial values for the `title`, `priority`, `subjectId`, and `dueDate` columns. We will let the `description` column just be NULL for now.

No `assignmentId` value is specified; since `assignmentId` was set as an Auto-Incrementing column, the database will automatically generate a unique value for the new element.

```sql
INSERT INTO assignments 
    (title, priority, subjectId, dueDate) 
VALUES 
    (?, ?, ?, ?);
```
> A record of this query is in `db/queries/crud/insert_assignment.sql`.
> Also, we wrote a similar INSERT query in part 3 of the tutorials (`db/queries/init/insert_assignment.sql`), and used it in our database initializing script (`db/db_insert_sample_data.js`).


### (5.3.3) Handling the CREATE hw POST request:

Finally, let's write a route to receive the form's POST request and run the INSERT query. 

Add this code to your `app.js`, below the other routes.

```js
// define a route for assignment CREATE
const create_assignment_sql = `
    INSERT INTO assignments 
        (title, priority, subjectId, dueDate) 
    VALUES 
        (?, ?, ?, ?);
`
app.post("/assignments", ( req, res ) => {
    db.execute(create_assignment_sql, [req.body.title, req.body.priority, req.body.subject, req.body.dueDate], (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            //results.insertId has the primary key (assignmentId) of the newly inserted row.
            res.redirect(`/assignments/${results.insertId}`);
        }
    });
});
```

Let's break down the flow of the CREATE hw operation we just implemented:

>```
> Browser --- request: POST URL -----> App Server
>                                      App Server --- INSERT query ---> Database
>                                      App Server <--- new row id ----- Database
> Browser <- response: REDIRECT------> App Server
>```

1. **The web server receives a POST HTTP request from a browser** - the user submits an HTML form. This POST handler receives the form data, which includes the user-inputted values of the form's inputs. These are accesible as properties of `req.body` that match the `name` attributes of the forms' inputs, e.g. `req.body.title` and `req.body.priority`.
2. **The web server makes an INSERT query to the database**. Those input values are used to prepare and excute an `INSERT` SQL statement, which adds a new row to the `assignment` table with the form values. 
3. **The web server waits for results of the query**; upon successful execution of the SQL, the `results` returned from the database includes `insertId`, the value of the primary key for the newly inserted row.
4. **The web server uses the query results to form and send the HTTP response back to the browser**. Once again, rather than generate a new page the server sends a "redirect" to the assignment detail page of the newly created assignment.  The `results.insertId` is used to construct the matching URL.

    > Alternatively, we could just redirect the user back to `/assignments`, where they can visually confirm the newly added assignment in the list.

    > Yet another alternative would be to respond by rendering a special page with a confirmation message for the create operation, but this is an uneccessary step.

### (5.3.4) Testing the CREATE hw operation

To test, navigate to `/assignments`, fill out the form inputs, and click Submit. You should be redirected to a new assignment detail page, containing the data you entered. Return to the `/assignments` page and you should see the assignment there as well.

> You should notice in the server logs a `POST /assignments` request, with a status code of `302` for redirect, followed by a `GET /assignments/:id` request.

> You can also see the POST request/response from your browser's Developer Tools; in the Network tab, watch for a request to `assignments` as you submit the Form. Click on it to view the details.
>
>The "Headers" sub-tab should show:
>>Request URL: http://localhost:8080/assignments
>>Request Method: POST
>>Status Code: 302 Found
>
>And the "Payload" sub-tab should show something starting with:
>>title: ____
>>priority: ____
>>...
>
>displaying the values entered into the form.


## (5.5) Implementing the UPDATE hw operation - 

The UPDATE operation is extremely similar to the CREATE operation. Here's the summary of what we'll do:

| Operation        | HTTP Request + URL     | SQL Command | HTTP response              |
|------------------|------------------------|-------------|----------------------------|
| UPDATE hw        | POST /assignment/:id   | UPDATE      | redirect to GET /assignment/:id |



###  (5.5.1) Sending an UPDATE hw POST request: - the "Edit Assignment" form

The "Edit Assignment" `<form>` in `detail.ejs` also needs updating to send a POST request - add `method="post"` and `action="/assignments/<%= hw.assignmentId%>`:

```html
<form id="updateForm" method="post" action="/assignments/<%= hw.assignmentId %>"> <!-- default action is the page's URL -->
    ...
    <input type="text" id="titleInput" name="title" ...>
    ...
    <input type="number" id="priorityInput" name="priority" ...>
    ...
    <select id="subjectInput" name="subject" ...>
    ...
    <input type="date" id="dueDateInput" name="dueDate">
    ... 
    <textarea id="descriptionInput" name="description">...

    ...
    <button type="submit">...</button>
</form>
```

> The `action` attribute is again optional - the default action is the URL of the detail page, which happens to match the URL we want for the POST request.

Once again, double check for the attribute `name` on each of the form's input elements (`<input>`, `<select>` and `<textarea>`) and a button with `type="submit"`: 


### (5.5.2)  Writing the UPDATE hw query:

Again, let's write the relevant SQL query we want triggered upon form submission: an UPDATE command which changes each column value for an entry in the `assignments` table, matching a given `id`:

```sql
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
```
> A record of this query is in `db/queries/crud/update_assignments.sql`.

This operation doesn't really return data, although it does provide confirmation of how many rows get updated. (Since the `assignmentId` is the unique primary key, it should be just 1 or 0)

### (5.5.3) Handling an UPDATE hw POST request:

Now, let's write a route to receive the update form's POST request and run the UPDATE query. 

```js
// define a route for assignment UPDATE
const update_assignment_sql = `
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
`
app.post("/assignments/:id", ( req, res ) => {
    db.execute(update_assignment_sql, [req.body.title, req.body.priority, req.body.subject, req.body.dueDate, req.body.description, req.params.id], (error, results) => {
        if (DEBUG)
            console.log(error ? error : results);
        if (error)
            res.status(500).send(error); //Internal Server Error
        else {
            res.redirect(`/assignments/${req.params.id}`);
        }
    });
});

```

Once again, let's break the code down and see how the UPDATE operation flow works:

>```
> Browser --- request: POST URL -----> App Server
>                                      App Server --- UPDATE query ---> Database
>                                      App Server <-- confirmation ---- Database
> Browser <- response: REDIRECT------> App Server
>```

1. **The web server receives a POST HTTP request from a browser** - the user submits an HTML form. This POST handler receives the form data, which includes the values of the various inputs. These are accesible via `req.body`, e.g. `req.body.title` and `req.body.priority`
2. **The web server makes an UPDATE query to the database**. Those input values, along with `id` in the URL (`req.params.id`), are used to prepare and excute an `UPDATE` SQL statement, which changes the values in the row with matching `id` to the new the form values. 
3. **The web server waits for results of the query**; upon successful execution of the SQL,  `results` are returned from the database. However, there isn't much information that we're interested in beyond whether it was successful or if there was an error.
4. **The web server uses the query results to form and send the HTTP response back to the browser**. Once again, rather than generate a new page the server sends a "redirect" to the assignment detail page of the updated assignment.  In this case, `req.params.id` is used to construct the matching URL.
    > Again, the server could respond by rendering a special page with a message confirming the success of the update operation, but it makes sense to simply show the user the page that the operation has changed.


#### (5.5.4) Testing the Update operation:

Navigate to `/assignments/:id` for some existing assignment, fill out the form inputs, and click Submit. You should be redirected to the same assignment detail page (a "refresh"), now updated with the data you entered. Return to the `/assignments` page and you should see the updated assignment there as well.

> You should notice in the server logs a `POST /assignments/:id` request, with a status code of `302` for redirect, followed by a `GET /assignments/:id` request.


> You can also see the POST request/response from your browser's Developer Tools; in the Network tab, watch for a request to `assignments` as you submit the Form. Click on it to view the details.
>
>The "Headers" sub-tab should show:
>>Request URL: http://localhost:8080/assignments/:id
>>Request Method: POST
>>Status Code: 302 Found
>
>And the "Payload" sub-tab should show something that starts like::
>>title: ____
>>priority: ____
>>...
>
>displaying the values entered into the form.


## (5.6) What's next?

With all the basic CRUD routes implemented, we have a usable web-app! It is - *almost* - time to deploy a first version of our application to a cloud-hosting service. 

However, there are a smattering of changes we need to make before we put it online. In the next tutorial [https://github.com/bca-atcs/inventory-webapp-06a-predeployment-improvements](https://github.com/bca-atcs/inventory-webapp-06a-predeployment-improvements), we will implement and discuss these preparations.



