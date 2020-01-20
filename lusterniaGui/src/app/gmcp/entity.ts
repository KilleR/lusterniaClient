export class Entity {
  id: string;
  name: string;
  icon: string;
  attrib: string;

  static fromJsonString(input: string): Entity[] {
    const out = [];
    let jsonInput = JSON.parse(input);
    // console.log('JSON input (entities):', jsonInput);

    if (!Array.isArray(jsonInput.items)) {
      if (jsonInput.item) {
        jsonInput = [jsonInput.item];
      } else {
        jsonInput = [jsonInput];
      }
    } else {
      jsonInput = jsonInput.items;
    }
    for (const line of jsonInput) {
      const p = new Entity();


      for (const key of Object.keys(line)) {
        // console.log('doing entity key:', key, line[key]);
        if (!line.hasOwnProperty(key)) {
          continue;
        }
        p[key] = line[key];
      }
      out.push(p);
    }
    return out;
  }
}
