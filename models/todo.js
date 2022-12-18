/* eslint-disable no-unused-vars */
"use strict";
const { Model } = require("sequelize");
const { Op } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Todo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }

    static addTodo({ title, dueDate }) {
      return this.create({ title: title, dueDate: dueDate, completed: false });
    }

    toggleCompleted() {
      return this.update({ completed: !this.completed });
    }

    static async listTodos() {
      return await this.findAll();
    }

    deleteATodo() {
      this.destroy();
    }
    static async overDue() {
      return await this.findAll({
        where: {
          dueDate: {
            [Op.lt]: new Date(),
          },
          completed: false,
        },
      });
    }

    static async dueToday() {
      return await this.findAll({
        where: {
          dueDate: {
            [Op.eq]: new Date(),
          },
          completed: false,
        },
      });
    }
    static async dueLater() {
      return await this.findAll({
        where: {
          dueDate: {
            [Op.gt]: new Date(),
          },
          completed: false,
        },
      });
    }

    static async completedItems() {
      return await this.findAll({
        where: {
          completed: true,
        },
      });
    }
  }
  Todo.init(
    {
      title: DataTypes.STRING,
      dueDate: DataTypes.DATEONLY,
      completed: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "Todo",
    }
  );
  return Todo;
};
