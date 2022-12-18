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

  test("Test Create Todo Functionality", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCSRFToken(res);
    const response = await agent.post("/todos").send({
      title: "Complete Wd 201",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Test status of a todo", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCSRFToken(res);
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res);

    let toggleCompletedResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: csrfToken,
      });

    let parseUpdateRespnse = JSON.parse(toggleCompletedResponse.text);
    expect(parseUpdateRespnse.completed).toBe(true);

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res);

    toggleCompletedResponse = await agent.put(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    });

    parseUpdateRespnse = JSON.parse(toggleCompletedResponse.text);
    expect(parseUpdateRespnse.completed).toBe(false);
  });

  test("Test deleting a Todo", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCSRFToken(res);
    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCSRFToken(res);

    const deleteResponse = await agent.delete(`/todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    });

    expect(JSON.parse(deleteResponse.text).success).toBe(true);
  });
});
