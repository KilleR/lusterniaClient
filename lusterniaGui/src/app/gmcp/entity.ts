export class Entity {
  id: string;
  name: string;
  icon: string;
  attrib: string;

  static fromJsonString(input: string): Entity[] {
    const out = [];
    const jsonInput = JSON.parse(input);
    console.log('JSON input (entities):', jsonInput);

    for (const line of jsonInput.items) {
      const p = new Entity();


      for (const key of Object.keys(line)) {
        console.log('doing entity key:', key, line[key]);
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
