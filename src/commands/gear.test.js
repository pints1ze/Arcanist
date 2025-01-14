import { Die } from "./die";
import { Character } from "./character";
import { Gear } from "./gear";
import { Library } from "../db/library";
import { MockRandom } from "../mocks/random";

describe("gear", () => {
  const library = new Library(":memory:");
  const fmt = { bold: (t) => `*${t}*`, strike: (t) => `~${t}~` };
  const character = new Character(fmt, library);
  const mockRandom = new MockRandom();
  const die = new Die(fmt, mockRandom);
  const gear = new Gear(fmt, library, die);
  let userId = Math.random().toString().substring(2);

  beforeAll(async () => {
    await library.init();
    await mockRandom.load();
  });

  afterAll(async () => {
    await mockRandom.save();
    await library.close();
  });

  it(`returns an error message when there's no active character`, async () => {
    expect(await gear.executeActions({ userId })).toEqual({
      actions: [],
      message: "No character found. Use /rollstats first!",
    });
  });

  it(`suggests adding starting gear for level 0 characters`, async () => {
    await character.fromStats({ id: "8:10:12:13:14:15", userId });
    expect(await gear.executeActions({ userId })).toEqual({
      actions: [{ id: "gear-starting", title: "Roll starting gear" }],
      message: `*Unnamed character's gear*
Slots: 0/10`,
    });
  });

  it(`rolls for starting gear`, async () => {
    expect(await gear.starting({ userId })).toEqual({
      actions: [],
      message: `*Rolling starting gear for Unnamed character*
1d4 (4) = 4 item(s)
1d12 (1) = 1; Torch
1d12 (4) = 4; Shortbow and Arrows
1d12 (5) = 5; Rope, 60'
1d12 (8) = 8; Iron spikes`,
    });
  });

  it(`allows adding gear by name`, async () => {
    expect(await gear.executeActions({ add: "Pole", userId })).toEqual({
      actions: [],
      message: `*Unnamed character's gear*
 - Torch
 - Shortbow
 - Arrows x5
 - Rope, 60'
 - Iron spikes x10
 - Pole
Slots: 6/10`,
    });
  });

  it(`allows adding gear that take up multiple slots`, async () => {
    expect(
      await gear.executeActions({ add: "Longer Pole", slots: 2, userId })
    ).toEqual({
      actions: [],
      message: `*Unnamed character's gear*
 - Torch
 - Shortbow
 - Arrows x5
 - Rope, 60'
 - Iron spikes x10
 - Pole
 - Longer Pole (2)
Slots: 8/10`,
    });
  });

  it(`warns you when you try to edit a nonexistent item`, async () => {
    expect(await gear.execute({ edit: "Vorpal", slots: 2, userId })).toEqual(
      `Unable to find gear to edit: Vorpal`
    );
  });

  it(`warns you when you try to an ambiguous item`, async () => {
    expect(await gear.execute({ edit: "Pole", slots: 2, userId })).toEqual(
      `Found multiple items to edit: Pole (found Pole and Longer Pole)`
    );
  });

  it(`allows you to edit the quantity of an item`, async () => {
    expect(
      await gear.execute({ edit: "Arrows", quantity: 10, userId })
    ).toEqual(
      `*Unnamed character's gear*
 - Torch
 - Shortbow
 - Arrows x10
 - Rope, 60'
 - Iron spikes x10
 - Pole
 - Longer Pole (2)
Slots: 8/10`
    );
  });

  it(`allows you to edit the slots of an item`, async () => {
    expect(
      await gear.execute({ edit: "Longer Pole", slots: 1, userId })
    ).toEqual(
      `*Unnamed character's gear*
 - Torch
 - Shortbow
 - Arrows x10
 - Rope, 60'
 - Iron spikes x10
 - Pole
 - Longer Pole
Slots: 7/10`
    );
  });

  it(`allows you to edit the name of an item`, async () => {
    expect(
      await gear.execute({ edit: "Longer Pole", name: "Fishing pole", userId })
    ).toEqual(
      `*Unnamed character's gear*
 - Torch
 - Shortbow
 - Arrows x10
 - Rope, 60'
 - Iron spikes x10
 - Pole
 - Fishing pole
Slots: 7/10`
    );
  });

  it(`suggests adding a crawling kit for level 1 characters`, async () => {
    userId = Math.random().toString().substring(2);
    await character.fromStats({ id: "8:10:12:13:14:15", userId });
    await character.execute({ level: 1, userId });
    expect(await gear.executeActions({ userId })).toEqual({
      actions: [{ id: "gear-crawling", title: "Add crawling kit" }],
      message: `*Unnamed character's gear*
Slots: 0/10`,
    });
  });

  it(`adds crawling kit`, async () => {
    expect(await gear.crawling({ userId })).toEqual({
      actions: [],
      message: `*Adding crawling kit*
 - Flint and steel
 - Torch
 - Torch
 - Rations x3
 - Iron spikes x10
 - Grappling hook
 - Rope, 60'`,
    });
  });

  it(`prompts equipping armor and shield`, async () => {
    userId = Math.random().toString().substring(2);
    await character.fromStats({ id: "8:10:12:13:14:15", userId });
    await gear.execute({ add: "Leather armor", userId });
    await gear.execute({ add: "Chainmail", userId });
    await gear.execute({ add: "Plate mail", userId });
    expect(await gear.executeActions({ add: "Shield", userId })).toEqual({
      actions: [
        {
          id: "character-update-ac:11",
          title: "Equip Leather armor",
        },
        {
          id: "character-update-ac:13",
          title: "Equip Leather armor + Shield",
        },
        {
          id: "character-update-ac:13",
          title: "Equip Chainmail",
        },
        {
          id: "character-update-ac:15",
          title: "Equip Chainmail + Shield",
        },
        {
          id: "character-update-ac:15",
          title: "Equip Plate mail",
        },
        {
          id: "character-update-ac:17",
          title: "Equip Plate mail + Shield",
        },
      ],
      message: `*Unnamed character's gear*
 - Leather armor
 - Chainmail
 - Plate mail
 - Shield
Slots: 4/10`,
    });
  });

  it(`allows equipping armor and shield`, async () => {
    expect(await character.update({ id: "ac:15", userId })).toEqual({
      actions: [],
      message: `Updated Unnamed character's AC: 15`,
    });
    expect(await gear.executeActions({ userId })).toEqual({
      actions: [
        {
          id: "character-update-ac:11",
          title: "Equip Leather armor",
        },
        {
          id: "character-update-ac:13",
          title: "Equip Leather armor + Shield",
        },
        {
          id: "character-update-ac:13",
          title: "Equip Chainmail",
        },
        {
          id: "character-update-ac:17",
          title: "Equip Plate mail + Shield",
        },
      ],
      message: `*Unnamed character's gear*
 - Leather armor
 - Chainmail
 - Plate mail
 - Shield
Slots: 4/10`,
    });
  });
});
