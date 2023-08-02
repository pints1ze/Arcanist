import { Command } from "./command.js";
import { statModifier } from "../util.js";

export class Check extends Command {
  constructor(fmt, die, libarary) {
    super();
    this.fmt = fmt;
    this.die = die;
    this.library = libarary;
  }

  arguments = [
    {
      description: "The modifier to add to the roll",
      title: "modifier",
      type: "integer",
    },
    {
      description: "The difficulty class of the check",
      title: "dc",
      type: "integer",
    },
    {
      description: "The stat associated with the check",
      enum: [
        "Strength",
        "Dexterity",
        "Constitution",
        "Intelligence",
        "Wisdom",
        "Charisma",
      ],
      title: "stat",
      type: "string",
    },
    {
      description: "Whether or not the check has advantage",
      title: "advantage",
      type: "boolean",
    },
    {
      description: "Whether or not the check has disadvantage",
      title: "disadvantage",
      type: "boolean",
    },
    {
      description: "The number of times to roll the check",
      minimum: 1,
      title: "multiple",
      type: "integer",
    },
  ];

  description = "Roll a check and return the result.";

  async execute({
    advantage,
    dc,
    disadvantage,
    modifier = 0,
    multiple = 1,
    username,
    stat,
    userId,
  }) {
    const user = await this.library.getUser(userId);
    let [, character] = await this.library.getDefaultCharacter(userId, user);
    const lines = [];
    let difficulty = "";
    if (dc !== undefined) {
      difficulty = `DC ${dc} `;
    }
    let check = "check";
    if (stat !== undefined) {
      check = `${stat} check`;
      if (character && !modifier) {
        modifier = statModifier(character[stat.toLowerCase()]);
      }
    }
    let successes = 0;
    for (let i = 0; i < multiple; i++) {
      const { roll, display } = this.die.execute({
        sides: 20,
        advantage,
        disadvantage,
      });
      const total = roll + modifier;
      let result = "";
      if (dc !== undefined) {
        if (total >= dc) {
          result = `; ${this.fmt.bold("Success!")}`;
          successes++;
        } else {
          result = `; ${this.fmt.bold("Failure")}`;
        }
      }
      lines.push(`1d20 (${display}) + ${modifier} = ${total}${result}`);
    }
    if (dc !== undefined && multiple > 1) {
      lines.push(`Successes: ${successes}/${multiple}`);
    }
    return `${character?.name ?? username} attempts a ${difficulty}${check}!
${lines.join("\n")}`;
  }
}
