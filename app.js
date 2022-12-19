const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const csrf = require("tiny-csrf");

const { Todo } = require("./models");

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser("Some secret info"));
app.use(csrf("UicgFjabMtvsSJEHUSfK3Dz0NR6K0pIm", ["DELETE", "PUT", "POST"]));

app.get("/", async function (request, response) {
  const overDue = await Todo.overDue();
  const dueToday = await Todo.dueToday();
  const dueLater = await Todo.dueLater();
  const completedItems = await Todo.completedItems();
  if (request.accepts("html")) {
    response.render("index", {
      overDue,
      dueToday,
      dueLater,
      completedItems,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({
      overDue,
      dueToday,
      dueLater,
      completedItems,
    });
  }
});

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.post("/todos", async function (request, response) {
  try {
    await Todo.addTodo({
      title: request.body.title,
      dueDate: request.body.dueDate,
    });
    return response.redirect("/");
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.put("/todos/:id", async function (request, response) {
  const todo = await Todo.findByPk(request.params.id);
  const completionStatus = request.body.completed;
  try {
    const updatedTodo = await todo.setCompletionStatus({
      completionStatus,
    });
    return response.json(updatedTodo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.delete("/todos/:id", async function (request, response) {
  console.log("Deleting a Todo with id: " + request.params.id);
  const todo = await Todo.findByPk(request.params.id);
  try {
    if (todo) {
      await todo.deleteATodo();
      return response.json({
        success: true,
      });
    } else {
      return response.status(404);
    }
  } catch (error) {
    return response.status(422).json({
      success: false,
    });
  }
});

module.exports = app;
