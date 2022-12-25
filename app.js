/* eslint-disable no-undef */
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const csrf = require("tiny-csrf");

const passport = require("passport");

const flash = require("connect-flash");

const connectEnsureLogin = require("connect-ensure-login");
const LocalStrategy = require("passport-local");
const session = require("express-session");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const { Todo } = require("./models");
const { User } = require("./models");

const app = express();

app.use(bodyParser.json());

app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser("Some secret info"));
app.use(csrf("UicgFjabMtvsSJEHUSfK3Dz0NR6K0pIm", ["DELETE", "PUT", "POST"]));
app.use(
  session({
    secret: "my-secret-key-9832e277",
    cookie: { maxAge: 86400000 },
  })
);

app.use(flash());
app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          // console.log(user);
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password." });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Incorrect username." });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("serializing User in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log("deserializing User in session", id);
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.get("/", async function (request, response) {
  response.render("index", {
    title: "Todo Application",
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const loggedinUser = request.user.id;
    const overDue = await Todo.overDue(loggedinUser);
    const dueToday = await Todo.dueToday(loggedinUser);
    const dueLater = await Todo.dueLater(loggedinUser);
    const completedItems = await Todo.completedItems(loggedinUser);
    if (request.accepts("html")) {
      response.render("todos", {
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
  }
);

app.get("/todos/:id", async function (request, response) {
  try {
    const todo = await Todo.findByPk(request.params.id);
    return response.json(todo);
  } catch (error) {
    console.log(error);
    return response.status(422).json(error);
  }
});

app.get("/signup", (request, response) => {
  response.render("signup", { csrfToken: request.csrfToken() });
});

app.get("/login", (request, response) => {
  response.render("login", { csrfToken: request.csrfToken() });
});
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.post("/todos", async function (request, response) {
  try {
    // console.log(request.user);
    await Todo.addTodo(
      {
        title: request.body.title,
        dueDate: request.body.dueDate,
        userId: request.user.id,
      },
      request.flash("success", "Todo item added successfully")
    );
    return response.redirect("/todos");
  } catch (error) {
    console.log(error);
    request.flash(
      "error",
      "Please enter a valid title and due date for the todo item"
    );
    return response.redirect("/todos");
  }
});
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (request, response) {
    // console.log(request.user);
    response.redirect("/todos");
  }
);

app.post("/users", async function (request, response) {
  if (request.body.password.length < 8) {
    request.flash(
      "error",
      "Please enter a password with more than 8 characters"
    );
    return response.redirect("/signup");
  }
  if (request.body.firstname.length <= 2) {
    request.flash(
      "error",
      "Please enter a first name with more than 2 characters"
    );
    return response.redirect("/signup");
  }
  let email = request.body.email;
  if (await User.findOne({ where: { email: email } })) {
    request.flash("error", "email already exists, please enter a different");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  await User.create({
    firstName: request.body.firstname,
    lastName: request.body.lastname,
    email: request.body.email,
    password: hashedPwd,
  })
    .then((user) => {
      request.flash("success", "User created successfully");
      request.login(user, (error) => {
        if (error) {
          console.log(error);
        }
        response.redirect("/todos");
      });
    })
    .catch((error) => {
      console.log(error);
      request.flash(
        "error",
        "Please enter a valid first name, last name, email and password"
      );
    });
});

app.put(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("Done 1");
    const todo = await Todo.findByPk(request.params.id);
    console.log("Done 2");
    const completionStatus = request.body.completed;
    console.log("Done 3");
    try {
      if (todo && todo.userId === request.user.id) {
        console.log("Done 4");
        const updatedTodo = await todo.setCompletionStatus({
          completionStatus,
        });
        return response.json(updatedTodo);
      } else {
        console.log("Done 5");
        return response.status(403).json({
          success: false,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.delete(
  "/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
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
  }
);

module.exports = app;
