/* eslint-disable no-undef */
const request = require("supertest");
const cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");

let server, agent;
function extractCSRFToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  const csrfToken = extractCSRFToken(res);
  res = await agent.post("/Session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};
describe("Todo Application", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3001, () => {});
    agent = request.agent(server);
  });

  afterAll(async () => {
    try {
      await server.close();
      await db.sequelize.close();
    } catch (error) {
      console.log(error);
    }
  });

  test("Test Signup Functionality", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCSRFToken(res);
    res = await agent.post("/users").send({
      firstname: "test",
      lastname: "test",
      email: "test@test.com",
      password: "test",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Test Signout Functionality", async () => {
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  });
  test("Test Create Todo Functionality", async () => {
    const agent = request.agent(server);
    await login(agent, "test@test.com", "test");
    const res = await agent.get("/todos");
    const csrfToken = extractCSRFToken(res);
    const response = await agent.post("/todos").send({
      title: "Complete Wd 201",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Test set todo status to true", async () => {
    const agent = request.agent(server);
    await login(agent, "test@test.com", "test");
    let res = await agent.get("/todos");
    let csrfToken = extractCSRFToken(res);
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res);

    let toggleCompletedResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
        completed: true,
      });

    let parseUpdateRespnse = JSON.parse(toggleCompletedResponse.text);
    expect(parseUpdateRespnse.completed).toBe(true);
  });

  test("Test set todo complete status to false", async () => {
    const agent = request.agent(server);
    await login(agent, "test@test.com", "test");
    let res = await agent.get("/todos");
    let csrfToken = extractCSRFToken(res);

    await agent.post("/todos").send({
      title: "Complete Mid Revesion",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res);
    let groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    let parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    let dueTodayCount = parsedGroupedResponse.dueToday.length;
    let latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];
    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res);

    toggleCompletedResponse = await agent.put(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
      completed: true,
    });

    parseUpdateRespnse = JSON.parse(toggleCompletedResponse.text);
    expect(parseUpdateRespnse.completed).toBe(true);
    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res);
    groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    completedItemsCount = parsedGroupedResponse.completedItems.length;
    latestTodo = parsedGroupedResponse.completedItems[completedItemsCount - 1];
    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res);

    toggleCompletedResponse = await agent.put(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
      completed: false,
    });

    parseUpdateRespnse = JSON.parse(toggleCompletedResponse.text);
    expect(parseUpdateRespnse.completed).toBe(false);
  });

  test("Test deleting a Todo", async () => {
    const agent = request.agent(server);
    await login(agent, "test@test.com", "test");
    let res = await agent.get("/todos");
    let csrfToken = extractCSRFToken(res);
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/todos");
    csrfToken = extractCSRFToken(res);

    const deleteResponse = await agent.delete(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    });

    expect(JSON.parse(deleteResponse.text).success).toBe(true);
  });
});
