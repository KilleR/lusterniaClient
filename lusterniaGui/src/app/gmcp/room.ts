/* tslint:disable:max-line-length */

/*

{
  "num": 1337,
  "name": "Before the Master Ravenwood Tree",
  "desc": "The dark heart of Glomdoring Forest is almost audibly beating in this, its shadowy centre. Tall, blackened trees surround this clearing, pressing together into an imposing barrier of rotten vegetation. Moulds and fungi are smeared across the plants, their pungent stench suffusing the forest. The branches are coated in dark slime, slick tendrils that hang downwards. Although a variety of trees might actually grow here, the black tar that coats them renders them indistinguishable. A thin black mist creeps between the trees, hanging low across the ground. The floor of the clearing itself is simply bare earth, cracked and dry. Overshadowing all is the Master Ravenwood Tree itself, jutting into the sky like a twisted fist. The sound of laughing crows echoes down from the treetops, a harsh sound for the ears below. The atmosphere vibrates with a palpable power.",
  "area": "Glomdoring Forest",
  "environment": "forest",
  "coords": "43,1,-1,0",
  "map": "www.lusternia.com/irex/maps/clientmap.php?map=43&building=0&level=0 52 16",
  "details": [
    "the Prime Material Plane",
    "outdoors"
  ],
  "exits": {
    "n": 1335
  }
}

 */

export class Room {
  num: number;
  name: string;
  desc: string;
  area: string;
  environment: string;
  coords: string;
  map: string;
  details: string[];
  exit: any;

  static fromJsonString(input: string): Room {
    const r = new Room();


    const jsonInput = JSON.parse(input);
    for (const key of Object.keys(jsonInput)) {
      // console.log('doing entity key:', key, line[key]);
      if (!jsonInput.hasOwnProperty(key)) {
        continue;
      }
      r[key] = jsonInput[key];
    }
    console.log('New room:', r);
    return r;
  }
}
